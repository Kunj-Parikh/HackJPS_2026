"""
collect.py - Three-Stage Intelligent Data Collection Pipeline
=============================================================

Stage 1: Candidate Generation
  - Dedicated drug subs: Pull recent posts/comments with NO keyword filter.
    Every post in r/Ozempic is implicitly about Ozempic.
  - General health subs: Search for "drug_name + symptom_term" combinations.
    e.g. "ozempic nausea", "lexapro insomnia", "adderall anxiety"

Stage 2: Experience Detection (in-memory, before saving)
  - Score every post/comment for first-person experiential language.
  - Users don't say "adverse reaction" -- they say "I feel awful",
    "anyone else getting this?", "since starting...", "suddenly..."
  - Drop anything that doesn't sound like a real patient experience.

Stage 3: BioBERT Verification (done later in ner_pipeline.py)
  - Only rows where BioBERT extracts a real symptom entity survive.
"""

import requests
import pandas as pd
import time
import os
import re
from rxnorm import get_search_terms
from subreddit_discovery import get_dedicated_and_general

BASE_URL = "https://arctic-shift.photon-reddit.com"
os.makedirs("data/raw", exist_ok=True)

AFTER  = "2021-01-01"
BEFORE = "2024-12-31"

# ── Stage 2 Patterns ─────────────────────────────────────
# First-person / experiential language (how real patients talk)
EXPERIENCE_PATTERNS = [
    r"\bi feel\b",
    r"\bfeeling\b",
    r"\bfelt\b",
    r"\bstarted\b",
    r"\bsince starting\b",
    r"\bafter taking\b",
    r"\bafter starting\b",
    r"\banyone else\b",
    r"\bhas anyone\b",
    r"\banybody else\b",
    r"\bexperiencing\b",
    r"\bexperienced\b",
    r"\bnoticed\b",
    r"\bnoticing\b",
    r"\bhaving\b",
    r"\bcan'?t\b",
    r"\blost\b",
    r"\bgained\b",
    r"\bsince i\b",
    r"\bi'?ve been\b",
    r"\bsuddenly\b",
    r"\bweird\b",
    r"\bsevere\b",
    r"\bit makes me\b",
    r"\bi keep\b",
    r"\bi'?m getting\b",
    r"\bstarted having\b",
    r"\bworse\b",
    r"\bworsened\b",
]

# Symptom/body terms (catches clinical and casual language)
SYMPTOM_TERMS = [
    "side effect", "side-effect", "adverse", "symptom", "reaction",
    "nausea", "vomit", "diarrhea", "constipation", "stomach", "gut",
    "headache", "migraine", "dizzy", "dizziness", "vertigo",
    "fatigue", "tired", "exhausted", "insomnia", "sleep",
    "anxiety", "panic", "depression", "mood", "brain fog",
    "hair loss", "hair falling", "thinning hair",
    "rash", "itch", "hives", "skin", "acne",
    "heart", "palpitation", "chest", "blood pressure",
    "pain", "ache", "cramp", "sore", "swelling",
    "appetite", "hunger", "weight", "dry mouth",
    "vision", "blurry", "taste", "smell", "numbness", "tingling",
    "breath", "breathing", "shortness",
]

# Compile a single mega-pattern: match if ANY experience pattern OR ANY symptom term
_all_patterns = EXPERIENCE_PATTERNS + [r"\b" + re.escape(t) + r"\b" for t in SYMPTOM_TERMS]
EXPERIENCE_REGEX = re.compile("|".join(_all_patterns), re.IGNORECASE)

# Common symptom terms to use as API-level search queries in general subreddits
# These are the most frequently reported side effects across all drug classes
SEARCH_SYMPTOMS = [
    "nausea", "fatigue", "headache", "dizzy",
    "anxiety", "depression", "hair loss", "insomnia",
    "stomach pain", "weight", "side effect",
]


# ── API Helpers ───────────────────────────────────────────
def fetch_posts(subreddit, query=None, after=AFTER, before=BEFORE, limit=100):
    params = {
        "subreddit": subreddit,
        "after":     after,
        "before":    before,
        "limit":     limit,
        "sort":      "desc",
        "fields":    "id,title,selftext,author,created_utc,score,subreddit,num_comments"
    }
    if query:
        params["query"] = query
    try:
        r = requests.get(f"{BASE_URL}/api/posts/search", params=params, timeout=15)
        if r.status_code == 200:
            return r.json().get("data", [])
    except Exception as e:
        print(f"[timeout] ", end="")
    return []


def fetch_comments(subreddit, keyword=None, after=AFTER, before=BEFORE, limit=100):
    params = {
        "subreddit": subreddit,
        "after":     after,
        "before":    before,
        "limit":     limit,
        "fields":    "id,body,author,created_utc,score,link_id,subreddit"
    }
    if keyword:
        params["body"] = keyword
    try:
        r = requests.get(f"{BASE_URL}/api/comments/search", params=params, timeout=15)
        if r.status_code == 200:
            return r.json().get("data", [])
    except Exception as e:
        print(f"[timeout] ", end="")
    return []


def is_experience(text: str) -> bool:
    """Stage 2: Does this text sound like a real patient experience?"""
    return bool(EXPERIENCE_REGEX.search(text))


# ── Main Collection Logic ─────────────────────────────────
def collect_drug(drug_input: str):
    print(f"\n{'='*60}")
    print(f"DRUG: {drug_input.upper()}")
    print(f"{'='*60}")

    # 1. Get clean synonyms from RxNorm
    search_terms = get_search_terms(drug_input, max_terms=2)
    print(f"  RxNorm terms:  {search_terms}")

    # 2. Get dedicated and general subreddits separately
    dedicated_subs, general_subs = get_dedicated_and_general(drug_input, max_dedicated=3, max_general=3)
    print(f"  Dedicated:     {dedicated_subs}")
    print(f"  General:       {general_subs}")

    all_posts    = []
    all_comments = []

    # ── STAGE 1A: Dedicated Subreddits ────────────────────
    # Every post here is implicitly about this drug.
    # Don't search for the drug name. Just pull recent posts.
    print(f"\n  --- Dedicated Subreddits (raw pull, no keyword) ---")
    for sub in dedicated_subs:
        # Pull recent posts -- no query needed
        print(f"  -> r/{sub} posts (raw)", end=" ... ")
        posts = fetch_posts(sub, query=None)
        all_posts.extend(posts)
        print(f"{len(posts)}")
        time.sleep(0.3)

        # Pull recent comments -- this is where the gold is
        print(f"  -> r/{sub} comments (raw)", end=" ... ")
        comments = fetch_comments(sub, keyword=None)
        all_comments.extend(comments)
        print(f"{len(comments)}")
        time.sleep(0.3)

    # ── STAGE 1B: General Subreddits ──────────────────────
    # Search for "drug_name + symptom" combinations.
    # e.g. "ozempic nausea", "lexapro insomnia"
    print(f"\n  --- General Subreddits (drug + symptom queries) ---")
    for sub in general_subs:
        for term in search_terms:
            for symptom in SEARCH_SYMPTOMS:
                query = f"{term} {symptom}"
                print(f"  -> r/{sub} | '{query}'", end=" ... ")
                posts = fetch_posts(sub, query=query)
                all_posts.extend(posts)
                print(f"{len(posts)} posts")
                time.sleep(0.3)

    # ── STAGE 2: Experience Detection (in-memory) ─────────
    slug = drug_input.lower().replace(" ", "_")
    print(f"\n  --- Stage 2: Experience Detection ---")

    if all_posts:
        df_p = pd.DataFrame(all_posts).drop_duplicates("id")
        total_raw = len(df_p)
        df_p["drug_query"] = drug_input

        # Score: does this sound like a real patient experience?
        text_col = (df_p["title"].fillna("") + " " + df_p["selftext"].fillna("")).str.lower()
        mask = text_col.apply(is_experience)
        df_p = df_p[mask]

        if not df_p.empty:
            df_p.to_csv(f"data/raw/{slug}_posts.csv", index=False)
            print(f"  [OK] Posts: {total_raw} raw -> {len(df_p)} experience-filtered (saved)")
        else:
            print(f"  [--] Posts: {total_raw} raw -> 0 passed experience filter")
    else:
        print(f"  [--] No posts collected for {drug_input}")

    if all_comments:
        df_c = pd.DataFrame(all_comments).drop_duplicates("id")
        total_raw = len(df_c)
        df_c["drug_query"] = drug_input

        # Score: does this comment sound like a real patient experience?
        text_col = df_c["body"].fillna("").str.lower()
        mask = text_col.apply(is_experience)
        df_c = df_c[mask]

        if not df_c.empty:
            df_c.to_csv(f"data/raw/{slug}_comments.csv", index=False)
            print(f"  [OK] Comments: {total_raw} raw -> {len(df_c)} experience-filtered (saved)")
        else:
            print(f"  [--] Comments: {total_raw} raw -> 0 passed experience filter")
    else:
        print(f"  [--] No comments collected for {drug_input}")


# ── Entry point ───────────────────────────────────────────
if __name__ == "__main__":
    DRUGS = [
        "ozempic",
        "lexapro",
        "adderall",
        "metformin",
        "lisinopril",
        "atorvastatin",
        "sertraline",
        "bupropion",
    ]

    print("=" * 60)
    print("PharmaWatch Intelligent Data Collection Pipeline")
    print("Stage 1: Candidate Generation")
    print("Stage 2: Experience Detection")
    print("(Stage 3: BioBERT Verification runs in ner_pipeline.py)")
    print("=" * 60)

    for drug in DRUGS:
        collect_drug(drug)

    print("\n" + "=" * 60)
    print("Collection complete. Run ner_pipeline.py next for Stage 3.")
    print("=" * 60)
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


_all_patterns = EXPERIENCE_PATTERNS + [r"\b" + re.escape(t) + r"\b" for t in SYMPTOM_TERMS]
EXPERIENCE_REGEX = re.compile("|".join(_all_patterns), re.IGNORECASE)



SEARCH_SYMPTOMS = [
    "nausea", "fatigue", "headache", "dizzy",
    "anxiety", "depression", "hair loss", "insomnia",
    "stomach pain", "weight", "side effect",
]



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



def _filter_experience_posts(posts: list, drug_input: str) -> pd.DataFrame:
    if not posts:
        return pd.DataFrame()
    df_p = pd.DataFrame(posts).drop_duplicates("id")
    df_p["drug_query"] = drug_input
    text_col = (df_p["title"].fillna("") + " " + df_p["selftext"].fillna("")).str.lower()
    return df_p[text_col.apply(is_experience)]


def _filter_experience_comments(comments: list, drug_input: str) -> pd.DataFrame:
    if not comments:
        return pd.DataFrame()
    df_c = pd.DataFrame(comments).drop_duplicates("id")
    df_c["drug_query"] = drug_input
    text_col = df_c["body"].fillna("").str.lower()
    return df_c[text_col.apply(is_experience)]


def _cap_records(
    posts_df: pd.DataFrame,
    comments_df: pd.DataFrame,
    max_records: int,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Keep at most max_records combined, favoring comments (richer ADE text)."""
    if posts_df.empty and comments_df.empty:
        return posts_df, comments_df
    if len(posts_df) + len(comments_df) <= max_records:
        return posts_df, comments_df
    comment_budget = min(len(comments_df), max(1, int(max_records * 0.6)))
    post_budget = max_records - comment_budget
    return posts_df.head(post_budget), comments_df.head(comment_budget)


def collect_drug(
    drug_input: str,
    mode: str = "full",
    max_records: int = 200,
    save: bool = True,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Collect Reddit posts/comments for a drug.

    mode="quick": dedicated subs + a few targeted general queries, capped at max_records (default 200).
    mode="full":  dedicated + general subs with symptom queries (full corpus).
    Returns (posts_df, comments_df) after experience filtering.
    """
    quick = mode == "quick"
    fetch_limit = 100 if quick else 100
    api_pause = 0.05 if quick else 0.3

    print(f"\n{'='*60}")
    print(f"DRUG: {drug_input.upper()}  [{mode}]")
    print(f"{'='*60}")

    search_terms = get_search_terms(drug_input, max_terms=1 if quick else 6)
    print(f"  RxNorm terms:  {search_terms}")

    dedicated_subs, general_subs = get_dedicated_and_general(
        drug_input,
        max_dedicated=3,
        max_general=2 if quick else 3,
    )
    print(f"  Dedicated:     {dedicated_subs}")
    if general_subs:
        print(f"  General:       {general_subs}")

    all_posts: list = []
    all_comments: list = []

    print(f"\n  --- Dedicated Subreddits (raw pull, no keyword) ---")
    for sub in dedicated_subs:
        print(f"  -> r/{sub} posts (raw)", end=" ... ")
        posts = fetch_posts(sub, query=None, limit=fetch_limit)
        all_posts.extend(posts)
        print(f"{len(posts)}")
        time.sleep(api_pause)

        print(f"  -> r/{sub} comments (raw)", end=" ... ")
        comments = fetch_comments(sub, keyword=None, limit=fetch_limit)
        all_comments.extend(comments)
        print(f"{len(comments)}")
        time.sleep(api_pause)

    if quick:
        print(f"\n  --- Quick general queries (drug + side effect) ---")
        for sub in general_subs[:2]:
            term = search_terms[0] if search_terms else drug_input.lower()
            query = f"{term} side effect"
            print(f"  -> r/{sub} | '{query}'", end=" ... ")
            posts = fetch_posts(sub, query=query, limit=50)
            all_posts.extend(posts)
            print(f"{len(posts)} posts")
            time.sleep(api_pause)
    elif general_subs:
        print(f"\n  --- General Subreddits (drug + symptom queries) ---")
        for sub in general_subs:
            for term in search_terms:
                for symptom in SEARCH_SYMPTOMS:
                    query = f"{term} {symptom}"
                    print(f"  -> r/{sub} | '{query}'", end=" ... ")
                    posts = fetch_posts(sub, query=query, limit=fetch_limit)
                    all_posts.extend(posts)
                    print(f"{len(posts)} posts")
                    time.sleep(api_pause)

    print(f"\n  --- Stage 2: Experience Detection ---")
    df_p = _filter_experience_posts(all_posts, drug_input)
    df_c = _filter_experience_comments(all_comments, drug_input)

    if quick:
        df_p, df_c = _cap_records(df_p, df_c, max_records)

    slug = drug_input.lower().replace(" ", "_")
    total_raw_posts = len(pd.DataFrame(all_posts).drop_duplicates("id")) if all_posts else 0
    total_raw_comments = len(pd.DataFrame(all_comments).drop_duplicates("id")) if all_comments else 0

    if not df_p.empty:
        print(f"  [OK] Posts: {total_raw_posts} raw -> {len(df_p)} experience-filtered")
    else:
        print(f"  [--] Posts: {total_raw_posts} raw -> 0 passed experience filter")

    if not df_c.empty:
        print(f"  [OK] Comments: {total_raw_comments} raw -> {len(df_c)} experience-filtered")
    else:
        print(f"  [--] Comments: {total_raw_comments} raw -> 0 passed experience filter")

    if save:
        os.makedirs("data/raw", exist_ok=True)
        if not df_p.empty:
            df_p.to_csv(f"data/raw/{slug}_posts.csv", index=False)
        if not df_c.empty:
            df_c.to_csv(f"data/raw/{slug}_comments.csv", index=False)

    return df_p, df_c



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
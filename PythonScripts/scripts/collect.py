import requests
import pandas as pd
import time
import os
from rxnorm import get_search_terms
from subreddit_discovery import find_subreddits_for_drug

BASE_URL = "https://arctic-shift.photon-reddit.com"
os.makedirs("data/raw", exist_ok=True)

AFTER  = "2021-01-01"
BEFORE = "2024-12-31"


def fetch_posts(subreddit, query, after=AFTER, before=BEFORE):
    params = {
        "subreddit": subreddit,
        "query":     query,
        "after":     after,
        "before":    before,
        "limit":     100,
        "sort":      "desc",
        "fields":    "id,title,selftext,author,created_utc,score,subreddit,num_comments"
    }
    r = requests.get(f"{BASE_URL}/api/posts/search", params=params)
    if r.status_code == 200:
        return r.json().get("data", [])
    return []


def fetch_comments(subreddit, keyword, after=AFTER, before=BEFORE):
    params = {
        "subreddit": subreddit,
        "body":      keyword,
        "after":     after,
        "before":    before,
        "limit":     100,
        "fields":    "id,body,author,created_utc,score,link_id,subreddit"
    }
    r = requests.get(f"{BASE_URL}/api/comments/search", params=params)
    if r.status_code == 200:
        return r.json().get("data", [])
    return []


def collect_drug(drug_input: str):
    print(f"\n{'='*50}")
    print(f"Drug: {drug_input}")

    # 1. Get clean synonyms from RxNorm
    search_terms = get_search_terms(drug_input)
    print(f"  Search terms: {search_terms}")

    # 2. Discover subreddits using the original drug name, never a derived term
    subreddits = find_subreddits_for_drug(drug_input)
    print(f"  Subreddits:   {subreddits}")

    all_posts    = []
    all_comments = []

    # 3. Scrape every (subreddit, search_term) combination
    for subreddit in subreddits:
        for term in search_terms:
            print(f"  → r/{subreddit} | '{term}'", end=" ... ")

            posts    = fetch_posts(subreddit, term)
            comments = fetch_comments(subreddit, term)

            all_posts.extend(posts)
            all_comments.extend(comments)
            print(f"{len(posts)} posts, {len(comments)} comments")

            time.sleep(0.4)

    # 4. Deduplicate and save
    slug = drug_input.lower().replace(" ", "_")

    if all_posts:
        df_p = pd.DataFrame(all_posts).drop_duplicates("id")
        df_p["drug_query"] = drug_input
        df_p.to_csv(f"data/raw/{slug}_posts.csv", index=False)
        print(f"  ✓ Saved {len(df_p)} unique posts")
    else:
        print(f"  ⚠ No posts found for {drug_input}")

    if all_comments:
        df_c = pd.DataFrame(all_comments).drop_duplicates("id")
        df_c["drug_query"] = drug_input
        df_c.to_csv(f"data/raw/{slug}_comments.csv", index=False)
        print(f"  ✓ Saved {len(df_c)} unique comments")
    else:
        print(f"  ⚠ No comments found for {drug_input}")


# ── Entry point ───────────────────────────────────────
if __name__ == "__main__":
    # Works for ANY drug — just add to this list
    DRUGS = [
        "ozempic",
        "lexapro",
        "adderall",
        "metformin",
        "lisinopril",
        "atorvastatin",
        "sertraline",
        "bupropion",
        # add as many as you want
    ]

    for drug in DRUGS:
        collect_drug(drug)
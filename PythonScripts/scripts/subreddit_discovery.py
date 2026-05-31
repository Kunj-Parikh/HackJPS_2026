import requests
import time

BASE_URL = "https://arctic-shift.photon-reddit.com"

# High-value general communities where patients frequently discuss drug side effects.
# These are condition-specific and health-discussion subs -- not just generic ones.
GENERAL_SUBREDDITS = [
    # Medical Q&A (people post "I started X and now I have Y")
    "AskDocs", "medicine", "pharmacy",
    # Mental health (SSRIs, stimulants, anxiolytics)
    "mentalhealth", "depression", "anxiety",
    # Metabolic / GLP-1 drugs (Ozempic, Metformin, etc.)
    "diabetes", "Type2Diabetes", "weightloss", "loseit", "PCOS", "obesity",
    # Chronic conditions (painkillers, immunosuppressants, statins)
    "ChronicPain", "chronicillness", "Fibromyalgia",
    # Cardiovascular (ACE inhibitors, statins, beta blockers)
    "bloodpressure", "HeartDisease",
]


def find_subreddits_for_drug(drug_name: str, top_n=10) -> list[str]:
    """
    Returns two groups of subreddits:
      1. Dedicated subreddits for this drug (e.g. r/Ozempic, r/lexapro)
      2. General health subreddits where patients discuss side effects

    Returns a flat list with dedicated first, then general.
    """
    # 1. Check if there's a dedicated subreddit (e.g. r/Ozempic, r/lexapro)
    try:
        r = requests.get(
            f"{BASE_URL}/api/subreddits/search",
            params={"subreddit_prefix": drug_name.lower(), "limit": 5},
            timeout=10
        )
        dedicated = [s.get("display_name") for s in r.json().get("data", []) if s.get("display_name")]
    except Exception as e:
        print(f"  (Subreddit Search Error/Timeout: {e})")
        dedicated = []

    # 2. Combine: dedicated first, then general
    combined = list(dict.fromkeys(dedicated + GENERAL_SUBREDDITS))
    return combined[:top_n]


def get_dedicated_and_general(drug_name: str, max_dedicated=3, max_general=3) -> tuple[list[str], list[str]]:
    """
    Returns (dedicated_subs, general_subs) as separate lists.
    This allows the caller to treat them differently during collection.
    """
    try:
        r = requests.get(
            f"{BASE_URL}/api/subreddits/search",
            params={"subreddit_prefix": drug_name.lower(), "limit": 5},
            timeout=10
        )
        dedicated = [s.get("display_name") for s in r.json().get("data", []) if s.get("display_name")]
    except Exception as e:
        print(f"  (Subreddit Search Error/Timeout: {e})")
        dedicated = []

    return dedicated[:max_dedicated], GENERAL_SUBREDDITS[:max_general]
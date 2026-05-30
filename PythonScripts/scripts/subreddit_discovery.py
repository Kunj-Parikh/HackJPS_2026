import requests
import time

BASE_URL = "https://arctic-shift.photon-reddit.com"

# Broad condition subreddits that discuss many drugs
GENERAL_SUBREDDITS = [
    "AskDocs", "pharmacy", "ChronicPain", "mentalhealth",
    "depression", "anxiety", "diabetes", "cancer",
    "MultipleSclerosis", "rheumatoid", "Fibromyalgia",
    "bloodpressure", "HeartDisease", "epilepsy", "asthma"
]

def find_subreddits_for_drug(drug_name: str, top_n=10) -> list[str]:
    """
    Finds subreddits where this drug is most discussed
    by searching Reddit's subreddit index.
    """
    # 1. Check if there's a dedicated subreddit (e.g. r/Ozempic, r/lexapro)
    r = requests.get(
        f"{BASE_URL}/api/subreddits/search",
        params={"subreddit_prefix": drug_name.lower(), "limit": 5}
    )
    dedicated = [s.get("display_name") for s in r.json().get("data", []) if s.get("display_name")]

    # 2. Arctic Shift does not support global text searches for post aggregation.
    # We will rely on dedicated subreddits + the GENERAL_SUBREDDITS list.
    
    # 3. Combine: dedicated first, then general
    combined = list(dict.fromkeys(dedicated + GENERAL_SUBREDDITS))
    return combined[:top_n]
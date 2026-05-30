import requests

def get_drug_names(drug_input: str) -> dict:
    """
    Given any drug name (brand or generic), returns:
    - rxcui: RxNorm concept ID
    - generic_name
    - all synonyms (brand names, common misspellings, informal names)
    """
    base = "https://rxnav.nlm.nih.gov/REST"

    # Step 1: get rxcui
    r = requests.get(f"{base}/rxcui.json", params={"name": drug_input, "search": 2})
    r.raise_for_status()
    ids = r.json().get("idGroup", {}).get("rxnormId", [])
    if not ids:
        print(f"  ⚠ RxNorm: no match for '{drug_input}'")
        return None
    rxcui = ids[0]

    # Step 2: get all related names
    r2 = requests.get(f"{base}/rxcui/{rxcui}/allrelated.json")
    r2.raise_for_status()
    concept_groups = r2.json().get("allRelatedGroup", {}).get("conceptGroup", [])

    all_names = set()
    all_names.add(drug_input.lower())

    for group in concept_groups:
        for prop in group.get("conceptProperties", []):
            name = prop.get("name", "").lower().strip()
            if name:
                all_names.add(name)

    # Step 3: get display name
    r3 = requests.get(f"{base}/rxcui/{rxcui}/properties.json")
    generic_name = r3.json().get("properties", {}).get("name", drug_input)

    return {
        "rxcui": rxcui,
        "generic_name": generic_name,
        "all_names": sorted(all_names)
    }


def get_search_terms(drug_input: str, max_terms=6) -> list[str]:
    """
    Returns clean, Reddit-useful search terms for a drug.
    Filters out RxNorm dosage form noise like 'oral tablet', 'pen injector', etc.
    """
    info = get_drug_names(drug_input)
    if not info:
        return [drug_input.lower()]

    drug_root = drug_input.lower().strip()
    # For multi-word inputs like "semaglutide injection", just use the first word as root
    root_word = drug_root.split()[0]

    filtered = []
    for name in info["all_names"]:
        # Keep only names that contain the actual drug word
        if root_word in name:
            filtered.append(name)

    # Always guarantee the original input is included
    if drug_root not in filtered:
        filtered.insert(0, drug_root)

    # Deduplicate, sort by length (shorter names appear more in casual Reddit posts)
    filtered = sorted(set(filtered), key=len)

    return filtered[:max_terms]
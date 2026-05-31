import os
import pandas as pd
import json
import ast
from collections import defaultdict, Counter

PROCESSED_DIR = "data/processed"
FRONTEND_DATA_PATH = "../../PharmaWatch/src/data/realData.json"

# Load current realData.json if it exists so we can update it instead of overwriting completely
try:
    with open(FRONTEND_DATA_PATH, "r", encoding="utf-8") as f:
        frontend_data = json.load(f)
except Exception:
    frontend_data = {}

def get_tier(count):
    if count >= 200: return "validated"
    if count >= 75: return "strong"
    if count >= 25: return "moderate"
    return "weak"

def aggregate():
    if not os.path.exists(PROCESSED_DIR):
        print(f"Directory {PROCESSED_DIR} not found. Run ner_pipeline.py first!")
        return

    files = [f for f in os.listdir(PROCESSED_DIR) if f.startswith("ner_")]
    if not files:
        print("No processed files found in data/processed/")
        return

    # Group files by drug
    drug_files = defaultdict(list)
    for f in files:
        # ner_ozempic_posts.csv -> ozempic
        drug_name = f.replace("ner_", "").replace("_posts.csv", "").replace("_comments.csv", "")
        drug_files[drug_name].append(os.path.join(PROCESSED_DIR, f))

    for drug_slug, paths in drug_files.items():
        print(f"Aggregating {drug_slug}...")
        
        symptom_counter = Counter()
        symptom_quotes = defaultdict(list)
        symptom_subreddits = defaultdict(set)
        
        for path in paths:
            df = pd.read_csv(path)
            for _, row in df.iterrows():
                try:
                    # Parse the stringified list representation
                    symptoms_raw = row.get("extracted_symptoms", "[]")
                    if pd.isna(symptoms_raw):
                        symptoms = []
                    else:
                        symptoms = ast.literal_eval(str(symptoms_raw))
                except:
                    symptoms = []
                    
                if not symptoms:
                    continue
                    
                # Reconstruct full text for quotes
                if "title" in row and "selftext" in row:
                    text = str(row.get("title", "")) + " " + str(row.get("selftext", ""))
                else:
                    text = str(row.get("body", ""))
                    
                sub = row.get("subreddit", "unknown")
                date = "2024-01-01" 
                
                # Try to format the reddit timestamp
                if "created_utc" in row and not pd.isna(row["created_utc"]):
                    try:
                        from datetime import datetime
                        date = datetime.utcfromtimestamp(row["created_utc"]).strftime('%Y-%m-%d')
                    except:
                        pass
                
                for sym in symptoms:
                    sym_clean = str(sym).lower().strip()
                    # Basic noise filtering
                    if len(sym_clean) < 3 or sym_clean in ["pain", "disease", "symptom"]:
                        continue
                        
                    symptom_counter[sym_clean] += 1
                    symptom_subreddits[sym_clean].add(f"r/{sub}")
                    
                    # Store up to 3 quotes
                    if len(symptom_quotes[sym_clean]) < 3 and len(text) > 20:
                        clean_text = text.replace('\n', ' ').strip()
                        symptom_quotes[sym_clean].append({
                            "text": clean_text[:300] + "..." if len(clean_text) > 300 else clean_text,
                            "sub": f"r/{sub}",
                            "date": date
                        })
        
        # Initialize drug in frontend data if it doesn't exist
        if drug_slug not in frontend_data:
            frontend_data[drug_slug] = {
                "brand": drug_slug.capitalize(),
                "generic": drug_slug,
                "class": "Unknown",
                "indications": [],
                "approvalDate": "Unknown",
                "listedEffects": [],
                "signals": []
            }
        
        new_signals = []
        # Take top 15 symptoms to avoid overloading the UI
        for sym, count in symptom_counter.most_common(15):
            if count < 2: 
                continue
                
            new_signals.append({
                "symptom": sym.title(),
                "tier": get_tier(count),
                "uniqueReporters": count,
                "avgOnsetDays": 0, # Needs complex NLP to compute
                "onsetStdDev": 0,
                "causalityAvg": 0.5,
                "subreddits": list(symptom_subreddits[sym]),
                "firstSeen": symptom_quotes[sym][-1]["date"] if symptom_quotes[sym] else "Unknown",
                "faersFirstSeen": None,
                "listedSimilarity": 0.0,
                "quotes": symptom_quotes[sym],
                "timeline": [],
                "onsetDistribution": []
            })
            
        frontend_data[drug_slug]["signals"] = new_signals
        print(f"  ✓ Processed {len(new_signals)} signals for {drug_slug}")
        
    # Write back to realData.json
    with open(FRONTEND_DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(frontend_data, f, indent=2)
    
    print(f"\n🎉 Aggregation complete! Updated {FRONTEND_DATA_PATH}")

if __name__ == "__main__":
    aggregate()

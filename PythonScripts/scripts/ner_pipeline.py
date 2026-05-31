"""
ner_pipeline.py - Stage 3: BioBERT Verification
================================================

This is the final gate. After collect.py has:
  Stage 1: Generated candidates (raw pulls + symptom queries)
  Stage 2: Filtered for experiential language

This script:
  1. Runs BioBERT NER on every surviving post/comment
  2. Extracts drug mentions and symptom entities
  3. DISCARDS any row where BioBERT finds zero symptom entities
     (eliminates insurance questions, coupon posts, pharmacy shortage complaints)
  4. Saves only verified symptom-containing rows to data/processed/
"""

import os
import pandas as pd
from transformers import pipeline
import torch
from tqdm import tqdm
import ast

# Configuration
RAW_DIR = "data/raw"
PROCESSED_DIR = "data/processed"
os.makedirs(PROCESSED_DIR, exist_ok=True)

# Detect if GPU is available
device = 0 if torch.cuda.is_available() else -1
if device == 0:
    print("[GPU] CUDA GPU Detected: Using Hardware Acceleration for NER.")
else:
    print("[CPU] No GPU Detected: Falling back to CPU. This will be slower.")

# Initialize the BioBERT NER Pipeline
# aggregation_strategy="simple" groups subtokens back into full words
ner = pipeline(
    "token-classification", 
    model="d4data/biomedical-ner-all", 
    aggregation_strategy="simple",
    device=device
)

def extract_entities(text):
    """Run NER and return structured entities."""
    if not isinstance(text, str) or not text.strip():
        return [], []
        
    try:
        # We limit length to 512 characters to prevent token limit crashes on massive posts
        # (For production, you'd chunk the text instead)
        results = ner(text[:512]) 
        
        drugs = [r["word"] for r in results if r["entity_group"] == "Medication"]
        symptoms = [r["word"] for r in results if r["entity_group"] in ("Sign_symptom", "Disease_disorder")]
        
        return list(set(drugs)), list(set(symptoms)) # Deduplicate
    except Exception as e:
        print(f"Error processing text: {e}")
        return [], []

def process_file(filepath):
    filename = os.path.basename(filepath)
    print(f"\nProcessing {filename}...")
    
    # Read raw data
    df = pd.read_csv(filepath)
    
    # Determine the text column
    if "title" in df.columns and "selftext" in df.columns:
        # It's a posts file
        df["full_text"] = df["title"].fillna("") + " " + df["selftext"].fillna("")
    elif "body" in df.columns:
        # It's a comments file
        df["full_text"] = df["body"].fillna("")
    else:
        print(f"Skipping {filename}: Unrecognized schema.")
        return

    # To test quickly, you can add `.head(10)` here:
    # df = df.head(10).copy()

    # Apply NER with a progress bar
    # Using tqdm.pandas() adds a progress bar to df.apply
    tqdm.pandas(desc="Extracting Entities")
    
    # Zip extracts two lists (drugs, symptoms) into two separate columns
    extracted = df["full_text"].progress_apply(extract_entities)
    df["extracted_drugs"] = extracted.apply(lambda x: x[0])
    df["extracted_symptoms"] = extracted.apply(lambda x: x[1])
    
    # ── Stage 3: BioBERT Verification ─────────────────────
    # Only keep rows where BioBERT actually found symptom entities.
    # This is the final gate that eliminates noise like:
    #   "How do I get insurance approval?"
    #   "Coupon not working"
    #   "Pharmacy shortage"
    #   "Where can I buy it?"
    before_count = len(df)
    df = df[df["extracted_symptoms"].apply(lambda syms: len(syms) > 0)]
    after_count = len(df)
    print(f"  BioBERT verification: {before_count} rows -> {after_count} with symptoms ({before_count - after_count} discarded)")

    # Drop intermediate column and save
    df = df.drop(columns=["full_text"])
    out_path = os.path.join(PROCESSED_DIR, f"ner_{filename}")
    df.to_csv(out_path, index=False)
    print(f"  [OK] Saved {len(df)} verified rows to {out_path}")


if __name__ == "__main__":
    raw_files = [f for f in os.listdir(RAW_DIR) if f.endswith(".csv")]
    
    if not raw_files:
        print(f"No CSV files found in {RAW_DIR}. Run collect.py first!")
    else:
        for file in raw_files:
            process_file(os.path.join(RAW_DIR, file))
        
        print("\n" + "=" * 60)
        print("Stage 3 NER Pipeline Complete!")
        print("Only rows with BioBERT-verified symptoms were kept.")
        print("Run aggregate.py next to generate realData.json.")
        print("=" * 60)

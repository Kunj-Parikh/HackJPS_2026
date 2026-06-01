import os
import pandas as pd
from transformers import pipeline
import torch
from tqdm import tqdm
import ast

RAW_DIR = "data/raw"
PROCESSED_DIR = "data/processed"
os.makedirs(PROCESSED_DIR, exist_ok=True)

device = 0 if torch.cuda.is_available() else -1
if device == 0:
    print("[GPU] CUDA GPU Detected: Using Hardware Acceleration for NER.")
else:
    print("[CPU] No GPU Detected: Falling back to CPU. This will be slower.")

ner = pipeline(
    "token-classification", 
    model="d4data/biomedical-ner-all", 
    aggregation_strategy="simple",
    device=device
)

def extract_entities(text):
    if not isinstance(text, str) or not text.strip():
        return [], []
        
    try:
        results = ner(text[:512]) 
        
        drugs = [r["word"] for r in results if r["entity_group"] == "Medication"]
        symptoms = [r["word"] for r in results if r["entity_group"] in ("Sign_symptom", "Disease_disorder")]
        
        return list(set(drugs)), list(set(symptoms))
    except Exception as e:
        print(f"Error processing text: {e}")
        return [], []

def process_file(filepath):
    filename = os.path.basename(filepath)
    print(f"\nProcessing {filename}...")
    
    df = pd.read_csv(filepath)
    
    if "title" in df.columns and "selftext" in df.columns:
        df["full_text"] = df["title"].fillna("") + " " + df["selftext"].fillna("")
    elif "body" in df.columns:
        df["full_text"] = df["body"].fillna("")
    else:
        print(f"Skipping {filename}: Unrecognized schema.")
        return

    tqdm.pandas(desc="Extracting Entities")
    
    extracted = df["full_text"].progress_apply(extract_entities)
    df["extracted_drugs"] = extracted.apply(lambda x: x[0])
    df["extracted_symptoms"] = extracted.apply(lambda x: x[1])
    
    before_count = len(df)
    df = df[df["extracted_symptoms"].apply(lambda syms: len(syms) > 0)]
    after_count = len(df)
    print(f"  BioBERT verification: {before_count} rows -> {after_count} with symptoms ({before_count - after_count} discarded)")

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
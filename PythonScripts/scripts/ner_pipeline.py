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
    print("🚀 CUDA GPU Detected: Using Hardware Acceleration for NER.")
else:
    print("⏳ No GPU Detected: Falling back to CPU. This will be slow!")

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
    
    # Drop intermediate column and save
    df = df.drop(columns=["full_text"])
    out_path = os.path.join(PROCESSED_DIR, f"ner_{filename}")
    df.to_csv(out_path, index=False)
    print(f"✓ Saved processed file to {out_path}")


if __name__ == "__main__":
    raw_files = [f for f in os.listdir(RAW_DIR) if f.endswith(".csv")]
    
    if not raw_files:
        print(f"No CSV files found in {RAW_DIR}. Run collect.py first!")
    else:
        for file in raw_files:
            process_file(os.path.join(RAW_DIR, file))
        
        print("\n🎉 Stage 2 NER Pipeline Complete!")

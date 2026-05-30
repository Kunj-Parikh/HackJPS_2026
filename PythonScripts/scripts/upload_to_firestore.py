import json
import os
import glob
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

# --- CONFIGURATION ---
# Path to your Firebase service account key JSON file
# 1. Go to Firebase Console -> Project Settings (gear icon) -> Service Accounts
# 2. Click "Generate new private key"
# 3. Save the downloaded JSON file to this scripts folder and rename it to 'serviceAccountKey.json'
SERVICE_ACCOUNT_KEY = "serviceAccountKey.json"

# Path to the directory containing JSONL files
OUTPUT_DIR = "python_pipeline/output"

def main():
    if not os.path.exists(SERVICE_ACCOUNT_KEY):
        print(f"Error: '{SERVICE_ACCOUNT_KEY}' not found.")
        print("Please download it from Firebase Console -> Project Settings -> Service Accounts")
        return

    # Initialize Firebase Admin SDK
    print("Connecting to Firestore...")
    cred = credentials.Certificate(SERVICE_ACCOUNT_KEY)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    
    # Get all jsonl files
    jsonl_files = glob.glob(os.path.join(OUTPUT_DIR, "*.jsonl"))
    
    if not jsonl_files:
        print(f"No JSONL files found in {OUTPUT_DIR}")
        return

    print(f"Found {len(jsonl_files)} files. Starting upload using nested subcollections (Option B)...\n")

    for file_path in jsonl_files:
        # Extract drug name from filename (e.g., 'lexapro_ade.jsonl' -> 'lexapro')
        drug_name = os.path.basename(file_path).replace("_ade.jsonl", "").lower()
        print(f"Processing '{drug_name}'...")
        
        # Reference to the drug document
        drug_ref = db.collection("drugs").document(drug_name)
        
        # Initialize the parent drug document
        drug_ref.set({"name": drug_name}, merge=True)
        
        # Reference to the reports subcollection for this drug
        reports_ref = drug_ref.collection("reports")
        
        count = 0
        batch = db.batch()
        batch_count = 0
        
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                    
                record = json.loads(line)
                
                # Remove the 'drug' key to save space (Option B efficiency)
                if "drug" in record:
                    del record["drug"]
                
                # Create a new document reference with an auto-generated ID inside the subcollection
                doc_ref = reports_ref.document()
                
                # Add the write operation to the batch
                batch.set(doc_ref, record)
                
                count += 1
                batch_count += 1
                
                # Firestore batches can hold up to 500 operations
                if batch_count >= 500:
                    batch.commit()
                    print(f"  Uploaded {count} records...")
                    batch = db.batch() # Start a new batch
                    batch_count = 0
            
            # Commit any remaining records in the last batch
            if batch_count > 0:
                batch.commit()
                
        print(f"✓ Finished '{drug_name}': {count} reports uploaded.")
        
        # Update the drug document with the total count for quick dashboard reads
        drug_ref.set({"total_reports": count}, merge=True)

    print("\nAll uploads completed successfully!")

if __name__ == "__main__":
    main()

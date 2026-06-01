import json
import os
import glob
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore






SERVICE_ACCOUNT_KEY = "serviceAccountKey.json"


OUTPUT_DIR = "python_pipeline/output"

def main():
    if not os.path.exists(SERVICE_ACCOUNT_KEY):
        print(f"Error: '{SERVICE_ACCOUNT_KEY}' not found.")
        print("Please download it from Firebase Console -> Project Settings -> Service Accounts")
        return


    print("Connecting to Firestore...")
    cred = credentials.Certificate(SERVICE_ACCOUNT_KEY)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    

    jsonl_files = glob.glob(os.path.join(OUTPUT_DIR, "*.jsonl"))
    
    if not jsonl_files:
        print(f"No JSONL files found in {OUTPUT_DIR}")
        return

    print(f"Found {len(jsonl_files)} files. Starting upload using nested subcollections (Option B)...\n")

    for file_path in jsonl_files:

        drug_name = os.path.basename(file_path).replace("_ade.jsonl", "").lower()
        print(f"Processing '{drug_name}'...")
        

        drug_ref = db.collection("drugs").document(drug_name)
        

        drug_ref.set({"name": drug_name}, merge=True)
        

        reports_ref = drug_ref.collection("reports")
        
        count = 0
        batch = db.batch()
        batch_count = 0
        
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                    
                record = json.loads(line)
                

                if "drug" in record:
                    del record["drug"]
                

                doc_ref = reports_ref.document()
                

                batch.set(doc_ref, record)
                
                count += 1
                batch_count += 1
                

                if batch_count >= 500:
                    batch.commit()
                    print(f"  Uploaded {count} records...")
                    batch = db.batch()
                    batch_count = 0
            

            if batch_count > 0:
                batch.commit()
                
        print(f"✓ Finished '{drug_name}': {count} reports uploaded.")
        

        drug_ref.set({"total_reports": count}, merge=True)

    print("\nAll uploads completed successfully!")

if __name__ == "__main__":
    main()

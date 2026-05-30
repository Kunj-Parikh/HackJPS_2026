from transformers import pipeline

ner = pipeline("token-classification", model="d4data/biomedical-ner-all", aggregation_strategy="simple")

text = "Ever since starting Ozempic I've had severe hair loss"
results = ner(text)

drugs = [r["word"] for r in results if r["entity_group"] == "Medication"]
print(drugs)
ades = [r["word"] for r in results if r["entity_group"] in ("Sign_symptom", "Disease_disorder")]
print(ades)

print(f"Input: {text}\n")
for d in drugs:
    print(f"Drug: {d}")
for a in ades:
    print(f"ADE: {a}")

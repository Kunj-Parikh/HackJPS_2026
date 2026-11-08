# PharmaWatch

**Early-warning pharmacovigilance from patient-reported experiences.** Built at HackJPS 2026.

Official adverse event reporting (FDA FAERS) is slow and under-reported. Most people who get a side effect never file a report, but many of them post about it online. PharmaWatch mines those posts, extracts drug–side effect pairs with biomedical NLP, and surfaces signals that may be emerging before they show up in official data.

## How it works

```
Reddit posts & comments ──► Drug extraction ──► Symptom extraction (BioBERT NER)
        (Arctic Shift)                                      │
                                                            ▼
   Signal dashboard ◄── Severity & confidence scoring ◄── Drug–symptom linking
        (React)               (tiered)                 + filtering (negation, onset,
                                                         quality, normalization)
```

1. **Collection:** pulls posts and comments mentioning a drug from relevant subreddits (with automatic subreddit discovery) via the Arctic Shift Reddit archive
2. **Extraction:** identifies drug mentions and uses BioBERT named-entity recognition to keep only text containing real symptom entities
3. **Linking and filtering:** pairs drugs with symptoms, then drops negated mentions ("I *didn't* get headaches"), implausible onset timing, and low-quality posts; normalizes drug and symptom names
4. **Scoring:** assigns severity and a tiered confidence level to each signal and compares against FDA label and FAERS data
5. **Dashboard:** search any drug, view its signals over time, drill into the posts behind each signal, and ask questions through a built-in AI assistant

Currently processed: Adderall, atorvastatin, bupropion, Lexapro, lisinopril, metformin, Ozempic, sertraline.

## Repo layout

| Path | Contents |
|---|---|
| `PythonScripts/scripts/` | Collection, subreddit discovery, NER, aggregation, and API server |
| `PythonScripts/scripts/python_pipeline/` | Modular extraction pipeline: `drug_extraction`, `symptom_extraction`, `linking`, `filtering`, `onset_extraction`, `severity`, `report_generation` |
| `PharmaWatch/` | React + Vite dashboard: search, drug pages, signal detail, timeline charts, methodology page, AI chat |

## Running locally

```bash
# pipeline
cd PythonScripts/scripts/python_pipeline
pip install -r requirements.txt
python pipeline.py

# dashboard
cd PharmaWatch
npm install
npm run dev
```

## Disclaimer

PharmaWatch surfaces unverified, self-reported signals for research purposes. It is not medical advice and does not establish that a drug causes any effect.

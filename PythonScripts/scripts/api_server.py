"""
FastAPI server: collect Reddit data + run pharmacovigilance pipeline on demand.

Usage (from PythonScripts/scripts):
  uvicorn api_server:app --reload --port 8000
"""
from __future__ import annotations

import sys
import threading
import uuid
from pathlib import Path
from typing import Literal

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

_SCRIPTS_DIR = Path(__file__).resolve().parent
_PIPELINE_DIR = _SCRIPTS_DIR / "python_pipeline"
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))
if str(_PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(_PIPELINE_DIR))

from aggregate_reports import aggregate_reports_to_drug_doc, build_metadata_for_drug
from collect import collect_drug
from pipeline import run_pipeline_on_dataframes

KNOWN_DRUG_IDS = frozenset({
    "ozempic", "lexapro", "adderall", "metformin",
    "lisinopril", "atorvastatin", "sertraline", "bupropion",
    "semaglutide", "escitalopram", "zoloft", "wellbutrin", "glucophage",
    "lipitor", "zestril",
})

STAGES = [
    "collecting",
    "extracting",
    "linking",
    "aggregating",
    "done",
]

app = FastAPI(title="PharmaWatch Analysis API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_jobs: dict[str, dict] = {}
_jobs_lock = threading.Lock()


class AnalyzeRequest(BaseModel):
    drugName: str = Field(..., min_length=1)
    brand: str | None = None
    generic: str | None = None
    mode: Literal["quick", "full"] = "quick"


def _set_job(job_id: str, **kwargs) -> None:
    with _jobs_lock:
        if job_id in _jobs:
            _jobs[job_id].update(kwargs)


def _run_analysis(job_id: str, req: AnalyzeRequest) -> None:
    quick = req.mode == "quick"
    drug_query = req.drugName.strip()

    try:
        _set_job(job_id, stage="collecting", message="Discovering subreddits & collecting patient posts…")
        posts_df, comments_df = collect_drug(
            drug_query,
            mode=req.mode,
            max_records=200 if quick else 5000,
            save=False,
        )
        record_count = len(posts_df) + len(comments_df)
        if record_count == 0:
            _set_job(
                job_id,
                stage="done",
                status="error",
                error="No patient experience posts found for this drug on Reddit.",
            )
            return

        _set_job(
            job_id,
            stage="extracting",
            message=(
                f"Extracting symptoms from {record_count} posts/comments (fast lexicon)…"
                if quick
                else f"Extracting symptoms from {record_count} posts/comments (BioBERT NER)…"
            ),
            recordsCollected=record_count,
        )

        _, _, reports, _, _ = run_pipeline_on_dataframes(
            posts_df, comments_df, drug_query, batch_size=32, fast=quick
        )

        _set_job(job_id, stage="linking", message="Linking drugs to symptoms & filtering reports…")

        metadata = build_metadata_for_drug(drug_query, brand=req.brand, generic=req.generic)
        _set_job(job_id, stage="aggregating", message="Building signal cards & timelines…")

        drug_doc = aggregate_reports_to_drug_doc(
            reports,
            posts_df,
            comments_df,
            metadata,
            quick=quick,
            min_reporters=1 if quick and record_count < 30 else 2,
        )
        drug_doc["scanMode"] = req.mode
        drug_doc["isLiveScan"] = True

        _set_job(
            job_id,
            stage="done",
            status="complete",
            result=drug_doc,
            message=f"Found {len(drug_doc['signals'])} signals from {record_count} records.",
        )
    except Exception as exc:
        _set_job(job_id, stage="done", status="error", error=str(exc))


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/analyze")
def start_analyze(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    slug = req.drugName.lower().replace(" ", "-")
    if slug in KNOWN_DRUG_IDS:
        raise HTTPException(
            status_code=400,
            detail="This drug is already indexed. Load it from the main search.",
        )

    job_id = str(uuid.uuid4())
    with _jobs_lock:
        _jobs[job_id] = {
            "jobId": job_id,
            "stage": "collecting",
            "status": "running",
            "message": "Starting analysis…",
            "mode": req.mode,
            "result": None,
            "error": None,
        }

    background_tasks.add_task(_run_analysis, job_id, req)
    return {"jobId": job_id}


@app.get("/api/analyze/{job_id}")
def get_analyze_status(job_id: str):
    with _jobs_lock:
        job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

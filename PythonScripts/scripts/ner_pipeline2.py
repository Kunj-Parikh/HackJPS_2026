"""NER pipeline wrapper that mirrors python_pipeline/pipeline.py."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent / "python_pipeline"
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd

from data_loader.loader import DRUG_DATA_DIR, discover_drugs, load_drug
from drug_extraction.drugs import extract_drugs
from filtering.apply import DroppedReport, filter_reports
from linking.linker import link_drug_symptoms
from report_generation.reports import reports_to_dicts
from schema import AdverseEventReport, PipelineDebug, TextRecord
from symptom_extraction.symptoms import extract_symptoms_batch


def process_record(
    record: TextRecord,
    symptoms: list | None = None,
) -> tuple[list[AdverseEventReport], list[DroppedReport], PipelineDebug]:
    drugs = extract_drugs(record)
    syms = symptoms if symptoms is not None else []
    if not syms:
        from symptom_extraction.symptoms import extract_symptoms_record
        syms = extract_symptoms_record(record)

    pairs = link_drug_symptoms(record.text, drugs, syms)
    kept, dropped = filter_reports(record, pairs)
    dbg = PipelineDebug(
        record=record,
        drugs=drugs,
        symptoms=syms,
        linked_pairs=pairs,
        reports=kept,
        dropped=[{"report": d.report, "drop_reason": d.drop_reason} for d in dropped],
    )
    for r in kept:
        dbg.onset_days[(r.drug, r.symptom)] = r.onset_days
    return kept, dropped, dbg


def run_pipeline(
    drug: str,
    data_dir: Path | None = None,
    batch_size: int = 32,
) -> tuple[pd.DataFrame, pd.DataFrame, list[dict], list[dict], list[PipelineDebug]]:
    root = data_dir or DRUG_DATA_DIR
    posts_df, comments_df, post_recs, comment_recs = load_drug(drug, root)
    all_records = post_recs + comment_recs
    texts = [r.text for r in all_records]
    symptom_lists = extract_symptoms_batch(texts, batch_size=batch_size)

    all_reports: list[dict] = []
    all_dropped: list[dict] = []
    debugs: list[PipelineDebug] = []
    for rec, syms in zip(all_records, symptom_lists):
        kept, dropped, dbg = process_record(rec, syms)
        for row in reports_to_dicts(kept):
            row["record_id"] = rec.record_id
            row["original_text"] = rec.original_text
            all_reports.append(row)
        for d in dropped:
            d.report["record_id"] = rec.record_id
            all_dropped.append({"report": d.report, "drop_reason": d.drop_reason})
        debugs.append(dbg)
    return posts_df, comments_df, all_reports, all_dropped, debugs


def write_jsonl(path: Path, rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row) + "\n")


def run_all_drugs(
    data_dir: Path | None = None,
    out_dir: Path | None = None,
    batch_size: int = 32,
) -> dict[str, int]:
    root = data_dir or DRUG_DATA_DIR
    out = out_dir or (_ROOT / "output")
    out.mkdir(exist_ok=True)
    counts: dict[str, int] = {}
    for drug in discover_drugs(root):
        _, _, reports, _, _ = run_pipeline(drug, root, batch_size)
        path = out / f"{drug}_ade.jsonl"
        write_jsonl(path, reports)
        counts[drug] = len(reports)
        print(f"{drug}: {len(reports)} reports -> {path}")
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run the pharmacovigilance pipeline like python_pipeline/pipeline.py"
    )
    parser.add_argument("--drug", help="Drug name to process")
    parser.add_argument("--all", action="store_true", help="Process all discovered drugs")
    parser.add_argument("--data-dir", type=Path, help="Root input data directory")
    parser.add_argument("--out-dir", type=Path, help="Output directory for JSONL files")
    parser.add_argument("--batch-size", type=int, default=32, help="Symptom extraction batch size")
    args = parser.parse_args()

    if args.all:
        run_all_drugs(args.data_dir, args.out_dir, args.batch_size)
        return

    if not args.drug:
        parser.error("Either --drug or --all is required")

    _, _, reports, dropped, _ = run_pipeline(args.drug, args.data_dir, args.batch_size)
    out_dir = args.out_dir or Path.cwd()
    out_dir.mkdir(parents=True, exist_ok=True)
    write_jsonl(out_dir / f"{args.drug}_ade.jsonl", reports)
    write_jsonl(out_dir / f"{args.drug}_dropped.jsonl", dropped)
    print(f"Wrote {len(reports)} reports and {len(dropped)} dropped rows to {out_dir}")


if __name__ == "__main__":
    main()
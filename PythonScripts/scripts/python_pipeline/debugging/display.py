"""Pretty-print pipeline debug output."""
from __future__ import annotations

import json

from schema import PipelineDebug


def format_debug(dbg: PipelineDebug) -> str:
    lines = [
        "=" * 72,
        f"id={dbg.record.record_id} source={dbg.record.source_type}",
        "-" * 72,
        "ORIGINAL TEXT:",
        dbg.record.original_text[:2000] + ("..." if len(dbg.record.original_text) > 2000 else ""),
        "-" * 72,
        "DRUGS:",
        ", ".join(f"{d.normalized}({d.source})@{d.start}" for d in dbg.drugs) or "(none)",
        "SYMPTOMS:",
        ", ".join(f"{s.text}({s.confidence:.2f})" for s in dbg.symptoms) or "(none)",
        "LINKED PAIRS:",
    ]
    for p in dbg.linked_pairs:
        lines.append(
            f"  {p.drug} <-> {p.symptom} | link={p.linking_score:.3f} prox={p.proximity_score:.3f}"
        )
    lines.append("ONSET (drug, symptom) -> days:")
    for k, v in dbg.onset_days.items():
        lines.append(f"  {k} → {v}")
    lines.append("REPORTS:")
    for r in dbg.reports:
        lines.append("  " + json.dumps({
            "drug": r.drug,
            "symptom": r.symptom,
            "onset_days": r.onset_days,
            "severity": r.severity,
            "causality_confidence": r.causality_confidence,
            "source_type": r.source_type,
        }))
    return "\n".join(lines)

"""Assemble adverse-event report objects."""
from __future__ import annotations

from schema import AdverseEventReport, LinkedPair, SourceType, TextRecord

COMMENT_WEIGHT = 0.85


def causality_confidence(pair: LinkedPair) -> float:
    raw = (
        0.4 * pair.symptom_confidence
        + 0.4 * pair.linking_score
        + 0.2 * pair.proximity_score
    )
    return max(0.0, min(1.0, raw))


def build_report(
    pair: LinkedPair,
    record: TextRecord,
    onset_days: int | None,
    severity: int | None,
) -> AdverseEventReport:
    conf = causality_confidence(pair)
    if record.source_type == "comment":
        conf *= COMMENT_WEIGHT
    return AdverseEventReport(
        drug=pair.drug,
        symptom=pair.symptom,
        onset_days=onset_days,
        severity=severity,
        causality_confidence=round(conf, 3),
        source_type=record.source_type,
    )


def reports_to_dicts(reports: list[AdverseEventReport]) -> list[dict]:
    return [
        {
            "drug": r.drug,
            "symptom": r.symptom,
            "onset_days": r.onset_days,
            "severity": r.severity,
            "causality_confidence": r.causality_confidence,
            "quality_score": r.quality_score,
            "source_type": r.source_type,
        }
        for r in reports
    ]

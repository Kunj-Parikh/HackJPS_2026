"""Quality scoring for post-filter ranking."""
from __future__ import annotations


def quality_score(
    symptom_confidence: float,
    linking_score: float,
    symptom_valid: bool,
    onset_validity: float,
) -> float:
    sv = 1.0 if symptom_valid else 0.0
    raw = (
        0.4 * symptom_confidence
        + 0.3 * linking_score
        + 0.2 * sv
        + 0.1 * onset_validity
    )
    return max(0.0, min(1.0, raw))

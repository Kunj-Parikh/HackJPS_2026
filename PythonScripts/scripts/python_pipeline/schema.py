"""Shared datatypes for the pharmacovigilance pipeline."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

SourceType = Literal["post", "comment"]


@dataclass(frozen=True)
class TextRecord:
    record_id: str
    text: str
    original_text: str
    source_type: SourceType
    drug_query: str | None = None


@dataclass
class Span:
    text: str
    start: int
    end: int


@dataclass
class DrugMention(Span):
    normalized: str = ""
    source: str = "dictionary"  # query | dictionary


@dataclass
class SymptomMention(Span):
    confidence: float = 0.0
    label: str = "DISEASE"


@dataclass
class LinkedPair:
    drug: str
    symptom: str
    linking_score: float
    symptom_confidence: float
    proximity_score: float
    sentence_idx: int = 0


@dataclass
class AdverseEventReport:
    drug: str
    symptom: str
    onset_days: int | None
    severity: int | None
    causality_confidence: float
    source_type: SourceType
    quality_score: float | None = None


@dataclass
class PipelineDebug:
    record: TextRecord
    drugs: list[DrugMention] = field(default_factory=list)
    symptoms: list[SymptomMention] = field(default_factory=list)
    linked_pairs: list[LinkedPair] = field(default_factory=list)
    onset_days: dict[tuple[str, str], int | None] = field(default_factory=dict)
    reports: list[AdverseEventReport] = field(default_factory=list)
    dropped: list[dict] = field(default_factory=list)

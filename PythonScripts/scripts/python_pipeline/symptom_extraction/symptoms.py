"""Biomedical NER + compact ADR lexicon for colloquial Reddit language."""
from __future__ import annotations

import re
from typing import Iterable

from nlp_cache import get_ner_nlp
from schema import SymptomMention, TextRecord

_SYMPTOM_LABELS = frozenset({"DISEASE", "SIGN_SYMPTOM", "CONDITION", "SYMPTOM"})

# High-frequency lay terms often missed by formal biomedical NER
_ADR_LEXICON: tuple[str, ...] = (
    "nausea", "vomiting", "constipation", "diarrhea", "hair loss", "fatigue",
    "headache", "dizziness", "pancreatitis", "gallstones", "depression",
    "anxiety", "hypoglycemia", "ulcer", "acid reflux", "heartburn",
    "brain fog", "injection site reaction", "weight regain", "loss of appetite",
)
_ADR_PAT = re.compile(
    r"\b(" + "|".join(re.escape(t) for t in _ADR_LEXICON) + r")\b", re.I
)


def _entity_confidence(ent) -> float:
    score = getattr(ent, "score", None) or getattr(ent._, "score", None)
    if score is not None:
        return float(min(1.0, max(0.0, score)))
    return min(1.0, 0.55 + 0.03 * len(ent.text.split()))


def _lexicon_symptoms(text: str) -> list[SymptomMention]:
    out: list[SymptomMention] = []
    for m in _ADR_PAT.finditer(text):
        out.append(
            SymptomMention(
                text=m.group(),
                start=m.start(),
                end=m.end(),
                confidence=0.65,
                label="LEXICON",
            )
        )
    return out


def _merge(mentions: list[SymptomMention]) -> list[SymptomMention]:
    mentions.sort(key=lambda x: x.start)
    merged: list[SymptomMention] = []
    for m in mentions:
        if merged and m.start < merged[-1].end:
            if m.confidence > merged[-1].confidence:
                merged[-1] = m
            continue
        merged.append(m)
    return merged


def symptoms_from_doc(doc) -> list[SymptomMention]:
    out: list[SymptomMention] = []
    for ent in doc.ents:
        if ent.label_ not in _SYMPTOM_LABELS:
            continue
        out.append(
            SymptomMention(
                text=ent.text,
                start=ent.start_char,
                end=ent.end_char,
                confidence=_entity_confidence(ent),
                label=ent.label_,
            )
        )
    return _merge(out + _lexicon_symptoms(doc.text))


def extract_symptoms(text: str) -> list[SymptomMention]:
    nlp = get_ner_nlp()
    return symptoms_from_doc(nlp(text[:1_000_000]))


def extract_symptoms_batch(texts: Iterable[str], batch_size: int = 32) -> list[list[SymptomMention]]:
    nlp = get_ner_nlp()
    return [symptoms_from_doc(doc) for doc in nlp.pipe(texts, batch_size=batch_size)]


def extract_symptoms_record(record: TextRecord) -> list[SymptomMention]:
    return extract_symptoms(record.text)

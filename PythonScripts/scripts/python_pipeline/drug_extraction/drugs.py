"""Lightweight drug mention detection (dictionary + drug_query)."""
from __future__ import annotations

import re

from schema import DrugMention, TextRecord

DRUG_LEXICON: dict[str, tuple[str, ...]] = {
    # GLP-1 / weight loss
    "ozempic": ("ozempic", "oze mpic"),
    "wegovy": ("wegovy",),
    "semaglutide": ("semaglutide",),
    "rybelsus": ("rybelsus",),
    "mounjaro": ("mounjaro", "zepbound"),
    "tirzepatide": ("tirzepatide",),
    "trulicity": ("trulicity", "dulaglutide"),
    "saxenda": ("saxenda", "liraglutide"),
    "victoza": ("victoza",),
    # Cardiovascular / metabolic
    "lisinopril": ("lisinopril", "zestril", "prinivil"),
    "metformin": ("metformin", "glucophage"),
    "atorvastatin": ("atorvastatin", "lipitor"),
    # Psychiatric
    "sertraline": ("sertraline", "zoloft"),
    "bupropion": ("bupropion", "wellbutrin", "zyban"),
    "lexapro": ("lexapro", "escitalopram"),
    "adderall": ("adderall", "dextroamphetamine", "amphetamine salts"),
}

_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    (canon, re.compile(r"\b" + re.escape(alias) + r"\b", re.I))
    for canon, aliases in DRUG_LEXICON.items()
    for alias in aliases
]


def _dedupe(mentions: list[DrugMention]) -> list[DrugMention]:
    seen: set[tuple[int, int, str]] = set()
    out: list[DrugMention] = []
    for m in sorted(mentions, key=lambda x: x.start):
        key = (m.start, m.end, m.normalized)
        if key not in seen:
            seen.add(key)
            out.append(m)
    return out


def extract_drugs_from_text(text: str, drug_query: str | None = None) -> list[DrugMention]:
    mentions: list[DrugMention] = []
    if drug_query:
        canon = drug_query.strip().lower()
        if canon in DRUG_LEXICON:
            for alias in DRUG_LEXICON[canon]:
                for m in re.finditer(r"\b" + re.escape(alias) + r"\b", text, re.I):
                    mentions.append(
                        DrugMention(
                            text=m.group(), start=m.start(), end=m.end(),
                            normalized=canon, source="query",
                        )
                    )
        else:
            for m in re.finditer(r"\b" + re.escape(canon) + r"\b", text, re.I):
                mentions.append(
                    DrugMention(
                        text=m.group(), start=m.start(), end=m.end(),
                        normalized=canon, source="query",
                    )
                )

    for canon, pat in _PATTERNS:
        for m in pat.finditer(text):
            mentions.append(
                DrugMention(
                    text=m.group(), start=m.start(), end=m.end(),
                    normalized=canon, source="dictionary",
                )
            )
    return _dedupe(mentions)


def extract_drugs(record: TextRecord) -> list[DrugMention]:
    mentions = extract_drugs_from_text(record.text, record.drug_query)
    if not mentions and record.drug_query:
        canon = record.drug_query.strip().lower()
        mentions.append(
            DrugMention(
                text=canon,
                start=0,
                end=min(len(canon), len(record.text)),
                normalized=canon,
                source="query_implicit",
            )
        )
    return mentions

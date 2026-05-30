"""Map generic drug names to the brand/name the user is discussing."""
from __future__ import annotations

import re

from drug_extraction.drugs import DRUG_LEXICON

KNOWN_DRUGS: frozenset[str] = frozenset(DRUG_LEXICON.keys())

_GROUPS: dict[str, frozenset[str]] = {
    "semaglutide": frozenset({"ozempic", "wegovy", "rybelsus", "semaglutide"}),
    "tirzepatide": frozenset({"mounjaro", "zepbound", "tirzepatide"}),
    "dulaglutide": frozenset({"trulicity", "dulaglutide"}),
    "liraglutide": frozenset({"saxenda", "victoza", "liraglutide"}),
    "escitalopram": frozenset({"lexapro", "escitalopram"}),
    "bupropion": frozenset({"bupropion", "wellbutrin", "zyban"}),
    "sertraline": frozenset({"sertraline", "zoloft"}),
    "atorvastatin": frozenset({"atorvastatin", "lipitor"}),
}

_DEFAULT: dict[str, str] = {
    "semaglutide": "ozempic",
    "tirzepatide": "mounjaro",
    "dulaglutide": "trulicity",
    "liraglutide": "victoza",
    "escitalopram": "lexapro",
}

_NAME_PAT = re.compile(
    r"\b(" + "|".join(re.escape(a) for aliases in DRUG_LEXICON.values() for a in aliases) + r")\b",
    re.I,
)


def _group_for(name: str) -> frozenset[str] | None:
    n = name.lower()
    for members in _GROUPS.values():
        if n in members:
            return members
    return None


def _names_in_text(text: str) -> list[str]:
    canon_by_alias = {a: c for c, aliases in DRUG_LEXICON.items() for a in aliases}
    seen: set[str] = set()
    out: list[str] = []
    for m in _NAME_PAT.finditer(text):
        c = canon_by_alias.get(m.group().lower(), m.group().lower())
        if c not in seen:
            seen.add(c)
            out.append(c)
    return out


def normalize_drug(drug: str, text: str, drug_query: str | None = None) -> str:
    d = drug.lower().strip()
    if d in KNOWN_DRUGS:
        return d

    in_text = _names_in_text(text)
    group = _group_for(d)
    if group and in_text:
        for n in in_text:
            if n in group:
                return n

    if drug_query:
        q = drug_query.lower().strip()
        if q in KNOWN_DRUGS:
            return q
        if group and q in group:
            return q

    return _DEFAULT.get(d, d if d in KNOWN_DRUGS else (drug_query or d).lower())

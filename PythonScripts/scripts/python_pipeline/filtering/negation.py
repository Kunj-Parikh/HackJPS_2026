"""Detect beneficial effects vs true ADRs; prefix negated symptom phrases."""
from __future__ import annotations

import re

_LACK_PREFIX = re.compile(
    r"\b(lack of|loss of|no|without|unable to|can't|cannot)\s+(?:\w+\s+){0,1}",
    re.I,
)

_SYM_ROOT: dict[str, str] = {
    "anxiety": "anxi", "anxious": "anxi", "depression": "depress", "depressive": "depress",
    "dizzy": "dizz", "dizziness": "dizz", "nausea": "nause", "nauseous": "nause",
    "insomnia": "sleep", "fatigue": "tired", "tired": "tired",
}


def _sym_variants(symptom: str) -> list[str]:
    s = symptom.lower().strip()
    out = [re.escape(s)]
    root = _SYM_ROOT.get(s)
    if root:
        out.append(re.escape(root) + r"\w*")
    return out


def _benefit_pattern(var: str) -> re.Pattern[str]:
    return re.compile(
        rf"\b(?:"
        rf"(?:much |significantly )?(?:less|lower|reduced|fewer)\s+(?:\w+\s+){{0,2}}{var}|"
        rf"{var}\s+(?:is|has been|was|got)\s+(?:much )?(?:better|gone|improved|lower|reduced)|"
        rf"(?:helped|helps|helping|improved|fix(?:ed)?|cured|relieved)\s+(?:my |with )?(?:\w+\s+)?{var}|"
        rf"no longer (?:have |feel |get |experience )?(?:\w+\s+)?{var}|"
        rf"{var}\s+(?:went|has gone|disappeared)\s+away|"
        rf"(?:fixed|helped with)\s+(?:my )?{var}"
        rf")\b",
        re.I,
    )


def is_beneficial_not_ade(text: str, symptom: str) -> bool:
    for var in _sym_variants(symptom):
        if _benefit_pattern(var).search(text):
            return True
    idx = text.lower().find(symptom.lower())
    if idx < 0:
        return False
    before = text[max(0, idx - 80) : idx].lower()
    return bool(re.search(r"\b(less|lower|reduced|better|improved|helped with|no longer)\s+\w*\s*$", before))


def apply_symptom_negation(text: str, symptom: str) -> str | None:
    if is_beneficial_not_ade(text, symptom):
        return None

    s = symptom.lower()
    if s.startswith(("lack of ", "loss of ", "no ", "inability to ")):
        return s

    core = s.removeprefix("lack of ").removeprefix("no ")
    idx = text.lower().find(core)
    if idx < 0:
        return symptom

    before = text[max(0, idx - 45) : idx]
    m = _LACK_PREFIX.search(before)
    if m:
        prefix = m.group().strip().lower()
        if prefix in ("can't", "cannot", "unable to"):
            return "insomnia" if "sleep" in s or s == "insomnia" else f"inability to {core}"
        if prefix == "no":
            return f"no {core}"
        if prefix == "without":
            return f"lack of {core}"
        return f"{prefix} {core}"

    return symptom

"""Normalize symptom phrases and reject low-quality spans."""
from __future__ import annotations

import re


_NORM_RULES: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\b(?:my )?hair(?:\s+is)?\s+(?:falling out|falling|shedding)\b", re.I), "hair loss"),
    (re.compile(r"\bcan'?t sleep\b|\btrouble sleeping\b|\bunable to sleep\b", re.I), "insomnia"),
    (re.compile(r"\bthrow(?:ing)? up\b|\bpuking\b", re.I), "vomiting"),
    (re.compile(r"\bfeel(?:ing)? nauseous\b|\bvery nauseous\b", re.I), "nausea"),
    (re.compile(r"\bcan'?t stop (?:vomiting|throwing up)\b", re.I), "vomiting"),
    (re.compile(r"\bbrain fog\b", re.I), "brain fog"),
    (re.compile(r"\b(?:bad|severe)\s+headache\b", re.I), "headache"),
    (re.compile(r"\b(?:very )?tired\b|\bexhausted\b", re.I), "fatigue"),
    (re.compile(r"\b(?:really )?dizzy\b|\bdizziness\b|\bgetting dizzy\b", re.I), "dizziness"),
    (re.compile(r"\bdizzy\b", re.I), "dizziness"),
    (re.compile(r"\b(?:can'?t|cannot) poop\b|\bno bowel\b", re.I), "constipation"),
    (re.compile(r"\b(?:running|liquid) stool\b", re.I), "diarrhea"),
    (re.compile(r"\bnauseas\b", re.I), "nausea"),
    (re.compile(r"\bdepressive symptoms?\b", re.I), "depression"),
    (re.compile(r"\bgallstone\b", re.I), "gallstones"),
)


_BLACKLIST_EXACT: frozenset[str] = frozenset({
    "brunch", "ozempic", "wegovy", "mounjaro", "semaglutide", "desire",
    "ozempic my desire", "hunger", "appetite", "craving", "food",
    "dose", "mg", "injection", "needle", "pen", "insurance", "cost",
    "pharmacy", "doctor", "insulin", "wl", "t2d", "t2dm", "ra", "nordisk",
})
_GARBAGE_PHRASES: tuple[str, ...] = (
    "ozempic my", "my desire", "brunch",
)

_ADJECTIVE_ONLY: frozenset[str] = frozenset({
    "mild", "severe", "bad", "worse", "terrible", "awful", "horrible",
    "slight", "minor", "major", "persistent", "constant", "chronic",
    "acute", "new", "old", "weird", "strange", "normal", "crazy",
})

_STOP = frozenset("a an the my me i it is was be have had".split())


def normalize_symptom(symptom: str) -> str:
    s = symptom.lower().strip()
    s = re.sub(r"\s+", " ", s)
    for pat, canon in _NORM_RULES:
        if pat.search(s):
            return canon
    return s


def passes_symptom_quality(symptom: str) -> bool:
    s = symptom.lower().strip()
    if len(s) < 3 or len(s) > 80:
        return False
    if s in _BLACKLIST_EXACT or any(p in s for p in _GARBAGE_PHRASES):
        return False

    if re.search(r"[^\x00-\x7f]", s) or not re.search(r"[a-z]", s):
        return False
    words = s.split()
    if len(words) == 1:
        if words[0] in _ADJECTIVE_ONLY or words[0] in _STOP:
            return False
    if len(words) >= 2:
        return True
    if not re.search(r"[aeiou]", s):
        return False
    return True

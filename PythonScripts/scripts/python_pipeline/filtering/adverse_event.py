"""Reject indications, diagnoses, and non-adverse mentions."""
from __future__ import annotations

import re


_REJECT_EXACT: frozenset[str] = frozenset({
    "diabetes", "type 2 diabetes", "type 1 diabetes", "t2d", "t1d", "t2dm",
    "t2 diabetes", "diabetes type 2", "diabetes type ii", "type ii diabetes",
    "obesity", "overweight", "hypertension", "high blood pressure",
    "adhd", "pcos", "prediabetes", "insulin resistance",
    "blood sugar", "blood glucose", "a1c", "hba1c", "glucose",
    "weight", "bmi", "cholesterol", "hyperlipidemia",
    "weight gain", "weight regain", "appetite", "appetite suppression",
    "reduced appetite", "binge eating disorder", "eating disorder",
    "cancer", "type2", "type 2", "hashimotos", "hashimoto", "hashimoto's",
    "afib", "atrial fibrillation", "fatty liver", "stroke", "fibromyalgia",
    "lactose intolerance", "mirena iud", "mirena", "monjaro", "muscle mass",
    "fullness", "psychiatric", "anhedonia",
})

_TOO_GENERIC: frozenset[str] = frozenset({
    "pain", "panic", "throat", "bleeding", "gerd", "nordisk", "wasting",
    "hypersensitivity", "hernia",
})

_REJECT_SUBSTR: tuple[str, ...] = (
    "diabet", "obesit", "overweight", "hypertens", "blood pressure",
    "blood sugar", "blood glucose", "a1c", "hba1c", "cholesterol",
    "insulin resistance", "prediabet",
)


_MED_HINT = re.compile(
    r"\b(ozempic|semaglutide|wegovy|mounjaro|metformin|insulin|rybelsus|"
    r"trulicity|saxenda|victoza|tirzepatide|mg\b|dose|dosage|injection)\b",
    re.I,
)


ADR_ALLOW: frozenset[str] = frozenset({
    "hair loss", "nausea", "vomiting", "fatigue", "insomnia", "dizziness",
    "constipation", "depression", "anxiety", "headache", "diarrhea",
    "pancreatitis", "gallstones", "hypoglycemia", "heartburn", "acid reflux",
    "brain fog", "ulcer", "seizure", "rash", "hives", "bloating",
    "muscle wasting", "corneal infection",
    "abdominal pain", "stomach pain", "cramps", "migraine",
})

_WEIGHT_LOSS = "weight loss"
_NEGATIVE_WL = re.compile(
    r"\b(regain|regained|gained back|no longer losing|stopped losing|"
    r"plateau|stall(?:ed|ing)?|not losing|unable to lose|weight gain|"
    r"gained weight|side effect.*weight|weight.*side effect)\b",
    re.I,
)


def is_valid_adverse_event(symptom: str, context: str = "") -> bool:
    s = symptom.lower().strip()
    if not s or s in _REJECT_EXACT:
        return False
    if s in ADR_ALLOW:
        return True
    if s in _TOO_GENERIC:
        return False
    if _MED_HINT.search(s):
        return False
    if any(x in s for x in _REJECT_SUBSTR):
        return False
    if s == _WEIGHT_LOSS or "weight loss" in s:
        return bool(context and _NEGATIVE_WL.search(context))
    if s in ("hunger", "appetite", "craving", "food noise"):
        return False

    if len(s.split()) == 1 and s.endswith(("itis", "osis", "emia", "pathy")):
        return False
    return True

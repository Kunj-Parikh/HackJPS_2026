"""Strict + duration-based onset extraction."""
from __future__ import annotations

import re
from dataclasses import dataclass

_NUM = r"(?P<num>\d+|one|two|three|four|five|six|seven|eight|nine|ten|a couple(?:\s+of)?|couple|about|around|approximately)"
_WORD = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "a couple": 2, "a couple of": 2, "couple": 2,
    "about": 1, "around": 1, "approximately": 1,
}
_MAX_DAYS = 365 * 5

_PATTERNS: list[re.Pattern[str]] = [
    re.compile(rf"\bafter\s+{_NUM}\s+(?P<unit>days?|weeks?|months?|years?)\b", re.I),
    re.compile(rf"\bwithin\s+(?:the\s+)?first\s+{_NUM}\s+(?P<unit>days?|weeks?|months?)\b", re.I),
    re.compile(rf"\bwithin\s+(?:the\s+)?first\s+week\b", re.I),
    re.compile(rf"\b{_NUM}\s+(?P<unit>days?|weeks?|months?|years?)\s+after\s+(?:starting|taking|beginning)\b", re.I),
    re.compile(rf"\b{_NUM}\s+weeks?\s+in\b", re.I),
    re.compile(rf"\b{_NUM}\s+(?P<unit>days?|weeks?|months?|years?)\s+later\b", re.I),
    re.compile(rf"\b(?P<num>\d+)\s*(?P<unit>d|w|wk)\b", re.I),

    re.compile(rf"\b(?:for|on|taking|been on|been taking)\s+(?:about\s+|around\s+)?{_NUM}\s+(?P<unit>days?|weeks?|months?|years?)\b", re.I),
    re.compile(rf"\b(?:for|on)\s+(?:about\s+|around\s+)?a\s+(?P<unit>day|week|month|year)\b", re.I),
    re.compile(rf"\ball up on\s+\w+\s+for\s+(?:about\s+|around\s+)?(?:a\s+)?(?P<unit>year|month|week)\b", re.I),
    re.compile(rf"\b(?:up on|on)\s+\w+\s+for\s+(?:about\s+|around\s+)?{_NUM}\s+(?P<unit>months?|weeks?|years?)\b", re.I),
    re.compile(rf"\btaking\s+(?:the\s+)?[\d.]+\s+(?:mg\s+)?(?:dosage|dose)\s+for\s+(?:about\s+)?{_NUM}\s+(?P<unit>months?|weeks?|years?)\b", re.I),
    re.compile(rf"\b(?:since|after)\s+(?:starting|beginning|commencing)\s+(?:about\s+)?{_NUM}\s+(?P<unit>months?|weeks?|years?)\b", re.I),
    re.compile(rf"\bover\s+(?:the\s+)?(?:past|last)\s+{_NUM}\s+(?P<unit>days?|weeks?|months?|years?)\b", re.I),
]

_REJECT_CTX = re.compile(
    r"\b(a1c|hba1c|blood sugar|blood glucose|glucose|mg/dl|mmol|"
    r"calibrat|reading|lost\s+\d+\s*kg|lost\s+\d+\s*lb)\b",
    re.I,
)
_CALENDAR_YEAR = re.compile(r"\b(19|20)\d{2}\b")


@dataclass(frozen=True)
class StrictOnset:
    days: int
    start: int
    end: int
    confidence: float


def _parse_num(raw: str | None) -> int:
    if not raw:
        return 1
    raw = raw.lower().strip()
    if raw.isdigit():
        return int(raw)
    return _WORD.get(raw, 1)


def _to_days(num_s: str | None, unit: str | None) -> int | None:
    n = _parse_num(num_s)
    u = (unit or "day").lower().rstrip("s")
    if u in ("d", "day"):
        return n
    if u in ("w", "wk", "week"):
        return n * 7
    if u in ("month", "mo"):
        return n * 30
    if u in ("year", "yr"):
        return n * 365
    return n


def _match_days(m: re.Match[str]) -> int | None:
    g = m.group().lower()
    if "first week" in g:
        return 7
    gd = m.groupdict()
    num = gd.get("num")
    unit = gd.get("unit")
    if not num and unit:
        return _to_days("a", unit)
    return _to_days(num, unit)


def strict_onsets(text: str) -> list[StrictOnset]:
    found: list[StrictOnset] = []
    for pat in _PATTERNS:
        for m in pat.finditer(text):
            span = m.group()
            if _CALENDAR_YEAR.search(span):
                continue
            lo = max(0, m.start() - 50)
            hi = min(len(text), m.end() + 50)
            ctx = text[lo:hi]
            if _REJECT_CTX.search(ctx):
                continue
            days = _match_days(m)
            if days is None or days < 1 or days > _MAX_DAYS:
                continue
            conf = 0.85 if "about" in span.lower() or "around" in span.lower() else 0.92
            found.append(StrictOnset(days=days, start=m.start(), end=m.end(), confidence=conf))
    found.sort(key=lambda x: x.start)
    deduped: list[StrictOnset] = []
    for o in found:
        if not deduped or o.start - deduped[-1].start > 8:
            deduped.append(o)
    return deduped


def attach_strict_onset(text: str, symptom: str, onsets: list[StrictOnset] | None = None) -> tuple[int | None, float]:
    onsets = onsets or strict_onsets(text)
    if not onsets:
        return None, 0.75

    core = symptom.lower().removeprefix("lack of ").removeprefix("no ")
    anchor = text.lower().find(core)
    anchor = anchor if anchor >= 0 else len(text) // 2


    if anchor < 80:
        early = [o for o in onsets if o.start < len(text) * 0.55]
        if early:
            best = max(early, key=lambda o: o.days)
            return best.days, best.confidence


    trig = re.search(
        rf"\b(?:noticed|started|began|getting)\b.{{0,120}}{re.escape(core)}",
        text, re.I | re.S,
    )
    if trig:
        after = [o for o in onsets if o.start <= trig.start() + 50]
        if after:
            best = max(after, key=lambda o: o.days)
            return best.days, best.confidence

    best = min(onsets, key=lambda o: abs(o.start - anchor))
    return best.days, best.confidence

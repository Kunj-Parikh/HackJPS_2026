"""Severity from full post/comment text."""
from __future__ import annotations

import re

_SEV3 = re.compile(
    r"\b(self[- ]?harm|suicidal|suicide|hospitalized|hospital admission|"
    r"emergency room|\ber\b|e\.r\.|seizure|life[- ]threatening|"
    r"anaphylaxis|icu\b|intensive care)\b",
    re.I,
)
_SEV2 = re.compile(
    r"\b("
    r"stopped (?:the )?(?:medication|dose|ozempic|semaglutide|taking)|"
    r"stop(?:ped)? taking|decided to stop|"
    r"unbearable|cannot work|can't work|couldn'?t work|"
    r"persistent(?:ly)?|worsening|getting worse|"
    r"pass(?:ed)? out|would pass out|thought i would pass out|almost pass|nearly pass|"
    r"large blood pressure drop|orthostatic|"
    r"very dizzy|extremely dizzy|so dizzy|debilitating|"
    r"couldn'?t hold down|could not eat|"
    r"interfered with|affected (?:my )?work"
    r")\b",
    re.I,
)
_SEV1 = re.compile(
    r"\b(mild|slight|slightly|manageable|minor|tolerable|annoying|"
    r"not too bad|bearable|occasionally|sometimes)\b",
    re.I,
)


def severity_score(text: str, symptom: str = "") -> int | None:
    """Scan entire text; prefer higher severity when multiple cues present."""
    t = text
    level = 0
    if _SEV3.search(t):
        level = max(level, 3)
    if _SEV2.search(t):
        level = max(level, 2)
    if _SEV1.search(t):
        level = max(level, 1)
    return level or None

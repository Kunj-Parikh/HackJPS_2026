"""Temporal extraction — strict high-precision patterns only."""
from __future__ import annotations

from filtering.onset_strict import StrictOnset, attach_strict_onset, strict_onsets
from schema import LinkedPair

OnsetMention = StrictOnset


def all_onsets(text: str) -> list[StrictOnset]:
    return strict_onsets(text)


def attach_onset(text: str, pair: LinkedPair, onsets: list[StrictOnset] | None = None) -> int | None:
    days, _ = attach_strict_onset(text, pair.symptom, onsets)
    return days

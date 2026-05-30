"""Text normalization while preserving originals."""
from __future__ import annotations

import re

_DELETED = frozenset({"[deleted]", "[removed]", "deleted", "removed"})
_WS = re.compile(r"\s+")


def is_deleted(text: str | None) -> bool:
    if text is None or (isinstance(text, float) and str(text) == "nan"):
        return True
    t = str(text).strip().lower()
    return not t or t in _DELETED


def clean_text(text: str) -> str:
    """Normalize whitespace; caller keeps original separately."""
    return _WS.sub(" ", text.strip())


def prepare_text(raw: str | None) -> tuple[str, str] | None:
    """Return (original, cleaned) or None if deleted/empty."""
    if is_deleted(raw):
        return None
    original = raw.strip()
    cleaned = clean_text(original)
    return (original, cleaned) if cleaned else None

"""Cached spaCy / scispaCy pipelines (load once)."""
from __future__ import annotations

from functools import lru_cache

import spacy
from spacy.language import Language

SCI_MODEL = "en_ner_bc5cdr_md"
SPACY_MODEL = "en_core_web_sm"


@lru_cache(maxsize=1)
def get_spacy_nlp() -> Language:
    return spacy.load(SPACY_MODEL, disable=["ner", "lemmatizer"])


@lru_cache(maxsize=1)
def get_spacy_ner_nlp() -> Language:
    """Lightweight DATE/TIME NER for onset extraction."""
    return spacy.load(SPACY_MODEL, disable=["lemmatizer"])


@lru_cache(maxsize=1)
def get_ner_nlp() -> Language:
    try:
        return spacy.load(SCI_MODEL)
    except OSError:
        nlp = spacy.load(SPACY_MODEL)
        if "ner" not in nlp.pipe_names:
            raise OSError(
                f"Install biomedical NER: pip install scispacy && "
                f"pip install {SCI_MODEL} model tarball"
            ) from None
        return nlp

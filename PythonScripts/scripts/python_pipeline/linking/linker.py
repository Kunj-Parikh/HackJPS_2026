"""Drug–symptom linking via sentence proximity and token distance."""
from __future__ import annotations

from dataclasses import dataclass

from nlp_cache import get_spacy_nlp
from schema import DrugMention, LinkedPair, SymptomMention


@dataclass
class SentenceSpan:
    text: str
    start: int
    end: int
    idx: int


def sentence_spans(text: str) -> list[SentenceSpan]:
    nlp = get_spacy_nlp()
    doc = nlp(text)
    return [SentenceSpan(s.text, s.start_char, s.end_char, i) for i, s in enumerate(doc.sents)]


def _sentence_for_char(spans: list[SentenceSpan], char: int) -> int:
    for s in spans:
        if s.start <= char < s.end:
            return s.idx
    return 0 if spans else 0


def _token_distance(text: str, a_start: int, a_end: int, b_start: int, b_end: int) -> int:
    if a_start > b_start:
        a_start, a_end, b_start, b_end = b_start, b_end, a_start, a_end
    return max(0, len(text[a_end:b_start].split()))


def _proximity(sent_dist: int, tok_dist: int) -> float:
    if sent_dist == 0:
        return 1.0
    if sent_dist == 1:
        return 0.7
    return max(0.2, 0.5 - 0.05 * tok_dist)


def _nearest_drug(
    text: str,
    sym: SymptomMention,
    drugs: list[DrugMention],
    spans: list[SentenceSpan],
    max_sent_dist: int,
) -> tuple[DrugMention, int] | None:
    sym_sent = _sentence_for_char(spans, sym.start)
    pool = [
        d for d in drugs
        if abs(_sentence_for_char(spans, d.start) - sym_sent) <= max_sent_dist
    ]
    if not pool:
        return None
    best = min(pool, key=lambda d: _token_distance(text, sym.start, sym.end, d.start, d.end))
    tok = _token_distance(text, sym.start, sym.end, best.start, best.end)
    return best, tok


def link_drug_symptoms(
    text: str,
    drugs: list[DrugMention],
    symptoms: list[SymptomMention],
) -> list[LinkedPair]:
    if not drugs or not symptoms:
        return []

    spans = sentence_spans(text)
    pairs: list[LinkedPair] = []

    for sym in symptoms:
        hit = _nearest_drug(text, sym, drugs, spans, max_sent_dist=0)
        sent_dist = 0
        if not hit:
            hit = _nearest_drug(text, sym, drugs, spans, max_sent_dist=1)
            sent_dist = 1
        if not hit:
            continue
        drug, tok_dist = hit
        link_score = 1.0 / (1.0 + tok_dist)
        pairs.append(
            LinkedPair(
                drug=drug.normalized or drug.text.lower(),
                symptom=sym.text.lower(),
                linking_score=link_score,
                symptom_confidence=sym.confidence,
                proximity_score=_proximity(sent_dist, tok_dist),
                sentence_idx=_sentence_for_char(spans, sym.start),
            )
        )
    return pairs

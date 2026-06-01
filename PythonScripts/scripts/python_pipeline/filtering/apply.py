"""Hard post-processing filter — precision over recall."""

from __future__ import annotations



from dataclasses import dataclass



from filtering.adverse_event import ADR_ALLOW, is_valid_adverse_event

from filtering.drug_normalize import KNOWN_DRUGS, normalize_drug

from filtering.negation import apply_symptom_negation

from filtering.onset_strict import attach_strict_onset, strict_onsets

from filtering.quality import quality_score

from filtering.symptom_normalize import normalize_symptom, passes_symptom_quality

from report_generation.reports import build_report, causality_confidence

from schema import AdverseEventReport, LinkedPair, TextRecord

from severity.scorer import severity_score



MIN_QUALITY = 0.5

MIN_CAUSALITY = 0.5

MIN_CAUSALITY_KNOWN_ADR = 0.45





@dataclass

class DroppedReport:

    report: dict

    drop_reason: str





def _prepare_pair(pair: LinkedPair, drug: str, symptom: str) -> LinkedPair:

    return LinkedPair(

        drug=drug,

        symptom=symptom,

        linking_score=pair.linking_score,

        symptom_confidence=pair.symptom_confidence,

        proximity_score=pair.proximity_score,

        sentence_idx=pair.sentence_idx,

    )





def _symptom_window(text: str, symptom: str, radius: int = 200) -> str:

    core = symptom.removeprefix("lack of ").removeprefix("no ").removeprefix("loss of ")

    i = text.lower().find(core.lower())

    if i < 0:

        return text[: min(len(text), 400)]

    return text[max(0, i - radius) : min(len(text), i + len(core) + radius)]





def filter_reports(

    record: TextRecord,

    pairs: list[LinkedPair],

    onsets_cache: list | None = None,

) -> tuple[list[AdverseEventReport], list[DroppedReport]]:

    text = record.text

    strict = onsets_cache if onsets_cache is not None else strict_onsets(text)

    kept: list[AdverseEventReport] = []

    dropped: list[DroppedReport] = []



    for pair in pairs:

        raw_sym = pair.symptom

        norm = normalize_symptom(raw_sym)

        norm = apply_symptom_negation(text, norm)

        if norm is None:

            dropped.append(_drop(record, pair, text, strict, norm or raw_sym, "beneficial_effect"))

            continue



        drug = normalize_drug(pair.drug, text, record.drug_query)

        query = (record.drug_query or "").lower().strip()
        query_root = query.split()[0] if query else ""
        drug_allowed = drug in KNOWN_DRUGS or (
            query
            and (
                drug == query
                or drug == query_root
                or query in drug
                or drug in query
            )
        )
        if not drug_allowed:
            dropped.append(_drop(record, pair, text, strict, norm, "invalid_drug", drug))
            continue



        pair_n = _prepare_pair(pair, drug, norm)

        ctx = _symptom_window(text, norm)



        if not is_valid_adverse_event(norm, ctx):

            dropped.append(_drop(record, pair, text, strict, norm, "invalid_symptom", drug))

            continue



        if not passes_symptom_quality(norm):

            dropped.append(_drop(record, pair, text, strict, norm, "invalid_symptom_normalization", drug))

            continue



        onset_days, onset_val = attach_strict_onset(text, norm, strict)

        sev = severity_score(text, norm)

        report = build_report(pair_n, record, onset_days, sev)

        q = quality_score(pair.symptom_confidence, pair.linking_score, True, onset_val)

        report.quality_score = round(q, 3)



        raw_c = causality_confidence(pair_n)

        min_c = MIN_CAUSALITY_KNOWN_ADR if norm.removeprefix("lack of ").removeprefix("no ") in ADR_ALLOW else MIN_CAUSALITY

        if raw_c < min_c:

            dropped.append(_drop_report(report, "low_confidence"))

            continue

        if q < MIN_QUALITY:

            dropped.append(_drop_report(report, "low_quality_score"))

            continue



        kept.append(report)



    return kept, dropped





def _drop(

    record: TextRecord,

    pair: LinkedPair,

    text: str,

    strict: list,

    symptom: str,

    reason: str,

    drug: str | None = None,

) -> DroppedReport:

    d = drug or normalize_drug(pair.drug, text, record.drug_query)

    pair_n = _prepare_pair(pair, d, symptom or pair.symptom)

    onset_days, onset_val = attach_strict_onset(text, pair_n.symptom, strict)

    r = build_report(pair_n, record, onset_days, severity_score(text, pair_n.symptom))

    r.quality_score = round(

        quality_score(pair.symptom_confidence, pair.linking_score, False, onset_val), 3

    )

    return _drop_report(r, reason)





def _drop_report(report: AdverseEventReport, reason: str) -> DroppedReport:

    return DroppedReport(report=_report_dict(report), drop_reason=reason)





def _report_dict(r: AdverseEventReport) -> dict:

    return {

        "drug": r.drug,

        "symptom": r.symptom,

        "onset_days": r.onset_days,

        "severity": r.severity,

        "causality_confidence": r.causality_confidence,

        "quality_score": getattr(r, "quality_score", None),

        "source_type": r.source_type,

    }


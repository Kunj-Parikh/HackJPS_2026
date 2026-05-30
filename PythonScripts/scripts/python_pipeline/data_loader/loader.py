"""Load Reddit CSVs from drug_data/{drug}_posts.csv and {drug}_comments.csv."""
from __future__ import annotations

from pathlib import Path

import pandas as pd

from data_loader.cleaning import is_deleted, prepare_text
from schema import TextRecord

DRUG_DATA_DIR = Path(__file__).resolve().parents[1] / "drug_data"


def _norm_drug_query(val: object, fallback: str | None = None) -> str | None:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return fallback
    s = str(val).strip()
    return s.lower() if s and not is_deleted(s) else fallback


def discover_drugs(data_dir: Path = DRUG_DATA_DIR) -> list[str]:
    return sorted(p.name[: -len("_posts.csv")] for p in data_dir.glob("*_posts.csv"))


def load_posts(drug: str, data_dir: Path = DRUG_DATA_DIR) -> pd.DataFrame:
    path = data_dir / f"{drug}_posts.csv"
    if not path.exists():
        raise FileNotFoundError(path)
    return pd.read_csv(path)


def load_comments(drug: str, data_dir: Path = DRUG_DATA_DIR) -> pd.DataFrame:
    path = data_dir / f"{drug}_comments.csv"
    if not path.exists():
        raise FileNotFoundError(path)
    return pd.read_csv(path)


def posts_to_records(df: pd.DataFrame, default_drug: str | None = None) -> list[TextRecord]:
    records: list[TextRecord] = []
    for row in df.itertuples(index=False):
        title = "" if is_deleted(getattr(row, "title", None)) else str(getattr(row, "title", "") or "")
        body = "" if is_deleted(getattr(row, "selftext", None)) else str(getattr(row, "selftext", "") or "")
        raw = f"{title}\n{body}".strip() if body else title.strip()
        prep = prepare_text(raw)
        if not prep:
            continue
        original, cleaned = prep
        records.append(
            TextRecord(
                record_id=str(row.id),
                text=cleaned,
                original_text=original,
                source_type="post",
                drug_query=_norm_drug_query(getattr(row, "drug_query", None), default_drug),
            )
        )
    return records


def comments_to_records(df: pd.DataFrame, default_drug: str | None = None) -> list[TextRecord]:
    records: list[TextRecord] = []
    for row in df.itertuples(index=False):
        prep = prepare_text(getattr(row, "body", None))
        if not prep:
            continue
        original, cleaned = prep
        records.append(
            TextRecord(
                record_id=str(row.id),
                text=cleaned,
                original_text=original,
                source_type="comment",
                drug_query=_norm_drug_query(getattr(row, "drug_query", None), default_drug),
            )
        )
    return records


def load_drug(
    drug: str, data_dir: Path = DRUG_DATA_DIR
) -> tuple[pd.DataFrame, pd.DataFrame, list[TextRecord], list[TextRecord]]:
    posts_df = load_posts(drug, data_dir)
    comments_df = load_comments(drug, data_dir)
    return (
        posts_df,
        comments_df,
        posts_to_records(posts_df, drug),
        comments_to_records(comments_df, drug),
    )


def load_all(drug: str = "ozempic", data_dir: Path = DRUG_DATA_DIR) -> tuple[pd.DataFrame, pd.DataFrame, list[TextRecord], list[TextRecord]]:
    return load_drug(drug, data_dir)

"""Load and validate the raw Kaggle credit card dataset."""
from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd

from ml.config import FEATURE_COLUMNS, RAW_DATA_PATH, TARGET_COLUMN

logger = logging.getLogger(__name__)


def load_creditcard_data(path: Path = RAW_DATA_PATH) -> tuple[pd.DataFrame, dict[str, int]]:
    """Return a de-duplicated dataframe plus row-count bookkeeping."""
    if not path.exists():
        raise FileNotFoundError(
            f"{path} not found. Run `python main.py download` or place creditcard.csv there."
        )

    df = pd.read_csv(path)
    missing = set(FEATURE_COLUMNS + [TARGET_COLUMN]) - set(df.columns)
    if missing:
        raise ValueError(f"Dataset is missing required columns: {sorted(missing)}")

    raw_rows = len(df)
    df = df.dropna(subset=FEATURE_COLUMNS + [TARGET_COLUMN])
    # Exact duplicates could land in both train and test, inflating scores.
    df = df.drop_duplicates().reset_index(drop=True)
    df[TARGET_COLUMN] = df[TARGET_COLUMN].astype(int)

    bookkeeping = {"raw_rows": raw_rows, "rows_after_cleaning": len(df), "duplicates_removed": raw_rows - len(df)}
    logger.info("Loaded %s rows (%s duplicates removed)", len(df), bookkeeping["duplicates_removed"])
    return df, bookkeeping

"""Descriptive dataset statistics for the dashboard."""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from ml.config import TARGET_COLUMN

AMOUNT_BINS = [0, 1, 10, 50, 100, 250, 500, 1000, 5000, np.inf]
AMOUNT_LABELS = ["<1", "1-10", "10-50", "50-100", "100-250", "250-500", "500-1k", "1k-5k", "5k+"]


def build_dataset_summary(df: pd.DataFrame, bookkeeping: dict[str, int]) -> dict[str, Any]:
    fraud_mask = df[TARGET_COLUMN] == 1
    fraud_cases = int(fraud_mask.sum())
    total = len(df)

    hours = (df["Time"] // 3600 % 24).astype(int)
    hourly = (
        pd.DataFrame({"hour": hours, "fraud": df[TARGET_COLUMN]})
        .groupby("hour")["fraud"]
        .agg(total="count", fraud="sum")
        .reset_index()
    )

    amount_bucket = pd.cut(df["Amount"], bins=AMOUNT_BINS, labels=AMOUNT_LABELS, right=False)
    amount_dist = (
        pd.DataFrame({"bucket": amount_bucket, "fraud": df[TARGET_COLUMN]})
        .groupby("bucket", observed=False)["fraud"]
        .agg(total="count", fraud="sum")
        .reset_index()
    )

    return {
        **bookkeeping,
        "total_transactions": total,
        "fraud_cases": fraud_cases,
        "legitimate_cases": total - fraud_cases,
        "fraud_rate": fraud_cases / total,
        "amount_stats": {
            "fraud_mean": float(df.loc[fraud_mask, "Amount"].mean()),
            "fraud_median": float(df.loc[fraud_mask, "Amount"].median()),
            "legitimate_mean": float(df.loc[~fraud_mask, "Amount"].mean()),
            "legitimate_median": float(df.loc[~fraud_mask, "Amount"].median()),
            "total_fraud_amount": float(df.loc[fraud_mask, "Amount"].sum()),
        },
        "hourly_distribution": [
            {
                "hour": int(row.hour),
                "legitimate": int(row.total - row.fraud),
                "fraud": int(row.fraud),
                "fraud_rate": float(row.fraud / row.total) if row.total else 0.0,
            }
            for row in hourly.itertuples()
        ],
        "amount_distribution": [
            {
                "bucket": str(row.bucket),
                "legitimate": int(row.total - row.fraud),
                "fraud": int(row.fraud),
                "fraud_rate": float(row.fraud / row.total) if row.total else 0.0,
            }
            for row in amount_dist.itertuples()
        ],
    }

"""Write a human-readable Markdown training report to reports/."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from ml.config import REPORTS_DIR


def write_training_report(supervised: dict[str, Any] | None, probabilistic: dict[str, Any] | None,
                          mode: str) -> None:
    lines = [
        "# Training Report",
        "",
        f"Generated: {datetime.now():%Y-%m-%d %H:%M:%S} | Mode: {mode}",
        "",
    ]
    if supervised:
        lines += [
            "## Fraud classifiers (test set, threshold 0.5)",
            "",
            "| Model | Precision | Recall | F1 | ROC-AUC | PR-AUC | Train time (s) |",
            "|---|---|---|---|---|---|---|",
        ]
        for name, r in supervised["models"].items():
            lines.append(
                f"| {name} | {r['precision']:.3f} | {r['recall']:.3f} | {r['f1']:.3f} | "
                f"{r['roc_auc']:.3f} | {r['pr_auc']:.3f} | {r['training_time_sec']:.1f} |"
            )
        svr = supervised["svr"]
        lines += [
            "",
            f"Best model by F1: **{supervised['best_model']}**",
            "",
            "## SVR - transaction amount prediction (not loss prediction)",
            "",
            f"MAE {svr['mae']:.2f} | RMSE {svr['rmse']:.2f} | R2 {svr['r2']:.3f} | R2 (log) {svr['r2_log_scale']:.3f}",
            "",
        ]
    if probabilistic:
        lines += [
            "## Probabilistic models (synthetic data)",
            "",
            f"- Bayesian network ROC-AUC: {probabilistic['bayesian_roc_auc']:.3f}",
            f"- HMM state accuracy: {probabilistic['hmm_state_accuracy']:.3f}",
            f"- HMM account-takeover F1: {probabilistic['hmm_takeover_f1']:.3f}",
            "",
        ]
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    (REPORTS_DIR / "training_report.md").write_text("\n".join(lines), encoding="utf-8")

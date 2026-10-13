"""End-to-end supervised fraud pipeline on the Kaggle credit card dataset.

raw data -> clean -> stratified split -> scale (train-fit) -> PCA/LDA/SVD study
-> undersample + SMOTE (train only) -> L1/L2 + GridSearchCV -> SVM -> RF/Bagging
-> XGBoost (RandomizedSearchCV) -> Stacking -> evaluation -> SVR amount model.
"""
from __future__ import annotations

import logging
from typing import Any

import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline

from ml.config import PROCESSED_DIR, RESULTS_DIR, TrainingConfig
from ml.dimensionality.analysis import run_dimensionality_analysis
from ml.ensembles.bagging import train_bagging, train_random_forest
from ml.ensembles.boosting import train_xgboost
from ml.ensembles.stacking import train_stacking
from ml.evaluation.metrics import evaluate_classifier
from ml.evaluation.reporting import save_json
from ml.imbalance.resampling import resample_training_data
from ml.models.linear import compare_regularization, tune_logistic_regression
from ml.models.registry import ModelRegistry
from ml.models.svm import train_linear_svm, train_rbf_svm
from ml.models.svr import train_amount_svr
from ml.preprocessing.loader import load_creditcard_data
from ml.preprocessing.splitter import DataSplit, split_and_scale
from ml.preprocessing.summary import build_dataset_summary

logger = logging.getLogger(__name__)

RISK_TIERS = [("Low", 0.0, 0.3), ("Medium", 0.3, 0.7), ("High", 0.7, 1.01)]
SAMPLES_PER_CLASS = 4


def _risk_summary(split: DataSplit, proba: np.ndarray, model_name: str) -> dict[str, Any]:
    tiers = []
    for label, low, high in RISK_TIERS:
        mask = (proba >= low) & (proba < high)
        tiers.append({"tier": label, "transactions": int(mask.sum()), "actual_fraud": int(split.y_test[mask].sum())})

    top = np.argsort(proba)[::-1][:10]
    raw = split.X_test_raw
    return {
        "model": model_name,
        "evaluated_transactions": int(len(proba)),
        "tiers": tiers,
        "top_flagged": [
            {
                "transaction_id": int(raw.index[i]),
                "amount": float(raw.iloc[i]["Amount"]),
                "hour": int(raw.iloc[i]["Time"] // 3600 % 24),
                "fraud_probability": float(proba[i]),
                "actual": "FRAUD" if split.y_test[i] == 1 else "LEGITIMATE",
            }
            for i in top
        ],
    }


def _sample_transactions(split: DataSplit, config: TrainingConfig) -> list[dict[str, Any]]:
    rng = np.random.default_rng(config.random_state)
    samples = []
    for label, name in ((1, "Fraud"), (0, "Legitimate")):
        positions = rng.choice(np.flatnonzero(split.y_test == label), size=SAMPLES_PER_CLASS, replace=False)
        for n, pos in enumerate(positions, start=1):
            row = split.X_test_raw.iloc[pos]
            samples.append(
                {
                    "id": f"{name.lower()}-{n}",
                    "label": f"{name} sample #{n} (test set)",
                    "actual_class": label,
                    "features": {k: float(v) for k, v in row.items()},
                }
            )
    return samples


def run_supervised_pipeline(config: TrainingConfig, registry: ModelRegistry) -> dict[str, Any]:
    logger.info("[1/9] Loading data")
    df, bookkeeping = load_creditcard_data()
    save_json(build_dataset_summary(df, bookkeeping), RESULTS_DIR / "dataset_summary.json")

    logger.info("[2/9] Stratified split + scaling")
    split = split_and_scale(df, config)

    logger.info("[3/9] Dimensionality reduction (PCA / LDA / SVD)")
    save_json(run_dimensionality_analysis(split, config), RESULTS_DIR / "dimensionality.json")

    logger.info("[4/9] Undersampling + SMOTE on training data only")
    resampled = resample_training_data(split.X_train, split.y_train, config)
    X_bal, y_bal = resampled.X, resampled.y
    save_json(
        {
            "stages": resampled.stages,
            "test_distribution": {
                "legitimate": int((split.y_test == 0).sum()),
                "fraud": int((split.y_test == 1).sum()),
            },
            "smote_ratio": config.smote_ratio,
            "majority_cap": config.majority_cap,
            "note": "Resampling is applied after the train/test split and only to training data.",
        },
        RESULTS_DIR / "imbalance.json",
    )
    pd.DataFrame(X_bal, columns=split.feature_names).assign(Class=y_bal).to_csv(
        PROCESSED_DIR / "train_resampled.csv.gz", index=False
    )

    searches: list[dict[str, Any]] = []
    trained: dict[str, tuple[Any, str, str, float, dict]] = {}

    logger.info("[5/9] Logistic regression: GridSearchCV over C and L1/L2")
    lr_model, lr_search, lr_time = tune_logistic_regression(X_bal, y_bal, config)
    searches.append(lr_search)
    trained["logistic_regression"] = (lr_model, "Logistic Regression", "Linear", lr_time, lr_search["best_params"])
    save_json(
        compare_regularization(X_bal, y_bal, split.X_test, split.y_test, split.feature_names,
                               lr_model.C, config),
        RESULTS_DIR / "regularization.json",
    )

    logger.info("[6/9] SVM (linear + RBF kernels)")
    svm_lin, svm_lin_search, svm_lin_time = train_linear_svm(X_bal, y_bal, config)
    svm_rbf, svm_rbf_search, svm_rbf_time = train_rbf_svm(X_bal, y_bal, config)
    searches += [svm_lin_search, svm_rbf_search]
    trained["svm_linear"] = (svm_lin, "SVM (Linear)", "SVM", svm_lin_time, svm_lin_search["best_params"])
    trained["svm_rbf"] = (svm_rbf, "SVM (RBF)", "SVM", svm_rbf_time, svm_rbf_search["best_params"])

    logger.info("[7/9] Bagging ensembles + XGBoost (RandomizedSearchCV)")
    rf, rf_params, rf_time = train_random_forest(X_bal, y_bal, config)
    bag, bag_params, bag_time = train_bagging(X_bal, y_bal, config)
    xgb, xgb_search, xgb_time = train_xgboost(X_bal, y_bal, config)
    searches.append(xgb_search)
    trained["random_forest"] = (rf, "Random Forest", "Bagging", rf_time, rf_params)
    trained["bagging"] = (bag, "Bagged Trees", "Bagging", bag_time, bag_params)
    trained["xgboost"] = (xgb, "XGBoost", "Boosting", xgb_time, xgb_search["best_params"])

    logger.info("[8/9] Stacking ensemble")
    stack, stack_params, stack_time = train_stacking(
        X_bal, y_bal, {"logistic_regression": lr_model, "random_forest": rf, "xgboost": xgb}, config
    )
    trained["stacking"] = (stack, "Stacking Ensemble", "Stacking", stack_time, stack_params)

    logger.info("[9/9] Evaluation on untouched test set + model serialisation")
    reports, probabilities = [], {}
    for key, (model, name, family, train_time, params) in trained.items():
        report, proba = evaluate_classifier(
            model, split.X_test, split.y_test, key=key, name=name, family=family,
            training_time_sec=train_time, best_params=params,
        )
        reports.append(report)
        probabilities[key] = proba
        # Bundle the train-fitted scaler so the API can score raw transactions.
        registry.register(key, name, family, Pipeline([("scaler", split.scaler), ("model", model)]))
        logger.info("  %-20s F1=%.3f ROC-AUC=%.3f PR-AUC=%.3f", name, report["f1"], report["roc_auc"], report["pr_auc"])

    best = max(reports, key=lambda r: r["f1"])
    save_json(
        {
            "test_samples": int(len(split.y_test)),
            "test_fraud_cases": int(split.y_test.sum()),
            "decision_threshold": 0.5,
            "best_model": {"key": best["key"], "name": best["name"], "f1": best["f1"], "roc_auc": best["roc_auc"]},
            "models": reports,
        },
        RESULTS_DIR / "model_metrics.json",
    )
    save_json({"searches": searches}, RESULTS_DIR / "hyperparameter_search.json")
    save_json(_risk_summary(split, probabilities[best["key"]], best["name"]), RESULTS_DIR / "risk_summary.json")
    save_json({"samples": _sample_transactions(split, config)}, RESULTS_DIR / "sample_transactions.json")

    logger.info("SVR transaction-amount model")
    svr_model, svr_results = train_amount_svr(split.X_train_raw, split.X_test_raw, config)
    registry.register("svr_amount", "SVR Amount Predictor", "SVM", svr_model, task="regression",
                      description="Predicts transaction Amount (not financial loss)")
    save_json(svr_results, RESULTS_DIR / "svr.json")

    return {"best_model": best["name"], "models": {r["name"]: r for r in reports}, "svr": svr_results["metrics"]}

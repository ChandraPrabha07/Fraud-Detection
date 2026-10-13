"""Synthetic-data pipeline: Bayesian risk network + behavioural HMM."""
from __future__ import annotations

import logging
from typing import Any

from sklearn.model_selection import train_test_split

from ml.bayesian.analysis import train_bayesian_network
from ml.bayesian.data_generator import generate_risk_dataset
from ml.config import RESULTS_DIR, SYNTHETIC_DIR, TrainingConfig
from ml.evaluation.reporting import save_json
from ml.models.registry import ModelRegistry
from ml.sequence.generator import generate_sequence_corpus
from ml.sequence.hmm_model import train_hmm

logger = logging.getLogger(__name__)

BAYESIAN_MODEL_FILE = "bayesian_network.joblib"
HMM_MODEL_FILE = "hmm_sequence.joblib"
SAMPLE_ACCOUNTS_PER_PROFILE = 4


def run_probabilistic_pipeline(config: TrainingConfig, registry: ModelRegistry) -> dict[str, Any]:
    logger.info("Bayesian network: generating synthetic risk data")
    risk_data = generate_risk_dataset(seed=config.random_state)
    risk_data.to_csv(SYNTHETIC_DIR / "bayesian_risk_data.csv", index=False)
    bn_model, bn_summary = train_bayesian_network(risk_data, config.random_state)
    registry.save_artifact(BAYESIAN_MODEL_FILE, bn_model)
    save_json(bn_summary, RESULTS_DIR / "bayesian.json")

    logger.info("HMM: generating synthetic account sequences")
    corpus = generate_sequence_corpus(seed=config.random_state)
    save_json(corpus, SYNTHETIC_DIR / "hmm_sequences.json")
    train_seqs, test_seqs = train_test_split(
        corpus, test_size=0.25, random_state=config.random_state, stratify=[s["profile"] for s in corpus]
    )
    hmm_model, hmm_summary = train_hmm(train_seqs, test_seqs, config.random_state)
    registry.save_artifact(HMM_MODEL_FILE, hmm_model)
    save_json(hmm_summary, RESULTS_DIR / "hmm.json")

    # A handful of held-out accounts for the Sequence Analysis page.
    samples = []
    for profile in ("normal", "suspicious", "takeover"):
        samples += [s for s in test_seqs if s["profile"] == profile][:SAMPLE_ACCOUNTS_PER_PROFILE]
    save_json({"accounts": samples}, SYNTHETIC_DIR / "hmm_sample_accounts.json")

    return {
        "bayesian_roc_auc": bn_summary["evaluation"]["roc_auc"],
        "hmm_state_accuracy": hmm_summary["evaluation"]["state_accuracy"],
        "hmm_takeover_f1": hmm_summary["evaluation"]["takeover_detection"]["f1"],
    }

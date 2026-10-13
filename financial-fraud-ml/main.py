"""Command-line entry point for data download and model training.

Usage:
    python main.py download            # fetch creditcard.csv into data/raw/
    python main.py train               # full pipeline (supervised + probabilistic)
    python main.py train --quick       # faster smoke-test settings
    python main.py train --only probabilistic
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time

# loky probes physical cores via `wmic`, which is absent on recent Windows builds.
os.environ.setdefault("LOKY_MAX_CPU_COUNT", str(os.cpu_count() or 1))

from ml.config import MODELS_DIR, TrainingConfig, ensure_directories
from ml.evaluation.reporting import load_json
from ml.evaluation.report_writer import write_training_report
from ml.models.registry import REGISTRY_FILENAME, ModelRegistry
from ml.preprocessing.download import download_creditcard_dataset


def _configure_logging() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s")


def _load_existing_registry(registry: ModelRegistry) -> None:
    """Keep previously trained entries when only one stage is re-run."""
    path = MODELS_DIR / REGISTRY_FILENAME
    if path.exists():
        from ml.models.registry import RegistryEntry

        registry.entries = [RegistryEntry(**e) for e in load_json(path).get("models", [])]


def command_train(args: argparse.Namespace) -> None:
    from ml.pipelines.probabilistic import run_probabilistic_pipeline
    from ml.pipelines.supervised import run_supervised_pipeline

    config = TrainingConfig.quick() if args.quick else TrainingConfig()
    registry = ModelRegistry()
    _load_existing_registry(registry)

    started = time.perf_counter()
    supervised = probabilistic = None
    if args.only in (None, "supervised"):
        download_creditcard_dataset()
        supervised = run_supervised_pipeline(config, registry)
    if args.only in (None, "probabilistic"):
        probabilistic = run_probabilistic_pipeline(config, registry)
    registry.write()
    write_training_report(supervised, probabilistic, "quick" if args.quick else "full")

    logging.info("Training finished in %.1f s", time.perf_counter() - started)
    if probabilistic:
        logging.info("Probabilistic summary: %s", json.dumps(probabilistic))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Financial fraud ML pipeline")
    sub = parser.add_subparsers(dest="command", required=True)

    download = sub.add_parser("download", help="Download creditcard.csv from Kaggle")
    download.add_argument("--force", action="store_true", help="Re-download even if the file exists")

    train = sub.add_parser("train", help="Train and evaluate all models")
    train.add_argument("--quick", action="store_true", help="Use smaller samples for a fast run")
    train.add_argument("--only", choices=["supervised", "probabilistic"], help="Run a single stage")

    args = parser.parse_args(argv)
    _configure_logging()
    ensure_directories()

    try:
        if args.command == "download":
            download_creditcard_dataset(force=args.force)
        else:
            command_train(args)
    except (FileNotFoundError, RuntimeError, ValueError) as exc:
        logging.error("%s", exc)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

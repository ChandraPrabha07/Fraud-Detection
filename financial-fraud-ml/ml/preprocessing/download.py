"""Fetch creditcard.csv from Kaggle (kagglehub) with a public mirror fallback."""
from __future__ import annotations

import logging
import shutil
import urllib.request
from pathlib import Path

from ml.config import RAW_DATA_PATH

logger = logging.getLogger(__name__)

KAGGLE_DATASET = "mlg-ulb/creditcardfraud"
# Identical copy of the Kaggle file hosted for the TensorFlow imbalanced-data tutorial.
MIRROR_URL = "https://storage.googleapis.com/download.tensorflow.org/data/creditcard.csv"


def _download_from_kaggle(destination: Path) -> bool:
    try:
        import kagglehub

        dataset_dir = Path(kagglehub.dataset_download(KAGGLE_DATASET))
        source = dataset_dir / "creditcard.csv"
        if not source.exists():
            logger.warning("kagglehub download did not contain creditcard.csv")
            return False
        shutil.copyfile(source, destination)
        return True
    except Exception as exc:  # network/auth failures should fall through to the mirror
        logger.warning("Kaggle download failed: %s", exc)
        return False


def _download_from_mirror(destination: Path) -> bool:
    try:
        urllib.request.urlretrieve(MIRROR_URL, destination)
        return True
    except Exception as exc:
        logger.warning("Mirror download failed: %s", exc)
        return False


def download_creditcard_dataset(destination: Path = RAW_DATA_PATH, force: bool = False) -> Path:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists() and not force:
        logger.info("Dataset already present at %s", destination)
        return destination

    logger.info("Downloading %s from Kaggle...", KAGGLE_DATASET)
    if _download_from_kaggle(destination) or _download_from_mirror(destination):
        logger.info("Dataset saved to %s", destination)
        return destination

    raise RuntimeError(
        "Could not download creditcard.csv. Download it manually from "
        "https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud and place it at "
        f"{destination}"
    )

"""JSON persistence and timing helpers shared by every pipeline stage."""
from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


def _to_serializable(value: Any) -> Any:
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.floating):
        return None if np.isnan(value) else float(value)
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, Path):
        return str(value)
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def save_json(data: Any, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, default=_to_serializable)
    logger.info("Saved %s", path)


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


class Timer:
    """Context manager measuring wall-clock seconds."""

    def __enter__(self) -> "Timer":
        self._start = time.perf_counter()
        self.elapsed = 0.0
        return self

    def __exit__(self, *exc: object) -> None:
        self.elapsed = round(time.perf_counter() - self._start, 3)

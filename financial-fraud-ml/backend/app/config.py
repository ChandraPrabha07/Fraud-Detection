"""Backend settings, read from environment variables (see backend/.env.example)."""
from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

DEFAULT_PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _load_dotenv(path: Path) -> None:
    """Minimal .env loader so no extra dependency is required."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def _path_from_env(name: str, default: Path) -> Path:
    value = os.getenv(name)
    return Path(value).resolve() if value else default


@dataclass(frozen=True)
class Settings:
    app_name: str = "Financial Fraud ML API"
    api_prefix: str = "/api"
    project_root: Path = field(default_factory=lambda: _path_from_env("FRAUD_PROJECT_ROOT", DEFAULT_PROJECT_ROOT))
    cors_origins: tuple[str, ...] = field(
        default_factory=lambda: tuple(
            o.strip()
            for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
            if o.strip()
        )
    )
    # Any localhost port is allowed by default so Vite falling back to 5174+ still works.
    # Set CORS_ORIGIN_REGEX to an empty string in production to rely on CORS_ORIGINS only.
    cors_origin_regex: str | None = field(
        default_factory=lambda: os.getenv("CORS_ORIGIN_REGEX", r"https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?") or None
    )
    recent_predictions_limit: int = int(os.getenv("RECENT_PREDICTIONS_LIMIT", "20"))

    @property
    def static_dir(self) -> Path | None:
        """Built frontend (Vite dist/) to serve from the API; unset in local development."""
        value = os.getenv("STATIC_DIR")
        return Path(value).resolve() if value else None

    @property
    def models_dir(self) -> Path:
        return _path_from_env("MODELS_DIR", self.project_root / "models")

    @property
    def results_dir(self) -> Path:
        return _path_from_env("RESULTS_DIR", self.project_root / "results")

    @property
    def synthetic_dir(self) -> Path:
        return _path_from_env("SYNTHETIC_DIR", self.project_root / "data" / "synthetic")


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    # Make the shared `ml` package importable (inference helpers + unpickling).
    if str(settings.project_root) not in sys.path:
        sys.path.insert(0, str(settings.project_root))
    return settings

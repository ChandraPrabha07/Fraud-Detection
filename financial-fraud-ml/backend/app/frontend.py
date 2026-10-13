"""Serve the built React dashboard from the API process (single-container deployments).

Enabled only when STATIC_DIR points at a Vite `dist/` folder; local development
keeps using the separate Vite dev server.
"""
from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


def mount_frontend(app: FastAPI, static_dir: Path, api_prefix: str) -> None:
    index = static_dir / "index.html"
    if not index.exists():
        raise RuntimeError(f"STATIC_DIR is set but {index} does not exist")

    app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")
    root = static_dir.resolve()

    # Registered last: any non-API path returns a real file if present, else the SPA shell
    # so client-side routes like /models survive a page refresh.
    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str) -> FileResponse:
        if full_path.startswith(api_prefix.strip("/") + "/"):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = (root / full_path).resolve()
        if full_path and candidate.is_file() and candidate.is_relative_to(root):
            return FileResponse(candidate)
        # Never cache the shell: it points at hashed asset names that change on every deploy.
        return FileResponse(index, headers={"Cache-Control": "no-cache"})

# Single-container image: React dashboard + FastAPI + trained models on one port.
# Works on Hugging Face Spaces (Docker SDK, port 7860) and any container host.
#   docker build -t fraud-sentinel .
#   docker run -p 7860:7860 fraud-sentinel   ->  http://localhost:7860
# Requires trained artefacts in models/, results/ and data/synthetic/ (`python main.py train`).

# ---- Stage 1: build the React dashboard ----
FROM node:20-alpine AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# Same-origin API: the dashboard calls /api on whatever host serves it.
ENV VITE_API_BASE_URL=/api
RUN npm run build

# ---- Stage 2: Python runtime ----
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    FRAUD_PROJECT_ROOT=/srv \
    STATIC_DIR=/srv/static \
    CORS_ORIGIN_REGEX= \
    PORT=7860

# Hugging Face runs containers as UID 1000.
RUN useradd --create-home --uid 1000 app
WORKDIR /srv

COPY backend/requirements.txt /tmp/requirements.txt
# xgboost-cpu is the same library without the ~300 MB CUDA dependency.
RUN sed 's/^xgboost==/xgboost-cpu==/' /tmp/requirements.txt > /tmp/requirements-cpu.txt \
 && pip install -r /tmp/requirements-cpu.txt

COPY --chown=app ml ml
COPY --chown=app backend backend
COPY --chown=app models models
COPY --chown=app results results
COPY --chown=app data/synthetic data/synthetic
COPY --from=web --chown=app /web/dist static

USER app
WORKDIR /srv/backend
EXPOSE 7860
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s CMD python -c "import urllib.request,os; urllib.request.urlopen(f'http://127.0.0.1:{os.environ[\"PORT\"]}/api/health')"
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]

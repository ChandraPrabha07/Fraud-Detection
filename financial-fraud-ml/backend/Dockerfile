# Build from the project root:  docker build -f backend/Dockerfile -t fraud-ml-api .
# Requires trained artefacts in models/, results/ and data/synthetic/ (run `python main.py train` first).
FROM python:3.12-slim

WORKDIR /srv
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 FRAUD_PROJECT_ROOT=/srv

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY ml ml
COPY backend backend
COPY models models
COPY results results
COPY data/synthetic data/synthetic

WORKDIR /srv/backend
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]

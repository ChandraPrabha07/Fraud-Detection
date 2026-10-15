---
title: Fraud Sentinel ML
emoji: 🛡️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
short_description: Fraud detection, Bayesian risk and HMM takeover detection
---

# Fraud Sentinel ML: Financial Fraud & Sequence Anomaly Detection

An end-to-end machine-learning system for credit-card fraud detection, built on the
[Kaggle Credit Card Fraud dataset](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud)
plus synthetic behavioural data. It includes:

| # | Technique | Where |
|---|-----------|-------|
| 1 | PCA, LDA and Truncated SVD dimensionality reduction | `ml/dimensionality/` |
| 2 | SMOTE class balancing (training data only) | `ml/imbalance/` |
| 3 | GridSearchCV + RandomizedSearchCV with StratifiedKFold | `ml/models/linear.py`, `ml/models/svm.py`, `ml/ensembles/boosting.py` |
| 4 | L1 / L2 regularisation comparison | `ml/models/linear.py` |
| 5 | SVM classification (linear and RBF kernels) | `ml/models/svm.py` |
| 6 | SVR for **transaction-amount** prediction (not loss prediction) | `ml/models/svr.py` |
| 7 | Random Forest, Bagging, XGBoost and Stacking ensembles | `ml/ensembles/` |
| 8 | Bayesian belief network computing P(Fraud \| Evidence) | `ml/bayesian/` |
| 9 | Hidden Markov Model for account-takeover detection | `ml/sequence/` |
| 10 | Interactive React dashboard (7 pages) | `frontend/` |

```
Frontend (React + TS + Tailwind + Recharts)
      │  fetch, VITE_API_BASE_URL
      ▼
REST API (FastAPI: routes → services → schemas)
      │  loads once at startup (joblib + JSON)
      ▼
ML artefacts (models/*.joblib, results/*.json)  ◄── python main.py train  ◄── ml/ package
```

---

## 1. Project structure

```
financial-fraud-ml/
├── frontend/                  React + TypeScript dashboard (Vite)
│   └── src/
│       ├── components/        layout/, ui/, charts/, transaction/, bayesian/, sequence/
│       ├── pages/             one file per page (7 pages)
│       ├── services/          apiClient.ts (fetch + errors), fraudApi.ts (one fn per endpoint)
│       ├── hooks/             useApi / useMutation (loading, error, reload)
│       ├── types/             api.ts mirrors backend JSON
│       ├── utils/             formatting, risk colours
│       └── App.tsx            routes (lazy-loaded)
├── backend/
│   ├── app/
│   │   ├── routes/            health, dashboard, models, predict, analysis, bayesian, sequence
│   │   ├── services/          artifact_store (loads models), prediction/bayesian/sequence/dashboard services
│   │   ├── schemas/           pydantic request/response models + validation
│   │   ├── config.py          environment-driven settings
│   │   └── main.py            FastAPI app, CORS, error handlers
│   └── requirements.txt
├── ml/
│   ├── preprocessing/         download, load/clean, split+scale, summary stats
│   ├── dimensionality/        PCA / LDA / SVD factories + comparison study
│   ├── imbalance/             undersampling + SMOTE
│   ├── models/                logistic (L1/L2), SVM, SVR, model registry
│   ├── ensembles/             random forest + bagging, XGBoost, stacking
│   ├── bayesian/              synthetic risk data, network, inference
│   ├── sequence/              synthetic sequences, HMM training, decoding
│   ├── evaluation/            metrics, curves, search summaries, reports
│   ├── pipelines/             supervised.py + probabilistic.py orchestrators
│   └── config.py              paths & hyperparameters (TrainingConfig)
├── data/{raw,processed,synthetic}/
├── models/                    *.joblib + registry.json
├── results/                   *.json consumed by the API
├── reports/training_report.md
├── notebooks/01_exploration.ipynb
├── main.py                    CLI: download / train
└── requirements.txt
```

---

## 2. Setup

Prerequisites: **Python 3.10+** (tested on 3.13) and **Node.js 18+** (tested on 24).

```bash
cd financial-fraud-ml
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

cd frontend
npm install
cp .env.example .env.local        # optional: edit VITE_API_BASE_URL
cd ..
```

### Dataset

`data/raw/creditcard.csv` is already included. To fetch it again:

```bash
python main.py download          # kagglehub first, then a public mirror as fallback
python main.py download --force  # re-download
```

`kagglehub` downloads public datasets anonymously. If you are rate-limited, add Kaggle
credentials (`~/.kaggle/kaggle.json` or the `KAGGLE_USERNAME`/`KAGGLE_KEY` env vars), or download
the file manually from Kaggle into `data/raw/`.

---

## 3. Training

```bash
python main.py train             # full pipeline (about 5 min on a modern laptop)
python main.py train --quick     # smaller samples, about 1.5 min (smoke test)
python main.py train --only probabilistic   # Bayesian network + HMM only (seconds)
python main.py train --only supervised
```

### Pipeline (leakage-safe ordering)

1. **Load and clean.** Drop NaNs and the 1,081 exact duplicate rows, so duplicates can't land in both train and test.
2. **Stratified 80/20 split.** The test set keeps the natural ~0.17% fraud rate and is never resampled.
3. **StandardScaler**, fit on the training split only.
4. **PCA / LDA / SVD study.** Each reducer is fit on training data, then SMOTE runs on the *reduced* training data, then the same logistic-regression model is evaluated on the test set.
   **LDA**: with 2 classes, LDA yields at most `n_classes − 1 = 1` component. The code computes this limit explicitly (`max_lda_components`).
5. **Resampling (training only).** Random undersampling of the majority class (cap 30k), then **SMOTE** to a 0.5 minority ratio.
6. **Logistic regression.** `GridSearchCV` over `C × {L1, L2}` with `StratifiedKFold(5)`, then a side-by-side L1 vs L2 comparison and a sparsity path.
7. **SVM.** Linear kernel (LinearSVC with calibrated probabilities) and RBF kernel (`GridSearchCV` over C and γ on a stratified subsample, since SVC is O(n²)).
8. **Random Forest and Bagged Trees.**
9. **XGBoost** with `RandomizedSearchCV` and `StratifiedKFold(3)`.
10. **Stacking.** LR + RF + XGBoost base learners with a logistic meta-learner.
11. **Evaluation.** Precision, recall, F1, ROC-AUC, PR-AUC, confusion matrix, training time, and ROC/PR curves. Accuracy is stored but never used for model selection.
12. **SVR.** Predicts `log1p(Amount)` from V1–V28. This is **transaction-amount prediction, not financial-loss prediction**.
13. **Synthetic Bayesian network.** Built over LocationMatch, DeviceKnown, LargeTransaction, UnusualTime → Fraud, using a BDeu prior and exact inference.
14. **Synthetic HMM.** Hidden states SAFE / SUSPICIOUS / COMPROMISED over 6 event types. It uses supervised MLE initialisation, then Baum-Welch refinement, keeping whichever decodes held-out accounts better.

Every classifier is saved as `Pipeline(scaler, model)` in `models/<key>.joblib` and listed in
`models/registry.json`. The API scores raw transactions and never retrains during requests.

All hyperparameters live in `ml/config.py` (`TrainingConfig`).

---

## 4. Running the application

Terminal 1, the API (from `backend/`):

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

API docs are at http://localhost:8000/docs.

Terminal 2, the dashboard (from `frontend/`):

```bash
cd frontend
npm run dev
```

Then open http://localhost:5173.

### Configuration (environment variables)

| Variable | Where | Default |
|----------|-------|---------|
| `VITE_API_BASE_URL` | `frontend/.env.local` | `http://localhost:8000/api` |
| `CORS_ORIGINS` | `backend/.env` | `http://localhost:5173,http://127.0.0.1:5173` |
| `FRAUD_PROJECT_ROOT`, `MODELS_DIR`, `RESULTS_DIR`, `SYNTHETIC_DIR` | `backend/.env` | project-relative |
| `RECENT_PREDICTIONS_LIMIT` | `backend/.env` | `20` |
| `STATIC_DIR` | container env | unset (set to the built dashboard to serve it from the API) |

No secrets are required or hard-coded.

---

## 5. REST API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health` | Loaded models, results and warnings |
| GET | `/api/dashboard/summary` | KPIs, distributions, model comparison, risk summary, live predictions |
| GET | `/api/models` | Registered models |
| GET | `/api/models/metrics` | Full metrics, confusion matrices, ROC/PR curves |
| POST | `/api/predict` | `{features: {Time, V1..V28, Amount}}` scored by every classifier, plus the SVR amount check |
| GET | `/api/predict/samples` | Held-out sample transactions for the form |
| GET | `/api/predict/recent` | Predictions made since server start |
| GET | `/api/analysis/dimensionality` | PCA/LDA/SVD comparison, 2-D projection, LDA density |
| GET | `/api/analysis/imbalance` | Class counts before/after undersampling and SMOTE |
| GET | `/api/analysis/regularization` | L1 vs L2 metrics, coefficients, sparsity path |
| GET | `/api/analysis/hyperparameter-search` | GridSearchCV / RandomizedSearchCV best params and top candidates |
| GET | `/api/analysis/svr` | SVR amount-prediction metrics and scatter |
| GET | `/api/bayesian/network` | Structure, CPT, scenarios, evaluation |
| POST | `/api/bayesian/infer` | `{LocationMatch?, DeviceKnown?, LargeTransaction?, UnusualTime?}` returns P(Fraud \| Evidence) |
| GET | `/api/sequence/model` | HMM parameters and evaluation |
| GET | `/api/sequence/samples` | Held-out synthetic accounts |
| POST | `/api/sequence/analyze` | `{observations: [...]}` returns Viterbi states, posteriors and takeover risk |
| POST | `/api/sequence/generate` | `{profile: normal\|suspicious\|takeover, length, seed?}` |

Error handling: missing artefacts return **503** with a "run `python main.py train`" message.
Invalid input returns **422** with field-level details.

---

## 6. Dashboard pages

1. **Dashboard**: totals, fraud rate, best F1/ROC-AUC, fraud by hour and amount, model comparison, risk tiers, top flagged transactions, live predictions.
2. **Transaction Analysis**: form for raw features (or load a held-out sample). Shows per-model probabilities (LR, SVM linear/RBF, RF, Bagging, XGBoost, Stacking), the ensemble verdict and SVR expected amount.
3. **Dimensionality Reduction**: metrics table, metric bars, 2-D PCA scatter, LDA density, explained variance.
4. **Model Comparison**: performance table, ROC / PR curves, F1/recall bars, confusion matrices, SVR results.
5. **SMOTE & Regularization**: class distribution per stage, L1 vs L2, sparsity path, coefficients, search results.
6. **Bayesian Risk**: interactive evidence, gauge, leave-one-out evidence impact, network diagram, scenarios, CPT.
7. **Sequence Analysis**: generate a sequence, pick a sample, or build your own. Shows the timeline, decoded states, posterior chart, current state, takeover risk, and HMM parameters.

---

## 7. Extending

- **New classifier**: train it in a module under `ml/models/` or `ml/ensembles/`, add it to the `trained` dict in
  `ml/pipelines/supervised.py`. It gets evaluated and registered automatically, and the API and UI pick it
  up from `models/registry.json`. Optionally give it a colour slot in `frontend/src/components/charts/chartTheme.ts`.
- **New page**: add a file in `frontend/src/pages/`, a route in `App.tsx` and an entry in `components/layout/navigation.ts`.
- **New endpoint**: add a router in `backend/app/routes/`, logic in `services/`, and models in `schemas/`, then include it in `main.py`.

---

## 8. Deployment

### Option A: single container (recommended; used for Hugging Face Spaces)

The root `Dockerfile` builds the React dashboard and serves it from FastAPI, so the dashboard
and API share one origin and port (7860). No CORS setup is needed.

```bash
python main.py train                       # artefacts must exist before building
docker build -t fraud-sentinel .
docker run -p 7860:7860 fraud-sentinel     # open http://localhost:7860
```

The image uses `xgboost-cpu` (the same library without CUDA) and runs as a non-root user (UID 1000).

### Deploy to Hugging Face Spaces (free CPU tier)

1. On huggingface.co: **New Space**, set **SDK = Docker** (blank template), visibility of your choice.
2. Create an access token with **write** permission (Settings, then Access Tokens).
3. From the `financial-fraud-ml/` folder:

```bash
git init -b main
git lfs install
git add .
git commit -m "Deploy Fraud Sentinel ML"
git remote add space https://huggingface.co/spaces/<your-username>/<space-name>
git push space main
```

When git asks for a password, paste the access token. The YAML block at the top of this README
configures the Space (`sdk: docker`, `app_port: 7860`). `.gitattributes` stores `*.joblib` via
Git LFS (Hugging Face rejects plain files over 10 MB). The raw dataset is not uploaded, because the
container only needs the trained models. The first build takes about 5–10 minutes. Free Spaces
sleep after inactivity and take about 30 s to wake up.

### Option B: two containers (separate API and nginx front end)

```bash
docker compose up --build            # API on :8000, dashboard on :8080
```

`backend/Dockerfile` (build context = project root) runs only the API, and `frontend/Dockerfile`
serves the static build through nginx with `VITE_API_BASE_URL` baked in. Set `CORS_ORIGINS` to the
real dashboard origin and `CORS_ORIGIN_REGEX=` (empty) in production.

### Production notes

Put the service behind HTTPS, keep the pinned model-library versions in `backend/requirements.txt`
(joblib pickles are version-sensitive), and retrain/redeploy whenever those versions change.

## 9. Notes and limitations

- The Kaggle features V1–V28 are already PCA-transformed and anonymised, so the extra PCA/SVD study shows
  the trade-off of compressing them further rather than discovering new structure.
- SMOTE makes the training prior far higher than the real one (33% vs 0.17%). This is why precision at a 0.5 threshold is
  lower than recall for several models. In production, tune the threshold on a validation set for the
  business cost of false positives vs missed fraud.
- The Bayesian network and HMM use **synthetic** data with known generating mechanisms. They show
  the methods, not real-world calibrated risk.
- The SVR predicts the *transaction amount*. It is **not** a financial-loss estimate.

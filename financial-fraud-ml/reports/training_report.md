# Training Report

Generated: 2026-10-05 17:01:42 | Mode: full

## Fraud classifiers (test set, threshold 0.5)

| Model | Precision | Recall | F1 | ROC-AUC | PR-AUC | Train time (s) |
|---|---|---|---|---|---|---|
| Logistic Regression | 0.108 | 0.874 | 0.193 | 0.965 | 0.667 | 5.6 |
| SVM (Linear) | 0.104 | 0.863 | 0.185 | 0.966 | 0.675 | 0.5 |
| SVM (RBF) | 0.101 | 0.863 | 0.181 | 0.964 | 0.609 | 2.1 |
| Random Forest | 0.691 | 0.800 | 0.741 | 0.980 | 0.757 | 5.9 |
| Bagged Trees | 0.374 | 0.800 | 0.510 | 0.950 | 0.684 | 11.2 |
| XGBoost | 0.506 | 0.821 | 0.627 | 0.973 | 0.790 | 2.0 |
| Stacking Ensemble | 0.595 | 0.821 | 0.690 | 0.962 | 0.769 | 41.2 |

Best model by F1: **Random Forest**

## SVR - transaction amount prediction (not loss prediction)

MAE 59.77 | RMSE 417.11 | R2 -2.303 | R2 (log) 0.747

## Probabilistic models (synthetic data)

- Bayesian network ROC-AUC: 0.866
- HMM state accuracy: 0.880
- HMM account-takeover F1: 0.957

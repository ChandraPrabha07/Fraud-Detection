import { get, post } from "./apiClient";
import type {
  BayesianInferenceResponse,
  BayesianNetworkSummary,
  DashboardSummary,
  DimensionalityResponse,
  Evidence,
  HealthResponse,
  HmmModelSummary,
  HyperparameterSearchResponse,
  ImbalanceResponse,
  ModelMetricsResponse,
  Observation,
  PredictionResponse,
  RegularizationResponse,
  SampleAccount,
  SampleTransaction,
  SequenceAnalysis,
  SequenceProfile,
  SvrResponse,
  TransactionFeatures,
} from "../types/api";

// One function per backend endpoint (see backend/app/routes).
export const fraudApi = {
  health: (signal?: AbortSignal) => get<HealthResponse>("/health", signal),

  dashboardSummary: (signal?: AbortSignal) => get<DashboardSummary>("/dashboard/summary", signal),
  modelMetrics: (signal?: AbortSignal) => get<ModelMetricsResponse>("/models/metrics", signal),

  predict: (features: TransactionFeatures) => post<PredictionResponse>("/predict", { features }),
  sampleTransactions: (signal?: AbortSignal) =>
    get<{ samples: SampleTransaction[] }>("/predict/samples", signal),

  dimensionality: (signal?: AbortSignal) => get<DimensionalityResponse>("/analysis/dimensionality", signal),
  imbalance: (signal?: AbortSignal) => get<ImbalanceResponse>("/analysis/imbalance", signal),
  regularization: (signal?: AbortSignal) => get<RegularizationResponse>("/analysis/regularization", signal),
  hyperparameterSearch: (signal?: AbortSignal) =>
    get<HyperparameterSearchResponse>("/analysis/hyperparameter-search", signal),
  svr: (signal?: AbortSignal) => get<SvrResponse>("/analysis/svr", signal),

  bayesianNetwork: (signal?: AbortSignal) => get<BayesianNetworkSummary>("/bayesian/network", signal),
  bayesianInfer: (evidence: Evidence) => post<BayesianInferenceResponse>("/bayesian/infer", evidence),

  hmmModel: (signal?: AbortSignal) => get<HmmModelSummary>("/sequence/model", signal),
  sequenceSamples: (signal?: AbortSignal) => get<SampleAccount[]>("/sequence/samples", signal),
  analyzeSequence: (observations: Observation[], accountId?: string) =>
    post<SequenceAnalysis>("/sequence/analyze", { observations, account_id: accountId ?? null }),
  generateSequence: (profile: SequenceProfile, length: number, seed?: number) =>
    post<SequenceAnalysis>("/sequence/generate", { profile, length, seed: seed ?? null }),
};

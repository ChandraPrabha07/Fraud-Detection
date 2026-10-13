// Types mirror the JSON produced by the backend (backend/app/schemas + results/*.json).

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type PredictionLabel = "FRAUD" | "LEGITIMATE";

export interface ConfusionMatrix {
  tn: number;
  fp: number;
  fn: number;
  tp: number;
}

export interface CoreMetrics {
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
  pr_auc: number;
}

export interface ModelMetrics extends CoreMetrics {
  key: string;
  name: string;
  family: string;
  accuracy: number;
  confusion_matrix: ConfusionMatrix;
  training_time_sec: number;
  best_params: Record<string, unknown>;
  roc_curve: { fpr: number; tpr: number }[];
  pr_curve: { recall: number; precision: number }[];
}

export interface BestModel {
  key: string;
  name: string;
  f1: number;
  roc_auc: number;
}

export interface ModelMetricsResponse {
  test_samples: number;
  test_fraud_cases: number;
  decision_threshold: number;
  best_model: BestModel;
  models: ModelMetrics[];
}

// ---- Dashboard ----------------------------------------------------------
export interface DistributionRow {
  legitimate: number;
  fraud: number;
  fraud_rate: number;
}

export interface DatasetSummary {
  raw_rows: number;
  rows_after_cleaning: number;
  duplicates_removed: number;
  total_transactions: number;
  fraud_cases: number;
  legitimate_cases: number;
  fraud_rate: number;
  amount_stats: {
    fraud_mean: number;
    fraud_median: number;
    legitimate_mean: number;
    legitimate_median: number;
    total_fraud_amount: number;
  };
  hourly_distribution: (DistributionRow & { hour: number })[];
  amount_distribution: (DistributionRow & { bucket: string })[];
}

export interface RiskSummary {
  model: string;
  evaluated_transactions: number;
  tiers: { tier: string; transactions: number; actual_fraud: number }[];
  top_flagged: {
    transaction_id: number;
    amount: number;
    hour: number;
    fraud_probability: number;
    actual: PredictionLabel;
  }[];
}

export interface RecentPrediction {
  timestamp: string;
  amount: number;
  fraud_probability: number;
  risk_level: RiskLevel;
  prediction: PredictionLabel;
}

export interface DashboardSummary {
  dataset: DatasetSummary;
  best_model: BestModel;
  model_comparison: (CoreMetrics & { key: string; name: string; family: string })[];
  risk_summary: RiskSummary | null;
  recent_predictions: RecentPrediction[];
}

// ---- Prediction ---------------------------------------------------------
export type TransactionFeatures = Record<string, number>;

export interface SampleTransaction {
  id: string;
  label: string;
  actual_class: number;
  features: TransactionFeatures;
}

export interface ModelPrediction {
  key: string;
  name: string;
  family: string;
  fraud_probability: number;
  prediction: PredictionLabel;
}

export interface PredictionResponse {
  threshold: number;
  verdict: {
    source: string;
    fraud_probability: number;
    prediction: PredictionLabel;
    risk_level: RiskLevel;
    models_flagging_fraud: number;
    models_total: number;
  };
  models: ModelPrediction[];
  amount_analysis: {
    label: string;
    entered_amount: number;
    expected_amount: number;
    deviation_ratio: number | null;
  } | null;
}

// ---- Dimensionality -----------------------------------------------------
export interface ReductionMethodResult extends CoreMetrics {
  method: string;
  components: number;
  explained_variance: number | null;
  training_time_sec: number;
  reduction_time_sec?: number;
}

export interface ExplainedVarianceRow {
  component: string;
  ratio: number;
  cumulative: number;
}

export interface DimensionalityResponse {
  classifier: string;
  original_dimensions: number;
  methods: ReductionMethodResult[];
  pca_explained_variance: ExplainedVarianceRow[];
  svd_explained_variance: ExplainedVarianceRow[];
  pca_projection: { pc1: number; pc2: number; label: number }[];
  lda_histogram: { bin: number; legitimate: number; fraud: number }[];
  notes: Record<"lda" | "pca" | "svd", string>;
}

// ---- SMOTE / regularisation / search -----------------------------------
export interface ImbalanceResponse {
  stages: { stage: string; legitimate: number; fraud: number }[];
  test_distribution: { legitimate: number; fraud: number };
  smote_ratio: number;
  majority_cap: number;
  note: string;
}

export interface RegularizationResponse {
  C: number;
  comparison: (CoreMetrics & {
    penalty: "L1" | "L2";
    non_zero_coefficients: number;
    total_coefficients: number;
    l1_norm: number;
    l2_norm: number;
    training_time_sec: number;
  })[];
  coefficients: { feature: string; l1: number; l2: number }[];
  sparsity_path: { C: number; l1_non_zero: number; l2_non_zero: number }[];
}

export type ParamValue = string | number | boolean | null;

export interface SearchSummary {
  model: string;
  search_type: "GridSearchCV" | "RandomizedSearchCV" | string;
  cv: string;
  scoring: string;
  best_params: Record<string, ParamValue>;
  best_score: number;
  n_candidates: number;
  search_time_sec: number;
  top_candidates: { rank: number; params: Record<string, ParamValue>; mean_score: number; std_score: number }[];
}

export interface HyperparameterSearchResponse {
  searches: SearchSummary[];
}

export interface SvrResponse {
  label: string;
  target: string;
  training_samples: number;
  evaluation_samples: number;
  training_time_sec: number;
  metrics: { mae: number; median_absolute_error: number; rmse: number; r2: number; r2_log_scale: number };
  search: SearchSummary;
  scatter: { actual: number; predicted: number }[];
}

// ---- Bayesian -----------------------------------------------------------
export const EVIDENCE_VARIABLES = ["LocationMatch", "DeviceKnown", "LargeTransaction", "UnusualTime"] as const;
export type EvidenceVariable = (typeof EVIDENCE_VARIABLES)[number];
export type Evidence = Partial<Record<EvidenceVariable, 0 | 1 | null>>;

export interface BayesianInferenceResponse {
  evidence: Record<string, number>;
  fraud_probability: number;
  prior_probability: number;
  lift: number | null;
  risk_level: RiskLevel;
  contributions: {
    variable: EvidenceVariable;
    value: number;
    is_risk_signal: boolean;
    probability_without: number;
    impact: number;
  }[];
}

export interface BayesianNetworkSummary {
  nodes: string[];
  edges: { source: string; target: string }[];
  training_samples: number;
  prior_fraud_probability: number;
  marginals: Record<EvidenceVariable, number>;
  evaluation: { roc_auc: number; test_samples: number; observed_fraud_rate: number };
  conditional_table: (Record<EvidenceVariable, number> & {
    fraud_probability: number;
    risk_level: RiskLevel;
    support: number;
  })[];
  scenarios: { name: string; evidence: Record<EvidenceVariable, 0 | 1>; fraud_probability: number; risk_level: RiskLevel }[];
}

// ---- Sequence / HMM ------------------------------------------------------
export const OBSERVATIONS = [
  "Normal Login",
  "Small Purchase",
  "Large Purchase",
  "New Device",
  "New Location",
  "Failed Login",
] as const;
export type Observation = (typeof OBSERVATIONS)[number];
export const HIDDEN_STATES = ["SAFE", "SUSPICIOUS", "COMPROMISED"] as const;
export type HiddenState = (typeof HIDDEN_STATES)[number];
export type SequenceProfile = "normal" | "suspicious" | "takeover";

export interface SequenceStep {
  step: number;
  observation: Observation;
  state: HiddenState;
  true_state: HiddenState | null;
  probabilities: Record<HiddenState, number>;
}

export interface SequenceAnalysis {
  account_id: string | null;
  profile: string | null;
  steps: SequenceStep[];
  current_state: HiddenState;
  current_state_confidence: number;
  takeover_risk: number;
  takeover_detected: boolean;
  risk_level: RiskLevel;
  first_compromised_step: number | null;
  log_likelihood: number;
}

export interface SampleAccount {
  account_id: string;
  profile: SequenceProfile;
  observations: Observation[];
  true_states: HiddenState[];
}

export interface HmmModelSummary {
  states: HiddenState[];
  observations: Observation[];
  estimation: string;
  training_sequences: number;
  test_sequences: number;
  start_probabilities: Record<HiddenState, number>;
  transition_matrix: (Record<HiddenState, number> & { from: HiddenState })[];
  emission_matrix: (Record<string, number | string> & { state: HiddenState })[];
  evaluation: {
    state_accuracy: number;
    per_state_recall: Record<HiddenState, number | null>;
    takeover_detection: { precision: number; recall: number; f1: number; accounts: number; true_takeovers: number };
  };
}

export interface HealthResponse {
  status: "ok" | "degraded";
  models_loaded: string[];
  results_loaded: string[];
  bayesian_network_loaded: boolean;
  hmm_loaded: boolean;
  warnings: string[];
}

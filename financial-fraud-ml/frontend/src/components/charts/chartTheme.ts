// Validated dark-mode categorical palette (CVD-safe in this fixed order).
export const SERIES_COLORS = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9"] as const;

// Colour follows the entity, not its rank: each model keeps one slot everywhere.
const MODEL_SLOT: Record<string, number> = {
  logistic_regression: 0,
  svm_linear: 1,
  svm_rbf: 2,
  random_forest: 3,
  bagging: 4,
  xgboost: 5,
  stacking: 6,
};

export const modelColor = (key: string, fallbackIndex = 0) =>
  SERIES_COLORS[MODEL_SLOT[key] ?? fallbackIndex % SERIES_COLORS.length];

/** Two-class identity colours used across every chart. */
export const CLASS_COLORS = { legitimate: SERIES_COLORS[0], fraud: SERIES_COLORS[1] } as const;

/** Reserved status colours: always paired with a text label, never used for series. */
export const STATUS_COLORS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
} as const;

export const CHART_INK = {
  primary: "#ffffff",
  secondary: "#c3c2b7",
  muted: "#898781",
  grid: "#2c2c2a",
  axis: "#383835",
  surface: "#1a1a19",
} as const;

export const axisProps = {
  stroke: CHART_INK.axis,
  tick: { fill: CHART_INK.muted, fontSize: 12 },
  tickLine: false,
} as const;

export const gridProps = { stroke: CHART_INK.grid, vertical: false } as const;

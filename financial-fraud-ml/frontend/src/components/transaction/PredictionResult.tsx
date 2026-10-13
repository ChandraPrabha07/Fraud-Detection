import type { PredictionResponse } from "../../types/api";
import { formatCurrency, formatPercent } from "../../utils/format";
import { RISK_COLOR } from "../../utils/risk";
import { modelColor } from "../charts/chartTheme";
import { ProbabilityBar } from "../ui/ProbabilityBar";
import { PredictionBadge, RiskBadge } from "../ui/StatusBadge";

export function PredictionResult({ result }: { result: PredictionResponse }) {
  const { verdict, models, amount_analysis: amount, threshold } = result;
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-line bg-page p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-ink-muted">Fraud probability · {verdict.source}</p>
            <p className="mt-1 text-4xl font-semibold text-ink">{formatPercent(verdict.fraud_probability)}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <RiskBadge level={verdict.risk_level} size="md" />
            <PredictionBadge label={verdict.prediction} />
          </div>
        </div>
        <div className="mt-4">
          <ProbabilityBar value={verdict.fraud_probability} color={RISK_COLOR[verdict.risk_level]} threshold={threshold} label="Ensemble fraud probability" />
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          {verdict.models_flagging_fraud} of {verdict.models_total} models flag this transaction (threshold {threshold}).
        </p>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">Per-model probabilities</h3>
        <ul className="space-y-3">
          {models.map((m, i) => (
            <li key={m.key} className="grid grid-cols-[minmax(0,140px)_1fr_auto] items-center gap-3">
              <span className="flex items-center gap-2 truncate text-sm text-ink-secondary">
                <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: modelColor(m.key, i) }} aria-hidden />
                {m.name}
              </span>
              <ProbabilityBar value={m.fraud_probability} color={modelColor(m.key, i)} threshold={threshold} label={m.name} />
              <PredictionBadge label={m.prediction} />
            </li>
          ))}
        </ul>
      </div>

      {amount && (
        <div className="rounded-lg border border-line bg-page p-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">Transaction amount prediction (SVR)</h3>
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-ink-muted">Entered</p>
              <p className="tabular font-semibold">{formatCurrency(amount.entered_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Expected</p>
              <p className="tabular font-semibold">{formatCurrency(amount.expected_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Ratio</p>
              <p className="tabular font-semibold">{amount.deviation_ratio ? `${amount.deviation_ratio.toFixed(2)}×` : "—"}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-ink-muted">{amount.label}</p>
        </div>
      )}
    </div>
  );
}

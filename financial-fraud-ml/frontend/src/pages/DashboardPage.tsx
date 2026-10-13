import { MetricBarChart } from "../components/charts/MetricBarChart";
import { CLASS_COLORS, SERIES_COLORS, STATUS_COLORS } from "../components/charts/chartTheme";
import { AsyncContent } from "../components/ui/AsyncContent";
import { Card } from "../components/ui/Card";
import { DataTable } from "../components/ui/DataTable";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { PredictionBadge, RiskBadge } from "../components/ui/StatusBadge";
import { EmptyState } from "../components/ui/States";
import { useApi } from "../hooks/useApi";
import { fraudApi } from "../services/fraudApi";
import type { DashboardSummary } from "../types/api";
import { formatCurrency, formatInteger, formatPercent, formatScore } from "../utils/format";

const METRIC_SERIES = [
  { key: "f1", label: "F1", color: SERIES_COLORS[0] },
  { key: "recall", label: "Recall", color: SERIES_COLORS[1] },
  { key: "pr_auc", label: "PR-AUC", color: SERIES_COLORS[2] },
];

function RiskSummaryCard({ summary }: { summary: DashboardSummary }) {
  const risk = summary.risk_summary;
  return (
    <Card title="Recent risk summary" subtitle={risk ? `${risk.model} on ${formatInteger(risk.evaluated_transactions)} held-out transactions` : undefined}>
      {!risk ? (
        <EmptyState title="No risk summary available" />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {risk.tiers.map((tier) => (
              <div key={tier.tier} className="rounded-lg border border-line bg-page p-3">
                <p className="text-xs text-ink-muted">{tier.tier} risk</p>
                <p className="tabular mt-1 text-lg font-semibold">{formatInteger(tier.transactions)}</p>
                <p className="text-[11px] text-ink-secondary">{tier.actual_fraud} actual fraud</p>
              </div>
            ))}
          </div>
          <DataTable
            dense
            rows={risk.top_flagged}
            rowKey={(r) => String(r.transaction_id)}
            columns={[
              { key: "id", header: "Txn", render: (r) => `#${r.transaction_id}` },
              { key: "amount", header: "Amount", align: "right", render: (r) => formatCurrency(r.amount) },
              { key: "hour", header: "Hour", align: "right", render: (r) => `${r.hour}:00` },
              { key: "p", header: "P(fraud)", align: "right", render: (r) => formatPercent(r.fraud_probability), highlight: () => true },
              { key: "actual", header: "Actual", render: (r) => <PredictionBadge label={r.actual} /> },
            ]}
          />
        </div>
      )}
    </Card>
  );
}

function RecentPredictionsCard({ summary }: { summary: DashboardSummary }) {
  return (
    <Card title="Live predictions this session" subtitle="Transactions scored via the Transaction Analysis page">
      <DataTable
        dense
        rows={summary.recent_predictions}
        rowKey={(r, i) => `${r.timestamp}-${i}`}
        emptyMessage="No transactions scored yet."
        columns={[
          { key: "t", header: "Time", render: (r) => new Date(r.timestamp).toLocaleTimeString() },
          { key: "a", header: "Amount", align: "right", render: (r) => formatCurrency(r.amount) },
          { key: "p", header: "P(fraud)", align: "right", render: (r) => formatPercent(r.fraud_probability) },
          { key: "r", header: "Risk", render: (r) => <RiskBadge level={r.risk_level} /> },
        ]}
      />
    </Card>
  );
}

export function DashboardPage() {
  const state = useApi(fraudApi.dashboardSummary);

  return (
    <>
      <PageHeader
        title="Fraud Intelligence Dashboard"
        description="Kaggle credit-card transactions (Sept 2013, European cardholders). Metrics are measured on an untouched, naturally imbalanced test set."
        actions={
          <button type="button" className="btn-ghost" onClick={state.reload}>
            ↻ Refresh
          </button>
        }
      />
      <AsyncContent state={state}>
        {(summary) => {
          const { dataset, best_model: best } = summary;
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <StatCard label="Total transactions" value={formatInteger(dataset.total_transactions)} hint={`${formatInteger(dataset.duplicates_removed)} duplicates removed`} />
                <StatCard label="Fraud cases" value={formatInteger(dataset.fraud_cases)} hint={`${formatCurrency(dataset.amount_stats.total_fraud_amount)} total`} accent={CLASS_COLORS.fraud} />
                <StatCard label="Fraud rate" value={formatPercent(dataset.fraud_rate, 3)} hint="Highly imbalanced" accent={STATUS_COLORS.warning} />
                <StatCard label="Best F1" value={formatScore(best.f1)} hint={best.name} accent={SERIES_COLORS[0]} />
                <StatCard label="Best model ROC-AUC" value={formatScore(best.roc_auc)} hint="Threshold-independent" accent={SERIES_COLORS[2]} />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Fraud cases by hour of day" subtitle="Derived from the Time column (seconds since first transaction)">
                  <MetricBarChart
                    data={dataset.hourly_distribution}
                    categoryKey="hour"
                    series={[{ key: "fraud", label: "Fraud cases", color: CLASS_COLORS.fraud }]}
                    height={240}
                  />
                </Card>
                <Card title="Fraud rate by transaction amount" subtitle="Share of transactions in each amount band that are fraudulent">
                  <MetricBarChart
                    data={dataset.amount_distribution}
                    categoryKey="bucket"
                    series={[{ key: "fraud_rate", label: "Fraud rate", color: CLASS_COLORS.fraud }]}
                    valueFormatter={(v) => formatPercent(v, 2)}
                    height={240}
                  />
                </Card>
              </div>

              <Card title="Model comparison" subtitle="F1, recall and PR-AUC on the held-out test set — accuracy is deliberately not shown">
                <MetricBarChart data={summary.model_comparison} categoryKey="name" series={METRIC_SERIES} domain={[0, 1]} valueFormatter={(v) => v.toFixed(2)} height={300} />
              </Card>

              <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
                <RiskSummaryCard summary={summary} />
                <RecentPredictionsCard summary={summary} />
              </div>
            </div>
          );
        }}
      </AsyncContent>
    </>
  );
}

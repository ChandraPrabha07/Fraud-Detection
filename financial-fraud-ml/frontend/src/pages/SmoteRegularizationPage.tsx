import { MetricBarChart } from "../components/charts/MetricBarChart";
import { CLASS_COLORS, SERIES_COLORS } from "../components/charts/chartTheme";
import { AsyncContent } from "../components/ui/AsyncContent";
import { Card } from "../components/ui/Card";
import { DataTable } from "../components/ui/DataTable";
import { PageHeader } from "../components/ui/PageHeader";
import { useApi } from "../hooks/useApi";
import { fraudApi } from "../services/fraudApi";
import type { ImbalanceResponse, RegularizationResponse, SearchSummary } from "../types/api";
import { formatInteger, formatParamValue, formatPercent, formatScore, formatSeconds } from "../utils/format";

const L1_COLOR = SERIES_COLORS[0];
const L2_COLOR = SERIES_COLORS[1];

function ImbalanceSection({ data }: { data: ImbalanceResponse }) {
  const rows = data.stages.map((s) => ({ ...s, fraud_share: s.fraud / (s.fraud + s.legitimate) }));
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Class distribution before / after resampling" subtitle="Training split only — the test set is never resampled">
        <MetricBarChart
          data={rows}
          categoryKey="stage"
          series={[
            { key: "legitimate", label: "Legitimate", color: CLASS_COLORS.legitimate },
            { key: "fraud", label: "Fraud", color: CLASS_COLORS.fraud },
          ]}
          valueFormatter={(v) => formatInteger(v)}
          height={260}
        />
      </Card>
      <Card title="Fraud share per stage" subtitle={`Random undersampling to ${formatInteger(data.majority_cap)} legitimate, then SMOTE to a ${data.smote_ratio} minority ratio`}>
        <DataTable
          rows={[...rows, { stage: "Test set (untouched)", ...data.test_distribution, fraud_share: data.test_distribution.fraud / (data.test_distribution.fraud + data.test_distribution.legitimate) }]}
          rowKey={(r) => r.stage}
          columns={[
            { key: "s", header: "Stage", render: (r) => r.stage, highlight: () => true },
            { key: "l", header: "Legitimate", align: "right", render: (r) => formatInteger(r.legitimate) },
            { key: "f", header: "Fraud", align: "right", render: (r) => formatInteger(r.fraud) },
            { key: "p", header: "Fraud share", align: "right", render: (r) => formatPercent(r.fraud_share, 2) },
          ]}
        />
        <p className="mt-4 text-xs text-ink-muted">{data.note}</p>
      </Card>
    </div>
  );
}

function RegularizationSection({ data }: { data: RegularizationResponse }) {
  const sortedCoefs = [...data.coefficients].sort((a, b) => Math.abs(b.l2) - Math.abs(a.l2));
  return (
    <div className="space-y-6">
      <Card title="L1 (Lasso) vs L2 (Ridge) logistic regression" subtitle={`Both fit at the grid-selected C = ${data.C}`}>
        <DataTable
          rows={data.comparison}
          rowKey={(r) => r.penalty}
          columns={[
            { key: "pen", header: "Penalty", render: (r) => r.penalty, highlight: () => true },
            { key: "nz", header: "Non-zero coefs", align: "right", render: (r) => `${r.non_zero_coefficients} / ${r.total_coefficients}` },
            { key: "p", header: "Precision", align: "right", render: (r) => formatScore(r.precision) },
            { key: "r", header: "Recall", align: "right", render: (r) => formatScore(r.recall) },
            { key: "f", header: "F1", align: "right", render: (r) => formatScore(r.f1) },
            { key: "roc", header: "ROC-AUC", align: "right", render: (r) => formatScore(r.roc_auc) },
            { key: "pr", header: "PR-AUC", align: "right", render: (r) => formatScore(r.pr_auc) },
            { key: "n", header: "‖w‖₁", align: "right", render: (r) => r.l1_norm.toFixed(2) },
            { key: "t", header: "Train time", align: "right", render: (r) => formatSeconds(r.training_time_sec) },
          ]}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Sparsity path" subtitle="Non-zero coefficients as regularisation weakens (larger C). L1 zeroes features; L2 only shrinks them.">
          <MetricBarChart
            data={data.sparsity_path.map((r) => ({ ...r, label: `C=${r.C}` }))}
            categoryKey="label"
            series={[
              { key: "l1_non_zero", label: "L1", color: L1_COLOR },
              { key: "l2_non_zero", label: "L2", color: L2_COLOR },
            ]}
            height={300}
          />
        </Card>
        <Card title="Coefficients by feature" subtitle="Sorted by L2 magnitude (standardised features)">
          <MetricBarChart
            data={sortedCoefs}
            categoryKey="feature"
            horizontal
            categoryWidth={56}
            domain={["auto", "auto"]}
            series={[
              { key: "l1", label: "L1", color: L1_COLOR },
              { key: "l2", label: "L2", color: L2_COLOR },
            ]}
            valueFormatter={(v) => v.toFixed(2)}
            height={720}
          />
        </Card>
      </div>
    </div>
  );
}

function SearchCard({ search }: { search: SearchSummary }) {
  return (
    <Card
      title={search.model}
      subtitle={`${search.search_type} · ${search.cv} · scoring: ${search.scoring}`}
      actions={<span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">{search.search_type}</span>}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(search.best_params).map(([k, v]) => (
          <span key={k} className="rounded-md border border-line-strong bg-page px-2 py-1 text-xs">
            <span className="text-ink-muted">{k}=</span>
            <span className="tabular font-medium text-ink">{formatParamValue(v)}</span>
          </span>
        ))}
      </div>
      <p className="mb-3 text-xs text-ink-secondary">
        Best CV score <span className="tabular font-semibold text-ink">{formatScore(search.best_score, 4)}</span> · {search.n_candidates} candidates · {formatSeconds(search.search_time_sec)}
      </p>
      <DataTable
        dense
        rows={search.top_candidates}
        rowKey={(r) => `${r.rank}-${JSON.stringify(r.params)}`}
        columns={[
          { key: "rank", header: "#", render: (r) => r.rank },
          { key: "params", header: "Params", render: (r) => Object.entries(r.params).map(([k, v]) => `${k}=${formatParamValue(v)}`).join(", ") },
          { key: "score", header: "Mean", align: "right", render: (r) => formatScore(r.mean_score, 4), highlight: (r) => r.rank === 1 },
          { key: "std", header: "±Std", align: "right", render: (r) => formatScore(r.std_score, 4) },
        ]}
      />
    </Card>
  );
}

export function SmoteRegularizationPage() {
  const imbalance = useApi(fraudApi.imbalance);
  const regularization = useApi(fraudApi.regularization);
  const searches = useApi(fraudApi.hyperparameterSearch);

  return (
    <>
      <PageHeader
        title="SMOTE & Regularization"
        description="How the training data is rebalanced, how L1/L2 penalties shape the linear model, and the hyperparameters chosen by stratified cross-validation."
      />
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">Class balancing</h2>
          <AsyncContent state={imbalance}>{(data) => <ImbalanceSection data={data} />}</AsyncContent>
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">Regularization</h2>
          <AsyncContent state={regularization}>{(data) => <RegularizationSection data={data} />}</AsyncContent>
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">GridSearchCV / RandomizedSearchCV</h2>
          <AsyncContent state={searches} isEmpty={(d) => d.searches.length === 0}>
            {(data) => (
              <div className="grid gap-6 xl:grid-cols-2">
                {data.searches.map((s) => (
                  <SearchCard key={s.model} search={s} />
                ))}
              </div>
            )}
          </AsyncContent>
        </section>
      </div>
    </>
  );
}

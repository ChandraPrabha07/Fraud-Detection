import { useMemo, useState } from "react";
import { ConfusionMatrixGrid } from "../components/charts/ConfusionMatrixGrid";
import { CurveChart } from "../components/charts/CurveChart";
import { MetricBarChart } from "../components/charts/MetricBarChart";
import { ScatterPlot } from "../components/charts/ScatterPlot";
import { SERIES_COLORS, modelColor } from "../components/charts/chartTheme";
import { AsyncContent } from "../components/ui/AsyncContent";
import { Card } from "../components/ui/Card";
import { DataTable } from "../components/ui/DataTable";
import { PageHeader } from "../components/ui/PageHeader";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { StatCard } from "../components/ui/StatCard";
import { useApi } from "../hooks/useApi";
import { fraudApi } from "../services/fraudApi";
import type { ModelMetrics, ModelMetricsResponse } from "../types/api";
import { formatCurrency, formatScore, formatSeconds } from "../utils/format";

function PerformanceTable({ data }: { data: ModelMetricsResponse }) {
  const bestF1 = Math.max(...data.models.map((m) => m.f1));
  return (
    <DataTable<ModelMetrics>
      rows={data.models}
      rowKey={(m) => m.key}
      columns={[
        {
          key: "name",
          header: "Model",
          render: (m) => (
            <span className="flex items-center gap-2 text-ink">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: modelColor(m.key) }} aria-hidden />
              {m.name}
              {m.f1 === bestF1 && <span className="text-[10px] text-accent">★ best F1</span>}
            </span>
          ),
        },
        { key: "family", header: "Family", render: (m) => m.family },
        { key: "p", header: "Precision", align: "right", render: (m) => formatScore(m.precision) },
        { key: "r", header: "Recall", align: "right", render: (m) => formatScore(m.recall) },
        { key: "f1", header: "F1", align: "right", render: (m) => formatScore(m.f1), highlight: (m) => m.f1 === bestF1 },
        { key: "roc", header: "ROC-AUC", align: "right", render: (m) => formatScore(m.roc_auc) },
        { key: "pr", header: "PR-AUC", align: "right", render: (m) => formatScore(m.pr_auc) },
        { key: "t", header: "Train time", align: "right", render: (m) => formatSeconds(m.training_time_sec) },
      ]}
    />
  );
}

function CurvesCard({ data }: { data: ModelMetricsResponse }) {
  const [kind, setKind] = useState<"roc" | "pr">("roc");
  const curves = useMemo(
    () =>
      data.models.map((m) => ({
        key: m.key,
        name: `${m.name} (${kind === "roc" ? m.roc_auc.toFixed(3) : m.pr_auc.toFixed(3)})`,
        color: modelColor(m.key),
        points: kind === "roc" ? m.roc_curve.map((p) => ({ x: p.fpr, y: p.tpr })) : m.pr_curve.map((p) => ({ x: p.recall, y: p.precision })),
      })),
    [data, kind],
  );
  const prevalence = data.test_fraud_cases / data.test_samples;
  return (
    <Card
      title={kind === "roc" ? "ROC curves" : "Precision-Recall curves"}
      subtitle={kind === "roc" ? "Diagonal = random classifier" : `Baseline precision = fraud prevalence (${(prevalence * 100).toFixed(2)}%) — PR is the more honest view under imbalance`}
      actions={
        <SegmentedControl
          ariaLabel="Curve type"
          value={kind}
          onChange={setKind}
          options={[
            { value: "roc", label: "ROC" },
            { value: "pr", label: "Precision-Recall" },
          ]}
        />
      }
    >
      {kind === "roc" ? (
        <CurveChart curves={curves} xLabel="False positive rate" yLabel="True positive rate" diagonal height={360} />
      ) : (
        <CurveChart curves={curves} xLabel="Recall" yLabel="Precision" baseline={prevalence} height={360} />
      )}
    </Card>
  );
}

function SvrCard() {
  const state = useApi(fraudApi.svr);
  return (
    <Card title="SVR — transaction amount prediction" subtitle="Predicts the transaction Amount from V1–V28. This is NOT a financial-loss prediction.">
      <AsyncContent state={state}>
        {(svr) => (
          <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
            <div className="grid grid-cols-2 content-start gap-3">
              <StatCard label="MAE" value={formatCurrency(svr.metrics.mae)} />
              <StatCard label="Median abs. error" value={formatCurrency(svr.metrics.median_absolute_error)} />
              <StatCard label="R² (log scale)" value={formatScore(svr.metrics.r2_log_scale)} />
              <StatCard label="R² (raw €)" value={formatScore(svr.metrics.r2)} />
              <p className="col-span-2 text-xs text-ink-muted">
                Trained on {svr.training_samples.toLocaleString()} samples (log1p target), evaluated on {svr.evaluation_samples.toLocaleString()} test transactions. Best params:{" "}
                {Object.entries(svr.search.best_params).map(([k, v]) => `${k}=${v}`).join(", ")}
              </p>
            </div>
            <ScatterPlot
              groups={[{ name: "Transactions", color: SERIES_COLORS[0], points: svr.scatter.map((p) => ({ x: p.actual, y: p.predicted })) }]}
              xLabel="Actual amount (€)"
              yLabel="Predicted amount (€)"
              identityLine
              scale="sqrt"
              valueFormatter={(v) => v.toFixed(0)}
              height={300}
            />
          </div>
        )}
      </AsyncContent>
    </Card>
  );
}

export function ModelComparisonPage() {
  const state = useApi(fraudApi.modelMetrics);
  return (
    <>
      <PageHeader
        title="Model Comparison"
        description="All classifiers trained on the same SMOTE-balanced training data and evaluated on the same untouched test set (threshold 0.5)."
      />
      <AsyncContent state={state} isEmpty={(d) => d.models.length === 0}>
        {(data) => (
          <div className="space-y-6">
            <Card title="Model performance" subtitle={`${data.test_samples.toLocaleString()} test transactions · ${data.test_fraud_cases} fraud cases`}>
              <PerformanceTable data={data} />
            </Card>
            <CurvesCard data={data} />
            <Card title="F1 vs recall" subtitle="Recall = share of fraud caught; F1 balances it against false alarms">
              <MetricBarChart
                data={data.models}
                categoryKey="name"
                series={[
                  { key: "f1", label: "F1", color: SERIES_COLORS[0] },
                  { key: "recall", label: "Recall", color: SERIES_COLORS[1] },
                  { key: "precision", label: "Precision", color: SERIES_COLORS[2] },
                ]}
                domain={[0, 1]}
                valueFormatter={(v) => v.toFixed(2)}
              />
            </Card>
            <Card title="Confusion matrices" subtitle="Cell shading is normalised within each actual class">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {data.models.map((m) => (
                  <ConfusionMatrixGrid key={m.key} title={m.name} matrix={m.confusion_matrix} color={modelColor(m.key)} />
                ))}
              </div>
            </Card>
            <SvrCard />
          </div>
        )}
      </AsyncContent>
    </>
  );
}

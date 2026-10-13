import { useMemo, useState } from "react";
import { DensityChart } from "../components/charts/DensityChart";
import { MetricBarChart } from "../components/charts/MetricBarChart";
import { ScatterPlot } from "../components/charts/ScatterPlot";
import { CLASS_COLORS, SERIES_COLORS } from "../components/charts/chartTheme";
import { AsyncContent } from "../components/ui/AsyncContent";
import { Card } from "../components/ui/Card";
import { DataTable } from "../components/ui/DataTable";
import { PageHeader } from "../components/ui/PageHeader";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { useApi } from "../hooks/useApi";
import { fraudApi } from "../services/fraudApi";
import type { DimensionalityResponse, ReductionMethodResult } from "../types/api";
import { formatPercent, formatScore, formatSeconds } from "../utils/format";

const METRIC_SERIES = [
  { key: "precision", label: "Precision", color: SERIES_COLORS[0] },
  { key: "recall", label: "Recall", color: SERIES_COLORS[1] },
  { key: "f1", label: "F1", color: SERIES_COLORS[2] },
  { key: "roc_auc", label: "ROC-AUC", color: SERIES_COLORS[3] },
];

function VarianceCard({ data }: { data: DimensionalityResponse }) {
  const [method, setMethod] = useState<"pca" | "svd">("pca");
  const rows = method === "pca" ? data.pca_explained_variance : data.svd_explained_variance;
  const cumulative = rows[rows.length - 1]?.cumulative ?? 0;
  return (
    <Card
      title="Explained variance per component"
      subtitle={`${rows.length} components retain ${formatPercent(cumulative)} of variance`}
      actions={
        <SegmentedControl
          ariaLabel="Decomposition"
          value={method}
          onChange={setMethod}
          options={[
            { value: "pca", label: "PCA" },
            { value: "svd", label: "SVD" },
          ]}
        />
      }
    >
      <MetricBarChart
        data={rows}
        categoryKey="component"
        series={[{ key: "ratio", label: "Variance ratio", color: SERIES_COLORS[0] }]}
        valueFormatter={(v) => formatPercent(v)}
        height={240}
      />
    </Card>
  );
}

export function DimensionalityPage() {
  const state = useApi(fraudApi.dimensionality);

  return (
    <>
      <PageHeader
        title="Dimensionality Reduction"
        description="PCA, LDA and Truncated SVD are fit on the training split only; SMOTE is then applied to the reduced training data and the same logistic-regression classifier is evaluated on each space."
      />
      <AsyncContent state={state}>
        {(data) => <DimensionalityContent data={data} />}
      </AsyncContent>
    </>
  );
}

function DimensionalityContent({ data }: { data: DimensionalityResponse }) {
  const projection = useMemo(
    () => [
      { name: "Legitimate (sample)", color: CLASS_COLORS.legitimate, opacity: 0.35, points: data.pca_projection.filter((p) => p.label === 0).map((p) => ({ x: p.pc1, y: p.pc2 })) },
      { name: "Fraud", color: CLASS_COLORS.fraud, opacity: 0.9, points: data.pca_projection.filter((p) => p.label === 1).map((p) => ({ x: p.pc1, y: p.pc2 })) },
    ],
    [data],
  );

  return (
    <div className="space-y-6">
      <Card title="Reduction results" subtitle={`${data.classifier} · original dimensions: ${data.original_dimensions}`}>
        <DataTable<ReductionMethodResult>
          rows={data.methods}
          rowKey={(r) => r.method}
          columns={[
            { key: "m", header: "Method", render: (r) => r.method, highlight: () => true },
            { key: "c", header: "Dimensions", align: "right", render: (r) => r.components },
            { key: "v", header: "Variance kept", align: "right", render: (r) => (r.explained_variance == null ? "n/a" : formatPercent(r.explained_variance)) },
            { key: "p", header: "Precision", align: "right", render: (r) => formatScore(r.precision) },
            { key: "r", header: "Recall", align: "right", render: (r) => formatScore(r.recall) },
            { key: "f", header: "F1", align: "right", render: (r) => formatScore(r.f1) },
            { key: "roc", header: "ROC-AUC", align: "right", render: (r) => formatScore(r.roc_auc) },
            { key: "pr", header: "PR-AUC", align: "right", render: (r) => formatScore(r.pr_auc) },
            { key: "t", header: "Train time", align: "right", render: (r) => formatSeconds(r.training_time_sec) },
          ]}
        />
        <p className="mt-3 rounded-md bg-page p-3 text-xs text-ink-secondary">
          <span className="font-semibold text-ink">LDA limitation: </span>
          {data.notes.lda}
        </p>
      </Card>

      <Card title="Metric comparison by reduction method">
        <MetricBarChart data={data.methods} categoryKey="method" series={METRIC_SERIES} domain={[0, 1]} valueFormatter={(v) => v.toFixed(2)} height={300} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="2D PCA projection" subtitle="Test set: all fraud cases plus a random sample of legitimate transactions">
          <ScatterPlot groups={projection} xLabel="PC1" yLabel="PC2" />
        </Card>
        <Card title="LDA discriminant axis" subtitle="Per-class density along the single LDA component (n_classes − 1 = 1)">
          <DensityChart
            data={data.lda_histogram}
            xKey="bin"
            xLabel="LD1"
            series={[
              { key: "legitimate", label: "Legitimate", color: CLASS_COLORS.legitimate },
              { key: "fraud", label: "Fraud", color: CLASS_COLORS.fraud },
            ]}
            height={316}
          />
        </Card>
      </div>

      <VarianceCard data={data} />
    </div>
  );
}

import { useEffect, useState } from "react";
import { EvidenceImpactList } from "../components/bayesian/EvidenceImpactList";
import { EVIDENCE_META, EvidenceSelector } from "../components/bayesian/EvidenceSelector";
import { NetworkDiagram } from "../components/bayesian/NetworkDiagram";
import { RiskGauge } from "../components/bayesian/RiskGauge";
import { MetricBarChart } from "../components/charts/MetricBarChart";
import { SERIES_COLORS } from "../components/charts/chartTheme";
import { AsyncContent } from "../components/ui/AsyncContent";
import { Card } from "../components/ui/Card";
import { DataTable } from "../components/ui/DataTable";
import { PageHeader } from "../components/ui/PageHeader";
import { ErrorState, LoadingState } from "../components/ui/States";
import { RiskBadge } from "../components/ui/StatusBadge";
import { useApi, useMutation } from "../hooks/useApi";
import { fraudApi } from "../services/fraudApi";
import type { BayesianNetworkSummary, Evidence, EvidenceVariable } from "../types/api";
import { EVIDENCE_VARIABLES } from "../types/api";
import { formatPercent, formatScore } from "../utils/format";

const INITIAL_EVIDENCE: Evidence = { LocationMatch: 1, DeviceKnown: 0, LargeTransaction: null, UnusualTime: 1 };

function describeEvidence(evidence: Record<EvidenceVariable, number>) {
  return EVIDENCE_VARIABLES.map((v) => {
    const meta = EVIDENCE_META[v];
    return `${evidence[v] === 1 ? meta.yes : meta.no}`;
  }).join(" · ");
}

function NetworkFacts({ summary, onApply }: { summary: BayesianNetworkSummary; onApply: (e: Evidence) => void }) {
  return (
    <div className="space-y-6">
      <Card title="Preset scenarios" subtitle={`Network ROC-AUC on held-out synthetic data: ${formatScore(summary.evaluation.roc_auc)}`}>
        <MetricBarChart
          data={summary.scenarios}
          categoryKey="name"
          horizontal
          categoryWidth={190}
          series={[{ key: "fraud_probability", label: "P(Fraud | evidence)", color: SERIES_COLORS[1] }]}
          domain={[0, 1]}
          valueFormatter={(v) => formatPercent(v, 0)}
          height={260}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {summary.scenarios.map((s) => (
            <button key={s.name} type="button" className="btn-ghost px-2.5 py-1 text-xs" onClick={() => onApply(s.evidence)}>
              Apply “{s.name}”
            </button>
          ))}
        </div>
      </Card>
      <Card title="Conditional probability table" subtitle="P(Fraud | all four indicators observed), learned with a BDeu prior">
        <DataTable
          dense
          rows={[...summary.conditional_table].reverse()}
          rowKey={(r) => EVIDENCE_VARIABLES.map((v) => r[v]).join("")}
          columns={[
            { key: "e", header: "Evidence", render: (r) => describeEvidence(r) },
            { key: "p", header: "P(Fraud)", align: "right", render: (r) => formatPercent(r.fraud_probability), highlight: () => true },
            { key: "r", header: "Risk", render: (r) => <RiskBadge level={r.risk_level} /> },
            { key: "n", header: "Support", align: "right", render: (r) => r.support.toLocaleString() },
          ]}
        />
      </Card>
    </div>
  );
}

export function BayesianRiskPage() {
  const [evidence, setEvidence] = useState<Evidence>(INITIAL_EVIDENCE);
  const summary = useApi(fraudApi.bayesianNetwork);
  const inference = useMutation(fraudApi.bayesianInfer);
  const { run } = inference;

  // Re-query whenever evidence changes; inference is a cheap variable-elimination call.
  useEffect(() => {
    void run(evidence);
  }, [evidence, run]);

  return (
    <>
      <PageHeader
        title="Bayesian Risk Network"
        description="A Bayesian belief network over synthetic risk indicators (the Kaggle data has no device/location fields). Toggle evidence to compute P(Fraud | Evidence) by exact variable elimination."
      />
      <div className="grid gap-6 xl:grid-cols-[2fr_3fr]">
        <Card title="Evidence">
          <EvidenceSelector evidence={evidence} onChange={setEvidence} />
          <button type="button" className="btn-ghost mt-5 w-full" onClick={() => setEvidence({})}>
            Clear all evidence
          </button>
        </Card>

        <div className="space-y-6">
          <Card title="Conditional fraud probability">
            {inference.error ? (
              <ErrorState message={inference.error} onRetry={() => void run(evidence)} />
            ) : !inference.data ? (
              <LoadingState compact label="Running inference…" />
            ) : (
              <div className="grid items-center gap-6 md:grid-cols-2">
                <div>
                  <RiskGauge probability={inference.data.fraud_probability} level={inference.data.risk_level} caption="P(Fraud | Evidence)" />
                  <p className="mt-3 text-center text-xs text-ink-muted">
                    Prior P(Fraud) {formatPercent(inference.data.prior_probability, 2)}
                    {inference.data.lift !== null && ` · ${inference.data.lift.toFixed(1)}× the base rate`}
                  </p>
                </div>
                <div>
                  <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">Evidence impact (leave-one-out)</h3>
                  <EvidenceImpactList result={inference.data} />
                </div>
              </div>
            )}
          </Card>
          <Card title="Network structure" subtitle="Outline: green = reassuring evidence, orange = risk signal, grey = unobserved">
            <NetworkDiagram evidence={evidence} />
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <AsyncContent state={summary}>{(data) => <NetworkFacts summary={data} onApply={setEvidence} />}</AsyncContent>
      </div>
    </>
  );
}

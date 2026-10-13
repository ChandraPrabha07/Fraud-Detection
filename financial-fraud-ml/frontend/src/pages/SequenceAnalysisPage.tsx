import { useCallback, useState } from "react";
import { ObservationTimeline } from "../components/sequence/ObservationTimeline";
import { SequenceBuilder } from "../components/sequence/SequenceBuilder";
import { StateProbabilityChart } from "../components/sequence/StateProbabilityChart";
import { AsyncContent } from "../components/ui/AsyncContent";
import { Card } from "../components/ui/Card";
import { DataTable } from "../components/ui/DataTable";
import { PageHeader } from "../components/ui/PageHeader";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { StatCard } from "../components/ui/StatCard";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { RiskBadge, StateBadge } from "../components/ui/StatusBadge";
import { useApi } from "../hooks/useApi";
import { fraudApi } from "../services/fraudApi";
import type { HmmModelSummary, Observation, SequenceAnalysis, SequenceProfile } from "../types/api";
import { HIDDEN_STATES } from "../types/api";
import { formatPercent, formatScore } from "../utils/format";
import { RISK_COLOR, STATE_COLOR } from "../utils/risk";

type Source = "sample" | "generate" | "custom";

function AnalysisResult({ analysis }: { analysis: SequenceAnalysis }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Current state" value={<StateBadge state={analysis.current_state} size="md" />} hint={`Confidence ${formatPercent(analysis.current_state_confidence)}`} accent={STATE_COLOR[analysis.current_state]} />
        <StatCard label="Takeover risk" value={formatPercent(analysis.takeover_risk)} hint={<RiskBadge level={analysis.risk_level} />} accent={RISK_COLOR[analysis.risk_level]} />
        <StatCard label="Takeover detected" value={analysis.takeover_detected ? "✕ Yes" : "✓ No"} hint="Risk ≥ 50% over recent steps" />
        <StatCard label="First compromised step" value={analysis.first_compromised_step ?? "—"} hint={`${analysis.steps.length} events · log-lik ${analysis.log_likelihood.toFixed(1)}`} />
      </div>
      <Card title="Observation timeline" subtitle={`${analysis.account_id ?? "Custom sequence"}${analysis.profile ? ` · generated profile: ${analysis.profile}` : ""} — Viterbi-decoded hidden state under each event`}>
        <ObservationTimeline steps={analysis.steps} />
      </Card>
      <Card title="Hidden-state posterior per step" subtitle="P(state | full sequence) from the forward-backward algorithm">
        <StateProbabilityChart steps={analysis.steps} />
      </Card>
    </div>
  );
}

function HmmModelCard({ model }: { model: HmmModelSummary }) {
  const ev = model.evaluation;
  return (
    <Card title="HMM model" subtitle={`CategoricalHMM · ${model.estimation} · ${model.training_sequences} training / ${model.test_sequences} test accounts`}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid grid-cols-2 content-start gap-3">
          <StatCard label="State accuracy" value={formatPercent(ev.state_accuracy)} />
          <StatCard label="Takeover F1" value={formatScore(ev.takeover_detection.f1)} />
          <StatCard label="Takeover precision" value={formatScore(ev.takeover_detection.precision)} />
          <StatCard label="Takeover recall" value={formatScore(ev.takeover_detection.recall)} />
        </div>
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">Transition matrix</h3>
          <DataTable
            dense
            rows={model.transition_matrix}
            rowKey={(r) => r.from}
            columns={[
              { key: "from", header: "From \\ To", render: (r) => <StateBadge state={r.from} /> },
              ...HIDDEN_STATES.map((s) => ({ key: s, header: s, align: "right" as const, render: (r: (typeof model.transition_matrix)[number]) => r[s].toFixed(3) })),
            ]}
          />
        </div>
      </div>
    </Card>
  );
}

export function SequenceAnalysisPage() {
  const [source, setSource] = useState<Source>("generate");
  const [profile, setProfile] = useState<SequenceProfile>("takeover");
  const [length, setLength] = useState(25);
  const [sampleId, setSampleId] = useState("");
  const [custom, setCustom] = useState<Observation[]>(["Normal Login", "Small Purchase", "Failed Login", "Failed Login", "New Device", "New Location", "Large Purchase", "Large Purchase"]);
  const [analysis, setAnalysis] = useState<SequenceAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const samples = useApi(fraudApi.sequenceSamples);
  const model = useApi(fraudApi.hmmModel);

  const execute = useCallback(async (task: () => Promise<SequenceAnalysis>) => {
    setBusy(true);
    setError(null);
    try {
      setAnalysis(await task());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  }, []);

  const analyzeSample = (id: string) => {
    setSampleId(id);
    const account = samples.data?.find((a) => a.account_id === id);
    if (!account) return;
    void execute(async () => {
      const result = await fraudApi.analyzeSequence(account.observations, account.account_id);
      // Attach ground truth so mis-decoded steps can be highlighted.
      return {
        ...result,
        profile: account.profile,
        steps: result.steps.map((s, i) => ({ ...s, true_state: account.true_states[i] ?? null })),
      };
    });
  };

  const lengthValid = Number.isInteger(length) && length >= 5 && length <= 60;

  return (
    <>
      <PageHeader
        title="Sequence Analysis"
        description="A hidden Markov model infers SAFE / SUSPICIOUS / COMPROMISED behavioural states from a stream of account events to flag possible account takeover. Sequences are synthetic."
      />
      <div className="grid gap-6 xl:grid-cols-[2fr_5fr]">
        <Card
          title="Account sequence"
          actions={
            <SegmentedControl<Source>
              ariaLabel="Sequence source"
              value={source}
              onChange={setSource}
              options={[
                { value: "generate", label: "Generate" },
                { value: "sample", label: "Samples" },
                { value: "custom", label: "Custom" },
              ]}
            />
          }
        >
          {source === "generate" && (
            <div className="space-y-4">
              <div>
                <p className="mb-1.5 text-xs text-ink-muted">Behaviour profile</p>
                <SegmentedControl<SequenceProfile>
                  ariaLabel="Profile"
                  value={profile}
                  onChange={setProfile}
                  options={[
                    { value: "normal", label: "Normal" },
                    { value: "suspicious", label: "Suspicious" },
                    { value: "takeover", label: "Takeover" },
                  ]}
                />
              </div>
              <label className="block">
                <span className="mb-1 block text-xs text-ink-muted">Sequence length (5–60)</span>
                <input type="number" min={5} max={60} className="input-field" value={length} onChange={(e) => setLength(Number(e.target.value))} />
                {!lengthValid && <span className="text-[11px] text-status-critical">Enter a whole number between 5 and 60</span>}
              </label>
              <button type="button" className="btn-primary w-full" disabled={busy || !lengthValid} onClick={() => void execute(() => fraudApi.generateSequence(profile, length))}>
                {busy ? "Generating…" : "Generate & analyze"}
              </button>
            </div>
          )}

          {source === "sample" && (
            <AsyncContent state={samples} isEmpty={(d) => d.length === 0} emptyTitle="No sample accounts">
              {(accounts) => (
                <label className="block">
                  <span className="mb-1 block text-xs text-ink-muted">Held-out synthetic accounts</span>
                  <select className="input-field" value={sampleId} onChange={(e) => analyzeSample(e.target.value)}>
                    <option value="" disabled>
                      Choose an account…
                    </option>
                    {accounts.map((a) => (
                      <option key={a.account_id} value={a.account_id}>
                        {a.account_id} · {a.profile} · {a.observations.length} events
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </AsyncContent>
          )}

          {source === "custom" && (
            <SequenceBuilder events={custom} onChange={setCustom} busy={busy} onAnalyze={() => void execute(() => fraudApi.analyzeSequence(custom))} />
          )}
        </Card>

        <div className="min-w-0">
          {busy ? (
            <Card title="Analyzing">
              <LoadingState label="Decoding hidden states…" />
            </Card>
          ) : error ? (
            <ErrorState message={error} />
          ) : analysis ? (
            <AnalysisResult analysis={analysis} />
          ) : (
            <Card title="Results">
              <EmptyState title="No sequence analyzed yet">Generate a sequence, pick a sample account, or build your own.</EmptyState>
            </Card>
          )}
        </div>
      </div>

      <div className="mt-6">
        <AsyncContent state={model}>{(m) => <HmmModelCard model={m} />}</AsyncContent>
      </div>
    </>
  );
}

import type { BayesianInferenceResponse } from "../../types/api";
import { EmptyState } from "../ui/States";
import { EVIDENCE_META } from "./EvidenceSelector";

// Diverging pair: warm raises risk, cool lowers it.
const RAISES = "#e66767";
const LOWERS = "#3987e5";

/** Leave-one-out impact of each observed variable on P(Fraud | evidence). */
export function EvidenceImpactList({ result }: { result: BayesianInferenceResponse }) {
  if (!result.contributions.length) {
    return <EmptyState title="No evidence observed">Set at least one variable to see its impact.</EmptyState>;
  }
  const maxImpact = Math.max(...result.contributions.map((c) => Math.abs(c.impact)), 0.01);

  return (
    <ul className="space-y-3">
      {result.contributions.map((c) => {
        const meta = EVIDENCE_META[c.variable];
        const width = (Math.abs(c.impact) / maxImpact) * 50;
        const positive = c.impact >= 0;
        return (
          <li key={c.variable}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-ink-secondary">
                {meta.label}: <span className="text-ink">{c.value === 1 ? meta.yes : meta.no}</span>
              </span>
              <span className="tabular font-medium text-ink">
                {positive ? "▲ +" : "▼ "}
                {(c.impact * 100).toFixed(1)} pts
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-line">
              <span className="absolute inset-y-0 left-1/2 w-px bg-line-strong" aria-hidden />
              <span
                className="absolute inset-y-0 rounded-full"
                style={{
                  backgroundColor: positive ? RAISES : LOWERS,
                  width: `${width}%`,
                  left: positive ? "50%" : `${50 - width}%`,
                }}
              />
            </div>
          </li>
        );
      })}
      <li className="flex gap-4 pt-1 text-[11px] text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: RAISES }} /> raises fraud probability
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: LOWERS }} /> lowers fraud probability
        </span>
      </li>
    </ul>
  );
}

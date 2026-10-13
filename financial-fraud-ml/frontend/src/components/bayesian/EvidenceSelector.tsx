import type { Evidence, EvidenceVariable } from "../../types/api";
import { EVIDENCE_VARIABLES } from "../../types/api";

export const EVIDENCE_META: Record<EvidenceVariable, { label: string; yes: string; no: string; riskyValue: 0 | 1 }> = {
  LocationMatch: { label: "Location matches profile", yes: "Match", no: "Mismatch", riskyValue: 0 },
  DeviceKnown: { label: "Device recognised", yes: "Known", no: "New device", riskyValue: 0 },
  LargeTransaction: { label: "Large transaction", yes: "Large", no: "Normal", riskyValue: 1 },
  UnusualTime: { label: "Unusual time of day", yes: "Unusual", no: "Usual", riskyValue: 1 },
};

type Choice = "unknown" | "1" | "0";

interface EvidenceSelectorProps {
  evidence: Evidence;
  onChange: (evidence: Evidence) => void;
}

export function EvidenceSelector({ evidence, onChange }: EvidenceSelectorProps) {
  const setValue = (variable: EvidenceVariable, choice: Choice) =>
    onChange({ ...evidence, [variable]: choice === "unknown" ? null : (Number(choice) as 0 | 1) });

  return (
    <div className="space-y-4">
      {EVIDENCE_VARIABLES.map((variable) => {
        const meta = EVIDENCE_META[variable];
        const current = evidence[variable];
        const choice: Choice = current === null || current === undefined ? "unknown" : (String(current) as Choice);
        const options: { value: Choice; label: string; risky?: boolean }[] = [
          { value: "unknown", label: "Unobserved" },
          { value: "1", label: meta.yes, risky: meta.riskyValue === 1 },
          { value: "0", label: meta.no, risky: meta.riskyValue === 0 },
        ];
        return (
          <div key={variable}>
            <p className="mb-1.5 text-sm text-ink">{meta.label}</p>
            <div role="radiogroup" aria-label={meta.label} className="grid grid-cols-3 gap-1.5">
              {options.map((opt) => {
                const active = opt.value === choice;
                const activeStyle = opt.risky
                  ? "border-status-serious/70 bg-status-serious/15 text-ink"
                  : opt.value === "unknown"
                    ? "border-line-strong bg-surface-hover text-ink"
                    : "border-status-good/70 bg-status-good/15 text-ink";
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setValue(variable, opt.value)}
                    className={`rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                      active ? activeStyle : "border-line text-ink-muted hover:border-line-strong hover:text-ink-secondary"
                    }`}
                  >
                    {opt.risky && <span aria-hidden>▲ </span>}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import type { Observation, SequenceStep } from "../../types/api";
import { STATE_COLOR, STATE_ICON } from "../../utils/risk";

export const OBSERVATION_ICON: Record<Observation, string> = {
  "Normal Login": "⏎",
  "Small Purchase": "€",
  "Large Purchase": "€€",
  "New Device": "▣",
  "New Location": "⌖",
  "Failed Login": "⨯",
};

/** Horizontal scrolling timeline: one card per event with its decoded hidden state. */
export function ObservationTimeline({ steps }: { steps: SequenceStep[] }) {
  return (
    <div className="overflow-x-auto pb-2">
      <ol className="flex min-w-max gap-1.5">
        {steps.map((step) => {
          const color = STATE_COLOR[step.state];
          const mismatch = step.true_state && step.true_state !== step.state;
          return (
            <li
              key={step.step}
              className="w-[76px] rounded-md border bg-page p-2 text-center"
              style={{ borderColor: `${color}80` }}
              title={`Step ${step.step}: ${step.observation} → ${step.state}${step.true_state ? ` (true: ${step.true_state})` : ""}`}
            >
              <p className="text-[10px] text-ink-muted">#{step.step}</p>
              <p className="my-1 text-base text-ink" aria-hidden>
                {OBSERVATION_ICON[step.observation]}
              </p>
              <p className="h-7 text-[10px] leading-tight text-ink-secondary">{step.observation}</p>
              <p className="mt-1 text-[10px] font-semibold" style={{ color }}>
                {STATE_ICON[step.state]} {step.state.slice(0, 4)}
              </p>
              {step.true_state && (
                <p className={`text-[9px] ${mismatch ? "text-status-warning" : "text-ink-muted"}`}>
                  true: {step.true_state.slice(0, 4)}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

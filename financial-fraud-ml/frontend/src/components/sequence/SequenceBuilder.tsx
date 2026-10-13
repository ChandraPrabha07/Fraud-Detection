import type { Observation } from "../../types/api";
import { OBSERVATIONS } from "../../types/api";
import { OBSERVATION_ICON } from "./ObservationTimeline";

const MAX_EVENTS = 60;

interface SequenceBuilderProps {
  events: Observation[];
  onChange: (events: Observation[]) => void;
  onAnalyze: () => void;
  busy: boolean;
}

/** Compose a custom observation sequence by clicking event buttons. */
export function SequenceBuilder({ events, onChange, onAnalyze, busy }: SequenceBuilderProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {OBSERVATIONS.map((obs) => (
          <button
            key={obs}
            type="button"
            className="btn-ghost justify-start px-2.5 py-1.5 text-xs"
            disabled={events.length >= MAX_EVENTS}
            onClick={() => onChange([...events, obs])}
          >
            <span aria-hidden>{OBSERVATION_ICON[obs]}</span> {obs}
          </button>
        ))}
      </div>
      <div className="min-h-[44px] rounded-md border border-line bg-page p-2 text-xs text-ink-secondary">
        {events.length === 0 ? (
          <span className="text-ink-muted">Click events above to build a sequence…</span>
        ) : (
          events.map((e, i) => (
            <span key={i} className="mr-1 inline-block">
              {i > 0 && <span className="mr-1 text-ink-muted">→</span>}
              {e}
            </span>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn-primary flex-1" disabled={!events.length || busy} onClick={onAnalyze}>
          Analyze sequence
        </button>
        <button type="button" className="btn-ghost" disabled={!events.length} onClick={() => onChange(events.slice(0, -1))}>
          Undo
        </button>
        <button type="button" className="btn-ghost" disabled={!events.length} onClick={() => onChange([])}>
          Clear
        </button>
      </div>
    </div>
  );
}

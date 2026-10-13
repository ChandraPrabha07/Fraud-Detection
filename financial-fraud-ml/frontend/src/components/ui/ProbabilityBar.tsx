import { formatPercent } from "../../utils/format";

interface ProbabilityBarProps {
  value: number;
  color: string;
  threshold?: number;
  label?: string;
}

/** Horizontal 0-100% meter with an optional decision-threshold tick. */
export function ProbabilityBar({ value, color, threshold, label }: ProbabilityBarProps) {
  const pct = Math.min(Math.max(value, 0), 1) * 100;
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative h-2 flex-1 overflow-hidden rounded-full bg-line"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label={label}
      >
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        {threshold !== undefined && (
          <span className="absolute inset-y-0 w-px bg-ink-secondary" style={{ left: `${threshold * 100}%` }} aria-hidden />
        )}
      </div>
      <span className="tabular w-14 text-right text-sm font-medium text-ink">{formatPercent(value)}</span>
    </div>
  );
}

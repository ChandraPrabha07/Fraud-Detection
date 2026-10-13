import type { RiskLevel } from "../../types/api";
import { formatPercent } from "../../utils/format";
import { RISK_COLOR } from "../../utils/risk";
import { CHART_INK } from "../charts/chartTheme";
import { RiskBadge } from "../ui/StatusBadge";

const RADIUS = 80;
const CIRCUMFERENCE = Math.PI * RADIUS;

/** Semi-circular gauge for a single probability; the number is the headline. */
export function RiskGauge({ probability, level, caption }: { probability: number; level: RiskLevel; caption: string }) {
  const filled = CIRCUMFERENCE * Math.min(Math.max(probability, 0), 1);
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 115" className="w-full max-w-[260px]" role="img" aria-label={`${caption}: ${formatPercent(probability)}`}>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={CHART_INK.grid} strokeWidth={14} strokeLinecap="round" />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={RISK_COLOR[level]}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
          style={{ transition: "stroke-dasharray 400ms ease" }}
        />
        <text x="100" y="88" textAnchor="middle" fill={CHART_INK.primary} fontSize="28" fontWeight="600">
          {formatPercent(probability)}
        </text>
      </svg>
      <p className="-mt-1 mb-2 text-xs text-ink-muted">{caption}</p>
      <RiskBadge level={level} size="md" />
    </div>
  );
}

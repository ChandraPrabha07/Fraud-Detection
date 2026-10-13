import type { Evidence, EvidenceVariable } from "../../types/api";
import { EVIDENCE_VARIABLES } from "../../types/api";
import { CHART_INK, STATUS_COLORS } from "../charts/chartTheme";
import { EVIDENCE_META } from "./EvidenceSelector";

const NODE_W = 132;
const NODE_H = 40;

/** Static DAG: four risk indicators -> Fraud. Node outline reflects current evidence. */
export function NetworkDiagram({ evidence }: { evidence: Evidence }) {
  const spacing = 600 / EVIDENCE_VARIABLES.length;
  const target = { x: 300, y: 170 };

  const outline = (variable: EvidenceVariable) => {
    const value = evidence[variable];
    if (value === null || value === undefined) return CHART_INK.axis;
    return value === EVIDENCE_META[variable].riskyValue ? STATUS_COLORS.serious : STATUS_COLORS.good;
  };

  return (
    <svg viewBox="0 0 600 220" className="w-full" role="img" aria-label="Bayesian network: four risk indicators point to Fraud">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={CHART_INK.muted} />
        </marker>
      </defs>
      {EVIDENCE_VARIABLES.map((variable, i) => {
        const cx = spacing * i + spacing / 2;
        return (
          <g key={variable}>
            <line x1={cx} y1={20 + NODE_H} x2={target.x} y2={target.y - NODE_H / 2 - 2} stroke={CHART_INK.muted} strokeWidth={1.5} markerEnd="url(#arrow)" />
            <rect x={cx - NODE_W / 2} y={20} width={NODE_W} height={NODE_H} rx={8} fill={CHART_INK.surface} stroke={outline(variable)} strokeWidth={2} />
            <text x={cx} y={45} textAnchor="middle" fill={CHART_INK.primary} fontSize="12">
              {variable}
            </text>
          </g>
        );
      })}
      <rect x={target.x - 60} y={target.y - NODE_H / 2} width={120} height={NODE_H} rx={20} fill="rgba(208,59,59,0.15)" stroke={STATUS_COLORS.critical} strokeWidth={2} />
      <text x={target.x} y={target.y + 5} textAnchor="middle" fill={CHART_INK.primary} fontSize="13" fontWeight="600">
        Fraud
      </text>
    </svg>
  );
}

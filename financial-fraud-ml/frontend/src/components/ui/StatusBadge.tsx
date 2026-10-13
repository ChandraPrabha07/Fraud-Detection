import type { HiddenState, PredictionLabel, RiskLevel } from "../../types/api";
import { RISK_COLOR, RISK_ICON, STATE_COLOR, STATE_ICON } from "../../utils/risk";
import { STATUS_COLORS } from "../charts/chartTheme";

interface BadgeProps {
  color: string;
  icon: string;
  label: string;
  size?: "sm" | "md";
}

/** Status is never colour-only: every badge carries an icon and a text label. */
export function Badge({ color, icon, label, size = "sm" }: BadgeProps) {
  const sizing = size === "md" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${sizing}`}
      style={{ color, borderColor: `${color}66`, backgroundColor: `${color}1a` }}
    >
      <span aria-hidden>{icon}</span>
      {label}
    </span>
  );
}

export const RiskBadge = ({ level, size }: { level: RiskLevel; size?: "sm" | "md" }) => (
  <Badge color={RISK_COLOR[level]} icon={RISK_ICON[level]} label={level} size={size} />
);

export const StateBadge = ({ state, size }: { state: HiddenState; size?: "sm" | "md" }) => (
  <Badge color={STATE_COLOR[state]} icon={STATE_ICON[state]} label={state} size={size} />
);

export const PredictionBadge = ({ label }: { label: PredictionLabel }) =>
  label === "FRAUD" ? (
    <Badge color={STATUS_COLORS.critical} icon="✕" label="FRAUD" />
  ) : (
    <Badge color={STATUS_COLORS.good} icon="✓" label="LEGIT" />
  );

import { STATUS_COLORS } from "../components/charts/chartTheme";
import type { HiddenState, RiskLevel } from "../types/api";

export const RISK_COLOR: Record<RiskLevel, string> = {
  LOW: STATUS_COLORS.good,
  MEDIUM: STATUS_COLORS.warning,
  HIGH: STATUS_COLORS.serious,
  CRITICAL: STATUS_COLORS.critical,
};

export const STATE_COLOR: Record<HiddenState, string> = {
  SAFE: STATUS_COLORS.good,
  SUSPICIOUS: STATUS_COLORS.warning,
  COMPROMISED: STATUS_COLORS.critical,
};

export const RISK_ICON: Record<RiskLevel, string> = {
  LOW: "✓",
  MEDIUM: "!",
  HIGH: "▲",
  CRITICAL: "✕",
};

export const STATE_ICON: Record<HiddenState, string> = {
  SAFE: "✓",
  SUSPICIOUS: "!",
  COMPROMISED: "✕",
};

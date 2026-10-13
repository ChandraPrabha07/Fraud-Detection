import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SequenceStep } from "../../types/api";
import { HIDDEN_STATES } from "../../types/api";
import { STATE_COLOR } from "../../utils/risk";
import { CHART_INK, axisProps, gridProps } from "../charts/chartTheme";
import { ChartLegend } from "../charts/ChartLegend";
import { ChartTooltip } from "../charts/ChartTooltip";

/** Stacked posterior P(state | observations) per step (forward-backward). */
export function StateProbabilityChart({ steps }: { steps: SequenceStep[] }) {
  const data = useMemo(
    () => steps.map((s) => ({ step: s.step, observation: s.observation, ...s.probabilities })),
    [steps],
  );
  return (
    <div>
      <ChartLegend items={HIDDEN_STATES.map((s) => ({ label: s, color: STATE_COLOR[s] }))} />
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid {...gridProps} />
          <XAxis {...axisProps} dataKey="step" />
          <YAxis {...axisProps} domain={[0, 1]} width={44} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} />
          <Tooltip
            content={
              <ChartTooltip
                valueFormatter={(v) => `${(v * 100).toFixed(1)}%`}
                labelFormatter={(l) => `Step ${l}: ${data[Number(l) - 1]?.observation ?? ""}`}
              />
            }
          />
          {HIDDEN_STATES.map((state) => (
            <Area
              key={state}
              dataKey={state}
              name={state}
              stackId="posterior"
              type="stepAfter"
              stroke={CHART_INK.surface}
              strokeWidth={1}
              fill={STATE_COLOR[state]}
              fillOpacity={0.75}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

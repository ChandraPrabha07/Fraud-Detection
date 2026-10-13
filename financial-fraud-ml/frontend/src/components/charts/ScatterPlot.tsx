import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_INK, axisProps, gridProps } from "./chartTheme";
import { ChartLegend } from "./ChartLegend";
import { ChartTooltip } from "./ChartTooltip";

export interface ScatterGroup {
  name: string;
  color: string;
  points: { x: number; y: number }[];
  opacity?: number;
}

interface ScatterPlotProps {
  groups: ScatterGroup[];
  xLabel: string;
  yLabel: string;
  height?: number;
  identityLine?: boolean;
  scale?: "linear" | "sqrt";
  valueFormatter?: (v: number) => string;
}

export function ScatterPlot({
  groups,
  xLabel,
  yLabel,
  height = 340,
  identityLine,
  scale = "linear",
  valueFormatter = (v) => v.toFixed(2),
}: ScatterPlotProps) {
  const max = identityLine ? Math.max(...groups.flatMap((g) => g.points.flatMap((p) => [p.x, p.y]))) : 0;
  return (
    <div>
      {groups.length > 1 && <ChartLegend items={groups.map((g) => ({ label: g.name, color: g.color }))} />}
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 4, right: 16, bottom: 20, left: 4 }}>
          <CartesianGrid {...gridProps} vertical />
          <XAxis
            {...axisProps}
            dataKey="x"
            type="number"
            name={xLabel}
            scale={scale}
            domain={["auto", "auto"]}
            tickFormatter={valueFormatter}
            label={{ value: xLabel, position: "insideBottom", offset: -12, fill: CHART_INK.muted, fontSize: 12 }}
          />
          <YAxis
            {...axisProps}
            dataKey="y"
            type="number"
            name={yLabel}
            scale={scale}
            domain={["auto", "auto"]}
            tickFormatter={valueFormatter}
            width={56}
            label={{ value: yLabel, angle: -90, position: "insideLeft", fill: CHART_INK.muted, fontSize: 12 }}
          />
          {identityLine && (
            <ReferenceLine segment={[{ x: 0, y: 0 }, { x: max, y: max }]} stroke={CHART_INK.muted} strokeWidth={1} />
          )}
          <Tooltip cursor={{ stroke: CHART_INK.muted }} content={<ChartTooltip valueFormatter={valueFormatter} />} />
          {groups.map((g) => (
            <Scatter
              key={g.name}
              name={g.name}
              data={g.points}
              fill={g.color}
              fillOpacity={g.opacity ?? 0.75}
              stroke={CHART_INK.surface}
              strokeWidth={1}
              isAnimationActive={false}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

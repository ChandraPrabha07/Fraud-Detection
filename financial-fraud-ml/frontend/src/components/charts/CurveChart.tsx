import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_INK, axisProps, gridProps } from "./chartTheme";
import { ChartLegend } from "./ChartLegend";
import { ChartTooltip } from "./ChartTooltip";

export interface CurveSeries {
  key: string;
  name: string;
  color: string;
  points: { x: number; y: number }[];
}

interface CurveChartProps {
  curves: CurveSeries[];
  xLabel: string;
  yLabel: string;
  height?: number;
  diagonal?: boolean;
  baseline?: number;
}

/** Multi-series curve plot (ROC / precision-recall). All curves share one x grid. */
export function CurveChart({ curves, xLabel, yLabel, height = 320, diagonal, baseline }: CurveChartProps) {
  const data = useMemo(() => {
    const rows = new Map<number, Record<string, number>>();
    for (const curve of curves) {
      for (const p of curve.points) {
        const row = rows.get(p.x) ?? { x: p.x };
        row[curve.key] = p.y;
        rows.set(p.x, row);
      }
    }
    return [...rows.values()].sort((a, b) => a.x - b.x);
  }, [curves]);

  const fmt = (v: number) => v.toFixed(2);

  return (
    <div>
      <ChartLegend items={curves.map((c) => ({ label: c.name, color: c.color, shape: "line" }))} />
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 20, left: 4 }}>
          <CartesianGrid {...gridProps} vertical />
          <XAxis
            {...axisProps}
            dataKey="x"
            type="number"
            domain={[0, 1]}
            tickFormatter={fmt}
            label={{ value: xLabel, position: "insideBottom", offset: -12, fill: CHART_INK.muted, fontSize: 12 }}
          />
          <YAxis
            {...axisProps}
            domain={[0, 1]}
            tickFormatter={fmt}
            width={48}
            label={{ value: yLabel, angle: -90, position: "insideLeft", fill: CHART_INK.muted, fontSize: 12 }}
          />
          {diagonal && (
            <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke={CHART_INK.axis} strokeWidth={1} />
          )}
          {baseline !== undefined && <ReferenceLine y={baseline} stroke={CHART_INK.axis} strokeWidth={1} />}
          <Tooltip
            cursor={{ stroke: CHART_INK.muted, strokeWidth: 1 }}
            content={<ChartTooltip valueFormatter={fmt} labelFormatter={(l) => `${xLabel}: ${Number(l).toFixed(2)}`} />}
          />
          {curves.map((c) => (
            <Line
              key={c.key}
              dataKey={c.key}
              name={c.name}
              stroke={c.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: CHART_INK.surface }}
              type="monotone"
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

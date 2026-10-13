import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_INK, axisProps, gridProps } from "./chartTheme";
import { ChartLegend } from "./ChartLegend";
import { ChartTooltip } from "./ChartTooltip";
import type { BarSeries } from "./MetricBarChart";

interface DensityChartProps<T> {
  data: T[];
  xKey: keyof T & string;
  series: BarSeries[];
  xLabel: string;
  height?: number;
}

/** Overlaid per-class density curves (e.g. LDA projection). */
export function DensityChart<T>({ data, xKey, series, xLabel, height = 280 }: DensityChartProps<T>) {
  return (
    <div>
      <ChartLegend items={series.map((s) => ({ label: s.label, color: s.color }))} />
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 16, bottom: 20, left: 4 }}>
          <CartesianGrid {...gridProps} />
          <XAxis
            {...axisProps}
            dataKey={xKey}
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v: number) => v.toFixed(1)}
            label={{ value: xLabel, position: "insideBottom", offset: -12, fill: CHART_INK.muted, fontSize: 12 }}
          />
          <YAxis {...axisProps} width={48} tickFormatter={(v: number) => v.toFixed(2)} />
          <Tooltip
            content={<ChartTooltip valueFormatter={(v) => v.toFixed(3)} labelFormatter={(l) => `${xLabel}: ${Number(l).toFixed(2)}`} />}
          />
          {series.map((s) => (
            <Area
              key={s.key}
              dataKey={s.key}
              name={s.label}
              type="monotone"
              stroke={s.color}
              strokeWidth={2}
              fill={s.color}
              fillOpacity={0.18}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

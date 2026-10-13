import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_INK, axisProps, gridProps } from "./chartTheme";
import { ChartLegend } from "./ChartLegend";
import { ChartTooltip } from "./ChartTooltip";

export interface BarSeries {
  key: string;
  label: string;
  color: string;
}

interface MetricBarChartProps<T> {
  data: T[];
  categoryKey: keyof T & string;
  series: BarSeries[];
  height?: number;
  stacked?: boolean;
  horizontal?: boolean;
  valueFormatter?: (value: number) => string;
  domain?: [number | "auto", number | "auto"];
  categoryWidth?: number;
}

/** Grouped / stacked bar chart. One series = no legend (the card title names it). */
export function MetricBarChart<T>({
  data,
  categoryKey,
  series,
  height = 280,
  stacked = false,
  horizontal = false,
  valueFormatter = (v) => v.toLocaleString(),
  domain = [0, "auto"],
  categoryWidth = 110,
}: MetricBarChartProps<T>) {
  const valueAxis = { ...axisProps, domain, tickFormatter: valueFormatter, type: "number" as const };
  const categoryAxis = { ...axisProps, dataKey: categoryKey, type: "category" as const, interval: 0 };

  return (
    <div>
      {series.length > 1 && <ChartLegend items={series.map((s) => ({ label: s.label, color: s.color }))} />}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 4, right: 12, bottom: 4, left: 4 }}
          barGap={2}
          barCategoryGap="20%"
        >
          <CartesianGrid {...gridProps} vertical={horizontal} horizontal={!horizontal} />
          {horizontal ? (
            <>
              <XAxis {...valueAxis} />
              <YAxis {...categoryAxis} width={categoryWidth} />
            </>
          ) : (
            <>
              <XAxis {...categoryAxis} />
              <YAxis {...valueAxis} width={56} />
            </>
          )}
          <Tooltip cursor={{ fill: CHART_INK.grid, opacity: 0.6 }} content={<ChartTooltip valueFormatter={valueFormatter} />} />
          {series.map((s, i) => {
            const isTop = !stacked || i === series.length - 1;
            const radius: [number, number, number, number] = !isTop
              ? [0, 0, 0, 0]
              : horizontal
                ? [0, 4, 4, 0]
                : [4, 4, 0, 0];
            return (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color}
                stackId={stacked ? "stack" : undefined}
                radius={radius}
                maxBarSize={36}
                stroke={stacked ? CHART_INK.surface : undefined}
                strokeWidth={stacked ? 2 : 0}
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

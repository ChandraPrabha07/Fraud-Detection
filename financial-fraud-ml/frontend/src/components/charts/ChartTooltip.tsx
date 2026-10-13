import type { TooltipProps } from "recharts";

interface ChartTooltipProps extends TooltipProps<number | string, string> {
  valueFormatter?: (value: number) => string;
  labelFormatter?: (label: unknown) => string;
}

/** Dark tooltip: text stays in ink colours; a swatch carries series identity. */
export function ChartTooltip({ active, payload, label, valueFormatter, labelFormatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line-strong bg-surface-raised px-3 py-2 text-xs shadow-xl">
      {label !== undefined && label !== "" && (
        <p className="mb-1.5 font-medium text-ink">{labelFormatter ? labelFormatter(label) : String(label)}</p>
      )}
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li key={`${entry.dataKey}-${entry.name}`} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color ?? entry.payload?.fill }} />
            <span className="text-ink-secondary">{entry.name}</span>
            <span className="tabular ml-auto pl-3 font-medium text-ink">
              {typeof entry.value === "number" && valueFormatter ? valueFormatter(entry.value) : String(entry.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

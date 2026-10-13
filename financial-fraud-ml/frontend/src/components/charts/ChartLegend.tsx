export interface LegendItem {
  label: string;
  color: string;
  shape?: "square" | "line";
}

export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-secondary">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            className={item.shape === "line" ? "h-0.5 w-3.5 rounded" : "h-2.5 w-2.5 rounded-sm"}
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

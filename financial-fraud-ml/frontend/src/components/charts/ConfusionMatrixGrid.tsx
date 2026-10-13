import type { ConfusionMatrix } from "../../types/api";
import { formatInteger } from "../../utils/format";

interface ConfusionMatrixGridProps {
  matrix: ConfusionMatrix;
  title: string;
  color: string;
}

/** 2x2 confusion matrix; cell intensity is row-normalised so the tiny fraud row stays readable. */
export function ConfusionMatrixGrid({ matrix, title, color }: ConfusionMatrixGridProps) {
  const rows = [
    { actual: "Legit", cells: [{ label: "TN", value: matrix.tn }, { label: "FP", value: matrix.fp }] },
    { actual: "Fraud", cells: [{ label: "FN", value: matrix.fn }, { label: "TP", value: matrix.tp }] },
  ];

  return (
    <figure className="rounded-lg border border-line bg-page p-3">
      <figcaption className="mb-2 flex items-center gap-2 text-xs font-medium text-ink">
        <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} aria-hidden />
        {title}
      </figcaption>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-0.5 text-xs">
        <span />
        <span className="pb-1 text-center text-ink-muted">Pred legit</span>
        <span className="pb-1 text-center text-ink-muted">Pred fraud</span>
        {rows.map((row) => {
          const total = row.cells.reduce((s, c) => s + c.value, 0) || 1;
          return [
            <span key={`${row.actual}-label`} className="flex items-center pr-2 text-ink-muted">
              {row.actual}
            </span>,
            ...row.cells.map((cell) => {
              const share = cell.value / total;
              return (
                <div
                  key={cell.label}
                  className="rounded px-2 py-2 text-center"
                  style={{ backgroundColor: `rgba(57,135,229,${0.08 + share * 0.6})` }}
                  title={`${cell.label}: ${cell.value} (${(share * 100).toFixed(1)}% of actual ${row.actual.toLowerCase()})`}
                >
                  <div className="tabular font-semibold text-ink">{formatInteger(cell.value)}</div>
                  <div className="text-[10px] text-ink-secondary">{cell.label}</div>
                </div>
              );
            }),
          ];
        })}
      </div>
    </figure>
  );
}

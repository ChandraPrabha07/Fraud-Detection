import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  highlight?: (row: T) => boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  emptyMessage?: string;
  dense?: boolean;
}

const alignClass = { left: "text-left", right: "text-right", center: "text-center" };

export function DataTable<T>({ columns, rows, rowKey, emptyMessage = "No rows", dense = false }: DataTableProps<T>) {
  const cellPad = dense ? "px-3 py-1.5" : "px-3 py-2.5";
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b border-line-strong">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`${cellPad} text-xs font-medium uppercase tracking-wide text-ink-muted ${alignClass[col.align ?? "left"]}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-ink-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={rowKey(row, i)} className="border-b border-line last:border-0 hover:bg-surface-hover">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`${cellPad} ${alignClass[col.align ?? "left"]} ${
                      col.highlight?.(row) ? "font-semibold text-ink" : "text-ink-secondary"
                    }`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

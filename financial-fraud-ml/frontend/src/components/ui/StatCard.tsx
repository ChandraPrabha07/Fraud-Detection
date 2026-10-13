import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: string;
}

export function StatCard({ label, value, hint, accent }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-surface p-4">
      {accent && <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: accent }} aria-hidden />}
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-secondary">{hint}</p>}
    </div>
  );
}

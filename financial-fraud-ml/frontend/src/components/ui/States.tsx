import type { ReactNode } from "react";

export function LoadingState({ label = "Loading…", compact = false }: { label?: string; compact?: boolean }) {
  return (
    <div
      role="status"
      className={`flex items-center justify-center gap-3 text-sm text-ink-muted ${compact ? "py-6" : "py-16"}`}
    >
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" aria-hidden />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-status-critical/40 bg-status-critical/10 p-4 text-sm">
      <p className="font-semibold text-status-critical">✕ Something went wrong</p>
      <p className="mt-1 text-ink-secondary">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-ghost mt-3">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong p-8 text-center">
      <p className="text-sm font-medium text-ink-secondary">{title}</p>
      {children && <div className="mt-1 text-xs text-ink-muted">{children}</div>}
    </div>
  );
}

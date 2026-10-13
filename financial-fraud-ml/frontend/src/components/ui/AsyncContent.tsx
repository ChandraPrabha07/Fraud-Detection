import type { ReactNode } from "react";
import type { AsyncState } from "../../hooks/useApi";
import { EmptyState, ErrorState, LoadingState } from "./States";

interface AsyncContentProps<T> {
  state: AsyncState<T>;
  children: (data: T) => ReactNode;
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  loadingLabel?: string;
}

/** Renders loading / error / empty states uniformly for any useApi() result. */
export function AsyncContent<T>({
  state,
  children,
  isEmpty,
  emptyTitle = "No data available",
  loadingLabel,
}: AsyncContentProps<T>) {
  if (state.loading && !state.data) return <LoadingState label={loadingLabel} />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  if (!state.data || isEmpty?.(state.data)) {
    return <EmptyState title={emptyTitle}>Run `python main.py train` to generate results.</EmptyState>;
  }
  return <>{children(state.data)}</>;
}

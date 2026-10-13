import { useCallback, useEffect, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/** Fetches on mount (and on reload); aborts in-flight requests on unmount. */
export function useApi<T>(fetcher: (signal: AbortSignal) => Promise<T>): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetcher(controller.signal)
      .then((result) => setData(result))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unexpected error");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // fetcher is expected to be a stable module-level function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, loading, reload };
}

/** Imperative mutation helper for POST actions triggered by the user. */
export function useMutation<TArgs extends unknown[], TResult>(action: (...args: TArgs) => Promise<TResult>) {
  const [data, setData] = useState<TResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(
    async (...args: TArgs) => {
      setLoading(true);
      setError(null);
      try {
        const result = await action(...args);
        setData(result);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [action],
  );

  return { data, error, loading, run, setData };
}

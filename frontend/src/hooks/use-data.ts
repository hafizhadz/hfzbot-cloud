import { useState, useEffect, useCallback } from "react";

interface State<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Generic hook for fetching data from an API with loading/error states.
 */
export function useData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
) {
  const [state, setState] = useState<State<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const data = await fetcher();
      setState({ data, isLoading: false, error: null });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setState({ data: null, isLoading: false, error: message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}

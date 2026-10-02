// Fetch on mount, then poll every 5 s while the page is visible (SPEC §9.4).
// On failure, keep showing the last cached data instead of an empty screen.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, readCache, writeCache } from '../api/client';

export interface ApiState<T> {
  data: T | undefined;
  loading: boolean;
  offline: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useApi<T>(path: string | null, { poll = 5000 }: { poll?: number | false } = {}): ApiState<T> {
  const [data, setData] = useState<T | undefined>(() => (path ? readCache<T>(path) : undefined));
  const [loading, setLoading] = useState<boolean>(!!path && data === undefined);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pathRef = useRef(path);
  pathRef.current = path;

  const refresh = useCallback(async () => {
    const p = pathRef.current;
    if (!p) return;
    try {
      const fresh = await api<T>(p);
      if (pathRef.current !== p) return;
      setData(fresh);
      writeCache(p, fresh);
      setOffline(false);
      setError(null);
    } catch (err) {
      if (pathRef.current !== p) return;
      setOffline(true);
      setError(err instanceof Error ? err.message : String(err));
      const cached = readCache<T>(p);
      if (cached !== undefined) setData(cached);
    } finally {
      if (pathRef.current === p) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!path) return;
    const cached = readCache<T>(path);
    setData(cached);
    setLoading(cached === undefined);
    void refresh();
    if (poll === false) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, poll);
    const onVisible = () => document.visibilityState === 'visible' && void refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [path, poll, refresh]);

  return { data, loading, offline, error, refresh };
}

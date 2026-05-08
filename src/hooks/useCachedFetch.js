import { useState, useEffect, useRef, useCallback } from 'react';

const CACHE_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Fetches data with localStorage caching. Cached payload format: { data, timestamp }.
 *
 * @param {string} cacheKey - Unique localStorage key for this fetch.
 * @param {() => Promise<any>} fetcherFn - Async function that fetches fresh data.
 * @param {any[]} deps - Extra dependencies that should trigger a fresh fetch (e.g. apiKey).
 */
export const useCachedFetch = (cacheKey, fetcherFn, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stable reference to fetcherFn so we don't need it in the dep array
  const fetcherRef = useRef(fetcherFn);
  fetcherRef.current = fetcherFn;

  const load = useCallback(
    async (force = false) => {
      setLoading(true);
      setError(null);

      // Try cache first (unless forced refresh)
      if (!force) {
        try {
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const cached = JSON.parse(raw);
            if (
              cached &&
              cached.data &&
              cached.timestamp &&
              Date.now() - cached.timestamp < CACHE_EXPIRATION_MS
            ) {
              setData(cached.data);
              setLoading(false);
              return;
            }
            // Cache is stale or malformed — clean it up
            localStorage.removeItem(cacheKey);
          }
        } catch {
          // Corrupted cache entry; remove it
          try { localStorage.removeItem(cacheKey); } catch { /* ignore */ }
        }
      }

      // Fresh fetch
      try {
        const result = await fetcherRef.current();
        if (result && (Array.isArray(result) ? result.length > 0 : true)) {
          try {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({ data: result, timestamp: Date.now() })
            );
          } catch {
            // Ignore localStorage write errors (quota exceeded etc.)
          }
          setData(result);
        } else {
          throw new Error('Fetcher returned empty data.');
        }
      } catch (err) {
        console.error(`[useCachedFetch] ${cacheKey}:`, err);
        setError(err);

        // Serve stale cache on failure rather than leaving the UI empty
        try {
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const cached = JSON.parse(raw);
            if (cached?.data) setData(cached.data);
          }
        } catch {
          // ignore
        }
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cacheKey, ...deps]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  return { data, loading, error, refetch: () => load(true) };
};

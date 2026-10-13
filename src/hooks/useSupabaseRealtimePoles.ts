import { useEffect, useState, useCallback, useRef } from 'react';
import { Pole } from '@/types/pole';
import { getCachedPoles, saveCachedPoles } from '@/lib/gis/polesClientCache';

function buildPoleSnapshotSignature(poles: Pole[]): string {
  if (!poles || poles.length === 0) return 'empty';
  const first = poles[0];
  const mid = poles[Math.floor(poles.length / 2)];
  const last = poles[poles.length - 1];
  return `${poles.length}~${first?.id || ''}~${first?.updatedAt || ''}~${mid?.id || ''}~${last?.id || ''}`;
}

export function useSupabaseRealtimePoles(
  initialPoles: Pole[] = [],
  onPolesChange?: (poles: Pole[]) => void
) {
  const [poles, setPoles] = useState<Pole[]>(initialPoles);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const polesSignatureRef = useRef<string>(buildPoleSnapshotSignature(initialPoles));
  const onPolesChangeRef = useRef(onPolesChange);
  onPolesChangeRef.current = onPolesChange;

  // Synchronize when initialPoles prop updates from server (only if signature actually changed)
  useEffect(() => {
    if (initialPoles && initialPoles.length > 0) {
      const initSig = buildPoleSnapshotSignature(initialPoles);
      if (initSig !== polesSignatureRef.current) {
        polesSignatureRef.current = initSig;
        setPoles(initialPoles);
      }
    }
  }, [initialPoles]);

  const lastRevisionRef = useRef<{ count: number; latest: string }>({
    count: initialPoles.length,
    latest: '',
  });

  // Fetch from the app API so the hook works with either Supabase atau PostgreSQL lokal VPS.
  const fetchFreshPoles = useCallback(async (showLoading = false, force = false) => {
    try {
      if (showLoading) setIsLoading(true);
      else setIsSyncing(true);

      // Lightweight revision check: only download full dataset if count or latest changed
      if (!force && lastRevisionRef.current.count > 0) {
        try {
          const revRes = await fetch('/api/poles/revision');
          if (revRes.ok) {
            const revJson = await revRes.json();
            if (
              revJson?.success &&
              revJson.count === lastRevisionRef.current.count &&
              revJson.latest === lastRevisionRef.current.latest
            ) {
              // Data is identical! No need to download or parse full dataset.
              return;
            }
            if (revJson?.success) {
              lastRevisionRef.current = { count: revJson.count, latest: revJson.latest };
            }
          }
        } catch (_) {
          // If revision check fails, fall through to full fetch
        }
      }

      const res = await fetch('/api/poles', { cache: 'no-store' });
      const json = await res.json();

      if (json?.success && Array.isArray(json.data)) {
        const nextPoles = json.data as Pole[];

        // Safeguard: Never replace an existing valid list of poles with an empty array or glitch response
        if (
          nextPoles.length === 0 &&
          polesSignatureRef.current.length > 0 &&
          polesSignatureRef.current !== 'empty'
        ) {
          console.warn('Realtime fetch returned 0 poles; keeping last valid snapshot.');
          return;
        }

        const nextSignature = buildPoleSnapshotSignature(nextPoles);

        if (nextSignature !== polesSignatureRef.current) {
          polesSignatureRef.current = nextSignature;
          lastRevisionRef.current.count = nextPoles.length;
          setPoles(nextPoles);
          // Persist to browser IndexedDB cache asynchronously
          saveCachedPoles(nextPoles, nextPoles.length, lastRevisionRef.current.latest).catch(
            () => {}
          );
          if (onPolesChangeRef.current) {
            onPolesChangeRef.current(nextPoles);
          }
        }
      } else if (json?.success === false) {
        console.warn('Realtime fetch poles notice:', json.error || 'Unknown API notice');
      }
    } catch (err) {
      console.warn('Realtime fetch poles network notice:', err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    // 1. If initialPoles was empty, try instant restore from client-side IndexedDB cache
    if (!initialPoles || initialPoles.length === 0) {
      setIsLoading(true);
      getCachedPoles()
        .then((cached) => {
          if (isCancelled) return;
          if (cached && Array.isArray(cached.poles) && cached.poles.length > 0) {
            setPoles(cached.poles);
            lastRevisionRef.current = { count: cached.count, latest: cached.latest };
            polesSignatureRef.current = buildPoleSnapshotSignature(cached.poles);
            setIsLoading(false);
            if (onPolesChangeRef.current) {
              onPolesChangeRef.current(cached.poles);
            }
            // Check revision in background to see if sync is needed
            fetchFreshPoles(false, false);
          } else {
            // First time visit: fetch fresh from server
            fetchFreshPoles(true, true);
          }
        })
        .catch(() => {
          if (!isCancelled) fetchFreshPoles(true, true);
        });
    }

    // 2. Periodic background refresh every 25 seconds via lightweight revision check
    const interval = window.setInterval(() => {
      fetchFreshPoles(false, false);
    }, 25000);

    // 3. Global Hard-Refresh Event Listener (Tombol Reload Header)
    const handleHardRefresh = () => {
      fetchFreshPoles(false, true);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('gis:hard-refresh', handleHardRefresh);
    }

    return () => {
      isCancelled = true;
      window.clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('gis:hard-refresh', handleHardRefresh);
      }
    };
  }, [fetchFreshPoles, initialPoles]);

  return {
    poles,
    isLive,
    isLoading,
    isSyncing,
    refreshPoles: () => fetchFreshPoles(false, true),
  };
}

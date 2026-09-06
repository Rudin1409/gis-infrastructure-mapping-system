'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Pole } from '@/types/pole';

function buildPoleSnapshotSignature(poles: Pole[]): string {
  return poles
    .map((pole) =>
      [
        pole.id,
        pole.updatedAt || '',
        pole.createdAt || '',
        pole.poleLatitude,
        pole.poleLongitude,
        pole.poleCode || '',
        pole.providerId || '',
        pole.providerName || '',
        pole.infrastructureCategory || '',
        pole.kecamatan || '',
        pole.kelurahan || '',
        pole.road || '',
      ].join('~')
    )
    .join('|');
}

// Nama hook dipertahankan untuk kompatibilitas. Pembaruan menggunakan polling
// API aplikasi setiap 20 detik, sehingga tidak bergantung pada Supabase Realtime.
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

  // Fetch from the app API so the hook works with either Supabase atau PostgreSQL lokal VPS.
  const fetchFreshPoles = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true);
      else setIsSyncing(true);

      const res = await fetch('/api/poles', { cache: 'no-store' });
      const json = await res.json();

      if (json?.success && Array.isArray(json.data)) {
        const nextPoles = json.data as Pole[];

        // Safeguard: Never replace an existing valid list of poles with an empty array or glitch response
        if (nextPoles.length === 0 && polesSignatureRef.current.length > 0) {
          console.warn('Realtime fetch returned 0 poles; keeping last valid snapshot.');
          return;
        }

        const nextSignature = buildPoleSnapshotSignature(nextPoles);

        if (nextSignature !== polesSignatureRef.current) {
          polesSignatureRef.current = nextSignature;
          setPoles(nextPoles);
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
    // 1. Only fetch immediately if initialPoles was empty
    if (!initialPoles || initialPoles.length === 0) {
      fetchFreshPoles(true);
    }

    // 2. Periodic background refresh every 20 seconds
    const interval = window.setInterval(() => {
      fetchFreshPoles(false);
    }, 20000);

    // 3. Global Hard-Refresh Event Listener (Tombol Reload Header)
    const handleHardRefresh = () => {
      fetchFreshPoles(false);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('gis:hard-refresh', handleHardRefresh);
    }

    return () => {
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
    refreshPoles: () => fetchFreshPoles(false),
  };
}

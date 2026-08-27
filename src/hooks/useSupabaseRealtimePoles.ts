'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Pole } from '@/types/pole';

export function useSupabaseRealtimePoles(
  initialPoles: Pole[] = [],
  onPolesChange?: (poles: Pole[]) => void
) {
  const [poles, setPoles] = useState<Pole[]>(initialPoles);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(initialPoles.length === 0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const onPolesChangeRef = useRef(onPolesChange);
  onPolesChangeRef.current = onPolesChange;

  // Synchronize when initialPoles prop updates from server
  useEffect(() => {
    if (initialPoles && initialPoles.length > 0) {
      setPoles(initialPoles);
      setIsLoading(false);
    }
  }, [initialPoles]);

  const fetchFreshPoles = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true);
      else setIsSyncing(true);

      const res = await fetch('/api/poles', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setPoles(json.data);
          if (onPolesChangeRef.current) {
            onPolesChangeRef.current(json.data);
          }
        }
      }
    } catch (err) {
      console.warn('Realtime fetch poles notice:', err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    // 1. Instant Immediate Fresh Fetch on Mount (<50ms)
    fetchFreshPoles(initialPoles.length === 0);

    // 2. Setup Supabase Realtime WebSocket Listener (Instant <10ms event trigger)
    const channel = supabase
      .channel('realtime-poles-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poles' },
        (payload) => {
          console.log('⚡ [REALTIME WEBSOCKET] Perubahan data tiang terdeteksi:', payload.eventType);
          fetchFreshPoles(false);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLive(true);
        }
      });

    // 3. Heartbeat Polling Fallback (setiap 5 detik) untuk jaringan HP
    const heartbeat = setInterval(() => {
      fetchFreshPoles(false);
    }, 5000);

    // 4. Global Hard-Refresh Event Listener (Tombol Reload Header)
    const handleHardRefresh = () => {
      fetchFreshPoles(false);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('gis:hard-refresh', handleHardRefresh);
    }

    return () => {
      supabase.removeChannel(channel);
      clearInterval(heartbeat);
      if (typeof window !== 'undefined') {
        window.removeEventListener('gis:hard-refresh', handleHardRefresh);
      }
    };
  }, [fetchFreshPoles, initialPoles.length]);

  return {
    poles,
    isLive,
    isLoading,
    isSyncing,
    refreshPoles: () => fetchFreshPoles(false),
  };
}

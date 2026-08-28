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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const onPolesChangeRef = useRef(onPolesChange);
  onPolesChangeRef.current = onPolesChange;

  // Synchronize when initialPoles prop updates from server
  useEffect(() => {
    if (initialPoles && initialPoles.length > 0) {
      setPoles(initialPoles);
    }
  }, [initialPoles]);

  // Fetch directly from Supabase Client to save 100% of Vercel Fast Origin bandwidth
  const fetchFreshPoles = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true);
      else setIsSyncing(true);

      const { data, error } = await supabase
        .from('poles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && Array.isArray(data)) {
        setPoles(data as Pole[]);
        if (onPolesChangeRef.current) {
          onPolesChangeRef.current(data as Pole[]);
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
    // 1. Only fetch if initialPoles was empty
    if (!initialPoles || initialPoles.length === 0) {
      fetchFreshPoles(true);
    }

    // 2. Setup Supabase Realtime WebSocket Listener (Zero Vercel Bandwidth)
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

    // 3. Global Hard-Refresh Event Listener (Tombol Reload Header)
    const handleHardRefresh = () => {
      fetchFreshPoles(false);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('gis:hard-refresh', handleHardRefresh);
    }

    return () => {
      supabase.removeChannel(channel);
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

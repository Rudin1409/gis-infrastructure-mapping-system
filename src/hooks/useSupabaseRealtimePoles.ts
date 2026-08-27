'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Pole } from '@/types/pole';

export function useSupabaseRealtimePoles(initialPoles: Pole[], onPolesChange?: (poles: Pole[]) => void) {
  const [poles, setPoles] = useState<Pole[]>(initialPoles);
  const [isLive, setIsLive] = useState<boolean>(true);

  const fetchFreshPoles = async () => {
    try {
      const res = await fetch('/api/poles', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setPoles(json.data);
          if (onPolesChange) onPolesChange(json.data);
        }
      }
    } catch (_) {
      // ignore
    }
  };

  useEffect(() => {
    // 1. Setup Supabase Realtime WebSocket Listener (Instant <10ms event trigger)
    const channel = supabase
      .channel('realtime-poles-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poles' },
        (payload) => {
          console.log('⚡ [REALTIME WEBSOCKET] Perubahan data tiang terdeteksi:', payload.eventType);
          fetchFreshPoles();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLive(true);
        }
      });

    // 2. Heartbeat Polling Fallback (setiap 6 detik) untuk jaringan HP tidak stabil
    const heartbeat = setInterval(() => {
      fetchFreshPoles();
    }, 6000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(heartbeat);
    };
  }, []);

  return { poles, isLive, refreshPoles: fetchFreshPoles };
}

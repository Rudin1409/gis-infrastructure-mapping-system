'use client';

import { useEffect, useRef } from 'react';
import { AuthUser } from '@/types/auth';

export function useActiveSurveyorPresence(user: AuthUser | null, enabled: boolean = true) {
  const lastPostedAtRef = useRef(0);
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!enabled || !user?.id || typeof window === 'undefined' || !navigator.geolocation) {
      return;
    }

    let watchId: number | null = null;
    let cancelled = false;

    // Helper calculate distance in meters
    const getApproxDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
          Math.cos(lat2 * (Math.PI / 180)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return 6371000 * c;
    };

    const publishLocation = async (position: GeolocationPosition) => {
      const now = Date.now();
      const currentLat = position.coords.latitude;
      const currentLng = position.coords.longitude;

      let movedMeters = 0;
      if (lastCoordsRef.current) {
        movedMeters = getApproxDistanceMeters(
          lastCoordsRef.current.lat,
          lastCoordsRef.current.lng,
          currentLat,
          currentLng
        );
      }

      // Jika user sedang bergerak (> 2 meter), perbarui setiap 3 detik.
      // Jika diam, kirim heartbeat setiap 25 detik.
      const throttleMs = movedMeters >= 2 ? 3000 : 25000;
      if (now - lastPostedAtRef.current < throttleMs) return;

      lastPostedAtRef.current = now;
      lastCoordsRef.current = { lat: currentLat, lng: currentLng };

      try {
        await fetch('/api/surveyors/active', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            userName: user.name,
            roleLabel: user.roleLabel,
            team: user.team,
            latitude: currentLat,
            longitude: currentLng,
            accuracy: position.coords.accuracy || 5,
          }),
        });
      } catch (_) {}
    };

    const sendOfflineSignal = () => {
      if (!user?.id) return;
      const offlineUrl = `/api/surveyors/active?action=offline&userId=${encodeURIComponent(user.id)}`;
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(offlineUrl);
      } else {
        fetch(offlineUrl, { method: 'POST', keepalive: true }).catch(() => {});
      }
    };

    const startWatch = () => {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (!cancelled) publishLocation(position);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    };

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((permission) => {
          if (!cancelled && permission.state !== 'denied') startWatch();
        })
        .catch(startWatch);
    } else {
      startWatch();
    }

    // 🛑 Listener agar saat user menutup browser / keluar aplikasi langsung hilang dari peta
    const handleVisibilityOrUnload = () => {
      if (document.visibilityState === 'hidden') {
        sendOfflineSignal();
      }
    };

    window.addEventListener('beforeunload', sendOfflineSignal);
    window.addEventListener('pagehide', sendOfflineSignal);
    document.addEventListener('visibilitychange', handleVisibilityOrUnload);

    return () => {
      cancelled = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      window.removeEventListener('beforeunload', sendOfflineSignal);
      window.removeEventListener('pagehide', sendOfflineSignal);
      document.removeEventListener('visibilitychange', handleVisibilityOrUnload);
      sendOfflineSignal();
    };
  }, [enabled, user?.id, user?.name, user?.roleLabel, user?.team]);
}

'use client';

import { useEffect, useRef } from 'react';
import { AuthUser } from '@/types/auth';

export function useActiveSurveyorPresence(user: AuthUser | null, enabled: boolean = true) {
  const lastPostedAtRef = useRef(0);

  useEffect(() => {
    if (!enabled || !user?.id || typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    let watchId: number | null = null;
    let cancelled = false;

    const publishLocation = async (position: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastPostedAtRef.current < 12000) return;
      lastPostedAtRef.current = now;

      try {
        await fetch('/api/surveyors/active', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            userName: user.name,
            roleLabel: user.roleLabel,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy || 5,
          }),
        });
      } catch (_) {}
    };

    const startWatch = () => {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (!cancelled) publishLocation(position);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
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

    return () => {
      cancelled = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [enabled, user?.id, user?.name, user?.roleLabel]);
}

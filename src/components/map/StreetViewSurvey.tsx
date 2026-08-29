'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Coordinates } from '@/types/gis';
import { loadGoogleMaps } from '@/lib/gis/googleMapsLoader';

export interface StreetViewCameraState {
  position: Coordinates;
  heading: number;
  pitch: number;
}

interface StreetViewSurveyProps {
  initialPosition: Coordinates;
  initialHeading?: number;
  initialPitch?: number;
  onCameraChange: (state: StreetViewCameraState) => void;
  onReadyChange?: (ready: boolean) => void;
}

export default function StreetViewSurvey({
  initialPosition,
  initialHeading = 0,
  initialPitch = 10,
  onCameraChange,
  onReadyChange,
}: StreetViewSurveyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCameraChange);
  const readyCallbackRef = useRef(onReadyChange);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    callbackRef.current = onCameraChange;
  }, [onCameraChange]);

  useEffect(() => {
    readyCallbackRef.current = onReadyChange;
  }, [onReadyChange]);

  useEffect(() => {
    let disposed = false;
    let listeners: Array<{ remove: () => void }> = [];

    async function initialize() {
      try {
        setError(null);
        setIsReady(false);
        readyCallbackRef.current?.(false);
        const maps = await loadGoogleMaps();
        if (disposed || !containerRef.current) return;

        const panorama = new maps.StreetViewPanorama(containerRef.current, {
          position: initialPosition,
          pov: { heading: initialHeading, pitch: initialPitch },
          zoom: 1,
          addressControl: true,
          clickToGo: true,
          linksControl: true,
          panControl: true,
          zoomControl: true,
          fullscreenControl: true,
          enableCloseButton: false,
          motionTracking: false,
          motionTrackingControl: false,
          visible: true,
        });

        const publishCameraState = () => {
          const position = panorama.getPosition();
          const pov = panorama.getPov();
          if (!position || !pov) return;

          callbackRef.current({
            position: { lat: position.lat(), lng: position.lng() },
            heading: Number.isFinite(pov.heading) ? pov.heading : 0,
            pitch: Number.isFinite(pov.pitch) ? pov.pitch : 0,
          });
        };

        listeners = [
          panorama.addListener('position_changed', publishCameraState),
          panorama.addListener('pov_changed', publishCameraState),
          panorama.addListener('status_changed', () => {
            const ok = panorama.getStatus() === maps.StreetViewStatus.OK;
            readyCallbackRef.current?.(ok);
            setIsReady(ok);
            if (!ok) {
              setError('Panorama Street View tidak tersedia di sekitar titik ini.');
            } else {
              setError(null);
              publishCameraState();
            }
          }),
        ];
      } catch (reason) {
        if (disposed) return;
        const message = reason instanceof Error ? reason.message : 'Street View gagal dimuat.';
        setError(message);
        setIsReady(false);
        readyCallbackRef.current?.(false);
      }
    }

    initialize();

    return () => {
      disposed = true;
      listeners.forEach((listener) => listener.remove());
      listeners = [];
    };
  }, [initialHeading, initialPitch, initialPosition.lat, initialPosition.lng]);

  return (
    <div className="absolute inset-0 bg-slate-950">
      <div ref={containerRef} className="w-full h-full" />
      {!error && !isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 pointer-events-none">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            <span>Memuat Street View presisi...</span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/95 p-6">
          <div className="max-w-md rounded-3xl border border-amber-400/30 bg-amber-500/10 p-5 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
            <h4 className="text-sm font-black text-white">Street View presisi belum aktif</h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">{error}</p>
            <p className="mt-2 text-[10px] text-slate-500">
              Aktifkan Maps JavaScript API dan Street View Static API, lalu konfigurasi
              NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

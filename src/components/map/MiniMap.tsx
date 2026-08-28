'use client';

import React, { useEffect, useRef, useState } from 'react';
import type L from 'leaflet';
import { Coordinates } from '@/types/gis';
import { MAP_TILE_LAYERS } from '@/lib/gis/tiles';
import { createProviderPoleMarkerIcon } from './markerIcons';
import { PoleCondition } from '@/types/pole';
import { Layers } from 'lucide-react';
import GISApiQuotaExceededLock from '@/components/common/GISApiQuotaExceededLock';

interface MiniMapProps {
  coord: Coordinates;
  condition: PoleCondition;
  poleId: string;
  poleCode?: string;
  providerColorHex?: string;
  category?: import('@/types/pole').InfrastructureCategory;
}

export default function MiniMap({
  coord,
  condition,
  poleId,
  poleCode,
  providerColorHex,
  category,
}: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [leafletLib, setLeafletLib] = useState<typeof L | null>(null);
  const [tileMode, setTileMode] = useState<'clean_satellite' | 'hybrid_survey' | 'street'>('clean_satellite');
  const [isLicenseLocked, setIsLicenseLocked] = useState(false);

  useEffect(() => {
    fetch('/api/system/license', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.isLocked) {
          setIsLicenseLocked(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadLeaflet() {
      if (typeof window === 'undefined') return;
      const L = await import('leaflet');
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (isMounted) setLeafletLib(L);
    }
    loadLeaflet();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLicenseLocked || !leafletLib || !containerRef.current || mapRef.current) return;
    const L = leafletLib;

    const map = L.map(containerRef.current, {
      center: [coord.lat, coord.lng],
      zoom: 18,
      maxZoom: 21,
      zoomControl: false,
    });

    const tileConfig = MAP_TILE_LAYERS[tileMode];
    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
      subdomains: tileConfig.subdomains || ['0', '1', '2', '3'],
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    const icon = createProviderPoleMarkerIcon(L, {
      condition,
      label: poleCode || poleId,
      colorHex: providerColorHex || '#2563eb',
      category,
    });
    L.marker([coord.lat, coord.lng], { icon }).addTo(map);

    mapRef.current = map;

    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [isLicenseLocked, leafletLib, coord, condition, poleId, poleCode, providerColorHex, category]);

  const toggleTile = () => {
    if (!leafletLib || !mapRef.current) return;
    const nextMode =
      tileMode === 'clean_satellite'
        ? 'hybrid_survey'
        : tileMode === 'hybrid_survey'
        ? 'street'
        : 'clean_satellite';
    setTileMode(nextMode);

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    const tileConfig = MAP_TILE_LAYERS[nextMode];
    const newLayer = leafletLib.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
      subdomains: tileConfig.subdomains || ['0', '1', '2', '3'],
    }).addTo(mapRef.current);

    tileLayerRef.current = newLayer;
  };

  if (isLicenseLocked) {
    return <GISApiQuotaExceededLock compact={true} />;
  }

  return (
    <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-slate-200/80 shadow-inner">
      <div ref={containerRef} className="w-full h-full z-0" />
      <button
        type="button"
        onClick={toggleTile}
        className="absolute top-2.5 right-2.5 z-[400] flex items-center gap-1 px-2.5 py-1 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl text-[10px] font-bold border border-white/20 shadow-md backdrop-blur-md transition-all cursor-pointer"
      >
        <Layers className="w-3 h-3 text-cyan-300" />
        <span>{tileMode === 'street' ? 'Jalan' : 'Satelit'}</span>
      </button>
    </div>
  );
}

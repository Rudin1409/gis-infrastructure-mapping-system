'use client';

import React, { useEffect, useRef, useState } from 'react';
import type L from 'leaflet';
import { Coordinates } from '@/types/gis';
import { MAP_TILE_LAYERS } from '@/lib/gis/tiles';
import { createConditionMarkerIcon } from './markerIcons';
import { PoleCondition } from '@/types/pole';
import { Layers } from 'lucide-react';

interface MiniMapProps {
  coord: Coordinates;
  condition: PoleCondition;
  poleId: string;
}

export default function MiniMap({ coord, condition, poleId }: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [leafletLib, setLeafletLib] = useState<typeof L | null>(null);
  const [tileMode, setTileMode] = useState<'clean_satellite' | 'hybrid_survey' | 'street'>('clean_satellite');

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
    if (!leafletLib || !containerRef.current || mapRef.current) return;
    const L = leafletLib;

    const map = L.map(containerRef.current, {
      center: [coord.lat, coord.lng],
      zoom: 17,
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

    const icon = createConditionMarkerIcon(L, condition, poleId);
    L.marker([coord.lat, coord.lng], { icon }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [leafletLib, coord, condition, poleId]);

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

  return (
    <div className="relative w-full h-48 md:h-64 rounded-2xl overflow-hidden border border-slate-700/80 shadow-lg">
      <div ref={containerRef} className="w-full h-full z-0" />
      <button
        type="button"
        onClick={toggleTile}
        className="absolute top-2.5 right-2.5 z-[400] flex items-center gap-1 px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-white rounded-lg text-xs border border-slate-700 shadow backdrop-blur transition-all"
      >
        <Layers className="w-3.5 h-3.5 text-blue-400" />
        <span>{tileMode === 'street' ? 'Peta Jalan' : 'Satelit'}</span>
      </button>
    </div>
  );
}

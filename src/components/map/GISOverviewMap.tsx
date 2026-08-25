'use client';

import React, { useEffect, useRef, useState } from 'react';
import type L from 'leaflet';
import { Pole } from '@/types/pole';
import { NetworkSegment } from '@/types/segment';
import { Provider } from '@/types/provider';
import { MAP_TILE_LAYERS } from '@/lib/gis/tiles';
import { LUBUKLINGGAU_CENTER, KECAMATAN_LUBUKLINGGAU } from '@/config/lubuklinggau';
import { DEFAULT_PROVIDERS } from '@/config/providers';
import { createProviderPoleMarkerIcon } from './markerIcons';
import {
  Layers,
  Search,
  Filter,
  RotateCcw,
  MapPin,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Eye,
  X,
  Shield,
  Ruler,
  Cable,
  ArrowRight,
  Sparkles,
  Check,
  Undo2,
  Plus,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { LUBUKLINGGAU_KELURAHAN_BOUNDARIES } from '@/lib/gis/boundaries';
import {
  calculateHaversineDistance,
  calculateMidpoint,
  estimateFiberCableLength,
  formatDistance,
} from '@/lib/gis/haversine';
import { findPolesPath } from '@/lib/gis/pathfinding';

interface GISOverviewMapProps {
  poles: Pole[];
  segments?: NetworkSegment[];
  providers?: Provider[];
}

export default function GISOverviewMap({
  poles,
  segments = [],
  providers = [],
}: GISOverviewMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const segmentsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const boundariesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const measureLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);

  const [leafletLib, setLeafletLib] = useState<typeof L | null>(null);
  const [tileMode, setTileMode] = useState<'clean_satellite' | 'hybrid_survey' | 'street'>('clean_satellite');
  const [showBoundaries, setShowBoundaries] = useState(true);

  // Multi-Pole Sequential Ruler & Auto-Corridor Routing State
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [autoRouteMode, setAutoRouteMode] = useState(true); // Default to Smart Auto-Routing
  const [measuredPoles, setMeasuredPoles] = useState<Pole[]>([]);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('ALL');
  const [selectedCondition, setSelectedCondition] = useState('ALL');
  const [selectedKecamatan, setSelectedKecamatan] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [selectedPole, setSelectedPole] = useState<Pole | null>(null);

  // Load Leaflet dynamically
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

  // Initialize Map
  useEffect(() => {
    if (!leafletLib || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = leafletLib;
    const map = L.map(mapContainerRef.current, {
      center: [LUBUKLINGGAU_CENTER.lat, LUBUKLINGGAU_CENTER.lng],
      zoom: LUBUKLINGGAU_CENTER.zoom,
      maxZoom: 21,
      zoomControl: false,
    });

    const tileConfig = MAP_TILE_LAYERS[tileMode];
    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
      subdomains: tileConfig.subdomains || ['0', '1', '2', '3'],
    }).addTo(map);

    currentTileLayerRef.current = tileLayer;

    // Create Layer Groups
    markersLayerGroupRef.current = L.layerGroup().addTo(map);
    segmentsLayerGroupRef.current = L.layerGroup().addTo(map);
    measureLayerGroupRef.current = L.layerGroup().addTo(map);

    // Add Kelurahan Boundaries
    const boundaryGroup = L.layerGroup();
    LUBUKLINGGAU_KELURAHAN_BOUNDARIES.forEach((district) => {
      const polygon = L.polygon(district.polygon, {
        color: district.color,
        weight: 1.8,
        dashArray: '5, 5',
        fillColor: district.color,
        fillOpacity: 0.06,
      }).bindTooltip(district.name, {
        permanent: true,
        direction: 'center',
        className: 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/90 shadow-sm border border-slate-200/90 text-slate-800 pointer-events-none',
      });
      boundaryGroup.addLayer(polygon);
    });

    if (showBoundaries) {
      boundaryGroup.addTo(map);
    }
    boundariesLayerGroupRef.current = boundaryGroup;

    mapInstanceRef.current = map;

    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [leafletLib]);

  // Toggle Tile Layer
  const toggleTileMode = () => {
    if (!leafletLib || !mapInstanceRef.current) return;
    const nextMode =
      tileMode === 'clean_satellite'
        ? 'hybrid_survey'
        : tileMode === 'hybrid_survey'
        ? 'street'
        : 'clean_satellite';
    setTileMode(nextMode);

    if (currentTileLayerRef.current) {
      mapInstanceRef.current.removeLayer(currentTileLayerRef.current);
    }

    const tileConfig = MAP_TILE_LAYERS[nextMode];
    const newLayer = leafletLib.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
      subdomains: tileConfig.subdomains || ['0', '1', '2', '3'],
    }).addTo(mapInstanceRef.current);

    currentTileLayerRef.current = newLayer;
  };

  // Toggle Kelurahan Boundaries Overlay
  const toggleBoundaries = () => {
    if (!mapInstanceRef.current || !boundariesLayerGroupRef.current) return;
    if (showBoundaries) {
      mapInstanceRef.current.removeLayer(boundariesLayerGroupRef.current);
      setShowBoundaries(false);
    } else {
      mapInstanceRef.current.addLayer(boundariesLayerGroupRef.current);
      setShowBoundaries(true);
    }
  };

  // Toggle Measurement Mode
  const toggleMeasuring = () => {
    if (isMeasuring) {
      setIsMeasuring(false);
      setMeasuredPoles([]);
      if (measureLayerGroupRef.current) {
        measureLayerGroupRef.current.clearLayers();
      }
    } else {
      setIsMeasuring(true);
      setSelectedPole(null);
      setMeasuredPoles([]);
    }
  };

  const startMeasureFrom = (pole: Pole) => {
    setSelectedPole(null);
    setIsMeasuring(true);
    setMeasuredPoles([pole]);
  };

  // Filter Poles
  const filteredPoles = poles.filter((pole) => {
    if (selectedProvider !== 'ALL' && pole.providerId !== selectedProvider) return false;
    if (selectedCondition !== 'ALL' && pole.condition !== selectedCondition) return false;
    if (selectedKecamatan !== 'ALL' && pole.kecamatan !== selectedKecamatan) return false;
    if (selectedType !== 'ALL' && pole.poleType !== selectedType) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = pole.id.toLowerCase().includes(q);
      const matchRoad = pole.road.toLowerCase().includes(q);
      const matchKec = pole.kecamatan.toLowerCase().includes(q);
      const matchKel = pole.kelurahan.toLowerCase().includes(q);
      const matchProvider = (pole.providerName || '').toLowerCase().includes(q);
      if (!matchId && !matchRoad && !matchKec && !matchKel && !matchProvider) return false;
    }

    return true;
  });

  // Handle Pole Marker Clicks with Smart Auto-Routing
  const handlePoleClick = (pole: Pole) => {
    if (isMeasuring) {
      if (measuredPoles.length === 0) {
        setMeasuredPoles([pole]);
      } else if (measuredPoles.length === 1) {
        if (pole.id === measuredPoles[0].id) return;

        if (autoRouteMode) {
          // Smart Pathfinding: find intermediate poles automatically
          const fullPath = findPolesPath(measuredPoles[0], pole, poles, segments);
          setMeasuredPoles(fullPath);
        } else {
          setMeasuredPoles([measuredPoles[0], pole]);
        }
      } else {
        const lastPole = measuredPoles[measuredPoles.length - 1];

        // If clicking the last pole again, undo it
        if (pole.id === lastPole.id) {
          setMeasuredPoles((prev) => prev.slice(0, -1));
          return;
        }

        if (autoRouteMode) {
          // Find path from the current last pole to the newly clicked pole
          const extension = findPolesPath(lastPole, pole, poles, segments);
          // Avoid duplicate start
          setMeasuredPoles((prev) => [...prev, ...extension.slice(1)]);
        } else {
          setMeasuredPoles((prev) => [...prev, pole]);
        }
      }
    } else {
      setSelectedPole(pole);
    }
  };

  // Render Markers & Segments
  useEffect(() => {
    if (!leafletLib || !mapInstanceRef.current) return;
    const L = leafletLib;

    if (markersLayerGroupRef.current) {
      markersLayerGroupRef.current.clearLayers();
    }
    if (segmentsLayerGroupRef.current) {
      segmentsLayerGroupRef.current.clearLayers();
    }

    const poleMapById: Record<string, Pole> = {};
    poles.forEach((p) => {
      poleMapById[p.id] = p;
    });

    // Render Cable Segments (Polylines)
    if (segmentsLayerGroupRef.current) {
      segments.forEach((seg) => {
        const fromPole = poleMapById[seg.fromNodeId];
        const toPole = poleMapById[seg.toNodeId];

        if (fromPole && toPole) {
          const latlngs: [number, number][] = [
            [fromPole.poleLatitude, fromPole.poleLongitude],
            [toPole.poleLatitude, toPole.poleLongitude],
          ];

          const color = seg.installationType === 'UNDERGROUND' ? '#8b5cf6' : '#2563eb';
          const polyline = L.polyline(latlngs, {
            color,
            weight: 3.5,
            opacity: 0.85,
            dashArray: seg.installationType === 'UNDERGROUND' ? '6, 6' : undefined,
          });

          polyline.bindTooltip(
            `<b>${seg.segmentCode || seg.id}</b><br/>${seg.installationType === 'UNDERGROUND' ? 'Kabel Bawah Tanah' : 'Kabel Udara'}<br/>Est. Jarak: ${seg.estimatedDistance}m`,
            { sticky: true }
          );

          polyline.addTo(segmentsLayerGroupRef.current!);
        }
      });
    }

    // Render Pole Markers with Provider Color & Smart GIS Code
    filteredPoles.forEach((pole) => {
      const provObj =
        providers.find((pr) => pr.id === pole.providerId) ||
        DEFAULT_PROVIDERS.find((pr) => pr.id === pole.providerId);

      const markerIcon = createProviderPoleMarkerIcon(L, {
        colorHex: provObj?.colorHex || '#2563eb',
        condition: pole.condition,
        label: pole.poleCode || pole.id,
        providerCode: provObj?.code,
        category: pole.infrastructureCategory,
      });

      const marker = L.marker([pole.poleLatitude, pole.poleLongitude], {
        icon: markerIcon,
      });

      marker.on('click', () => {
        handlePoleClick(pole);
      });

      marker.addTo(markersLayerGroupRef.current!);
    });

    // Auto fit bounds if search query is entered
    if (filteredPoles.length > 0 && searchQuery) {
      const bounds = L.latLngBounds(
        filteredPoles.map((p) => [p.poleLatitude, p.poleLongitude])
      );
      mapInstanceRef.current.fitBounds(bounds, { maxZoom: 16, padding: [50, 50] });
    }
  }, [filteredPoles, segments, leafletLib, searchQuery, isMeasuring, measuredPoles, autoRouteMode]);

  // Render Multi-Pole Measurement Route & Distance Badges
  useEffect(() => {
    if (!leafletLib || !mapInstanceRef.current || !measureLayerGroupRef.current) return;
    const L = leafletLib;

    measureLayerGroupRef.current.clearLayers();

    if (measuredPoles.length === 0) return;

    // 1. Draw glowing circular halo & order badges on each measured pole
    measuredPoles.forEach((p, idx) => {
      const isStart = idx === 0;
      const isEnd = idx === measuredPoles.length - 1 && measuredPoles.length > 1;
      const isIntermediate = !isStart && !isEnd;

      const circle = L.circleMarker([p.poleLatitude, p.poleLongitude], {
        radius: isIntermediate ? 14 : 19,
        color: isStart ? '#0284c7' : isEnd ? '#059669' : '#eab308',
        fillColor: isStart ? '#38bdf8' : isEnd ? '#34d399' : '#fde047',
        fillOpacity: 0.4,
        weight: 3,
        dashArray: isIntermediate ? '2, 2' : '3, 3',
      });
      circle.addTo(measureLayerGroupRef.current!);

      // Order badge (1, 2, 3...)
      const orderIcon = L.divIcon({
        html: `
          <div class="w-5 h-5 rounded-full ${
            isStart
              ? 'bg-blue-600'
              : isEnd
              ? 'bg-emerald-600'
              : 'bg-amber-500'
          } text-white font-mono font-black text-[9px] flex items-center justify-center border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2">
            ${idx + 1}
          </div>
        `,
        className: 'custom-measure-order-badge',
        iconSize: [0, 0],
      });
      L.marker([p.poleLatitude, p.poleLongitude], { icon: orderIcon }).addTo(
        measureLayerGroupRef.current!
      );
    });

    // 2. If at least 2 poles, draw polyline and calculate individual span distances
    if (measuredPoles.length >= 2) {
      const latlngs: [number, number][] = measuredPoles.map((p) => [
        p.poleLatitude,
        p.poleLongitude,
      ]);

      // Glowing Polyline connecting all points sequentially
      const laserPolyline = L.polyline(latlngs, {
        color: '#0284c7',
        weight: 4.5,
        opacity: 0.95,
        dashArray: '6, 6',
      });
      laserPolyline.addTo(measureLayerGroupRef.current);

      // Render Distance Badge on EACH individual span midpoint
      for (let i = 0; i < measuredPoles.length - 1; i++) {
        const p1 = measuredPoles[i];
        const p2 = measuredPoles[i + 1];

        const coord1 = { lat: p1.poleLatitude, lng: p1.poleLongitude };
        const coord2 = { lat: p2.poleLatitude, lng: p2.poleLongitude };

        const spanDist = calculateHaversineDistance(coord1, coord2);
        const mid = calculateMidpoint(coord1, coord2);

        const badgeIcon = L.divIcon({
          html: `
            <div class="px-2 py-0.5 bg-slate-900/95 text-white font-mono font-black text-[10px] rounded-full border-2 border-cyan-400 shadow-xl flex items-center gap-1 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap animate-in zoom-in-90">
              <span class="text-cyan-400 text-[9px]">#${i + 1}</span>
              <span>${formatDistance(spanDist)}</span>
            </div>
          `,
          className: 'custom-span-distance-badge',
          iconSize: [0, 0],
        });

        L.marker([mid.lat, mid.lng], { icon: badgeIcon }).addTo(
          measureLayerGroupRef.current
        );
      }
    }
  }, [leafletLib, measuredPoles]);

  // Compute Total Multi-Span Distance and Individual Spans
  const spanDetails = React.useMemo(() => {
    if (measuredPoles.length < 2) return [];

    const spans = [];
    for (let i = 0; i < measuredPoles.length - 1; i++) {
      const p1 = measuredPoles[i];
      const p2 = measuredPoles[i + 1];
      const dist = calculateHaversineDistance(
        { lat: p1.poleLatitude, lng: p1.poleLongitude },
        { lat: p2.poleLatitude, lng: p2.poleLongitude }
      );
      spans.push({
        from: p1,
        to: p2,
        distance: dist,
        spanIndex: i + 1,
      });
    }
    return spans;
  }, [measuredPoles]);

  const totalMeasuredDistance = spanDetails.reduce((sum, s) => sum + s.distance, 0);

  const handleResetFilters = () => {
    setSelectedProvider('ALL');
    setSelectedCondition('ALL');
    setSelectedKecamatan('ALL');
    setSelectedType('ALL');
    setSearchQuery('');
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-100 overflow-hidden">
      {/* ============================================================ */}
      {/* TOP FLOATING CONTROLS: 2-TIER MODERN MOBILE MAP UI          */}
      {/* ============================================================ */}
      <div className="absolute top-3 left-3 right-3 z-[400] space-y-2 pointer-events-auto select-none">
        {/* Tier 1: Full-Width Clean Floating Search Bar */}
        <div className="relative w-full shadow-lg rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 flex items-center">
          <Search className="w-4 h-4 text-slate-400 ml-3.5 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ID tiang, provider, nama jalan..."
            className="w-full pl-2.5 pr-8 py-2.5 bg-transparent text-xs text-slate-800 placeholder-slate-400 font-medium outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tier 2: Floating Quick Action Chips (Horizontal Scrollable) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {/* 1. Ruler Tool Toggle */}
          <button
            type="button"
            onClick={toggleMeasuring}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl font-bold border shadow-md backdrop-blur-md whitespace-nowrap transition-all cursor-pointer ${
              isMeasuring
                ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-300 shadow-amber-500/25'
                : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>{isMeasuring ? 'Mode Ukur Jalur' : 'Ukur Jarak'}</span>
          </button>

          {/* 2. Auto-Route Toggle (when measuring) */}
          {isMeasuring && (
            <button
              type="button"
              onClick={() => setAutoRouteMode(!autoRouteMode)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl font-bold border shadow-md backdrop-blur-md whitespace-nowrap transition-all cursor-pointer ${
                autoRouteMode
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/25'
                  : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Otomatis sambungkan tiang perantara di sepanjang jalan"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{autoRouteMode ? '⚡ Jalur Tiang Otomatis' : '📐 Garis Bebas'}</span>
            </button>
          )}

          {/* 3. Filter Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl font-bold border shadow-md backdrop-blur-md whitespace-nowrap transition-all cursor-pointer ${
              selectedProvider !== 'ALL' ||
              selectedCondition !== 'ALL' ||
              selectedKecamatan !== 'ALL' ||
              selectedType !== 'ALL'
                ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/25'
                : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                selectedProvider !== 'ALL' ||
                selectedCondition !== 'ALL' ||
                selectedKecamatan !== 'ALL' ||
                selectedType !== 'ALL'
                  ? 'bg-white text-blue-700'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {filteredPoles.length}
            </span>
          </button>

          {/* 4. Kelurahan Boundaries Toggle */}
          <button
            type="button"
            onClick={toggleBoundaries}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl font-bold border shadow-md backdrop-blur-md whitespace-nowrap transition-all cursor-pointer ${
              showBoundaries
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-500/25'
                : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Tampilkan / Sembunyikan Batas Kelurahan"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Batas Wilayah</span>
          </button>

          {/* 5. Layer Map Toggle */}
          <button
            type="button"
            onClick={toggleTileMode}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl font-bold border border-slate-200 bg-white/95 text-slate-700 hover:bg-slate-50 shadow-md backdrop-blur-md whitespace-nowrap transition-all cursor-pointer"
            title="Ganti Mode Peta / Satelit"
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span className="capitalize">
              {tileMode === 'clean_satellite'
                ? 'Satelit Polos'
                : tileMode === 'hybrid_survey'
                ? 'Satelit + Jalan'
                : 'Peta Jalan'}
            </span>
          </button>
        </div>
      </div>

      {/* Multi-Pole Measurement Mode Prompt Banner */}
      {isMeasuring && (
        <div className="absolute top-24 left-3 right-3 z-[410] bg-slate-900/95 text-white border border-amber-400/80 rounded-2xl p-2.5 shadow-xl backdrop-blur-md flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-xs min-w-0">
            <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 animate-pulse">
              📏
            </div>
            <div className="min-w-0">
              <p className="font-bold text-amber-300 leading-tight truncate">
                {measuredPoles.length === 0
                  ? 'Ketuk Tiang Pertama (Titik Awal)'
                  : measuredPoles.length === 1
                  ? `Titik Awal: ${measuredPoles[0].poleCode || measuredPoles[0].id} ➔ Ketuk Tiang Tujuan`
                  : `Jalur ${measuredPoles.length} Tiang: Total ${formatDistance(totalMeasuredDistance)}`}
              </p>
              <p className="text-[10px] text-slate-300 leading-none mt-0.5 truncate">
                {measuredPoles.length < 2
                  ? autoRouteMode
                    ? '⚡ Mode Otomatis Aktif: Tiang perantara akan terhubung otomatis'
                    : 'Ketuk tiang tujuan untuk menarik garis'
                  : 'Tiang perantara terhubung otomatis, lihat rincian di bawah'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {measuredPoles.length > 0 && (
              <button
                type="button"
                onClick={() => setMeasuredPoles((prev) => prev.slice(0, -1))}
                className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-amber-300 flex items-center gap-1 text-[10px] font-bold"
                title="Hapus Titik Terakhir"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Undo</span>
              </button>
            )}
            <button
              type="button"
              onClick={toggleMeasuring}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filter Popover / Drawer */}
      {showFilterDrawer && (
        <div className="absolute top-24 left-3 right-3 z-[450] bg-white/98 border border-slate-200 rounded-3xl p-4 shadow-2xl backdrop-blur-xl text-slate-800 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 text-blue-600" /> Filter Titik Tiang GIS
            </h3>
            <button
              onClick={() => setShowFilterDrawer(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Condition Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Kondisi
              </label>
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
              >
                <option value="ALL">Semua Kondisi</option>
                <option value="GOOD">🟢 Baik</option>
                <option value="NEEDS_REPAIR">🟡 Perlu Servis</option>
                <option value="DAMAGED">🔴 Rusak</option>
              </select>
            </div>

            {/* Provider Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Provider
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
              >
                <option value="ALL">Semua Provider</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Kecamatan Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Kecamatan
              </label>
              <select
                value={selectedKecamatan}
                onChange={(e) => setSelectedKecamatan(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
              >
                <option value="ALL">Semua Kecamatan</option>
                {KECAMATAN_LUBUKLINGGAU.map((k) => (
                  <option key={k.name} value={k.name}>
                    {k.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Pole Type Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Jenis Tiang
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
              >
                <option value="ALL">Semua Jenis</option>
                <option value="BETON">Beton</option>
                <option value="BESI">Besi</option>
                <option value="KAYU">Kayu</option>
                <option value="LAINNYA">Lainnya</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-3">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFilterDrawer(false)}
              className="py-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm"
            >
              Terapkan Filter
            </button>
          </div>
        </div>
      )}

      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0 flex-1" />

      {/* Floating Multi-Pole Measurement Result Card */}
      {isMeasuring && measuredPoles.length >= 2 && (
        <div className="absolute bottom-20 sm:bottom-24 left-3.5 right-3.5 z-[450] bg-white border border-blue-300 rounded-3xl p-3.5 shadow-[0_12px_40px_rgba(15,23,42,0.22)] text-slate-800 animate-in slide-in-from-bottom-2 max-h-[52vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">
                📏
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider">
                    Hasil Pengukuran Rute ({measuredPoles.length} Tiang • {spanDetails.length} Bentangan)
                  </h4>
                  {autoRouteMode && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5" /> Otomatis
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500">
                  Akumulasi Geometri Spasial GIS Mengikuti Jalur Jalan
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMeasuredPoles((prev) => prev.slice(0, -1))}
                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title="Hapus Titik Terakhir (Undo)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setMeasuredPoles([])}
                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title="Reset Pengukuran"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 2 Main Accumulation Total Pills */}
          <div className="grid grid-cols-2 gap-2 my-2 flex-shrink-0">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/90 p-2.5 rounded-2xl border border-blue-200 text-center">
              <span className="text-[9px] font-bold text-blue-700 uppercase block">
                Total Jarak Rute (GIS Real)
              </span>
              <span className="text-base font-black text-blue-900 font-mono block mt-0.5">
                {formatDistance(totalMeasuredDistance)}
              </span>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/90 p-2.5 rounded-2xl border border-emerald-200 text-center">
              <span className="text-[9px] font-bold text-emerald-700 uppercase block">
                Total Est. Kabel FO (+10%)
              </span>
              <span className="text-base font-black text-emerald-900 font-mono block mt-0.5">
                {formatDistance(estimateFiberCableLength(totalMeasuredDistance))}
              </span>
            </div>
          </div>

          {/* Individual Span Details List (Scrollable) */}
          <div className="flex-1 overflow-y-auto space-y-1.5 my-1 pr-1 text-xs">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
              Rincian Jarak Tiap Bentangan Antar Tiang:
            </span>
            {spanDetails.map((span) => (
              <div
                key={span.spanIndex}
                className="p-2 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 font-mono font-bold text-[9px] flex items-center justify-center flex-shrink-0">
                    {span.spanIndex}
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-[11px] truncate">
                    {span.from.poleCode || span.from.id} ➔ {span.to.poleCode || span.to.id}
                  </span>
                </div>

                <span className="font-mono font-black text-blue-600 bg-white px-2 py-0.5 rounded-md border border-blue-100 text-[11px] flex-shrink-0">
                  {formatDistance(span.distance)}
                </span>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-slate-100 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                // Keep measuring mode active to tap more poles
              }}
              className="flex-1 py-2 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ketuk Tiang Lain</span>
            </button>
            <button
              type="button"
              onClick={toggleMeasuring}
              className="py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Selesai
            </button>
          </div>
        </div>
      )}

      {/* Bottom Floating Card on Selected Pole (when not measuring) */}
      {!isMeasuring && selectedPole && (
        <div className="absolute bottom-20 sm:bottom-24 left-3.5 right-3.5 z-[350] bg-white border border-slate-200/90 rounded-3xl p-3.5 shadow-[0_12px_36px_rgba(15,23,42,0.2)] text-slate-800 animate-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  selectedPole.condition === 'GOOD'
                    ? 'bg-emerald-500 ring-4 ring-emerald-100'
                    : selectedPole.condition === 'NEEDS_REPAIR'
                    ? 'bg-amber-500 ring-4 ring-amber-100'
                    : 'bg-rose-500 ring-4 ring-rose-100'
                }`}
              />
              <span className="font-black text-sm text-slate-900 font-mono">
                {selectedPole.poleCode || selectedPole.id}
              </span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-mono font-bold">
                {selectedPole.id}
              </span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-md text-[9px] font-bold uppercase">
                {selectedPole.poleType}
              </span>
            </div>
            <button
              onClick={() => setSelectedPole(null)}
              className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 mb-2 text-[10px]">
            <div className="bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block font-semibold text-[9px] uppercase">Provider</span>
              <span className="font-bold text-slate-800 truncate block mt-0.5">
                {selectedPole.providerName || selectedPole.providerId}
              </span>
            </div>
            <div className="bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block font-semibold text-[9px] uppercase">Kondisi</span>
              <span
                className={`font-bold block mt-0.5 ${
                  selectedPole.condition === 'GOOD'
                    ? 'text-emerald-600'
                    : selectedPole.condition === 'NEEDS_REPAIR'
                    ? 'text-amber-600'
                    : 'text-rose-600'
                }`}
              >
                {selectedPole.condition === 'GOOD'
                  ? 'Baik'
                  : selectedPole.condition === 'NEEDS_REPAIR'
                  ? 'Miring'
                  : 'Rusak'}
              </span>
            </div>
            <div className="bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block font-semibold text-[9px] uppercase">GPS</span>
              <span className="font-bold text-slate-800 font-mono block mt-0.5">
                {selectedPole.gpsAccuracy ? `±${selectedPole.gpsAccuracy.toFixed(0)}m` : 'OK'}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-600 mb-2.5 flex items-center gap-1.5 px-0.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span className="truncate">
              <strong className="text-slate-900">{selectedPole.road}</strong>, Kel. {selectedPole.kelurahan}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => startMeasureFrom(selectedPole)}
              className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 active:scale-[0.99] text-amber-900 border border-amber-200 font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Ruler className="w-3.5 h-3.5 text-amber-600" />
              <span>Ukur Rute</span>
            </button>

            <Link
              href={`/poles/${selectedPole.id}`}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/25 flex items-center justify-center gap-1.5 transition-all"
            >
              <span>Detail Lengkap</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

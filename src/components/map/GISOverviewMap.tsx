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
  CheckCircle2,
  Sliders,
  Settings2,
  Share2,
  Trash2,
  CheckSquare,
  Square,
  Route,
  Navigation,
  LayoutGrid,
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
import { interpolatePolesAlongPath } from '@/lib/gis/corridorInterpolation';
import { reverseGeocodeLocation } from '@/lib/gis/geocoding';
import { fetchRoadGeometry, offsetCoordinatePerpendicular } from '@/lib/gis/roadRouting';
import { Coordinates } from '@/types/gis';
import { useSupabaseRealtimePoles } from '@/hooks/useSupabaseRealtimePoles';

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
  const { poles: livePoles, refreshPoles } = useSupabaseRealtimePoles(poles);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const segmentsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const boundariesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const measureLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const corridorLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);

  const [leafletLib, setLeafletLib] = useState<typeof L | null>(null);
  const [tileMode, setTileMode] = useState<'clean_satellite' | 'hybrid_survey' | 'street'>('clean_satellite');
  const [showBoundaries, setShowBoundaries] = useState(true);

  // Multi-Pole Sequential Ruler & Auto-Corridor Routing State
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [autoRouteMode, setAutoRouteMode] = useState(true); // Default to Smart Auto-Routing
  const [measuredPoles, setMeasuredPoles] = useState<Pole[]>([]);

  // ⚡ AUTO-CORRIDOR GENERATOR (TARIK JALUR & INTERVAL OTOMATIS) STATE
  const [isCorridorMode, setIsCorridorMode] = useState(false);
  const isCorridorModeRef = useRef(false);
  isCorridorModeRef.current = isCorridorMode;

  const [corridorWaypoints, setCorridorWaypoints] = useState<Coordinates[]>([]);
  const [corridorInterval, setCorridorInterval] = useState<number>(35);
  const [corridorEqualSpacing, setCorridorEqualSpacing] = useState<boolean>(true);
  const [corridorSnapToRoad, setCorridorSnapToRoad] = useState<boolean>(true);
  const [corridorRoadSide, setCorridorRoadSide] = useState<'KIRI' | 'KANAN' | 'TENGAH'>('KIRI');
  const [corridorRoadCoords, setCorridorRoadCoords] = useState<Coordinates[]>([]);
  const [isLoadingRoadGeometry, setIsLoadingRoadGeometry] = useState<boolean>(false);
  const [corridorProviderId, setCorridorProviderId] = useState<string>('PRV_TELKOM');
  const [corridorPoleType, setCorridorPoleType] = useState<string>('BETON');
  const [corridorHeight, setCorridorHeight] = useState<string>('7m');
  const [corridorRoad, setCorridorRoad] = useState<string>('Jalan Garuda');
  const [corridorKecamatan, setCorridorKecamatan] = useState<string>(KECAMATAN_LUBUKLINGGAU[0].name);
  const [corridorKelurahan, setCorridorKelurahan] = useState<string>(KECAMATAN_LUBUKLINGGAU[0].kelurahan[0]);
  const [corridorWithCable, setCorridorWithCable] = useState<boolean>(true);
  const [isGeneratingCorridor, setIsGeneratingCorridor] = useState<boolean>(false);
  const [corridorResultToast, setCorridorResultToast] = useState<string | null>(null);

  // 🗑️ MULTI-SELECT BATCH DELETE POLES STATE
  const [isBatchDeleteMode, setIsBatchDeleteMode] = useState<boolean>(false);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<string[]>([]);
  const [isDeletingBatch, setIsDeletingBatch] = useState<boolean>(false);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('ALL');
  const [selectedCondition, setSelectedCondition] = useState('ALL');
  const [selectedKecamatan, setSelectedKecamatan] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showGoogleToolsMenu, setShowGoogleToolsMenu] = useState(false);
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
    corridorLayerGroupRef.current = L.layerGroup().addTo(map);

    // Map Click Listener for Corridor Waypoint placement
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (isCorridorModeRef.current) {
        addCorridorWaypoint({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

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

  // Add waypoint with auto reverse-geocoding for Point A
  const addCorridorWaypoint = React.useCallback((coord: Coordinates) => {
    setCorridorWaypoints((prev) => {
      const next = [...prev, coord];
      if (next.length === 1) {
        // Auto reverse-geocode Point A (Pangkal)
        reverseGeocodeLocation(coord)
          .then((geo) => {
            if (geo.road) setCorridorRoad(geo.road);
            if (geo.kecamatan) setCorridorKecamatan(geo.kecamatan);
            if (geo.kelurahan) setCorridorKelurahan(geo.kelurahan);
          })
          .catch(() => {});
      }
      return next;
    });
  }, []);

  // Fetch OSRM Road Geometry when waypoints change
  useEffect(() => {
    if (corridorWaypoints.length >= 2 && corridorSnapToRoad) {
      setIsLoadingRoadGeometry(true);
      fetchRoadGeometry(corridorWaypoints)
        .then(({ coordinates }) => {
          setCorridorRoadCoords(coordinates);
        })
        .finally(() => {
          setIsLoadingRoadGeometry(false);
        });
    } else {
      setCorridorRoadCoords(corridorWaypoints);
    }
  }, [corridorWaypoints, corridorSnapToRoad]);

  // Compute interpolated poles along road corridor with roadside offset
  const interpolatedCorridor = React.useMemo(() => {
    const rawPts = corridorRoadCoords.length >= 2 ? corridorRoadCoords : corridorWaypoints;
    if (rawPts.length < 2) return null;

    const baseResult = interpolatePolesAlongPath(
      rawPts,
      corridorInterval,
      corridorEqualSpacing
    );

    // Apply roadside perpendicular offset if requested (-2.5m for KIRI, +2.5m for KANAN)
    const offsetMeters =
      corridorRoadSide === 'KIRI' ? -2.5 : corridorRoadSide === 'KANAN' ? 2.5 : 0;

    if (offsetMeters === 0 || baseResult.poles.length === 0) {
      return baseResult;
    }

    const offsetPoles = baseResult.poles.map((p, idx) => {
      let bearing = 0;
      if (idx < baseResult.poles.length - 1) {
        const next = baseResult.poles[idx + 1].coord;
        const dLng = ((next.lng - p.coord.lng) * Math.PI) / 180;
        const lat1 = (p.coord.lat * Math.PI) / 180;
        const lat2 = (next.lat * Math.PI) / 180;
        const y = Math.sin(dLng) * Math.cos(lat2);
        const x =
          Math.cos(lat1) * Math.sin(lat2) -
          Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
        bearing = (Math.atan2(y, x) * 180) / Math.PI;
      } else if (idx > 0) {
        const prev = baseResult.poles[idx - 1].coord;
        const dLng = ((p.coord.lng - prev.lng) * Math.PI) / 180;
        const lat1 = (prev.lat * Math.PI) / 180;
        const lat2 = (p.coord.lat * Math.PI) / 180;
        const y = Math.sin(dLng) * Math.cos(lat2);
        const x =
          Math.cos(lat1) * Math.sin(lat2) -
          Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
        bearing = (Math.atan2(y, x) * 180) / Math.PI;
      }

      return {
        ...p,
        coord: offsetCoordinatePerpendicular(p.coord, bearing, offsetMeters),
      };
    });

    return {
      ...baseResult,
      poles: offsetPoles,
    };
  }, [
    corridorRoadCoords,
    corridorWaypoints,
    corridorInterval,
    corridorEqualSpacing,
    corridorRoadSide,
  ]);

  // Auto zoom/fit bounds when Point B (2 waypoints) is placed
  useEffect(() => {
    if (isCorridorMode && corridorWaypoints.length >= 2 && mapInstanceRef.current && leafletLib) {
      const bounds = leafletLib.latLngBounds(corridorWaypoints.map((p) => [p.lat, p.lng]));
      mapInstanceRef.current.fitBounds(bounds, { maxZoom: 19, padding: [70, 70] });
    }
  }, [corridorWaypoints.length, isCorridorMode, leafletLib]);

  // Render Corridor Preview Layer
  useEffect(() => {
    if (!leafletLib || !corridorLayerGroupRef.current) return;
    const L = leafletLib;
    corridorLayerGroupRef.current.clearLayers();

    if (!isCorridorMode) return;

    if (corridorWaypoints.length >= 2 && interpolatedCorridor) {
      // 1. Dotted guide line along actual road geometry
      const guidePoints = corridorRoadCoords.length >= 2 ? corridorRoadCoords : corridorWaypoints;
      const latlngs: [number, number][] = guidePoints.map((p) => [p.lat, p.lng]);
      const polyline = L.polyline(latlngs, {
        color: '#2563eb',
        weight: 4,
        dashArray: '6, 8',
        opacity: 0.85,
      });
      polyline.addTo(corridorLayerGroupRef.current);

      // 2. Interpolated Preview Markers
      interpolatedCorridor.poles.forEach((p) => {
        const isStart = p.isEndpoint === 'START';
        const isEnd = p.isEndpoint === 'END';
        const badgeColor = isStart ? '#10b981' : isEnd ? '#ef4444' : '#2563eb';
        const label = isStart ? 'A' : isEnd ? 'B' : `${p.index}`;

        const icon = L.divIcon({
          className: 'corridor-preview-marker',
          html: `
            <div style="
              width: ${isStart || isEnd ? '30px' : '26px'};
              height: ${isStart || isEnd ? '30px' : '26px'};
              background: ${badgeColor};
              border: 2.5px solid #ffffff;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-weight: 900;
              font-size: ${isStart || isEnd ? '12px' : '11px'};
              box-shadow: 0 4px 14px rgba(0,0,0,0.4);
            ">
              ${label}
            </div>
          `,
          iconSize: isStart || isEnd ? [30, 30] : [26, 26],
          iconAnchor: isStart || isEnd ? [15, 15] : [13, 13],
        });

        const marker = L.marker([p.coord.lat, p.coord.lng], { icon });
        marker.bindTooltip(
          `<b>Tiang ${p.index} ${
            isStart ? '(Titik Pangkal A)' : isEnd ? '(Titik Ujung B)' : '(Tiang Tengah)'
          }</b><br/>` +
            `📍 Jarak Bentang: <b>+${p.spanFromPrevious} m</b><br/>` +
            `📏 Jarak Kumulatif: <b>${p.distanceFromStart} m</b><br/>` +
            `🛣️ Posisi: <b>Sisi ${corridorRoadSide} Jalan</b><br/>` +
            `🏷️ Kode: <code>${p.poleCode}</code>`,
          { direction: 'top', offset: [0, -12] }
        );
        marker.addTo(corridorLayerGroupRef.current!);
      });
    } else if (corridorWaypoints.length === 1) {
      const pt = corridorWaypoints[0];
      const icon = L.divIcon({
        className: 'corridor-start-marker',
        html: `
          <div style="
            width: 28px;
            height: 28px;
            background: #10b981;
            border: 2.5px solid #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-weight: 900;
            font-size: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          ">
            A
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker([pt.lat, pt.lng], { icon });
      marker.bindTooltip('📍 <b>Titik Awal (A)</b><br/>Klik titik kedua (B) di jalan untuk otomatis memasang tiang tengah', {
        permanent: true,
        direction: 'top',
        offset: [0, -14],
      });
      marker.addTo(corridorLayerGroupRef.current);
    }
  }, [
    leafletLib,
    isCorridorMode,
    corridorWaypoints,
    corridorRoadCoords,
    corridorInterval,
    corridorEqualSpacing,
    corridorRoadSide,
    interpolatedCorridor,
  ]);

  // Toggle Corridor Generator Mode
  const toggleCorridorMode = () => {
    if (isCorridorMode) {
      setIsCorridorMode(false);
      setCorridorWaypoints([]);
      if (corridorLayerGroupRef.current) {
        corridorLayerGroupRef.current.clearLayers();
      }
    } else {
      setIsCorridorMode(true);
      setIsMeasuring(false);
      setSelectedPole(null);
      setCorridorWaypoints([]);
    }
  };

  // Batch create corridor poles & cable in Supabase
  const handleApplyCorridor = async () => {
    if (!interpolatedCorridor || interpolatedCorridor.poles.length === 0) return;

    setIsGeneratingCorridor(true);
    try {
      const selectedProv =
        providers.find((p) => p.id === corridorProviderId) ||
        DEFAULT_PROVIDERS.find((p) => p.id === corridorProviderId);

      const payload = {
        poles: interpolatedCorridor.poles.map((p) => ({
          poleLatitude: p.coord.lat,
          poleLongitude: p.coord.lng,
          poleCode: p.poleCode,
          road: corridorRoad.trim() || 'Jalan Utama',
          kelurahan: corridorKelurahan,
          kecamatan: corridorKecamatan,
          providerId: corridorProviderId,
          providerName: selectedProv?.name || 'Provider',
          poleType: corridorPoleType,
          height: corridorHeight,
          condition: 'GOOD',
          sisiJalan: 'KIRI',
          infrastructureCategory: 'FO_WIFI',
          cableInstallationType: 'UDARA',
        })),
        createSegments: corridorWithCable,
        networkType: 'FIBER_OPTIC',
        installationType: 'AERIAL',
      };

      const res = await fetch('/api/poles/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal membuat rangkaian tiang');
      }

      setCorridorResultToast(
        `🎉 Berhasil membuat ${json.data.countPoles} tiang & ${json.data.countSegments} segmen kabel!`
      );
      setIsCorridorMode(false);
      setCorridorWaypoints([]);
      if (corridorLayerGroupRef.current) {
        corridorLayerGroupRef.current.clearLayers();
      }
      refreshPoles();

      setTimeout(() => {
        setCorridorResultToast(null);
      }, 4000);
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat generate tiang');
    } finally {
      setIsGeneratingCorridor(false);
    }
  };

  // Toggle Batch Delete Mode
  const toggleBatchDeleteMode = () => {
    if (isBatchDeleteMode) {
      setIsBatchDeleteMode(false);
      setSelectedDeleteIds([]);
    } else {
      setIsBatchDeleteMode(true);
      setIsCorridorMode(false);
      setIsMeasuring(false);
      setSelectedPole(null);
      setSelectedDeleteIds([]);
    }
  };

  // Execute Batch Delete from Supabase & Google Sheets
  const handleExecuteBatchDelete = async () => {
    if (selectedDeleteIds.length === 0) return;

    const confirmMsg = `Yakin ingin menghapus ${selectedDeleteIds.length} tiang terpilih beserta segmen kabelnya dari database Supabase dan Google Sheets?`;
    if (!confirm(confirmMsg)) return;

    setIsDeletingBatch(true);
    try {
      const res = await fetch('/api/poles/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedDeleteIds }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menghapus tiang');
      }

      setCorridorResultToast(`🗑️ ${json.message}`);
      setSelectedDeleteIds([]);
      setIsBatchDeleteMode(false);
      refreshPoles();

      setTimeout(() => {
        setCorridorResultToast(null);
      }, 4000);
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat menghapus tiang');
    } finally {
      setIsDeletingBatch(false);
    }
  };

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
      setIsCorridorMode(false);
      setIsBatchDeleteMode(false);
      setSelectedPole(null);
      setMeasuredPoles([]);
    }
  };

  const startMeasureFrom = (pole: Pole) => {
    setSelectedPole(null);
    setIsMeasuring(true);
    setIsCorridorMode(false);
    setIsBatchDeleteMode(false);
    setMeasuredPoles([pole]);
  };

  // Filter Poles
  const filteredPoles = livePoles.filter((pole) => {
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

  // Handle Pole Marker Clicks with Smart Auto-Routing & Batch Delete
  const handlePoleClick = (pole: Pole) => {
    if (isBatchDeleteMode) {
      setSelectedDeleteIds((prev) =>
        prev.includes(pole.id) ? prev.filter((id) => id !== pole.id) : [...prev, pole.id]
      );
      return;
    }

    if (isCorridorMode) {
      addCorridorWaypoint({ lat: pole.poleLatitude, lng: pole.poleLongitude });
      return;
    }

    if (isMeasuring) {
      if (measuredPoles.length === 0) {
        setMeasuredPoles([pole]);
      } else if (measuredPoles.length === 1) {
        if (pole.id === measuredPoles[0].id) return;

        if (autoRouteMode) {
          // Smart Pathfinding: find intermediate poles automatically
          const fullPath = findPolesPath(measuredPoles[0], pole, livePoles, segments);
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
          const extension = findPolesPath(lastPole, pole, livePoles, segments);
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
    livePoles.forEach((p) => {
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

      const isSelectedForDelete = isBatchDeleteMode && selectedDeleteIds.includes(pole.id);

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

      // If selected for batch delete, render pulsing red selection halo
      if (isSelectedForDelete) {
        const deleteRing = L.circleMarker([pole.poleLatitude, pole.poleLongitude], {
          radius: 18,
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.4,
          weight: 3,
          dashArray: '3, 3',
        });
        deleteRing.addTo(markersLayerGroupRef.current!);
      }
    });

    // Auto fit bounds if search query is entered
    if (filteredPoles.length > 0 && searchQuery) {
      const bounds = L.latLngBounds(
        filteredPoles.map((p) => [p.poleLatitude, p.poleLongitude])
      );
      mapInstanceRef.current.fitBounds(bounds, { maxZoom: 16, padding: [50, 50] });
    }
  }, [
    filteredPoles,
    segments,
    leafletLib,
    searchQuery,
    isMeasuring,
    measuredPoles,
    autoRouteMode,
    isBatchDeleteMode,
    selectedDeleteIds,
  ]);

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
      {/* TOP GOOGLE SEARCH & 4-DOTS TOOLS MENU BAR                   */}
      {/* ============================================================ */}
      <div className="absolute top-3 left-3 right-3 z-[400] space-y-2 pointer-events-auto select-none">
        <div className="flex items-center gap-2">
          {/* Full-Width Clean Floating Search Bar */}
          <div className="relative flex-1 shadow-lg rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 flex items-center">
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
                className="p-1 mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 4-DOTS / GOOGLE APPS TOOLS MENU BUTTON */}
          <button
            type="button"
            onClick={() => setShowGoogleToolsMenu(true)}
            className={`p-2.5 rounded-2xl shadow-lg border backdrop-blur-md transition-all flex items-center justify-center cursor-pointer ${
              showGoogleToolsMenu
                ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/30'
                : 'bg-white/95 text-slate-700 hover:text-blue-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Buka Menu Alat GIS (Titik 4)"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
        </div>

        {/* Active Tool Badge Indicator (When a mode is running) */}
        {(isCorridorMode ||
          isBatchDeleteMode ||
          isMeasuring ||
          selectedProvider !== 'ALL' ||
          selectedCondition !== 'ALL' ||
          selectedKecamatan !== 'ALL' ||
          selectedType !== 'ALL') && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {isCorridorMode && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-[11px] rounded-xl shadow-md border border-blue-400/40 animate-in fade-in">
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>Mode Jalur Aktif</span>
                <button
                  type="button"
                  onClick={toggleCorridorMode}
                  className="p-0.5 hover:bg-white/20 rounded-md ml-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {isBatchDeleteMode && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white font-bold text-[11px] rounded-xl shadow-md border border-red-400/40 animate-in fade-in">
                <Trash2 className="w-3.5 h-3.5" />
                <span>Mode Hapus ({selectedDeleteIds.length})</span>
                <button
                  type="button"
                  onClick={toggleBatchDeleteMode}
                  className="p-0.5 hover:bg-white/20 rounded-md ml-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {isMeasuring && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-white font-bold text-[11px] rounded-xl shadow-md border border-amber-400/40 animate-in fade-in">
                <Ruler className="w-3.5 h-3.5" />
                <span>Mode Ukur</span>
                <button
                  type="button"
                  onClick={toggleMeasuring}
                  className="p-0.5 hover:bg-white/20 rounded-md ml-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {(selectedProvider !== 'ALL' ||
              selectedCondition !== 'ALL' ||
              selectedKecamatan !== 'ALL' ||
              selectedType !== 'ALL') && (
              <button
                type="button"
                onClick={() => setShowFilterDrawer(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 font-bold text-[11px] rounded-xl border border-blue-200 shadow-xs cursor-pointer"
              >
                <Filter className="w-3 h-3" />
                <span>Filter Aktif ({filteredPoles.length})</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* GOOGLE-STYLE 4-DOTS TOOLS POPUP ACTION SHEET                 */}
      {/* ============================================================ */}
      {showGoogleToolsMenu && (
        <div className="fixed inset-0 z-[500] bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 w-full max-w-sm max-h-[85vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Menu &amp; Alat GIS</h3>
                  <p className="text-[10px] text-slate-400">Pilih fitur pemetaan &amp; alat survei</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleToolsMenu(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid Menu Cards (Google Style) */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* 1. Auto-Corridor Generator */}
              <button
                type="button"
                onClick={() => {
                  setShowGoogleToolsMenu(false);
                  toggleCorridorMode();
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer group ${
                  isCorridorMode
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25'
                    : 'bg-slate-50 hover:bg-blue-50/50 border-slate-200 hover:border-blue-300'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 shadow-xs ${
                    isCorridorMode ? 'bg-white/20 text-white' : 'bg-blue-600 text-white'
                  }`}
                >
                  <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                </div>
                <div>
                  <h4
                    className={`font-black text-xs ${
                      isCorridorMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    Tarik Jalur Otomatis
                  </h4>
                  <p
                    className={`text-[10px] leading-tight mt-0.5 ${
                      isCorridorMode ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    Pasang tiang per interval 35m di jalan
                  </p>
                </div>
              </button>

              {/* 2. Batch Delete Tool */}
              <button
                type="button"
                onClick={() => {
                  setShowGoogleToolsMenu(false);
                  toggleBatchDeleteMode();
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer group ${
                  isBatchDeleteMode
                    ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-500/25'
                    : 'bg-slate-50 hover:bg-red-50/50 border-slate-200 hover:border-red-300'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 shadow-xs ${
                    isBatchDeleteMode ? 'bg-white/20 text-white' : 'bg-red-600 text-white'
                  }`}
                >
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4
                    className={`font-black text-xs ${
                      isBatchDeleteMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    Pilih &amp; Hapus Massal
                  </h4>
                  <p
                    className={`text-[10px] leading-tight mt-0.5 ${
                      isBatchDeleteMode ? 'text-red-100' : 'text-slate-500'
                    }`}
                  >
                    Pilih beberapa pin tiang untuk dihapus
                  </p>
                </div>
              </button>

              {/* 3. Measurement Tool */}
              <button
                type="button"
                onClick={() => {
                  setShowGoogleToolsMenu(false);
                  toggleMeasuring();
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer group ${
                  isMeasuring
                    ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/25'
                    : 'bg-slate-50 hover:bg-amber-50/50 border-slate-200 hover:border-amber-300'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 shadow-xs ${
                    isMeasuring ? 'bg-white/20 text-white' : 'bg-amber-500 text-white'
                  }`}
                >
                  <Ruler className="w-5 h-5" />
                </div>
                <div>
                  <h4
                    className={`font-black text-xs ${
                      isMeasuring ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    Ukur Jarak Spasial
                  </h4>
                  <p
                    className={`text-[10px] leading-tight mt-0.5 ${
                      isMeasuring ? 'text-amber-100' : 'text-slate-500'
                    }`}
                  >
                    Hitung bentang kabel antar-tiang
                  </p>
                </div>
              </button>

              {/* 4. Filter Drawer */}
              <button
                type="button"
                onClick={() => {
                  setShowGoogleToolsMenu(false);
                  setShowFilterDrawer(true);
                }}
                className="p-3 rounded-2xl border bg-slate-50 hover:bg-blue-50/50 border-slate-200 hover:border-blue-300 text-left flex flex-col justify-between transition-all cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 shadow-xs">
                  <Filter className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-xs text-slate-900">
                    Filter Data Tiang
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    Provider, kondisi, &amp; kecamatan
                  </p>
                </div>
              </button>
            </div>

            {/* Map Layers Section */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Pengaturan Layer Peta
              </h4>

              {/* Layer Mode Switch */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Tipe Layer Peta
                    </span>
                    <span className="text-[10px] text-slate-500 block capitalize">
                      {tileMode === 'clean_satellite'
                        ? 'Google Satelit Polos'
                        : tileMode === 'hybrid_survey'
                        ? 'Satelit + Jalan (Hybrid)'
                        : 'Peta Jalan (Street)'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleTileMode}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-blue-700 font-bold text-xs rounded-xl shadow-2xs cursor-pointer"
                >
                  Ganti Mode
                </button>
              </div>

              {/* Boundaries Overlay Switch */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Batas Kelurahan
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {showBoundaries ? 'Aktif (Terlihat)' : 'Nonaktif'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleBoundaries}
                  className={`px-2.5 py-1 font-bold text-xs rounded-xl shadow-2xs cursor-pointer transition-all ${
                    showBoundaries
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-700'
                  }`}
                >
                  {showBoundaries ? 'Sembunyikan' : 'Tampilkan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Result Toast Notification */}
      {corridorResultToast && (
        <div className="absolute top-16 left-4 right-4 z-[600] bg-emerald-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500 flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="text-xs font-bold">{corridorResultToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setCorridorResultToast(null)}
            className="text-emerald-300 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. SLIM INSTRUCTION BANNER (When picking Point A or Point B) */}
      {isCorridorMode && corridorWaypoints.length < 2 && (
        <div className="absolute top-24 left-3.5 right-3.5 z-[450] bg-slate-900/95 text-white border border-blue-500/60 rounded-3xl p-3.5 shadow-2xl backdrop-blur-xl flex items-center justify-between animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-md ${
              corridorWaypoints.length === 0 ? 'bg-blue-600 animate-pulse' : 'bg-emerald-600 animate-pulse'
            }`}>
              {corridorWaypoints.length === 0 ? '1' : '2'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-black text-xs uppercase tracking-wider text-white">
                  {corridorWaypoints.length === 0
                    ? 'Langkah 1: Ketuk Titik Pangkal (A)'
                    : 'Langkah 2: Ketuk Titik Ujung (B)'}
                </h4>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-500/30 text-blue-300 border border-blue-400/30">
                  ⚡ Auto-Corridor
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-tight mt-0.5">
                {corridorWaypoints.length === 0
                  ? 'Sentuh posisi awal jalur tiang di peta jalan'
                  : 'Titik A terkunci! Sentuh titik ujung jalan untuk memasang tiang tengah otomatis'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {corridorWaypoints.length === 1 && (
              <button
                type="button"
                onClick={() => setCorridorWaypoints([])}
                className="px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-amber-300 font-bold text-[10px] rounded-xl flex items-center gap-1 cursor-pointer"
                title="Reset Titik A"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Reset A</span>
              </button>
            )}
            <button
              type="button"
              onClick={toggleCorridorMode}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer"
              title="Tutup Mode Jalur"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. FULL CORRIDOR CONFIGURATION DRAWER (Only appears AFTER Point A and Point B are clicked!) */}
      {isCorridorMode && corridorWaypoints.length >= 2 && (
        <div className="absolute bottom-20 sm:bottom-24 left-3.5 right-3.5 z-[480] bg-white/98 backdrop-blur-xl border border-blue-300 rounded-3xl p-4 shadow-[0_12px_45px_rgba(15,23,42,0.28)] text-slate-800 animate-in slide-in-from-bottom-3 max-h-[64vh] flex flex-col overflow-y-auto space-y-3.5">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/25">
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              </div>
              <div>
                <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider">
                  Pengaturan Interval &amp; Tiang Tengah
                </h4>
                <span className="text-[10px] text-slate-500 block leading-tight font-medium">
                  Titik A &amp; B Terhubung • Est. {formatDistance(interpolatedCorridor?.totalDistance || 0)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCorridorWaypoints((prev) => prev.slice(0, -1))}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                title="Hapus Titik Terakhir (Undo)"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ubah Titik B</span>
              </button>
              <button
                type="button"
                onClick={toggleCorridorMode}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mode Selector: Bagi Rata Presisi vs Interval Tetap */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Metode Penempatan Tiang Tengah:
            </span>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setCorridorEqualSpacing(true)}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  corridorEqualSpacing
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>⚖️ Bagi Rata Presisi</span>
              </button>
              <button
                type="button"
                onClick={() => setCorridorEqualSpacing(false)}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  !corridorEqualSpacing
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📏 Interval Tetap</span>
              </button>
            </div>
          </div>

          {/* Interval Quick Selector & Custom Input */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[10px] font-bold text-slate-600 uppercase">
                Target Jarak Antar-Tiang:
              </span>
              <div className="flex items-center gap-1 font-mono font-black text-blue-700 text-xs">
                <input
                  type="number"
                  min="5"
                  max="200"
                  value={corridorInterval}
                  onChange={(e) => setCorridorInterval(Math.max(5, parseInt(e.target.value) || 5))}
                  className="w-14 px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded-lg text-center font-bold text-blue-900 outline-none"
                />
                <span>Meter</span>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {[20, 25, 30, 35, 40, 50].map((dist) => (
                <button
                  key={dist}
                  type="button"
                  onClick={() => setCorridorInterval(dist)}
                  className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center ${
                    corridorInterval === dist
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80'
                  }`}
                >
                  {dist}m
                </button>
              ))}
            </div>
          </div>

          {/* Live Calculated Stats Banner with Span Breakdown */}
          {interpolatedCorridor && interpolatedCorridor.poles.length > 0 && (
            <div className="p-3 bg-gradient-to-r from-blue-50 via-indigo-50 to-cyan-50 border border-blue-200 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase block">
                    Hasil Kalkulasi Spasial:
                  </span>
                  <span className="text-sm font-black text-blue-950 font-mono">
                    {interpolatedCorridor.poles.length} Tiang Total
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    (2 Titik Ujung + {Math.max(0, interpolatedCorridor.poles.length - 2)} Tiang Tengah)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Panjang Jalur:
                  </span>
                  <span className="text-sm font-black text-slate-900 font-mono">
                    {formatDistance(interpolatedCorridor.totalDistance)}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold block">
                    {interpolatedCorridor.segmentCount} bentang @ ~{interpolatedCorridor.averageSpan}m
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Attributes Setup (Grid) */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Provider Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Provider / Operator
              </label>
              <select
                value={corridorProviderId}
                onChange={(e) => setCorridorProviderId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
              >
                {DEFAULT_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Pole Type */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Jenis Tiang
              </label>
              <select
                value={corridorPoleType}
                onChange={(e) => setCorridorPoleType(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
              >
                <option value="BETON">Tiang Beton (7m)</option>
                <option value="BESI">Tiang Besi / Galvanis</option>
                <option value="KAYU">Tiang Kayu</option>
              </select>
            </div>

            {/* Road Name */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Nama Jalan / Ruas
              </label>
              <input
                type="text"
                value={corridorRoad}
                onChange={(e) => setCorridorRoad(e.target.value)}
                placeholder="e.g. Jl. Garuda"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
              />
            </div>

            {/* Kelurahan */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Kelurahan
              </label>
              <select
                value={corridorKelurahan}
                onChange={(e) => setCorridorKelurahan(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
              >
                {KECAMATAN_LUBUKLINGGAU.flatMap((k) => k.kelurahan).map((kel) => (
                  <option key={kel} value={kel}>
                    {kel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sisi Jalan (Side of Road) Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Posisi Sisi Jalan (Mencegah Tiang Menyebrang):
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-2xl text-center">
              {(['KIRI', 'TENGAH', 'KANAN'] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => setCorridorRoadSide(side)}
                  className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    corridorRoadSide === side
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {side === 'KIRI' ? '◀ Sisi Kiri' : side === 'KANAN' ? 'Sisi Kanan ▶' : '● As Jalan'}
                </button>
              ))}
            </div>
          </div>

          {/* Road Snapping & Cable Interconnect Options */}
          <div className="space-y-1.5 pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={corridorSnapToRoad}
                onChange={(e) => setCorridorSnapToRoad(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-md border-slate-300"
              />
              <span className="font-bold text-[11px] flex items-center gap-1">
                🛣️ Ikuti Kelokan Garis Jalan Otomatis (OSRM Road Snapping)
                {isLoadingRoadGeometry && (
                  <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin ml-1" />
                )}
              </span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={corridorWithCable}
                onChange={(e) => setCorridorWithCable(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-md border-slate-300"
              />
              <span className="font-bold text-[11px]">
                🔗 Hubungkan kabel antar-tiang sekaligus (Topologi Fiber Optic)
              </span>
            </label>
          </div>

          {/* Action Apply Button */}
          <div className="pt-1 flex gap-2">
            <button
              type="button"
              disabled={
                !interpolatedCorridor ||
                interpolatedCorridor.poles.length < 2 ||
                isGeneratingCorridor
              }
              onClick={handleApplyCorridor}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 active:scale-[0.99] disabled:opacity-50 text-white font-black text-xs rounded-2xl shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isGeneratingCorridor ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>
                    Membuat {interpolatedCorridor?.poles.length} Tiang di Supabase...
                  </span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>
                    🚀 TERAPKAN &amp; PASANG ({interpolatedCorridor ? interpolatedCorridor.poles.length : 0} TIANG)
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCorridorWaypoints([])}
              className="px-3.5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-colors cursor-pointer"
            >
              Reset Titik
            </button>
          </div>
        </div>
      )}

      {/* Floating Multi-Select Batch Delete Bar */}
      {isBatchDeleteMode && (
        <div className="absolute bottom-20 sm:bottom-24 left-3.5 right-3.5 z-[490] bg-slate-950/95 text-white border border-red-500/60 rounded-3xl p-4 shadow-[0_12px_40px_rgba(239,68,68,0.25)] backdrop-blur-xl flex flex-col gap-3 animate-in slide-in-from-bottom-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-2xl bg-red-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-600/30">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-black text-xs uppercase tracking-wider text-white">
                  Mode Pilih &amp; Hapus Massal
                </h4>
                <p className="text-[11px] text-slate-300 leading-tight">
                  {selectedDeleteIds.length === 0
                    ? 'Ketuk pin tiang di peta untuk memilih tiang yang ingin dihapus'
                    : `${selectedDeleteIds.length} tiang terpilih untuk dihapus`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsBatchDeleteMode(false);
                setSelectedDeleteIds([]);
              }}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer"
              title="Tutup Mode Hapus"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedDeleteIds(filteredPoles.map((p) => p.id))}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 font-bold rounded-xl text-[10px] cursor-pointer"
              >
                Pilih Semua ({filteredPoles.length})
              </button>
              {selectedDeleteIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedDeleteIds([])}
                  className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-slate-400 font-bold rounded-xl text-[10px] cursor-pointer"
                >
                  Kosongkan
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={selectedDeleteIds.length === 0 || isDeletingBatch}
              onClick={handleExecuteBatchDelete}
              className="py-2.5 px-4 bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {isDeletingBatch ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus {selectedDeleteIds.length} Tiang Terpilih</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

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

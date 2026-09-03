'use client';

import React, { useEffect, useRef, useState, useMemo, useDeferredValue } from 'react';
import type L from 'leaflet';
import {
  Pole,
  InfrastructureCategory,
  PoleCondition,
  OwnershipStatus,
  CableInstallationType,
  LampuPjuType,
  LampuPjuCondition,
} from '@/types/pole';
import { NetworkSegment } from '@/types/segment';
import { Provider } from '@/types/provider';
import { MAP_TILE_LAYERS } from '@/lib/gis/tiles';
import { LUBUKLINGGAU_CENTER, KECAMATAN_LUBUKLINGGAU } from '@/config/lubuklinggau';
import { DEFAULT_PROVIDERS, resolveProviderInfo } from '@/config/providers';
import { createProviderPoleMarkerIcon, createUserGpsMarkerIcon } from './markerIcons';
import {
  Layers,
  Search,
  Filter,
  RotateCcw,
  RotateCw,
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
  HelpCircle,
  Compass,
  Locate,
  LocateFixed,
  Crosshair,
  Copy,
  Radio,
  Smartphone,
  Monitor,
  Maximize2,
  Minimize2,
  Lock,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useViewMode } from '@/context/ViewModeContext';
import { useAuth } from '@/context/AuthContext';
import GISApiQuotaExceededLock from '@/components/common/GISApiQuotaExceededLock';
import { LUBUKLINGGAU_KELURAHAN_BOUNDARIES } from '@/lib/gis/boundaries';
import MapPinLegendModal from './MapPinLegendModal';
import {
  calculateHaversineDistance,
  calculateMidpoint,
  estimateFiberCableLength,
  formatDistance,
} from '@/lib/gis/haversine';
import { findPolesPath } from '@/lib/gis/pathfinding';
import { interpolatePolesAlongPath } from '@/lib/gis/corridorInterpolation';
import { reverseGeocodeLocation, getKecamatanCode, getKelurahanCode } from '@/lib/gis/geocoding';
import { fetchRoadGeometry, offsetCoordinatePerpendicular } from '@/lib/gis/roadRouting';
import { Coordinates } from '@/types/gis';
import { useSupabaseRealtimePoles } from '@/hooks/useSupabaseRealtimePoles';

interface GISOverviewMapProps {
  poles: Pole[];
  segments?: NetworkSegment[];
  providers?: Provider[];
  initialProvider?: string;
  initialQuery?: string;
  initialCondition?: string;
  initialCategory?: string;
  initialSurveyor?: string;
  initialKecamatan?: string;
  initialKelurahan?: string;
  initialSurveyDate?: string;
  initialType?: string;
  isLicenseLocked?: boolean;
  licenseReason?: string;
}

interface MapRenderBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

interface MapRenderState {
  zoom: number;
  bounds: MapRenderBounds;
}

interface ActiveSurveyorLocation {
  userId: string;
  userName: string;
  roleLabel?: string;
  team?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  updatedAt?: string;
  distanceMeters?: number;
}

const DETAIL_MARKER_ZOOM = 17;
const LABEL_MARKER_ZOOM = 18;
const MAX_DETAILED_MARKERS = 220;
const VIEWPORT_PADDING_RATIO = 0.45;
const SEGMENT_MIN_ZOOM = 15;

function poleIsInsideBounds(pole: Pole, bounds: MapRenderBounds) {
  return (
    pole.poleLatitude >= bounds.south &&
    pole.poleLatitude <= bounds.north &&
    pole.poleLongitude >= bounds.west &&
    pole.poleLongitude <= bounds.east
  );
}

function getPoleSurveyorLabel(pole: Pole) {
  return (pole.surveyorName || pole.surveyorId || 'Tidak diketahui').trim();
}

function escapeMapHtml(value?: string | number | null) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getSurveyorInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || 'U') + (parts[1]?.[0] || '')).toUpperCase();
}

function createTeamLocationIcon(LInstance: typeof L, location: ActiveSurveyorLocation) {
  const color = location.team === 'BAPENDA' ? '#059669' : '#2563eb';
  const initials = escapeMapHtml(getSurveyorInitials(location.userName));
  return LInstance.divIcon({
    className: 'active-team-location-marker',
    html: `
      <div class="relative flex items-center justify-center select-none pointer-events-none" style="width:46px;height:46px;">
        <div class="absolute w-11 h-11 rounded-full opacity-20 animate-ping" style="background:${color}"></div>
        <div class="relative w-9 h-9 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white text-[10px] font-black ring-2 ring-white/30" style="background:${color}">
          ${initials}
        </div>
      </div>
    `,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -20],
  });
}

export default function GISOverviewMap({
  poles,
  segments = [],
  providers = [],
  initialProvider,
  initialQuery,
  initialCondition,
  initialCategory,
  initialSurveyor,
  initialKecamatan,
  initialKelurahan,
  initialSurveyDate,
  initialType,
  isLicenseLocked = false,
  licenseReason,
}: GISOverviewMapProps) {
  const { user } = useAuth();
  const { poles: livePoles, refreshPoles } = useSupabaseRealtimePoles(poles);
  const { viewMode, toggleViewMode, isFullscreen, toggleFullscreen } = useViewMode();
  const [isLocked, setIsLocked] = useState<boolean>(isLicenseLocked);
  const [lockReason, setLockReason] = useState<string>(
    licenseReason ||
      'Masa Uji Coba (Trial Period) Server GIS Telah Berakhir. Kapasitas kuota data infrastruktur telah melebihi batas paket dasar.'
  );

  useEffect(() => {
    // Dynamic real-time license check
    fetch('/api/system/license', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setIsLocked(!!d.isLocked);
          if (d.reason) setLockReason(d.reason);
        }
      })
      .catch(() => {});
  }, []);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const selectionLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const segmentsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const boundariesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const measureLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const corridorLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const activeSurveyorLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const activeSurveyorMarkersRef = useRef<Map<string, any>>(new Map());
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);
  const markerIconCacheRef = useRef<Map<string, L.DivIcon>>(new Map());

  const [leafletLib, setLeafletLib] = useState<typeof L | null>(null);
  const [tileMode, setTileMode] = useState<'clean_satellite' | 'hybrid_survey' | 'street'>('clean_satellite');
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [showLegendModal, setShowLegendModal] = useState(false);
  const [mapRenderState, setMapRenderState] = useState<MapRenderState | null>(null);

  // Invalidate Leaflet Map Size when switching between Desktop full-width & Mobile mode
  useEffect(() => {
    if (mapInstanceRef.current) {
      const timers = [50, 150, 300, 500];
      timers.forEach((t) => {
        setTimeout(() => {
          mapInstanceRef.current?.invalidateSize();
        }, t);
      });
    }
  }, [viewMode, isFullscreen]);

  // Merge default providers with any custom provider records passed
  const providerById = useMemo(() => {
    const map = new Map<string, Provider>();
    DEFAULT_PROVIDERS.forEach((p) => map.set(p.id, p));
    providers.forEach((p) => map.set(p.id, { ...map.get(p.id), ...p }));
    return map;
  }, [providers]);

  const allCombinedProviders = useMemo(() => Array.from(providerById.values()), [providerById]);

  const surveyorOptions = useMemo(() => {
    const counts = new Map<string, number>();
    livePoles.forEach((pole) => {
      const label = getPoleSurveyorLabel(pole);
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [livePoles]);

  const livePoleById = useMemo(() => {
    const map: Record<string, Pole> = {};
    livePoles.forEach((pole) => {
      map[pole.id] = pole;
    });
    return map;
  }, [livePoles]);

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
  const [corridorCategory, setCorridorCategory] = useState<InfrastructureCategory>('FO_WIFI');
  const [corridorPoleType, setCorridorPoleType] = useState<string>('BETON');
  const [corridorHeight, setCorridorHeight] = useState<string>('5m');
  const [corridorCondition, setCorridorCondition] = useState<PoleCondition>('GOOD');
  const [corridorOwnershipStatus, setCorridorOwnershipStatus] = useState<OwnershipStatus>('SENDIRI');
  const [corridorCableInstallationType, setCorridorCableInstallationType] = useState<CableInstallationType>('UDARA');
  const [corridorHasNetworkCable, setCorridorHasNetworkCable] = useState<boolean>(false);
  const [corridorPjuLampType, setCorridorPjuLampType] = useState<LampuPjuType>('LED');
  const [corridorPjuLampPower, setCorridorPjuLampPower] = useState<string>('90W');
  const [corridorPjuLampCondition, setCorridorPjuLampCondition] = useState<LampuPjuCondition>('MENYALA_NORMAL');
  const [corridorHasKwhMeter, setCorridorHasKwhMeter] = useState<boolean>(false);
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
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = useMemo(
    () => deferredSearchQuery.toLowerCase().trim(),
    [deferredSearchQuery]
  );
  const [selectedProvider, setSelectedProvider] = useState(initialProvider || 'ALL');
  const [selectedCondition, setSelectedCondition] = useState(initialCondition || 'ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'ALL'); // FO_WIFI, PJU_MANDIRI, GABUNG_PLN_PJU, PLN_MURNI, etc.
  const [selectedSurveyor, setSelectedSurveyor] = useState(initialSurveyor || 'ALL');
  const [selectedPjuCableFilter, setSelectedPjuCableFilter] = useState<'ALL' | 'WITH_CABLE' | 'WITHOUT_CABLE'>('ALL');
  const [selectedKecamatan, setSelectedKecamatan] = useState(initialKecamatan || 'ALL');
  const [selectedKelurahan, setSelectedKelurahan] = useState(initialKelurahan || 'ALL');
  const [selectedSurveyDate, setSelectedSurveyDate] = useState<string>(initialSurveyDate || 'ALL');
  const [selectedType, setSelectedType] = useState(initialType || 'ALL');
  const [selectedHeight, setSelectedHeight] = useState('ALL'); // ALL, 5m, 6m, 7m, 9m, 12m
  const [selectedCableType, setSelectedCableType] = useState('ALL'); // UDARA, BAWAH_TANAH, TRANSISI_RISER
  const [selectedHazard, setSelectedHazard] = useState<'ALL' | 'HAZARD_ONLY' | 'TILTED' | 'MESSY' | 'LOW'>('ALL');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showGoogleToolsMenu, setShowGoogleToolsMenu] = useState(false);
  const [selectedPole, setSelectedPole] = useState<Pole | null>(null);

  // 📍 GPS LIVE SURVEYOR LOCATION & TRACKING STATE
  const userLocationLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    heading: number | null;
    speed: number | null;
    timestamp: number;
  } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isLiveTracking, setIsLiveTracking] = useState<boolean>(false);
  const [isFollowMe, setIsFollowMe] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isCopiedCoords, setIsCopiedCoords] = useState<boolean>(false);
  const [showGpsHud, setShowGpsHud] = useState<boolean>(false);
  const [activeSurveyors, setActiveSurveyors] = useState<ActiveSurveyorLocation[]>([]);
  const [showActiveSurveyors, setShowActiveSurveyors] = useState<boolean>(true);

  // 🔒 HAK AKSES KHUSUS: Hanya user dari Tim KOMINFO yang boleh melihat posisi seluruh petugas
  const isKominfoUser = useMemo(() => {
    if (!user) return false;
    if (user.role === 'ADMIN_KOMINFO') return true;
    if (user.team === 'KOMINFO') return true;
    const agencyLower = (user.agency || '').toLowerCase();
    return agencyLower.includes('kominfo') || agencyLower.includes('komunikasi');
  }, [user]);

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

  // ⚡ INFRA-AI Map Action Listener (Auto-filter & Auto-pan on AI voice / chat commands)
  useEffect(() => {
    const handleAiAction = (e: any) => {
      const detail = e.detail || {};
      if (detail.reset) {
        setSelectedProvider('ALL');
        setSelectedCondition('ALL');
        setSelectedCategory('ALL');
        setSelectedKecamatan('ALL');
        setSelectedKelurahan('ALL');
        setSelectedSurveyor('ALL');
        setSelectedSurveyDate('ALL');
        setSelectedType('ALL');
        setSelectedHazard('ALL');
        setSearchQuery('');
        return;
      }
      if (detail.providerId !== undefined) {
        setSelectedProvider(detail.providerId);
      }
      if (detail.condition !== undefined) {
        setSelectedCondition(detail.condition);
      }
      if (detail.category !== undefined) {
        setSelectedCategory(detail.category);
      }
      if (detail.kecamatan !== undefined) {
        setSelectedKecamatan(detail.kecamatan);
      }
      if (detail.kelurahan !== undefined) {
        setSelectedKelurahan(detail.kelurahan);
      }
      if (detail.surveyor !== undefined) {
        setSelectedSurveyor(detail.surveyor);
      }
      if (detail.surveyorName !== undefined) {
        setSelectedSurveyor(detail.surveyorName);
      }
      if (detail.date !== undefined) {
        setSelectedSurveyDate(detail.date);
      }
      if (detail.surveyDate !== undefined) {
        setSelectedSurveyDate(detail.surveyDate);
      }
      if (detail.typeFilter !== undefined) {
        setSelectedType(detail.typeFilter);
      }
      if (detail.search !== undefined) {
        setSearchQuery(detail.search);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('gis:ai-action', handleAiAction as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('gis:ai-action', handleAiAction as EventListener);
      }
    };
  }, []);

  // Cleanup map instance if locked
  useEffect(() => {
    if (isLocked && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
  }, [isLocked]);

  // Initialize Map
  useEffect(() => {
    if (isLocked || !leafletLib || !mapContainerRef.current || mapInstanceRef.current) return;

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
    selectionLayerGroupRef.current = L.layerGroup().addTo(map);
    measureLayerGroupRef.current = L.layerGroup().addTo(map);
    corridorLayerGroupRef.current = L.layerGroup().addTo(map);
    userLocationLayerGroupRef.current = L.layerGroup().addTo(map);
    activeSurveyorLayerGroupRef.current = L.layerGroup().addTo(map);

    // Map Click Listener for Corridor Waypoint placement
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (isCorridorModeRef.current) {
        addCorridorWaypoint({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    const syncMapRenderState = () => {
      const paddedBounds = map.getBounds().pad(VIEWPORT_PADDING_RATIO);
      setMapRenderState({
        zoom: map.getZoom(),
        bounds: {
          south: paddedBounds.getSouth(),
          west: paddedBounds.getWest(),
          north: paddedBounds.getNorth(),
          east: paddedBounds.getEast(),
        },
      });
    };

    map.on('moveend zoomend', syncMapRenderState);
    syncMapRenderState();

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
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      map.remove();
      mapInstanceRef.current = null;
      selectionLayerGroupRef.current = null;
      activeSurveyorLayerGroupRef.current = null;
      setMapRenderState(null);
    };
  }, [leafletLib]);

  useEffect(() => {
    // 🔒 Jika bukan tim KOMINFO (misal BAPENDA), jangan fetch maupun tampilkan lokasi petugas lain
    if (!isKominfoUser) {
      setActiveSurveyors([]);
      if (activeSurveyorLayerGroupRef.current) {
        activeSurveyorLayerGroupRef.current.clearLayers();
        activeSurveyorMarkersRef.current.clear();
      }
      return;
    }

    let cancelled = false;
    const fetchActiveSurveyors = async () => {
      try {
        const lat = userLocation?.latitude ?? LUBUKLINGGAU_CENTER.lat;
        const lng = userLocation?.longitude ?? LUBUKLINGGAU_CENTER.lng;
        const exclude = user?.id ? `&excludeUserId=${encodeURIComponent(user.id)}` : '';
        const requesterInfo = `&requesterTeam=KOMINFO&requesterRole=${encodeURIComponent(user?.role || '')}`;
        const res = await fetch(`/api/surveyors/active?lat=${lat}&lng=${lng}${exclude}${requesterInfo}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (!cancelled && json.success) {
          setActiveSurveyors(json.data || []);
        }
      } catch (_) {
        if (!cancelled) setActiveSurveyors([]);
      }
    };

    fetchActiveSurveyors();
    // ⚡ Polling cepat setiap 4 detik untuk memantau pergerakan realtime
    const intervalId = window.setInterval(fetchActiveSurveyors, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isKominfoUser, user?.id, user?.role, userLocation?.latitude, userLocation?.longitude]);

  useEffect(() => {
    if (!leafletLib || !mapInstanceRef.current || !activeSurveyorLayerGroupRef.current) return;
    const L = leafletLib;
    const group = activeSurveyorLayerGroupRef.current;

    if (!isKominfoUser || !showActiveSurveyors) {
      group.clearLayers();
      activeSurveyorMarkersRef.current.clear();
      return;
    }

    const currentMarkerMap = activeSurveyorMarkersRef.current;
    const incomingUserIds = new Set<string>();

    activeSurveyors.forEach((location) => {
      incomingUserIds.add(location.userId);
      const existingMarker = currentMarkerMap.get(location.userId);

      const popupHtml = `
        <div style="min-width:175px">
          <strong>${escapeMapHtml(location.userName)}</strong><br/>
          <span>${escapeMapHtml(location.team || 'TIM')}</span><br/>
          <small>GPS: ${escapeMapHtml(location.accuracy ? `±${Math.round(location.accuracy)}m` : '-')}</small><br/>
          ${
            typeof location.distanceMeters === 'number'
              ? `<b>Jarak: ${escapeMapHtml(formatDistance(location.distanceMeters))}</b>`
              : ''
          }
        </div>
      `;

      if (existingMarker) {
        // ✨ Pergerakan halus: geser marker ke koordinat baru tanpa render ulang
        existingMarker.setLatLng([location.latitude, location.longitude]);
        existingMarker.setIcon(createTeamLocationIcon(L, location));
        existingMarker.setPopupContent(popupHtml);
      } else {
        const marker = L.marker([location.latitude, location.longitude], {
          icon: createTeamLocationIcon(L, location),
          zIndexOffset: 1300,
        }).bindPopup(popupHtml);

        group.addLayer(marker);
        currentMarkerMap.set(location.userId, marker);
      }
    });

    // 🛑 Bersihkan marker user yang sudah offline / keluar aplikasi
    currentMarkerMap.forEach((marker, uid) => {
      if (!incomingUserIds.has(uid)) {
        group.removeLayer(marker);
        currentMarkerMap.delete(uid);
      }
    });
  }, [activeSurveyors, showActiveSurveyors, isKominfoUser, leafletLib]);

  // 📍 GPS Location Trigger & Realtime Tracking
  const startLocating = (centerMap: boolean = true) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('Perangkat Anda tidak mendukung fitur GPS Geolocation.');
      return;
    }

    setIsLocating(true);
    setGpsError(null);
    setShowGpsHud(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setIsLiveTracking(true);
        const { latitude, longitude, accuracy, heading, speed } = pos.coords;
        const locData = {
          latitude,
          longitude,
          accuracy: accuracy || 5,
          heading: heading || null,
          speed: speed || null,
          timestamp: pos.timestamp,
        };
        setUserLocation(locData);

        if (mapInstanceRef.current && centerMap) {
          mapInstanceRef.current.flyTo([latitude, longitude], 18, { animate: true, duration: 1.2 });
        }
      },
      (err) => {
        setIsLocating(false);
        setGpsError(`Gagal memperoleh sinyal GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, heading, speed } = pos.coords;
        const locData = {
          latitude,
          longitude,
          accuracy: accuracy || 5,
          heading: heading || null,
          speed: speed || null,
          timestamp: pos.timestamp,
        };
        setUserLocation(locData);

        if (isFollowMe && mapInstanceRef.current) {
          mapInstanceRef.current.panTo([latitude, longitude], { animate: true, duration: 0.5 });
        }
      },
      (err) => {
        console.warn('GPS continuous watch notice:', err);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
    );
  };

  const stopLocating = () => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLiveTracking(false);
    setIsFollowMe(false);
    if (userLocationLayerGroupRef.current) {
      userLocationLayerGroupRef.current.clearLayers();
    }
  };

  // 📍 Render User Location Pin & Accuracy Circle on Map
  useEffect(() => {
    if (!leafletLib || !mapInstanceRef.current || !userLocationLayerGroupRef.current) return;
    const L = leafletLib;
    const group = userLocationLayerGroupRef.current;
    group.clearLayers();

    if (!userLocation) return;

    const { latitude, longitude, accuracy, heading } = userLocation;

    // 1. Accuracy Circle
    const accuracyCircle = L.circle([latitude, longitude], {
      radius: Math.max(accuracy, 3),
      color: '#2563eb',
      fillColor: '#3b82f6',
      fillOpacity: 0.14,
      weight: 1.5,
      dashArray: '4, 4',
    });
    group.addLayer(accuracyCircle);

    // 2. User GPS Marker
    const userMarker = L.marker([latitude, longitude], {
      icon: createUserGpsMarkerIcon(L, { heading, accuracy }),
      zIndexOffset: 1000,
    }).bindPopup(
      `
        <div class="p-2 space-y-1.5 text-xs text-slate-800">
          <div class="flex items-center gap-1.5 font-bold text-blue-600">
            <span>📍</span>
            <span>Titik Posisi Anda Saat Ini</span>
          </div>
          <div class="bg-slate-100 p-2 rounded-lg font-mono text-[11px] space-y-0.5">
            <div>Lat: <strong>${latitude.toFixed(6)}</strong></div>
            <div>Lng: <strong>${longitude.toFixed(6)}</strong></div>
            <div>Akurasi: <span class="text-emerald-600 font-bold">±${Math.round(accuracy)} meter</span></div>
          </div>
          <div class="text-[10px] text-slate-500">
            Waktu: ${new Date(userLocation.timestamp).toLocaleTimeString('id-ID')}
          </div>
        </div>
      `,
      { closeButton: true, className: 'custom-gps-popup' }
    );
    group.addLayer(userMarker);
  }, [leafletLib, userLocation]);

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

    const kecCode = getKecamatanCode(corridorKecamatan);
    const kelCode = getKelurahanCode(corridorKelurahan);
    const prefix = `LLG-${kecCode}-${kelCode}`;

    let maxSeq = 0;
    const currentPolesList = livePoles || poles || [];
    for (const p of currentPolesList) {
      if (p.poleCode && p.poleCode.startsWith(`${prefix}-`)) {
        const num = parseInt(p.poleCode.slice(prefix.length + 1), 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
    const startSeq = maxSeq + 1;

    const baseResult = interpolatePolesAlongPath(
      rawPts,
      corridorInterval,
      corridorEqualSpacing,
      prefix,
      startSeq
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
    corridorKecamatan,
    corridorKelurahan,
    livePoles,
    poles,
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
          condition: corridorCondition,
          sisiJalan: corridorRoadSide,
          infrastructureCategory: corridorCategory,
          ownershipStatus: corridorOwnershipStatus,
          cableInstallationType: corridorCableInstallationType,
          hasNetworkCable:
            corridorCategory === 'PJU_MANDIRI' || corridorCategory === 'GABUNG_PLN_PJU'
              ? corridorHasNetworkCable
              : undefined,
          pjuLampType:
            corridorCategory === 'PJU_MANDIRI' || corridorCategory === 'GABUNG_PLN_PJU'
              ? corridorPjuLampType
              : undefined,
          pjuLampPower:
            corridorCategory === 'PJU_MANDIRI' || corridorCategory === 'GABUNG_PLN_PJU'
              ? corridorPjuLampPower
              : undefined,
          pjuLampCondition:
            corridorCategory === 'PJU_MANDIRI' || corridorCategory === 'GABUNG_PLN_PJU'
              ? corridorPjuLampCondition
              : undefined,
          hasKwhMeter:
            corridorCategory === 'PJU_MANDIRI' || corridorCategory === 'GABUNG_PLN_PJU'
              ? corridorHasKwhMeter
              : false,
        })),
        createSegments: corridorWithCable,
        networkType: corridorCategory === 'FO_WIFI' ? 'FIBER_OPTIC' : 'JARINGAN_KABEL',
        installationType: corridorCableInstallationType,
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

    const confirmMsg = `Yakin ingin menghapus ${selectedDeleteIds.length} tiang terpilih beserta segmen kabelnya dari server basis data dan Google Sheets?`;
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

  // Comprehensive Multi-Parameter Pole Filtering
  const filteredPoles = useMemo(() => {
    const query = normalizedSearchQuery;
    const selectedProviderLower = selectedProvider.toLowerCase().trim();
    const selectedCategoryLower = selectedCategory;
    const selectedConditionUpper = selectedCondition.toUpperCase();
    const selectedTypeUpper = selectedType.toUpperCase();
    const selectedHeightValue = selectedHeight;
    const selectedCableTypeValue = selectedCableType;
    const selectedSurveyorLower = selectedSurveyor.toLowerCase().trim();

    const targetProvObj = selectedProvider !== 'ALL' ? providerById.get(selectedProvider) : undefined;

    return livePoles.filter((pole) => {
      // 0. Resolve accurate provider and category
      const resolved = resolveProviderInfo({
        providerId: pole.providerId,
        providerName: pole.providerName,
        infrastructureCategory: pole.infrastructureCategory,
      });

      const effectiveCategory = resolved.category || pole.infrastructureCategory || 'FO_WIFI';
      const effectiveProviderId = resolved.providerId || pole.providerId || '';
      const effectiveProviderName = resolved.providerName || pole.providerName || '';

      // 0b. Surveyor / admin filter, used by INFRA-AI and the filter drawer.
      if (selectedSurveyor !== 'ALL') {
        const surveyorLabel = getPoleSurveyorLabel(pole).toLowerCase();
        const surveyorId = (pole.surveyorId || '').toLowerCase();
        if (
          !surveyorLabel.includes(selectedSurveyorLower) &&
          !selectedSurveyorLower.includes(surveyorLabel) &&
          !surveyorId.includes(selectedSurveyorLower)
        ) {
          return false;
        }
      }

      // 0c. Survey Date filter, used by INFRA-AI and date filtering.
      if (selectedSurveyDate !== 'ALL') {
        const rawDate = (pole.surveyDate || pole.createdAt || '').slice(0, 10);
        if (!rawDate.includes(selectedSurveyDate)) {
          return false;
        }
      }

      // 1. Provider Filter
      if (selectedProvider !== 'ALL') {
        const matchId =
          effectiveProviderId.toLowerCase() === selectedProviderLower ||
          (pole.providerId || '').toLowerCase() === selectedProviderLower;

        const matchName =
          effectiveProviderName.toLowerCase().includes(selectedProviderLower) ||
          selectedProviderLower.includes(effectiveProviderName.toLowerCase()) ||
          (pole.providerName || '').toLowerCase().includes(selectedProviderLower);

        const matchTargetObj =
          targetProvObj &&
          ((targetProvObj.name &&
            effectiveProviderName
              .toLowerCase()
              .includes(targetProvObj.name.toLowerCase().replace(/^\d+\.\s*/, ''))) ||
            (targetProvObj.code &&
              (pole.poleCode || '').toLowerCase().includes(targetProvObj.code.toLowerCase())));

        if (!matchId && !matchName && !matchTargetObj) return false;
      }

      // 2. Condition Filter
      if (selectedCondition !== 'ALL') {
        const normPoleCond = (pole.condition || '').toUpperCase();
        if (normPoleCond !== selectedConditionUpper) {
          if (selectedConditionUpper === 'GOOD' && normPoleCond === 'BAIK') {
            // match
          } else if (
            selectedConditionUpper === 'NEEDS_REPAIR' &&
            (normPoleCond === 'PERLU_PERBAIKAN' || normPoleCond === 'PERLU_SERVIS')
          ) {
            // match
          } else if (selectedConditionUpper === 'DAMAGED' && normPoleCond === 'RUSAK') {
            // match
          } else {
            return false;
          }
        }
      }

      // 3. Infrastructure Category (PJU Mandiri, Gabung PLN+PJU, PLN Murni, FO/WiFi)
      if (selectedCategoryLower !== 'ALL') {
        if (effectiveCategory !== selectedCategoryLower) {
          if (selectedCategoryLower === 'PLN_MURNI' && effectiveProviderId === 'PRV_PLN_DISTRIBUSI') {
            // match
          } else if (
            selectedCategoryLower === 'GABUNG_PLN_PJU' &&
            effectiveProviderId === 'PRV_PLN_PJU_GABUNG'
          ) {
            // match
          } else if (selectedCategoryLower === 'PJU_MANDIRI' && effectiveProviderId === 'PRV_PJU_PEMKOT') {
            // match
          } else {
            return false;
          }
        }
      }

      // 3b. PJU Network Cable Tumpangan Filter (Khusus PJU)
      if (selectedPjuCableFilter !== 'ALL') {
        const isPju = effectiveCategory === 'PJU_MANDIRI' || effectiveCategory === 'GABUNG_PLN_PJU';
        if (selectedPjuCableFilter === 'WITH_CABLE') {
          if (!isPju || !pole.hasNetworkCable) return false;
        } else if (selectedPjuCableFilter === 'WITHOUT_CABLE') {
          if (!isPju || pole.hasNetworkCable) return false;
        }
      }

      // 4. Kecamatan Filter (Resilient matching)
      if (selectedKecamatan !== 'ALL') {
        const cleanPoleKec = (pole.kecamatan || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanTargetKec = selectedKecamatan.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!cleanPoleKec.includes(cleanTargetKec) && !cleanTargetKec.includes(cleanPoleKec)) {
          return false;
        }
      }

      // 5. Kelurahan Filter (Resilient matching)
      if (selectedKelurahan !== 'ALL') {
        const cleanPoleKel = (pole.kelurahan || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanTargetKel = selectedKelurahan.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!cleanPoleKel.includes(cleanTargetKel) && !cleanTargetKel.includes(cleanPoleKel)) {
          return false;
        }
      }

      // 6. Pole Material Type Filter (Beton, Besi, Kayu)
      if (selectedType !== 'ALL') {
        if ((pole.poleType || '').toUpperCase() !== selectedTypeUpper) return false;
      }

      // 6b. Pole Height Filter (5m, 6m, 7m, 9m, 12m)
      if (selectedHeightValue !== 'ALL') {
        const pHeight = pole.height || '5m';
        if (pHeight !== selectedHeightValue) return false;
      }

      // 7. Cable Installation Type (Udara, Bawah Tanah, Riser)
      if (selectedCableTypeValue !== 'ALL') {
        const cableType = pole.cableInstallationType || 'UDARA';
        if (cableType !== selectedCableTypeValue) return false;
      }

      // 8. Hazard / Risk Filter
      if (selectedHazard === 'HAZARD_ONLY') {
        const isProblem =
          pole.isTilted ||
          pole.isMessyCable ||
          pole.isLowCable ||
          pole.isCorroded ||
          pole.isObstructing ||
          pole.isHazardous;
        if (!isProblem) return false;
      } else if (selectedHazard === 'TILTED') {
        if (!pole.isTilted) return false;
      } else if (selectedHazard === 'MESSY') {
        if (!pole.isMessyCable) return false;
      } else if (selectedHazard === 'LOW') {
        if (!pole.isLowCable) return false;
      }

      // 9. Search Query Filter
      if (query) {
        const matchId = (pole.id || '').toLowerCase().includes(query);
        const matchCode = (pole.poleCode || '').toLowerCase().includes(query);
        const matchRoad = (pole.road || '').toLowerCase().includes(query);
        const matchKec = (pole.kecamatan || '').toLowerCase().includes(query);
        const matchKel = (pole.kelurahan || '').toLowerCase().includes(query);
        const matchProviderId = effectiveProviderId.toLowerCase().includes(query);
        const matchProviderName = effectiveProviderName.toLowerCase().includes(query);
        const matchDesc = (pole.description || '').toLowerCase().includes(query);
        const matchPatokan = (pole.patokanLokasi || '').toLowerCase().includes(query);
        const matchSurveyor = (pole.surveyorName || '').toLowerCase().includes(query);
        const matchType = (pole.poleType || '').toLowerCase().includes(query);

        if (
          !matchId &&
          !matchCode &&
          !matchRoad &&
          !matchKec &&
          !matchKel &&
          !matchProviderId &&
          !matchProviderName &&
          !matchDesc &&
          !matchPatokan &&
          !matchSurveyor &&
          !matchType
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    livePoles,
    providerById,
    normalizedSearchQuery,
    selectedProvider,
    selectedCondition,
    selectedCategory,
    selectedSurveyor,
    selectedSurveyDate,
    selectedPjuCableFilter,
    selectedKecamatan,
    selectedKelurahan,
    selectedType,
    selectedHeight,
    selectedCableType,
    selectedHazard,
  ]);

  const hasFocusedFilter = useMemo(
    () =>
      Boolean(normalizedSearchQuery) ||
      selectedProvider !== 'ALL' ||
      selectedCondition !== 'ALL' ||
      selectedCategory !== 'ALL' ||
      selectedSurveyor !== 'ALL' ||
      selectedSurveyDate !== 'ALL' ||
      selectedPjuCableFilter !== 'ALL' ||
      selectedKecamatan !== 'ALL' ||
      selectedKelurahan !== 'ALL' ||
      selectedType !== 'ALL' ||
      selectedHeight !== 'ALL' ||
      selectedCableType !== 'ALL' ||
      selectedHazard !== 'ALL',
    [
      normalizedSearchQuery,
      selectedProvider,
      selectedCondition,
      selectedCategory,
      selectedSurveyor,
      selectedSurveyDate,
      selectedPjuCableFilter,
      selectedKecamatan,
      selectedKelurahan,
      selectedType,
      selectedHeight,
      selectedCableType,
      selectedHazard,
    ]
  );

  const renderablePoles = useMemo(() => {
    if (!mapRenderState || normalizedSearchQuery) return filteredPoles;
    return filteredPoles.filter((pole) => poleIsInsideBounds(pole, mapRenderState.bounds));
  }, [filteredPoles, mapRenderState, normalizedSearchQuery]);

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

    const currentZoom = mapRenderState?.zoom ?? mapInstanceRef.current.getZoom();
    const renderablePoleIds = new Set(renderablePoles.map((pole) => pole.id));
    const showDetailedMarkers =
      currentZoom >= DETAIL_MARKER_ZOOM ||
      (hasFocusedFilter && renderablePoles.length <= MAX_DETAILED_MARKERS);
    const showMarkerLabels =
      currentZoom >= LABEL_MARKER_ZOOM ||
      Boolean(normalizedSearchQuery) ||
      (hasFocusedFilter && renderablePoles.length <= 80);
    const showSegments = currentZoom >= SEGMENT_MIN_ZOOM || hasFocusedFilter;

    // Render Cable Segments (Polylines)
    if (segmentsLayerGroupRef.current) {
      segments.forEach((seg) => {
        if (!showSegments) return;
        if (!renderablePoleIds.has(seg.fromNodeId) && !renderablePoleIds.has(seg.toNodeId)) return;

        const fromPole = livePoleById[seg.fromNodeId];
        const toPole = livePoleById[seg.toNodeId];

        if (fromPole && toPole) {
          const latlngs: [number, number][] = [
            [fromPole.poleLatitude, fromPole.poleLongitude],
            [toPole.poleLatitude, toPole.poleLongitude],
          ];

          const color = seg.installationType === 'UNDERGROUND' ? '#8b5cf6' : '#2563eb';
          const polyline = L.polyline(latlngs, {
            color,
            weight: currentZoom >= 17 ? 3.5 : 2,
            opacity: currentZoom >= 17 ? 0.85 : 0.45,
            dashArray: seg.installationType === 'UNDERGROUND' ? '6, 6' : undefined,
            interactive: currentZoom >= 16,
          });

          if (currentZoom >= 16) {
            polyline.bindTooltip(
              `<b>${seg.segmentCode || seg.id}</b><br/>${
                seg.installationType === 'UNDERGROUND' ? 'Kabel Bawah Tanah' : 'Kabel Udara'
              }<br/>Est. Jarak: ${seg.estimatedDistance}m`,
              { sticky: true }
            );
          }

          polyline.addTo(segmentsLayerGroupRef.current!);
        }
      });
    }

    // Render Pole Markers with Provider Color & Smart GIS Code
    renderablePoles.forEach((pole) => {
      const provObj = providerById.get(pole.providerId);
      let color = provObj?.colorHex || '#2563eb';
      if (pole.infrastructureCategory === 'PJU_MANDIRI') color = '#f59e0b';
      else if (pole.infrastructureCategory === 'GABUNG_PLN_PJU') color = '#0284c7';
      else if (pole.infrastructureCategory === 'PLN_MURNI') color = '#0369a1';

      let conditionRing = '#10b981';
      if (pole.condition === 'NEEDS_REPAIR') conditionRing = '#f59e0b';
      else if (pole.condition === 'DAMAGED') conditionRing = '#ef4444';
      else if (pole.condition === 'UNKNOWN') conditionRing = '#64748b';

      if (!showDetailedMarkers) {
        const marker = L.circleMarker([pole.poleLatitude, pole.poleLongitude], {
          radius: currentZoom >= 15 ? 5 : 3.5,
          color: conditionRing,
          fillColor: color,
          fillOpacity: 0.92,
          weight: currentZoom >= 15 ? 2 : 1,
          interactive: true,
        });

        marker.on('click', () => {
          handlePoleClick(pole);
        });

        marker.addTo(markersLayerGroupRef.current!);
        return;
      }

      const cacheKey = [
        provObj?.id || pole.providerId || '',
        pole.condition || 'GOOD',
        showMarkerLabels ? pole.poleCode || pole.id : '',
        provObj?.code || '',
        pole.infrastructureCategory || '',
      ].join('|');

      let markerIcon = markerIconCacheRef.current.get(cacheKey);
      if (!markerIcon) {
        markerIcon = createProviderPoleMarkerIcon(L, {
          colorHex: provObj?.colorHex || '#2563eb',
          condition: pole.condition,
          label: showMarkerLabels ? pole.poleCode || pole.id : undefined,
          providerCode: provObj?.code,
          category: pole.infrastructureCategory,
        });
        markerIconCacheRef.current.set(cacheKey, markerIcon);
      }

      const marker = L.marker([pole.poleLatitude, pole.poleLongitude], {
        icon: markerIcon,
      });

      marker.on('click', () => {
        handlePoleClick(pole);
      });

      marker.addTo(markersLayerGroupRef.current!);
    });

    // Auto fit bounds if search query is entered
    if (filteredPoles.length > 0 && normalizedSearchQuery) {
      const bounds = L.latLngBounds(filteredPoles.map((p) => [p.poleLatitude, p.poleLongitude]));
      mapInstanceRef.current.fitBounds(bounds, { maxZoom: 16, padding: [50, 50] });
    }
  }, [
    filteredPoles,
    renderablePoles,
    segments,
    leafletLib,
    normalizedSearchQuery,
    providerById,
    livePoleById,
    mapRenderState,
    hasFocusedFilter,
  ]);

  // Render batch delete selection halos only when the selection changes
  useEffect(() => {
    if (!leafletLib || !selectionLayerGroupRef.current) return;
    const L = leafletLib;

    selectionLayerGroupRef.current.clearLayers();
    if (!isBatchDeleteMode || selectedDeleteIds.length === 0) return;

    const selectedSet = new Set(selectedDeleteIds);
    filteredPoles.forEach((pole) => {
      if (!selectedSet.has(pole.id)) return;

      const deleteRing = L.circleMarker([pole.poleLatitude, pole.poleLongitude], {
        radius: 18,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.4,
        weight: 3,
        dashArray: '3, 3',
      });
      deleteRing.addTo(selectionLayerGroupRef.current!);
    });
  }, [filteredPoles, isBatchDeleteMode, selectedDeleteIds, leafletLib]);

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
    setSelectedCategory('ALL');
    setSelectedSurveyor('ALL');
    setSelectedPjuCableFilter('ALL');
    setSelectedKecamatan('ALL');
    setSelectedKelurahan('ALL');
    setSelectedType('ALL');
    setSelectedHeight('ALL');
    setSelectedCableType('ALL');
    setSelectedHazard('ALL');
    setSearchQuery('');
  };

  // Dynamic Kelurahan list based on selected Kecamatan
  const availableKelurahans = React.useMemo(() => {
    if (selectedKecamatan === 'ALL') {
      return KECAMATAN_LUBUKLINGGAU.flatMap((k) => k.kelurahan);
    }
    const found = KECAMATAN_LUBUKLINGGAU.find((k) => k.name === selectedKecamatan);
    return found ? found.kelurahan : [];
  }, [selectedKecamatan]);

  if (isLocked) {
    return <GISApiQuotaExceededLock customMessage={lockReason} />;
  }

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

          {/* PANDUAN ARTI PIN BUTTON (Quick Access) */}
          <button
            type="button"
            onClick={() => setShowLegendModal(true)}
            className="w-10 h-10 rounded-full shadow-lg border bg-white/95 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-slate-200 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Buka Panduan &amp; Arti Simbol Pin Peta"
          >
            <HelpCircle className="w-5 h-5 text-blue-600" />
          </button>

          {/* DESKTOP FULL-WIDTH / MOBILE MODE TOGGLE BUTTON */}
          <button
            type="button"
            onClick={toggleViewMode}
            className={`w-10 h-10 rounded-full shadow-lg border backdrop-blur-md flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 ${
              viewMode === 'DESKTOP'
                ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-500/30'
                : 'bg-white/95 text-slate-700 hover:text-blue-600 border-slate-200'
            }`}
            title={
              viewMode === 'DESKTOP'
                ? 'Mode Desktop Penuh Aktif (Layar Lebar & Pas) - Klik untuk Mode Mobile'
                : 'Buka Ukuran Layar Penuh Desktop (Layar Luas & Pas)'
            }
          >
            {viewMode === 'DESKTOP' ? (
              <Smartphone className="w-5 h-5" />
            ) : (
              <Monitor className="w-5 h-5 text-blue-600" />
            )}
          </button>

          {/* 4-DOTS CIRCULAR TOGGLE BUTTON (Bisa dibuka dan disembunyikan lagi) */}
          <button
            type="button"
            onClick={() => setShowGoogleToolsMenu((prev) => !prev)}
            className={`w-10 h-10 rounded-full shadow-lg border backdrop-blur-md transition-all duration-300 flex items-center justify-center cursor-pointer ${
              showGoogleToolsMenu
                ? 'bg-slate-900 text-white border-slate-700 rotate-90 scale-105 ring-4 ring-blue-500/20'
                : 'bg-white/95 text-slate-700 hover:text-blue-600 border-slate-200 hover:scale-105 active:scale-95'
            }`}
            title={showGoogleToolsMenu ? 'Sembunyikan Menu Alat' : 'Buka Menu Alat GIS (Ikon Bulat)'}
          >
            {showGoogleToolsMenu ? (
              <X className="w-5 h-5" />
            ) : (
              <LayoutGrid className="w-5 h-5 text-blue-600" />
            )}
          </button>
        </div>

        {/* Active Tool Badge Indicator (When a mode is running) */}
        {(isCorridorMode ||
          isBatchDeleteMode ||
          isMeasuring ||
          selectedProvider !== 'ALL' ||
          selectedCondition !== 'ALL' ||
          selectedCategory !== 'ALL' ||
          selectedSurveyor !== 'ALL' ||
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

            {selectedSurveyDate !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-600 text-white font-bold text-[11px] rounded-xl shadow-md border border-purple-400/40 animate-in fade-in">
                <span>📅 {selectedSurveyDate}</span>
                <button
                  type="button"
                  onClick={() => setSelectedSurveyDate('ALL')}
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
              selectedCategory !== 'ALL' ||
              selectedSurveyor !== 'ALL' ||
              selectedSurveyDate !== 'ALL' ||
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

        {/* ============================================================ */}
        {/* IKON BULAT-BULAT BERDERET 1 BARIS KE BAWAH (SPEED-DIAL STACK) */}
        {/* ============================================================ */}
        {showGoogleToolsMenu && (
          <div className="flex flex-col items-end gap-2 pt-1 animate-in slide-in-from-top-3 fade-in duration-200">
            {/* 1. Bulat: Tarik Jalur Otomatis */}
            <div className="flex items-center gap-2 group">
              <span className="px-2.5 py-1 bg-slate-900/90 text-white font-bold text-[11px] rounded-xl shadow-lg border border-white/10 whitespace-nowrap backdrop-blur-md">
                ⚡ Tarik Jalur Otomatis
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowGoogleToolsMenu(false);
                  toggleCorridorMode();
                }}
                className={`w-10 h-10 rounded-full shadow-xl border flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                  isCorridorMode
                    ? 'bg-blue-600 text-white border-blue-400 ring-4 ring-blue-500/30'
                    : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                }`}
                title="Tarik Jalur Otomatis (Interval 35m)"
              >
                <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
              </button>
            </div>

            {/* 2. Bulat: Pilih & Hapus Massal */}
            <div className="flex items-center gap-2 group">
              <span className="px-2.5 py-1 bg-slate-900/90 text-white font-bold text-[11px] rounded-xl shadow-lg border border-white/10 whitespace-nowrap backdrop-blur-md">
                🗑️ Pilih &amp; Hapus Massal
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowGoogleToolsMenu(false);
                  toggleBatchDeleteMode();
                }}
                className={`w-10 h-10 rounded-full shadow-xl border flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                  isBatchDeleteMode
                    ? 'bg-red-600 text-white border-red-400 ring-4 ring-red-500/30'
                    : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                }`}
                title="Pilih & Hapus Massal Pin"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* 3. Bulat: Ukur Jarak Spasial */}
            <div className="flex items-center gap-2 group">
              <span className="px-2.5 py-1 bg-slate-900/90 text-white font-bold text-[11px] rounded-xl shadow-lg border border-white/10 whitespace-nowrap backdrop-blur-md">
                📏 Ukur Jarak Spasial
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowGoogleToolsMenu(false);
                  toggleMeasuring();
                }}
                className={`w-10 h-10 rounded-full shadow-xl border flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                  isMeasuring
                    ? 'bg-amber-500 text-white border-amber-400 ring-4 ring-amber-500/30'
                    : 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50'
                }`}
                title="Ukur Jarak Spasial"
              >
                <Ruler className="w-4 h-4" />
              </button>
            </div>

            {/* 4. Bulat: Filter Data Tiang */}
            <div className="flex items-center gap-2 group">
              <span className="px-2.5 py-1 bg-slate-900/90 text-white font-bold text-[11px] rounded-xl shadow-lg border border-white/10 whitespace-nowrap backdrop-blur-md">
                🔍 Filter Data ({filteredPoles.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowGoogleToolsMenu(false);
                  setShowFilterDrawer(true);
                }}
                className="w-10 h-10 rounded-full shadow-xl border bg-white text-slate-700 hover:text-blue-600 border-slate-200 hover:bg-blue-50 flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95"
                title="Filter Data Tiang"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>

            {/* 5. Bulat: Ganti Layer Peta */}
            <div className="flex items-center gap-2 group">
              <span className="px-2.5 py-1 bg-slate-900/90 text-white font-bold text-[11px] rounded-xl shadow-lg border border-white/10 whitespace-nowrap backdrop-blur-md capitalize">
                🛰️ {tileMode === 'clean_satellite' ? 'Satelit Polos' : tileMode === 'hybrid_survey' ? 'Satelit + Jalan' : 'Peta Jalan'}
              </span>
              <button
                type="button"
                onClick={toggleTileMode}
                className="w-10 h-10 rounded-full shadow-xl border bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95"
                title="Ganti Mode Layer Peta"
              >
                <Layers className="w-4 h-4" />
              </button>
            </div>

            {/* 6. Bulat: Batas Wilayah Kelurahan */}
            <div className="flex items-center gap-2 group">
              <span className="px-2.5 py-1 bg-slate-900/90 text-white font-bold text-[11px] rounded-xl shadow-lg border border-white/10 whitespace-nowrap backdrop-blur-md">
                🌐 {showBoundaries ? 'Batas Kelurahan (Aktif)' : 'Batas Kelurahan (Off)'}
              </span>
              <button
                type="button"
                onClick={toggleBoundaries}
                className={`w-10 h-10 rounded-full shadow-xl border flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                  showBoundaries
                    ? 'bg-emerald-600 text-white border-emerald-400 ring-4 ring-emerald-500/30'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
                title="Tampilkan / Sembunyikan Batas Kelurahan"
              >
                <Shield className="w-4 h-4" />
              </button>
            </div>

            {/* 7. Bulat: Lacak Posisi Saya (GPS) */}
            <div className="flex items-center gap-2 group">
              <span className="px-2.5 py-1 bg-slate-900/90 text-white font-bold text-[11px] rounded-xl shadow-lg border border-white/10 whitespace-nowrap backdrop-blur-md">
                📍 {isLiveTracking ? 'Lacak GPS Aktif' : 'Lacak Posisi Koordinat Saya'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowGoogleToolsMenu(false);
                  if (isLiveTracking) {
                    if (userLocation && mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo([userLocation.latitude, userLocation.longitude], 18, { animate: true });
                    }
                  } else {
                    startLocating(true);
                  }
                }}
                className={`w-10 h-10 rounded-full shadow-xl border flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                  isLiveTracking
                    ? 'bg-blue-600 text-white border-blue-400 ring-4 ring-blue-500/30'
                    : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                }`}
                title="Lacak Titik Posisi Koordinat GPS Saya"
              >
                <Locate className={`w-5 h-5 ${isLocating ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* 8. Bulat: Mode Desktop Widescreen */}
            <div className="flex items-center gap-2 group">
              <span className="px-2.5 py-1 bg-slate-900/90 text-white font-bold text-[11px] rounded-xl shadow-lg border border-white/10 whitespace-nowrap backdrop-blur-md">
                🖥️ {viewMode === 'DESKTOP' ? 'Mode Desktop (Aktif)' : 'Buka Mode Desktop (Layar Lebar)'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowGoogleToolsMenu(false);
                  toggleViewMode();
                }}
                className={`w-10 h-10 rounded-full shadow-xl border flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                  viewMode === 'DESKTOP'
                    ? 'bg-blue-600 text-white border-blue-400 ring-4 ring-blue-500/30'
                    : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                }`}
                title="Beralih antara Mode Desktop Layar Lebar dan Mode Mobile"
              >
                {viewMode === 'DESKTOP' ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
              </button>
            </div>

            {/* 10. Bulat: Arti Pin & Legenda Peta */}
            <div className="flex items-center gap-2 group">
              <span className="px-2.5 py-1 bg-slate-900/90 text-white font-bold text-[11px] rounded-xl shadow-lg border border-white/10 whitespace-nowrap backdrop-blur-md">
                📖 Arti Pin &amp; Legenda Peta
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowGoogleToolsMenu(false);
                  setShowLegendModal(true);
                }}
                className="w-10 h-10 rounded-full shadow-xl border bg-white text-blue-600 border-blue-200 hover:bg-blue-50 flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 ring-2 ring-blue-500/20"
                title="Panduan Lengkap Arti Pin &amp; Simbol Peta GIS"
              >
                <HelpCircle className="w-5 h-5 text-blue-600" />
              </button>
            </div>
          </div>
        )}
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

      {/* Comprehensive Filter Popover / Drawer */}
      {showFilterDrawer && (
        <div className="absolute top-20 left-3 right-3 z-[450] bg-white/98 border border-slate-200 rounded-3xl p-4 shadow-[0_16px_50px_rgba(15,23,42,0.28)] backdrop-blur-xl text-slate-800 animate-in fade-in slide-in-from-top-2 max-h-[78vh] overflow-y-auto space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Filter Titik Tiang GIS
                </h3>
                <span className="text-[10px] text-slate-400">
                  Menampilkan {filteredPoles.length} dari {livePoles.length} tiang
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowFilterDrawer(false)}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 1. Kategori Infrastruktur (PJU Mandiri, Gabung PLN+PJU, PLN, FO/WiFi) */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
              Kategori Infrastruktur:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
              {[
                { id: 'ALL', label: 'Semua Kategori' },
                { id: 'PJU_MANDIRI', label: '💡 PJU Mandiri' },
                { id: 'GABUNG_PLN_PJU', label: '⚡💡 Gabung PLN+PJU' },
                { id: 'PLN_MURNI', label: '⚡ PLN Listrik' },
                { id: 'FO_WIFI', label: '🌐 Fiber Optic / WiFi' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`py-2 px-2.5 rounded-xl font-bold transition-all text-left truncate cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/40'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* 1b. Khusus PJU: Filter Tumpangan Kabel Jaringan / FO */}
            {(selectedCategory === 'ALL' || selectedCategory === 'PJU_MANDIRI' || selectedCategory === 'GABUNG_PLN_PJU') && (
              <div className="mt-2 p-2.5 bg-amber-50/70 border border-amber-200 rounded-2xl">
                <label className="block text-[10px] font-black text-amber-900 uppercase tracking-wider mb-1">
                  💡 Status Tumpangan Kabel Jaringan pada PJU:
                </label>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  {[
                    { id: 'ALL', label: 'Semua PJU' },
                    { id: 'WITH_CABLE', label: '🌐 Ada Kabel FO' },
                    { id: 'WITHOUT_CABLE', label: '🚫 PJU Murni (Tanpa FO)' },
                  ].map((pjuOpt) => (
                    <button
                      key={pjuOpt.id}
                      type="button"
                      onClick={() => setSelectedPjuCableFilter(pjuOpt.id as any)}
                      className={`py-1.5 px-2 rounded-xl font-bold transition-all text-center cursor-pointer ${
                        selectedPjuCableFilter === pjuOpt.id
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {pjuOpt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Grid Fields (Provider, Kondisi, Kecamatan, Kelurahan, Material, Tinggi, Kabel) */}
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            {/* Provider Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Provider / Operator
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
              >
                <option value="ALL">Semua Provider ({allCombinedProviders.length} Operator)</option>
                {allCombinedProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Condition Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Kondisi Fisik Tiang
              </label>
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
              >
                <option value="ALL">Semua Kondisi</option>
                <option value="GOOD">🟢 Kondisi Baik</option>
                <option value="NEEDS_REPAIR">🟡 Perlu Servis</option>
                <option value="DAMAGED">🔴 Rusak Berat</option>
              </select>
            </div>

            {/* Kecamatan Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Kecamatan
              </label>
              <select
                value={selectedKecamatan}
                onChange={(e) => {
                  setSelectedKecamatan(e.target.value);
                  setSelectedKelurahan('ALL');
                }}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
              >
                <option value="ALL">Semua Kecamatan (8 Kec)</option>
                {KECAMATAN_LUBUKLINGGAU.map((k) => (
                  <option key={k.name} value={k.name}>
                    {k.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Kelurahan Filter (Dynamic) */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Kelurahan
              </label>
              <select
                value={selectedKelurahan}
                onChange={(e) => setSelectedKelurahan(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
              >
                <option value="ALL">Semua Kelurahan</option>
                {availableKelurahans.map((kel) => (
                  <option key={kel} value={kel}>
                    {kel}
                  </option>
                ))}
              </select>
            </div>

            {/* Surveyor / Petugas Filter */}
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Petugas / Admin Pendata
              </label>
              <select
                value={selectedSurveyor}
                onChange={(e) => setSelectedSurveyor(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
              >
                <option value="ALL">Semua Petugas ({surveyorOptions.length} nama)</option>
                {surveyorOptions.map((surveyor) => (
                  <option key={surveyor.label} value={surveyor.label}>
                    {surveyor.label} ({surveyor.count} titik)
                  </option>
                ))}
              </select>
            </div>

            {/* Pole Height Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Tinggi Tiang
              </label>
              <select
                value={selectedHeight}
                onChange={(e) => setSelectedHeight(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
              >
                <option value="ALL">Semua Tinggi</option>
                <option value="5m">5 Meter (PJU / FO Rendah)</option>
                <option value="6m">6 Meter</option>
                <option value="7m">7 Meter (Standar FO)</option>
                <option value="9m">9 Meter</option>
                <option value="11m">11 Meter</option>
                <option value="12m">12 Meter (PLN)</option>
              </select>
            </div>

            {/* Pole Type Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Material Tiang
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
              >
                <option value="ALL">Semua Material</option>
                <option value="BETON">Tiang Beton</option>
                <option value="BESI">Tiang Besi / Galvanis</option>
                <option value="KAYU">Tiang Kayu</option>
              </select>
            </div>

            {/* Cable Installation Type Filter */}
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Instalasi Kabel
              </label>
              <select
                value={selectedCableType}
                onChange={(e) => setSelectedCableType(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
              >
                <option value="ALL">Semua Tipe Kabel</option>
                <option value="UDARA">Kabel Udara (Aerial)</option>
                <option value="BAWAH_TANAH">🕳️ Kabel Bawah Tanah</option>
                <option value="TRANSISI_RISER">↕️ Riser Pole (Transisi)</option>
              </select>
            </div>
          </div>

          {/* 3. Hazard & Potensi Risiko Checklist */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
              Filter Potensi Risiko &amp; Bahaya:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
              {[
                { id: 'ALL', label: 'Semua Status' },
                { id: 'TILTED', label: '⚠️ Tiang Miring' },
                { id: 'MESSY', label: '🔌 Semrawut' },
                { id: 'LOW', label: '⚡ Kabel Rendah' },
              ].map((hz) => (
                <button
                  key={hz.id}
                  type="button"
                  onClick={() => setSelectedHazard(hz.id as any)}
                  className={`py-1.5 px-2 rounded-xl font-bold transition-all text-center cursor-pointer ${
                    selectedHazard === hz.id
                      ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-400/40'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {hz.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Reset & Apply */}
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer py-1.5 px-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Semua Filter</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFilterDrawer(false)}
              className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-500/25 cursor-pointer transition-all"
            >
              Tampilkan ({filteredPoles.length} Tiang)
            </button>
          </div>
        </div>
      )}

      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0 flex-1 overflow-hidden" />

      {/* ============================================================ */}
      {/* FLOATING MAP CONTROLS (LOCATE ME)                            */}
      {/* ============================================================ */}
      <div className="absolute right-3.5 bottom-44 sm:bottom-28 z-[400] flex flex-col items-center gap-2 pointer-events-auto select-none">
        {/* Floating Active Surveyors Toggle (Khusus Tim KOMINFO) */}
        {isKominfoUser && (
          <button
            type="button"
            onClick={() => setShowActiveSurveyors((prev) => !prev)}
            className={`relative flex h-11 w-11 items-center justify-center rounded-full border shadow-xl transition-all hover:scale-105 active:scale-95 ${
              showActiveSurveyors
                ? 'border-emerald-300 bg-emerald-600 text-white ring-4 ring-emerald-500/20'
                : 'border-slate-200 bg-white/95 text-slate-500 backdrop-blur-md'
            }`}
            title="Pantau posisi surveyor aktif (Khusus Tim KOMINFO)"
          >
            <Users className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-white bg-slate-950 px-1 text-[9px] font-black text-white">
              {activeSurveyors.length}
            </span>
          </button>
        )}

        {/* Locate Me Floating GPS Button */}
        <button
          type="button"
          onClick={() => {
            if (isLiveTracking && userLocation && mapInstanceRef.current) {
              mapInstanceRef.current.flyTo([userLocation.latitude, userLocation.longitude], 18, { animate: true });
              setShowGpsHud(true);
            } else {
              startLocating(true);
            }
          }}
          className={`relative w-12 h-12 rounded-full shadow-2xl border flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 ${
            isLiveTracking
              ? 'bg-blue-600 text-white border-blue-400 ring-4 ring-blue-500/30'
              : isLocating
              ? 'bg-blue-500 text-white border-blue-300 animate-pulse'
              : 'bg-white/95 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-slate-200/90 backdrop-blur-md'
          }`}
          title={isLiveTracking ? 'Pusatkan ke Titik Posisi Saya' : 'Lacak Lokasi Koordinat GPS Saya'}
        >
          <Locate className={`w-6 h-6 ${isLocating ? 'animate-spin' : ''}`} />
          {isLiveTracking && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white animate-ping" />
          )}
        </button>
      </div>

      {/* ============================================================ */}
      {/* FLOATING LIVE GPS STATUS HUD CARD                           */}
      {/* ============================================================ */}
      {showGpsHud && userLocation && (
        <div className="absolute bottom-20 sm:bottom-24 left-3.5 right-3.5 sm:right-auto sm:w-[420px] z-[450] bg-slate-900/95 text-white border border-blue-500/60 rounded-3xl p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 space-y-2.5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-black text-white uppercase tracking-wider">
                Titik Koordinat Saya (GPS)
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                ±{Math.round(userLocation.accuracy)}m
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowGpsHud(false)}
              className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Coordinate Readout */}
          <div className="bg-slate-950/80 rounded-2xl p-2.5 border border-slate-800/90 flex items-center justify-between">
            <div className="font-mono text-xs text-slate-200 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-sans text-[10px] w-6">LAT:</span>
                <strong className="text-blue-400">{userLocation.latitude.toFixed(6)}</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-sans text-[10px] w-6">LNG:</span>
                <strong className="text-blue-400">{userLocation.longitude.toFixed(6)}</strong>
              </div>
            </div>

            {/* Copy Button */}
            <button
              type="button"
              onClick={() => {
                const text = `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`;
                navigator.clipboard.writeText(text);
                setIsCopiedCoords(true);
                setTimeout(() => setIsCopiedCoords(false), 2000);
              }}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isCopiedCoords ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Salin</span>
                </>
              )}
            </button>
          </div>

          {/* Actions: Follow Me & Direct Survey */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsFollowMe((prev) => !prev)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                isFollowMe
                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/40'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>{isFollowMe ? 'Mode Ikuti (ON)' : 'Ikuti Saya'}</span>
            </button>

            <Link
              href={`/poles/new?lat=${userLocation.latitude}&lng=${userLocation.longitude}&locMethod=GPS_DEVICE`}
              className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Survei di Sini</span>
            </Link>
          </div>
        </div>
      )}

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

          {/* 1. Kategori Infrastruktur (Seragam dengan SurveyForm) */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
              Kategori Infrastruktur Tiang:
            </label>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              {[
                { id: 'FO_WIFI', label: '🌐 Fiber Optic / WiFi' },
                { id: 'PJU_MANDIRI', label: '💡 PJU Mandiri' },
                { id: 'GABUNG_PLN_PJU', label: '⚡💡 Gabung PLN+PJU' },
                { id: 'PLN_MURNI', label: '⚡ PLN Listrik' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCorridorCategory(cat.id as any)}
                  className={`py-2 px-2 rounded-xl font-bold transition-all text-left truncate cursor-pointer ${
                    corridorCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400/40'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Khusus PJU: Spesifikasi Lampu & Kabel Menumpang */}
          {(corridorCategory === 'PJU_MANDIRI' || corridorCategory === 'GABUNG_PLN_PJU') && (
            <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-2xl space-y-2">
              <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1">
                <span>💡</span>
                <span>Spesifikasi Penerangan Jalan (PJU):</span>
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[9px] font-bold text-amber-800 uppercase mb-0.5">
                    Tipe Lampu
                  </label>
                  <select
                    value={corridorPjuLampType}
                    onChange={(e) => setCorridorPjuLampType(e.target.value as any)}
                    className="w-full px-2 py-1.5 bg-white border border-amber-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
                  >
                    <option value="LED">Lampu LED (Hemat Energi)</option>
                    <option value="SON_T">Lampu Kuning (SON-T / Sodium)</option>
                    <option value="SOLAR_CELL">Lampu Tenaga Surya (Solar Cell)</option>
                    <option value="MERCURY">Lampu Mercury</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-amber-800 uppercase mb-0.5">
                    Daya Lampu
                  </label>
                  <select
                    value={corridorPjuLampPower}
                    onChange={(e) => setCorridorPjuLampPower(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-amber-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
                  >
                    <option value="40W">40 Watt</option>
                    <option value="60W">60 Watt</option>
                    <option value="90W">90 Watt (Standar)</option>
                    <option value="120W">120 Watt</option>
                    <option value="150W">150 Watt</option>
                    <option value="250W">250 Watt</option>
                  </select>
                </div>
              </div>

              {/* Tumpangan Kabel Jaringan FO pada PJU */}
              <div>
                <label className="block text-[9px] font-bold text-amber-800 uppercase mb-1">
                  Status Tumpangan Kabel Jaringan / FO:
                </label>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setCorridorHasNetworkCable(false)}
                    className={`py-1.5 px-2 rounded-xl font-bold border transition-all text-center cursor-pointer ${
                      !corridorHasNetworkCable
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    🚫 PJU Murni (Tanpa FO)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCorridorHasNetworkCable(true)}
                    className={`py-1.5 px-2 rounded-xl font-bold border transition-all text-center cursor-pointer ${
                      corridorHasNetworkCable
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    🌐 Ada Kabel FO Menumpang
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. Spesifikasi Teknis Tiang & Kepemilikan */}
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

            {/* Material Tiang */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Jenis Tiang
              </label>
              <select
                value={corridorPoleType}
                onChange={(e) => setCorridorPoleType(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
              >
                <option value="BETON">Tiang Beton</option>
                <option value="BESI">Tiang Besi / Galvanis</option>
                <option value="KAYU">Tiang Kayu</option>
              </select>
            </div>

            {/* Height Selector (Default 5m) */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Tinggi Tiang
              </label>
              <select
                value={corridorHeight}
                onChange={(e) => setCorridorHeight(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
              >
                <option value="5m">5 Meter (PJU / Standar)</option>
                <option value="6m">6 Meter</option>
                <option value="7m">7 Meter</option>
                <option value="9m">9 Meter</option>
                <option value="11m">11 Meter</option>
                <option value="12m">12 Meter</option>
              </select>
            </div>

            {/* Kondisi Fisik Tiang */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Kondisi Fisik Tiang
              </label>
              <select
                value={corridorCondition}
                onChange={(e) => setCorridorCondition(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
              >
                <option value="GOOD">🟢 Kondisi Baik</option>
                <option value="NEEDS_REPAIR">🟡 Perlu Servis</option>
                <option value="DAMAGED">🔴 Rusak Berat</option>
              </select>
            </div>

            {/* Status Kepemilikan */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Kepemilikan
              </label>
              <select
                value={corridorOwnershipStatus}
                onChange={(e) => setCorridorOwnershipStatus(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
              >
                <option value="SENDIRI">Aset Sendiri</option>
                <option value="SEWA">Sewa Tiang</option>
                <option value="BERSAMA_PLN">Joint Bersama PLN</option>
              </select>
            </div>

            {/* Tipe Jalur Kabel */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Instalasi Kabel
              </label>
              <select
                value={corridorCableInstallationType}
                onChange={(e) => setCorridorCableInstallationType(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
              >
                <option value="UDARA">Kabel Udara (Aerial)</option>
                <option value="BAWAH_TANAH">🕳️ Bawah Tanah (Tanam)</option>
                <option value="TRANSISI_RISER">↕️ Riser Transisi</option>
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
                    Menyimpan {interpolatedCorridor?.poles.length} Tiang ke Server...
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
                {selectedPole.poleType} • {selectedPole.height || '5m'}
              </span>
              {(selectedPole.infrastructureCategory === 'PJU_MANDIRI' || selectedPole.infrastructureCategory === 'GABUNG_PLN_PJU') && (
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                  selectedPole.hasNetworkCable ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-900'
                }`}>
                  💡 {selectedPole.hasNetworkCable ? 'PJU + Kabel FO' : 'PJU Murni'}
                </span>
              )}
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

      {/* MODAL PANDUAN LENGKAP ARTI SIMBOL PIN PETA GIS */}
      <MapPinLegendModal
        isOpen={showLegendModal}
        onClose={() => setShowLegendModal(false)}
      />
    </div>
  );
}

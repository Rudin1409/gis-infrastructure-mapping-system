'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type L from 'leaflet';
import { Coordinates, GpsReading } from '@/types/gis';
import { MAP_TILE_LAYERS } from '@/lib/gis/tiles';
import { LUBUKLINGGAU_CENTER } from '@/config/lubuklinggau';
import {
  calculateHaversineDistance,
  formatDistance,
  getGpsQuality,
  evaluateLocationQC,
} from '@/lib/gis/haversine';
import {
  createDraggablePinIcon,
  createSurveyorBlueDotIcon,
  createPreviousPolePinIcon,
} from './markerIcons';
import { LUBUKLINGGAU_DISTRICT_BOUNDARIES } from '@/lib/gis/boundaries';
import {
  Layers,
  Locate,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  Compass,
  Sparkles,
  Search,
  Plus,
  Minus,
  Loader2,
  Info,
  Shield,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Camera,
  ExternalLink,
  Maximize2,
  X,
  RefreshCw,
  Lock,
  Users,
  Radio,
  Eye,
  EyeOff,
} from 'lucide-react';
import GISApiQuotaExceededLock from '@/components/common/GISApiQuotaExceededLock';
import { getStreetViewEmbedUrl, getStreetViewDirectUrl } from '@/lib/gis/streetview';
import { useAuth } from '@/context/AuthContext';

interface PinSelectorMapProps {
  initialPinCoord?: Coordinates;
  originalCoord?: Coordinates;
  poleCode?: string;
  onConfirmLocation: (data: {
    poleCoord: Coordinates;
    deviceCoord?: Coordinates;
    gpsAccuracy?: number;
    distanceFromDevice?: number;
    photoUrl?: string;
    roadSide?: 'KIRI' | 'KANAN';
  }) => void;
  onCancel?: () => void;
}

interface NearbyPole {
  id: string;
  poleCode?: string;
  poleLatitude: number;
  poleLongitude: number;
  providerName?: string;
  road?: string;
  kelurahan?: string;
  kecamatan?: string;
  surveyorName?: string;
  distanceMeters?: number;
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

function escapeHtml(value?: string | number | null) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || 'U') + (parts[1]?.[0] || '');
}

function createNearbyPoleIcon(LInstance: typeof L, distanceMeters?: number) {
  const isVeryClose = typeof distanceMeters === 'number' && distanceMeters <= 25;
  const color = isVeryClose ? '#dc2626' : '#f59e0b';
  const html = `
    <div class="relative flex flex-col items-center select-none pointer-events-none">
      <div class="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-black" style="background:${color}">
        !
      </div>
      <div class="w-1.5 h-1.5 rotate-45 -mt-1 shadow-sm" style="background:${color}"></div>
    </div>
  `;

  return LInstance.divIcon({
    html,
    className: 'nearby-existing-pole-icon',
    iconSize: [28, 34],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

function createActiveSurveyorIcon(LInstance: typeof L, location: ActiveSurveyorLocation) {
  const initials = escapeHtml(getInitials(location.userName).toUpperCase());
  const color = location.team === 'BAPENDA' ? '#059669' : '#2563eb';
  const html = `
    <div class="relative flex items-center justify-center select-none pointer-events-none" style="width:42px;height:42px;">
      <div class="absolute w-10 h-10 rounded-full opacity-25 animate-ping" style="background:${color}"></div>
      <div class="relative w-8 h-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white text-[10px] font-black ring-2 ring-white/30" style="background:${color}">
        ${initials}
      </div>
    </div>
  `;

  return LInstance.divIcon({
    html,
    className: 'active-surveyor-location-icon',
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -18],
  });
}

export default function PinSelectorMap({
  initialPinCoord,
  originalCoord,
  poleCode,
  onConfirmLocation,
  onCancel,
}: PinSelectorMapProps) {
  const { user } = useAuth();
  const isEditingSavedLocation = Boolean(originalCoord);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const pinMarkerRef = useRef<L.Marker | null>(null);
  const originalMarkerRef = useRef<L.Marker | null>(null);
  const shiftLineRef = useRef<L.Polyline | null>(null);
  const surveyorMarkerRef = useRef<L.Marker | null>(null);
  const distanceLineRef = useRef<L.Polyline | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);
  const boundaryLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const nearbyPoleLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const activeSurveyorLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const gpsReadingRef = useRef<GpsReading | null>(null);
  const hasUserInteractedRef = useRef<boolean>(Boolean(initialPinCoord || originalCoord));

  const [isLoadingLicense, setIsLoadingLicense] = useState(true);
  const [isLicenseLocked, setIsLicenseLocked] = useState(false);
  const [licenseReason, setLicenseReason] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch('/api/system/license', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.isLocked) {
          setIsLicenseLocked(true);
          if (d.reason) setLicenseReason(d.reason);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingLicense(false);
      });
  }, []);

  const [leafletLib, setLeafletLib] = useState<typeof L | null>(null);
  const [tileMode, setTileMode] = useState<'clean_satellite' | 'hybrid_survey' | 'street'>('hybrid_survey');
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [gpsReading, setGpsReading] = useState<GpsReading | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [nearbyPoles, setNearbyPoles] = useState<NearbyPole[]>([]);
  const [activeSurveyors, setActiveSurveyors] = useState<ActiveSurveyorLocation[]>([]);
  const [isCheckingNearby, setIsCheckingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [showNearbyLayer, setShowNearbyLayer] = useState(true);
  const [showSurveyorLayer, setShowSurveyorLayer] = useState(true);

  // 🔒 HAK AKSES KHUSUS: Hanya tim KOMINFO yang boleh melihat surveyor lain
  const isKominfoUser = useMemo(() => {
    if (!user) return false;
    if (user.role === 'ADMIN_KOMINFO') return true;
    if (user.team === 'KOMINFO') return true;
    const agencyLower = (user.agency || '').toLowerCase();
    return agencyLower.includes('kominfo') || agencyLower.includes('komunikasi');
  }, [user]);

  const [pinCoord, setPinCoord] = useState<Coordinates>(
    initialPinCoord || {
      lat: LUBUKLINGGAU_CENTER.lat,
      lng: LUBUKLINGGAU_CENTER.lng,
    }
  );

  // Street View is used as a visual reference only. The saved coordinate always comes from the 2D map pin.
  const [showStreetViewModal, setShowStreetViewModal] = useState<boolean>(false);
  const [streetViewKey, setStreetViewKey] = useState<number>(1);
  const [streetViewHeading, setStreetViewHeading] = useState<number>(0);
  const [isStreetViewLoading, setIsStreetViewLoading] = useState<boolean>(false);
  const [showStreetViewLockHint, setShowStreetViewLockHint] = useState<boolean>(false);
  const streetViewLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showLockedStreetViewHint = () => {
    setShowStreetViewLockHint(true);
    if (streetViewLockTimerRef.current) {
      clearTimeout(streetViewLockTimerRef.current);
    }
    streetViewLockTimerRef.current = setTimeout(() => {
      setShowStreetViewLockHint(false);
      streetViewLockTimerRef.current = null;
    }, 1700);
  };

  useEffect(() => {
    return () => {
      if (streetViewLockTimerRef.current) {
        clearTimeout(streetViewLockTimerRef.current);
      }
    };
  }, []);

  const openStreetView = () => {
    setIsStreetViewLoading(true);
    setStreetViewHeading(0);
    setShowStreetViewModal(true);
    setStreetViewKey((key) => key + 1);
  };

  // Load Leaflet library dynamically client-side only when verified NOT locked
  useEffect(() => {
    if (isLoadingLicense || isLicenseLocked) return;
    let isMounted = true;

    async function loadLeaflet() {
      if (typeof window === 'undefined') return;
      const L = await import('leaflet');
      // Import CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (isMounted) {
        setLeafletLib(L);
      }
    }

    loadLeaflet();
    return () => {
      isMounted = false;
    };
  }, [isLoadingLicense, isLicenseLocked]);

  // Initialize Map
  useEffect(() => {
    if (isLoadingLicense || isLicenseLocked || !leafletLib || !mapContainerRef.current || mapInstanceRef.current) return;
    isMountedRef.current = true;

    const L = leafletLib;
    const initialCenter = initialPinCoord || {
      lat: LUBUKLINGGAU_CENTER.lat,
      lng: LUBUKLINGGAU_CENTER.lng,
    };

    const map = L.map(mapContainerRef.current, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: 18,
      maxZoom: 21,
      zoomControl: false,
    });

    // Add Google Hybrid Satellite as default
    const tileConfig = MAP_TILE_LAYERS[tileMode];
    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
      subdomains: tileConfig.subdomains || ['0', '1', '2', '3'],
    }).addTo(map);

    currentTileLayerRef.current = tileLayer;

    // Add Administrative Kelurahan / Desa Boundaries
    const boundaryGroup = L.layerGroup();
    LUBUKLINGGAU_DISTRICT_BOUNDARIES.forEach((district) => {
      const polygon = L.polygon(district.polygon, {
        color: district.color,
        weight: 1.8,
        dashArray: '5, 5',
        fillColor: district.color,
        fillOpacity: 0.07,
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
    boundaryLayerGroupRef.current = boundaryGroup;

    nearbyPoleLayerGroupRef.current = L.layerGroup().addTo(map);
    activeSurveyorLayerGroupRef.current = L.layerGroup().addTo(map);

    // Previous Saved Location Marker (if originalCoord provided)
    if (originalCoord) {
      const origIcon = createPreviousPolePinIcon(L, poleCode);
      const origMarker = L.marker([originalCoord.lat, originalCoord.lng], {
        icon: origIcon,
        zIndexOffset: 700,
      }).addTo(map);
      originalMarkerRef.current = origMarker;

      // Dashed Leader Line connecting Original Pos to Moving New Pin
      const leaderLine = L.polyline(
        [
          [originalCoord.lat, originalCoord.lng],
          [initialCenter.lat, initialCenter.lng],
        ],
        {
          color: '#f59e0b',
          weight: 2.5,
          dashArray: '6, 6',
          opacity: 0.85,
          interactive: false,
        }
      ).addTo(map);
      shiftLineRef.current = leaderLine;
    }

    // Draggable Pin Marker with smooth auto-pan
    const pinIcon = createDraggablePinIcon(L);
    const pinMarker = L.marker([initialCenter.lat, initialCenter.lng], {
      draggable: true,
      autoPan: true,
      autoPanPadding: [40, 40],
      autoPanSpeed: 10,
      icon: pinIcon,
      zIndexOffset: 1000,
    }).addTo(map);

    // 🌐 Lingkaran Visual Radius Radar (75m dinamis mengikuti posisi pin)
    const radiusCircle = L.circle([initialCenter.lat, initialCenter.lng], {
      radius: 75,
      color: '#0284c7',
      weight: 1.8,
      dashArray: '5, 5',
      fillColor: '#38bdf8',
      fillOpacity: 0.12,
      interactive: false,
    }).addTo(map);
    radiusCircleRef.current = radiusCircle;

    const updatePinVisuals = (lat: number, lng: number) => {
      const latLng: [number, number] = [lat, lng];
      if (radiusCircleRef.current) {
        radiusCircleRef.current.setLatLng(latLng);
      }
      if (originalCoord && shiftLineRef.current) {
        shiftLineRef.current.setLatLngs([
          [originalCoord.lat, originalCoord.lng],
          latLng,
        ]);
      }
      if (distanceLineRef.current && gpsReadingRef.current) {
        distanceLineRef.current.setLatLngs([
          [gpsReadingRef.current.latitude, gpsReadingRef.current.longitude],
          latLng,
        ]);
      }
    };

    pinMarker.on('dragstart', () => {
      hasUserInteractedRef.current = true;
    });

    pinMarker.on('drag', (e: any) => {
      hasUserInteractedRef.current = true;
      const pos = e.target.getLatLng();
      updatePinVisuals(pos.lat, pos.lng);
      setPinCoord({ lat: pos.lat, lng: pos.lng });
    });

    pinMarker.on('dragend', (e: any) => {
      hasUserInteractedRef.current = true;
      const pos = e.target.getLatLng();
      updatePinVisuals(pos.lat, pos.lng);
      setPinCoord({ lat: pos.lat, lng: pos.lng });
    });

    // Tap map anywhere to move pin immediately
    map.on('click', (e: L.LeafletMouseEvent) => {
      hasUserInteractedRef.current = true;
      pinMarker.setLatLng(e.latlng);
      updatePinVisuals(e.latlng.lat, e.latlng.lng);
      setPinCoord({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    pinMarkerRef.current = pinMarker;
    mapInstanceRef.current = map;

    // Multiple invalidateSize passes to guarantee full viewport rendering
    [50, 150, 350, 700].forEach((delay) => {
      setTimeout(() => {
        if (isMountedRef.current && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, delay);
    });

    // New surveys can start from GPS automatically; edits should stay on the saved point.
    if (!isEditingSavedLocation) {
      requestGpsLocation(map, L, pinMarker);
    }

    // Watch position continuously for live satellite refinement and dynamic surveyor movement
    let watchId: number | null = null;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!isMountedRef.current || !mapInstanceRef.current) return;
          const { latitude, longitude, accuracy } = pos.coords;
          setGpsReading({
            latitude,
            longitude,
            accuracy: accuracy || 5,
            timestamp: pos.timestamp,
          });

          // 📍 Update device surveyor marker (blue dot)
          if (surveyorMarkerRef.current) {
            surveyorMarkerRef.current.setLatLng([latitude, longitude]);
          } else if (mapInstanceRef.current) {
            const surveyorIcon = createSurveyorBlueDotIcon(L);
            surveyorMarkerRef.current = L.marker([latitude, longitude], {
              icon: surveyorIcon,
              zIndexOffset: 500,
              interactive: false,
            }).addTo(mapInstanceRef.current);
          }

          // Pin marker is ONLY placed on first fix if user NEVER moved pin
          // and no initialPinCoord or originalCoord was provided.
          if (!hasUserInteractedRef.current && pinMarkerRef.current) {
            hasUserInteractedRef.current = true;
            pinMarkerRef.current.setLatLng([latitude, longitude]);
            updatePinVisuals(latitude, longitude);
            setPinCoord({ lat: latitude, lng: longitude });
          }

          // Update distance line connecting surveyor to current pin position
          if (distanceLineRef.current && pinMarkerRef.current) {
            const currentPinPos = pinMarkerRef.current.getLatLng();
            distanceLineRef.current.setLatLngs([
              [latitude, longitude],
              [currentPinPos.lat, currentPinPos.lng],
            ]);
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }

    return () => {
      isMountedRef.current = false;
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn('Map unmount cleanup:', e);
        }
        mapInstanceRef.current = null;
      }
      if (radiusCircleRef.current) {
        try {
          radiusCircleRef.current.remove();
        } catch (_) {}
      }
      radiusCircleRef.current = null;
      pinMarkerRef.current = null;
      surveyorMarkerRef.current = null;
      boundaryLayerGroupRef.current = null;
      nearbyPoleLayerGroupRef.current = null;
      activeSurveyorLayerGroupRef.current = null;
      currentTileLayerRef.current = null;
    };
  }, [leafletLib]);

  useEffect(() => {
    gpsReadingRef.current = gpsReading;
  }, [gpsReading]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsCheckingNearby(true);
      setNearbyError(null);
      try {
        const res = await fetch(
          `/api/poles?lat=${pinCoord.lat}&lng=${pinCoord.lng}&radius=75&limit=20`,
          { cache: 'no-store', signal: controller.signal }
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Gagal cek titik sekitar');
        }
        setNearbyPoles(json.data || []);
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          setNearbyError(error.message || 'Cek titik sekitar belum tersedia');
          setNearbyPoles([]);
        }
      } finally {
        if (!controller.signal.aborted) setIsCheckingNearby(false);
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [pinCoord.lat, pinCoord.lng]);

  useEffect(() => {
    if (!user?.id) return;

    const publishLocation = async () => {
      const reading = gpsReadingRef.current;
      if (!reading) return;
      try {
        await fetch('/api/surveyors/active', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            userName: user.name,
            roleLabel: user.roleLabel,
            team: user.team,
            latitude: reading.latitude,
            longitude: reading.longitude,
            accuracy: reading.accuracy,
          }),
        });
      } catch (_) {}
    };

    publishLocation();
    const intervalId = window.setInterval(publishLocation, 10000);
    return () => window.clearInterval(intervalId);
  }, [user?.id, user?.name, user?.roleLabel, user?.team]);

  useEffect(() => {
    // 🔒 Hanya tim KOMINFO yang boleh melihat surveyor aktif lain
    if (!isKominfoUser || !user?.id) {
      setActiveSurveyors([]);
      return;
    }

    let cancelled = false;
    const fetchActiveSurveyors = async () => {
      try {
        const res = await fetch(
          `/api/surveyors/active?lat=${pinCoord.lat}&lng=${pinCoord.lng}&excludeUserId=${encodeURIComponent(user.id)}&requesterTeam=KOMINFO`,
          { cache: 'no-store' }
        );
        const json = await res.json();
        if (!cancelled && json.success) {
          setActiveSurveyors(json.data || []);
        }
      } catch (_) {
        if (!cancelled) setActiveSurveyors([]);
      }
    };

    fetchActiveSurveyors();
    const intervalId = window.setInterval(fetchActiveSurveyors, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [pinCoord.lat, pinCoord.lng, user?.id, isKominfoUser]);

  useEffect(() => {
    if (!leafletLib || !mapInstanceRef.current || !nearbyPoleLayerGroupRef.current) return;
    const L = leafletLib;
    const group = nearbyPoleLayerGroupRef.current;
    group.clearLayers();

    if (!showNearbyLayer) return;

    nearbyPoles.forEach((pole) => {
      const marker = L.marker([pole.poleLatitude, pole.poleLongitude], {
        icon: createNearbyPoleIcon(L, pole.distanceMeters),
        zIndexOffset: 650,
      }).bindPopup(`
        <div style="min-width:170px">
          <strong>${escapeHtml(pole.poleCode || pole.id)}</strong><br/>
          <span>${escapeHtml(pole.providerName || 'Data tiang')}</span><br/>
          <small>${escapeHtml(pole.road || '-')}, ${escapeHtml(pole.kelurahan || '-')}</small><br/>
          <b>Jarak: ${escapeHtml(formatDistance(pole.distanceMeters || 0))}</b>
        </div>
      `);
      group.addLayer(marker);
    });
  }, [nearbyPoles, showNearbyLayer, leafletLib]);

  useEffect(() => {
    if (!leafletLib || !mapInstanceRef.current || !activeSurveyorLayerGroupRef.current) return;
    const L = leafletLib;
    const group = activeSurveyorLayerGroupRef.current;
    group.clearLayers();

    if (!isKominfoUser || !showSurveyorLayer) return;

    activeSurveyors.forEach((location) => {
      const marker = L.marker([location.latitude, location.longitude], {
        icon: createActiveSurveyorIcon(L, location),
        zIndexOffset: 720,
      }).bindPopup(`
        <div style="min-width:170px">
          <strong>${escapeHtml(location.userName)}</strong><br/>
          <span>${escapeHtml(location.team || 'TIM')}</span><br/>
          <small>Akurasi GPS: ${escapeHtml(location.accuracy ? `±${Math.round(location.accuracy)}m` : '-')}</small><br/>
          <b>Jarak dari pin: ${escapeHtml(formatDistance(location.distanceMeters || 0))}</b>
        </div>
      `);
      group.addLayer(marker);
    });
  }, [activeSurveyors, showSurveyorLayer, isKominfoUser, leafletLib]);

  // Handle Tile Mode Switch
  const toggleTileMode = () => {
    if (!leafletLib || !mapInstanceRef.current) return;
    const nextMode =
      tileMode === 'hybrid_survey'
        ? 'clean_satellite'
        : tileMode === 'clean_satellite'
        ? 'street'
        : 'hybrid_survey';
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

  // Toggle District Boundaries Overlay
  const toggleBoundaries = () => {
    if (!mapInstanceRef.current || !boundaryLayerGroupRef.current) return;
    if (showBoundaries) {
      mapInstanceRef.current.removeLayer(boundaryLayerGroupRef.current);
      setShowBoundaries(false);
    } else {
      mapInstanceRef.current.addLayer(boundaryLayerGroupRef.current);
      setShowBoundaries(true);
    }
  };

  // Request GPS Location from device with high accuracy
  const requestGpsLocation = (
    mapObj?: L.Map | null,
    LObj?: typeof L | null,
    markerObj?: L.Marker | null
  ) => {
    const map = mapObj || mapInstanceRef.current;
    const L = LObj || leafletLib;
    const pinMarker = markerObj || pinMarkerRef.current;

    if (!navigator.geolocation) {
      setGpsError('Browser tidak mendukung Geolocation.');
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isMountedRef.current || !mapInstanceRef.current) return;
        setIsLocating(false);
        const { latitude, longitude, accuracy } = position.coords;

        const reading: GpsReading = {
          latitude,
          longitude,
          accuracy: accuracy || 5,
          timestamp: position.timestamp,
        };

        setGpsReading(reading);

        if (map && L && mapInstanceRef.current) {
          try {
            // Update or create blue dot surveyor marker
            if (surveyorMarkerRef.current) {
              surveyorMarkerRef.current.setLatLng([latitude, longitude]);
            } else {
              const surveyorIcon = createSurveyorBlueDotIcon(L);
              surveyorMarkerRef.current = L.marker([latitude, longitude], {
                icon: surveyorIcon,
                zIndexOffset: 500,
              }).addTo(map);
            }

            // If user has NOT manually chosen/dragged a location yet, initialize pin to GPS position
            if (!hasUserInteractedRef.current && pinMarker) {
              hasUserInteractedRef.current = true;
              pinMarker.setLatLng([latitude, longitude]);
              if (radiusCircleRef.current) {
                radiusCircleRef.current.setLatLng([latitude, longitude]);
              }
              setPinCoord({ lat: latitude, lng: longitude });
              // Zoom deep into user position (Level 19)
              map.setView([latitude, longitude], 19, { animate: true });
            }
          } catch (err) {
            console.warn('Leaflet map update safely ignored:', err);
          }
        }
      },
      (error) => {
        if (!isMountedRef.current) return;
        setIsLocating(false);
        console.warn('Geolocation error:', error.message);
        setGpsError('Gagal mengunci GPS. Pastikan izin lokasi aktif.');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // Search Address / Perumahan via Geocoding
  const handleSearchLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || !mapInstanceRef.current) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery + ', Lubuklinggau'
        )}&limit=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        hasUserInteractedRef.current = true;
        if (pinMarkerRef.current) {
          pinMarkerRef.current.setLatLng([lat, lng]);
        }
        if (radiusCircleRef.current) {
          radiusCircleRef.current.setLatLng([lat, lng]);
        }
        if (originalCoord && shiftLineRef.current) {
          shiftLineRef.current.setLatLngs([
            [originalCoord.lat, originalCoord.lng],
            [lat, lng],
          ]);
        }
        if (distanceLineRef.current && gpsReadingRef.current) {
          distanceLineRef.current.setLatLngs([
            [gpsReadingRef.current.latitude, gpsReadingRef.current.longitude],
            [lat, lng],
          ]);
        }
        setPinCoord({ lat, lng });
        mapInstanceRef.current.setView([lat, lng], 19, { animate: true });
      }
    } catch (err) {
      console.warn('Geocoding error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Zoom Helpers
  const zoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };
  const zoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  // Update distance line whenever pin or GPS reading changes
  useEffect(() => {
    if (!leafletLib || !mapInstanceRef.current) return;
    const L = leafletLib;

    if (gpsReading) {
      const latlngs: [number, number][] = [
        [gpsReading.latitude, gpsReading.longitude],
        [pinCoord.lat, pinCoord.lng],
      ];

      if (distanceLineRef.current) {
        distanceLineRef.current.setLatLngs(latlngs);
      } else {
        const line = L.polyline(latlngs, {
          color: '#3b82f6',
          weight: 2.5,
          dashArray: '5, 8',
          opacity: 0.8,
        }).addTo(mapInstanceRef.current);
        distanceLineRef.current = line;
      }
    }
  }, [pinCoord, gpsReading, leafletLib]);

  // Center pin to current map view center
  const centerPinToMap = () => {
    if (!mapInstanceRef.current || !pinMarkerRef.current) return;
    const center = mapInstanceRef.current.getCenter();
    hasUserInteractedRef.current = true;
    pinMarkerRef.current.setLatLng(center);
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setLatLng(center);
    }
    if (originalCoord && shiftLineRef.current) {
      shiftLineRef.current.setLatLngs([
        [originalCoord.lat, originalCoord.lng],
        [center.lat, center.lng],
      ]);
    }
    if (distanceLineRef.current && gpsReadingRef.current) {
      distanceLineRef.current.setLatLngs([
        [gpsReadingRef.current.latitude, gpsReadingRef.current.longitude],
        [center.lat, center.lng],
      ]);
    }
    setPinCoord({ lat: center.lat, lng: center.lng });
  };

  // Focus map back to surveyor location
  const focusToSurveyor = () => {
    if (gpsReading && mapInstanceRef.current) {
      mapInstanceRef.current.setView([gpsReading.latitude, gpsReading.longitude], 19, {
        animate: true,
      });
    } else {
      requestGpsLocation();
    }
  };

  // Explicitly snap pin to surveyor's current GPS location
  const snapPinToGps = () => {
    if (!gpsReading || !pinMarkerRef.current || !mapInstanceRef.current) {
      requestGpsLocation();
      return;
    }
    hasUserInteractedRef.current = true;
    const { latitude, longitude } = gpsReading;
    pinMarkerRef.current.setLatLng([latitude, longitude]);
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setLatLng([latitude, longitude]);
    }
    if (originalCoord && shiftLineRef.current) {
      shiftLineRef.current.setLatLngs([
        [originalCoord.lat, originalCoord.lng],
        [latitude, longitude],
      ]);
    }
    if (distanceLineRef.current) {
      distanceLineRef.current.setLatLngs([
        [latitude, longitude],
        [latitude, longitude],
      ]);
    }
    setPinCoord({ lat: latitude, lng: longitude });
    mapInstanceRef.current.panTo([latitude, longitude]);
  };

  const shiftFromOriginal = originalCoord
    ? calculateHaversineDistance(originalCoord, pinCoord)
    : 0;

  const resetToOriginal = () => {
    if (!originalCoord || !pinMarkerRef.current || !mapInstanceRef.current) return;
    hasUserInteractedRef.current = true;
    pinMarkerRef.current.setLatLng([originalCoord.lat, originalCoord.lng]);
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setLatLng([originalCoord.lat, originalCoord.lng]);
    }
    if (shiftLineRef.current) {
      shiftLineRef.current.setLatLngs([
        [originalCoord.lat, originalCoord.lng],
        [originalCoord.lat, originalCoord.lng],
      ]);
    }
    if (distanceLineRef.current && gpsReadingRef.current) {
      distanceLineRef.current.setLatLngs([
        [gpsReadingRef.current.latitude, gpsReadingRef.current.longitude],
        [originalCoord.lat, originalCoord.lng],
      ]);
    }
    setPinCoord(originalCoord);
    mapInstanceRef.current.panTo([originalCoord.lat, originalCoord.lng]);
  };

  // Quality Control evaluation
  const deviceCoord = gpsReading
    ? { lat: gpsReading.latitude, lng: gpsReading.longitude }
    : null;

  const distance = deviceCoord
    ? calculateHaversineDistance(deviceCoord, pinCoord)
    : 0;

  const locationQC = evaluateLocationQC(pinCoord, deviceCoord);
  const gpsQuality = getGpsQuality(gpsReading?.accuracy);
  const nearestPole = nearbyPoles[0];
  const nearestDistance = nearestPole?.distanceMeters;
  const duplicateLevel =
    typeof nearestDistance === 'number' && nearestDistance <= 25
      ? 'danger'
      : typeof nearestDistance === 'number' && nearestDistance <= 75
      ? 'warning'
      : 'clear';

  // Handle confirmation: read coordinates accurately directly from pinMarker if active
  const handleConfirm = () => {
    const finalCoord = pinMarkerRef.current
      ? {
          lat: Number(pinMarkerRef.current.getLatLng().lat.toFixed(7)),
          lng: Number(pinMarkerRef.current.getLatLng().lng.toFixed(7)),
        }
      : pinCoord;

    onConfirmLocation({
      poleCoord: finalCoord,
      deviceCoord: deviceCoord || undefined,
      gpsAccuracy: gpsReading?.accuracy,
      distanceFromDevice: distance,
    });
  };

  if (isLoadingLicense) {
    return (
      <div className="w-full h-full min-h-[450px] bg-slate-900 flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
        <div className="w-14 h-14 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-slate-400 mb-3.5 shadow-xl animate-pulse">
          <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
        </div>
        <div className="h-3.5 w-48 bg-slate-800 rounded-full mb-2 animate-pulse" />
        <div className="h-2.5 w-32 bg-slate-800/70 rounded-full animate-pulse" />
      </div>
    );
  }

  if (isLicenseLocked) {
    return <GISApiQuotaExceededLock customMessage={licenseReason} />;
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-100 text-slate-800 relative select-none">
      {/* Top Search & GPS Status Bar */}
      <div className="z-10 bg-white/95 backdrop-blur-md px-3 py-2 border-b border-slate-200 shadow-sm flex items-center gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all flex items-center gap-1 font-bold text-xs flex-shrink-0 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Batal</span>
          </button>
        )}

        {/* Search Input for Perumahan / Street */}
        <form onSubmit={handleSearchLocation} className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari perumahan, gang, atau jalan..."
            className="w-full pl-8 pr-7 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 transition-all"
          />
          {isSearching && (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-600 animate-spin" />
          )}
        </form>

        {/* GPS Quality Badge */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span
            className={`inline-flex items-center px-2 py-1 rounded-xl text-[9px] font-bold border ${gpsQuality.badgeClass}`}
            title={`Akurasi perangkat: ±${(gpsReading?.accuracy || 0).toFixed(1)}m`}
          >
            GPS: {gpsQuality.label}
          </span>
        </div>
      </div>

      {/* Map Canvas Container */}
      <div className="relative flex-1 w-full h-full bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Map Overlaid Floating Action Controls */}
        <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
          {/* Street / Satellite Layer Toggle */}
          <button
            type="button"
            onClick={toggleTileMode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 hover:bg-slate-50 text-slate-800 rounded-2xl shadow-lg border border-slate-200 text-xs font-bold backdrop-blur transition-all active:scale-95 cursor-pointer"
            title="Ganti Tampilan Peta / Satelit"
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[11px]">{tileMode === 'street' ? 'Satelit' : 'Peta'}</span>
          </button>

          {/* Kelurahan Boundaries Toggle */}
          <button
            type="button"
            onClick={toggleBoundaries}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl shadow-lg border text-xs font-bold backdrop-blur transition-all active:scale-95 cursor-pointer ${
              showBoundaries
                ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/25'
                : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Tampilkan / Sembunyikan Batas Wilayah Kelurahan / Desa"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="text-[11px]">Kelurahan</span>
          </button>

          {/* Focus to My Location */}
          <button
            type="button"
            onClick={focusToSurveyor}
            disabled={isLocating}
            className="flex items-center justify-center w-9 h-9 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-2xl shadow-lg border border-blue-500 transition-all cursor-pointer"
            title="Fokus ke Posisi Saya (GPS)"
          >
            <Locate className={`w-4 h-4 ${isLocating ? 'animate-spin text-blue-200' : ''}`} />
          </button>

          {/* Zoom In (+) */}
          <button
            type="button"
            onClick={zoomIn}
            className="flex items-center justify-center w-9 h-9 bg-white/95 hover:bg-slate-50 active:scale-95 text-slate-700 rounded-2xl shadow-lg border border-slate-200 backdrop-blur transition-all font-bold cursor-pointer"
            title="Perbesar Peta (+)"
          >
            <Plus className="w-4 h-4 text-slate-800 stroke-[3]" />
          </button>

          {/* Zoom Out (-) */}
          <button
            type="button"
            onClick={zoomOut}
            className="flex items-center justify-center w-9 h-9 bg-white/95 hover:bg-slate-50 active:scale-95 text-slate-700 rounded-2xl shadow-lg border border-slate-200 backdrop-blur transition-all font-bold cursor-pointer"
            title="Perkecil Peta (-)"
          >
            <Minus className="w-4 h-4 text-slate-800 stroke-[3]" />
          </button>
        </div>

        {/* Top-Left Floating Live Coordinates & GPS Quality Card */}
        <div className="absolute top-3 left-3 z-[400] bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/15 text-white shadow-xl flex flex-col gap-1 max-w-[230px] select-none pointer-events-auto animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>Titik Tiang</span>
            </span>
            <span className="text-[8px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
              Live Pin
            </span>
          </div>

          <div className="font-mono text-[10px] text-slate-100 font-bold leading-tight">
            <div>Lat: <span className="text-emerald-300">{pinCoord.lat.toFixed(6)}</span></div>
            <div>Lng: <span className="text-emerald-300">{pinCoord.lng.toFixed(6)}</span></div>
          </div>

          <div className="text-[9px] text-slate-400 border-t border-white/10 pt-1 flex items-center justify-between">
            <span>Akurasi: <strong className="text-slate-200">{gpsReading ? `±${gpsReading.accuracy.toFixed(0)}m` : '-'}</strong></span>
            {distance > 0 && (
              <span className={`font-bold ${locationQC.isWarningDistance ? 'text-amber-400' : 'text-emerald-400'}`}>
                {formatDistance(distance)}
              </span>
            )}
          </div>

          <div className="text-[8px] text-slate-300 border-t border-white/10 pt-1 flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={snapPinToGps}
              className="px-2 py-0.5 bg-blue-600/80 hover:bg-blue-600 active:scale-95 text-white rounded text-[8px] font-bold flex items-center gap-1 cursor-pointer transition-all"
              title="Pindahkan pin ke posisi GPS perangkat saat ini"
            >
              <Crosshair className="w-2.5 h-2.5" />
              <span>Pin ke GPS</span>
            </button>
            {originalCoord && (
              <button
                type="button"
                onClick={resetToOriginal}
                className="px-2 py-0.5 bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 rounded text-[8px] font-bold cursor-pointer transition-all"
                title={`Geser: ${formatDistance(shiftFromOriginal)}`}
              >
                Reset ({formatDistance(shiftFromOriginal)})
              </button>
            )}
          </div>
        </div>

        {/* Nearby existing poles and active surveyor radar */}
        <div className="absolute bottom-24 right-3 z-[410] w-[min(245px,calc(100%-148px))] rounded-2xl border border-white/80 bg-white/95 p-2.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-slate-900">
                <Radio className="h-3.5 w-3.5 text-blue-600" />
                <span>Cek Sekitar</span>
              </p>
              <p
                className={`mt-0.5 text-[9px] font-bold ${
                  duplicateLevel === 'danger'
                    ? 'text-red-600'
                    : duplicateLevel === 'warning'
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              >
                {isCheckingNearby
                  ? 'Memindai lokasi...'
                  : duplicateLevel === 'danger'
                  ? 'Ada titik sangat dekat'
                  : duplicateLevel === 'warning'
                  ? 'Ada titik di sekitar'
                  : 'Belum ada titik dekat'}
              </p>
            </div>
            {isCheckingNearby ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            ) : duplicateLevel === 'danger' ? (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            )}
          </div>

          <div className={`mt-2 grid gap-1.5 ${isKominfoUser ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <button
              type="button"
              onClick={() => setShowNearbyLayer((value) => !value)}
              className={`flex h-9 items-center justify-between gap-1 rounded-xl border px-2 text-left transition-all active:scale-95 ${
                showNearbyLayer
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}
              title="Tampilkan atau sembunyikan titik tiang yang sudah terdata di sekitar pin"
            >
              <span className="text-[9px] font-black leading-tight">
                Titik Sekitar
                <br />
                {nearbyPoles.length} tiang
              </span>
              {showNearbyLayer ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>

            {isKominfoUser && (
              <button
                type="button"
                onClick={() => setShowSurveyorLayer((value) => !value)}
                className={`flex h-9 items-center justify-between gap-1 rounded-xl border px-2 text-left transition-all active:scale-95 ${
                  showSurveyorLayer
                    ? 'border-blue-200 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
                }`}
                title="Tampilkan atau sembunyikan posisi user aktif (Khusus Tim KOMINFO)"
              >
                <span className="text-[9px] font-black leading-tight">
                  User Aktif
                  <br />
                  {activeSurveyors.length}
                </span>
                <Users className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="mt-2 rounded-xl bg-slate-50 px-2 py-1.5 text-[9px] font-bold leading-snug text-slate-600">
            {nearbyError ? (
              <span className="text-amber-700">{nearbyError}</span>
            ) : nearestPole ? (
              <span>
                Terdekat <strong className="text-slate-950">{formatDistance(nearestDistance || 0)}</strong>
                {' '}dari <strong className="text-slate-950">{nearestPole.poleCode || nearestPole.id}</strong>
              </span>
            ) : (
              <span>Geser pin untuk cek titik yang sudah ditandai.</span>
            )}
          </div>
        </div>

        {/* ======================================================= */}
        {/* 🚶 GOOGLE MAPS STYLE LIVE STREET VIEW MINI-BOX INSET */}
        {/* ======================================================= */}
        <div className="absolute bottom-20 sm:bottom-24 left-3 z-[410] animate-in fade-in zoom-in duration-200">
          <button
            type="button"
            onClick={openStreetView}
            className="group relative w-28 h-20 sm:w-32 sm:h-22 rounded-2xl overflow-hidden border-2 border-white shadow-2xl bg-slate-900 flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer ring-2 ring-black/15"
            title="Lihat Street View untuk cek lokasi"
          >
            {/* Street View preview for visual checking near the selected map pin. */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center bg-slate-900">
              <iframe
                src={getStreetViewEmbedUrl(pinCoord, 0)}
                className="w-[280px] h-[190px] border-0 pointer-events-none opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                loading="lazy"
                title="Preview Street View lokasi"
              />
            </div>

            {/* Top Label Badge */}
            <div className="absolute top-1 left-1 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded-lg text-[8px] font-bold text-amber-300 flex items-center gap-1 border border-white/10 shadow-md pointer-events-none z-10">
              <Camera className="w-2.5 h-2.5" />
              <span>Street View</span>
            </div>

            {/* Hover Expand Hint */}
            <div className="absolute inset-0 bg-blue-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white font-bold text-[9px] gap-0.5 backdrop-blur-2xs pointer-events-none z-20">
              <Maximize2 className="w-4 h-4" />
              <span>Cek Visual</span>
            </div>
          </button>
        </div>
      </div>

      {/* Floating Bottom Full Confirmation Action */}
      <div className="absolute bottom-3.5 left-3 right-3 z-[400] animate-in slide-in-from-bottom-2">
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:scale-[0.99] text-white font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer border border-white/20"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>KONFIRMASI TITIK LOKASI INI &rarr;</span>
        </button>
      </div>

      {/* ======================================================= */}
      {/* Street View visual verification */}
      {/* ======================================================= */}
      {showStreetViewModal && (
        <div className="fixed inset-0 z-[1200] flex flex-col bg-slate-950 text-white animate-in fade-in duration-200">
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-md">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black tracking-tight text-white">
                    Lihat Street View
                  </h3>
                  <span className="px-1.5 py-0.2 rounded-full text-[8px] font-bold bg-sky-500/20 text-sky-200 border border-sky-400/30">
                    CEK LOKASI
                  </span>
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500/15 text-red-300 border border-red-400/40"
                    title="Maju dan mundur dikunci"
                  >
                    <Lock className="w-2.5 h-2.5" />
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  Pin peta: {pinCoord.lat.toFixed(6)}, {pinCoord.lng.toFixed(6)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Refresh Panorama Button */}
              <button
                type="button"
                onClick={() => {
                  setIsStreetViewLoading(true);
                  setStreetViewKey((k) => k + 1);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Muat ulang tampilan Street View"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isStreetViewLoading ? 'animate-spin text-sky-300' : ''}`} />
                <span className="hidden sm:inline">Segarkan</span>
              </button>

              <a
                href={getStreetViewDirectUrl(pinCoord, 0)}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-all"
              >
                <span>Buka di Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => setShowStreetViewModal(false)}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Street View Viewport: 360° rotation with quick turn buttons and 56% road chevron lock shield */}
          <div className="flex-1 w-full relative bg-slate-950 overflow-hidden select-none">
            {/* Loading Indicator Overlay */}
            {isStreetViewLoading && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs text-white pointer-events-none">
                <Loader2 className="w-8 h-8 text-sky-300 animate-spin mb-2" />
                <p className="text-xs font-bold text-slate-300">Memuat Street View...</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Tahan &amp; geser layar atau gunakan tombol putar</p>
              </div>
            )}

            {/* Google iframe with Street View */}
            <iframe
              key={`${streetViewKey}-${streetViewHeading}`}
              src={getStreetViewEmbedUrl(pinCoord, streetViewHeading, 16, 75)}
              title="Street View untuk cek lokasi"
              className="absolute inset-0 h-full w-full border-0 pointer-events-auto"
              allowFullScreen
              loading="eager"
              onLoad={() => setIsStreetViewLoading(false)}
            />

            {/* Quick 45-degree Rotation Controls on Left & Right */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsStreetViewLoading(true);
                setStreetViewHeading((h) => (h - 45 + 360) % 360);
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-30 flex items-center gap-1 px-3 py-2 rounded-2xl bg-slate-900/85 hover:bg-slate-800 text-white border border-white/20 shadow-2xl backdrop-blur-md text-xs font-bold transition-all active:scale-95 cursor-pointer"
              title="Putar Kiri 45°"
            >
              <ChevronLeft className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">Putar Kiri</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsStreetViewLoading(true);
                setStreetViewHeading((h) => (h + 45) % 360);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex items-center gap-1 px-3 py-2 rounded-2xl bg-slate-900/85 hover:bg-slate-800 text-white border border-white/20 shadow-2xl backdrop-blur-md text-xs font-bold transition-all active:scale-95 cursor-pointer"
              title="Putar Kanan 45°"
            >
              <span className="hidden sm:inline">Putar Kanan</span>
              <ChevronRight className="w-4 h-4 text-sky-400" />
            </button>

            {/* High-Coverage Road & Chevron Interceptor Shield (Covers lower 56% road corridor) */}
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                showLockedStreetViewHint();
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                showLockedStreetViewHint();
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              className="absolute bottom-0 left-0 right-0 h-[56%] z-20 pointer-events-auto cursor-default select-none"
              title="Posisi tiang terkunci. Pindah titik lewat peta 2D."
            />

            {/* Top Red Lock Alert Badge (Only appears when someone tries to click/step forward) */}
            {showStreetViewLockHint && (
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-600 text-white border border-red-400/80 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in duration-150 pointer-events-none">
                <Lock className="w-3.5 h-3.5 fill-white text-white" />
                <span className="text-[10.5px] font-black tracking-tight">Posisi Terkunci (Ganti lewat Peta 2D)</span>
              </div>
            )}
          </div>

          {/* Bottom Action Footer */}
          <div className="p-3 bg-slate-900/98 backdrop-blur-xl border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 flex-shrink-0">
            <div className="w-full sm:max-w-md rounded-2xl border border-slate-700 bg-slate-800/80 px-3 py-2">
              <p className="text-[11px] font-bold text-slate-100 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verifikasi Posisi Tiang</span>
              </p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-slate-300">
                Putar 360° untuk cek lingkungan sekitar tiang. Geser titik dari peta 2D jika belum pas.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-[0.9fr_1.1fr] gap-2 w-full sm:flex sm:w-auto">
              <button
                type="button"
                onClick={() => setShowStreetViewModal(false)}
                className="min-h-12 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[10px] sm:text-xs rounded-2xl transition-all cursor-pointer border border-white/10 flex items-center justify-center text-center"
              >
                Geser di Peta
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowStreetViewModal(false);
                  handleConfirm();
                }}
                className="min-h-12 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:scale-95 text-white font-black text-[10px] sm:text-xs rounded-2xl shadow-xl shadow-blue-500/25 transition-all cursor-pointer border border-white/20 text-center leading-tight"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>PAKAI TITIK INI &rarr;</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

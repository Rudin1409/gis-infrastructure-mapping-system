'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  RotateCcw,
  Camera,
  ExternalLink,
  Maximize2,
  X,
  RefreshCw,
} from 'lucide-react';
import GISApiQuotaExceededLock from '@/components/common/GISApiQuotaExceededLock';
import { getStreetViewEmbedUrl, getStreetViewDirectUrl } from '@/lib/gis/streetview';

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

export default function PinSelectorMap({
  initialPinCoord,
  originalCoord,
  poleCode,
  onConfirmLocation,
  onCancel,
}: PinSelectorMapProps) {
  const isEditingSavedLocation = Boolean(originalCoord);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const pinMarkerRef = useRef<L.Marker | null>(null);
  const originalMarkerRef = useRef<L.Marker | null>(null);
  const shiftLineRef = useRef<L.Polyline | null>(null);
  const surveyorMarkerRef = useRef<L.Marker | null>(null);
  const distanceLineRef = useRef<L.Polyline | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);
  const boundaryLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const isMountedRef = useRef<boolean>(true);

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

  const [pinCoord, setPinCoord] = useState<Coordinates>(
    initialPinCoord || {
      lat: LUBUKLINGGAU_CENTER.lat,
      lng: LUBUKLINGGAU_CENTER.lng,
    }
  );

  // Street View is used as a visual reference only. The saved coordinate always comes from the 2D map pin.
  const [showStreetViewModal, setShowStreetViewModal] = useState<boolean>(false);
  const [streetViewKey, setStreetViewKey] = useState<number>(1);
  const [isStreetViewLoading, setIsStreetViewLoading] = useState<boolean>(false);

  const openStreetView = () => {
    setIsStreetViewLoading(true);
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
        }
      ).addTo(map);
      shiftLineRef.current = leaderLine;
    }

    // Draggable Pin Marker
    const pinIcon = createDraggablePinIcon(L);
    const pinMarker = L.marker([initialCenter.lat, initialCenter.lng], {
      draggable: true,
      icon: pinIcon,
      zIndexOffset: 1000,
    }).addTo(map);

    pinMarker.on('drag', (e: any) => {
      const pos = e.target.getLatLng();
      setPinCoord({ lat: pos.lat, lng: pos.lng });
      if (originalCoord && shiftLineRef.current) {
        shiftLineRef.current.setLatLngs([
          [originalCoord.lat, originalCoord.lng],
          [pos.lat, pos.lng],
        ]);
      }
    });

    // Tap map anywhere to move pin immediately
    map.on('click', (e: L.LeafletMouseEvent) => {
      pinMarker.setLatLng(e.latlng);
      setPinCoord({ lat: e.latlng.lat, lng: e.latlng.lng });
      if (originalCoord && shiftLineRef.current) {
        shiftLineRef.current.setLatLngs([
          [originalCoord.lat, originalCoord.lng],
          [e.latlng.lat, e.latlng.lng],
        ]);
      }
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

    // Watch position continuously for live satellite refinement
    let watchId: number | null = null;
    if (!isEditingSavedLocation && typeof navigator !== 'undefined' && navigator.geolocation) {
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

          if (surveyorMarkerRef.current) {
            surveyorMarkerRef.current.setLatLng([latitude, longitude]);
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
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
      pinMarkerRef.current = null;
      surveyorMarkerRef.current = null;
      boundaryLayerGroupRef.current = null;
      currentTileLayerRef.current = null;
    };
  }, [leafletLib]);

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

            // If pin is still at default Lubuklinggau center, place pin near user
            if (
              pinMarker &&
              Math.abs(pinCoord.lat - LUBUKLINGGAU_CENTER.lat) < 0.001 &&
              Math.abs(pinCoord.lng - LUBUKLINGGAU_CENTER.lng) < 0.001
            ) {
              pinMarker.setLatLng([latitude, longitude]);
              setPinCoord({ lat: latitude, lng: longitude });
            }

            // Zoom deep into user position (Level 19)
            map.setView([latitude, longitude], 19, { animate: true });
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
        if (pinMarkerRef.current) {
          pinMarkerRef.current.setLatLng([lat, lng]);
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
    pinMarkerRef.current.setLatLng(center);
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

  const shiftFromOriginal = originalCoord
    ? calculateHaversineDistance(originalCoord, pinCoord)
    : 0;

  const resetToOriginal = () => {
    if (!originalCoord || !pinMarkerRef.current || !mapInstanceRef.current) return;
    pinMarkerRef.current.setLatLng([originalCoord.lat, originalCoord.lng]);
    setPinCoord(originalCoord);
    if (shiftLineRef.current) {
      shiftLineRef.current.setLatLngs([
        [originalCoord.lat, originalCoord.lng],
        [originalCoord.lat, originalCoord.lng],
      ]);
    }
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

  // Handle confirmation
  const handleConfirm = () => {
    onConfirmLocation({
      poleCoord: pinCoord,
      deviceCoord: deviceCoord || undefined,
      gpsAccuracy: gpsReading?.accuracy,
      distanceFromDevice: distance,
    });
  };

  if (isLoadingLicense) {
    return (
      <div className="w-full h-full min-h-[450px] bg-slate-900 flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
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

        {/* Draggable & Tap Hint Pill */}
        <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-700 shadow-md flex items-center gap-1.5 pointer-events-none">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Geser pin atau ketuk peta untuk pindah</span>
        </div>

        {/* ======================================================= */}
        {/* 🚶 GOOGLE MAPS STYLE LIVE STREET VIEW MINI-BOX INSET */}
        {/* ======================================================= */}
        <div className="absolute bottom-36 sm:bottom-32 left-3 z-[410] animate-in fade-in zoom-in duration-200">
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

      {/* Floating Bottom Data Card & Action */}
      <div className="absolute bottom-4 left-3 right-3 z-[400] bg-white/98 backdrop-blur-xl rounded-3xl p-3 border border-slate-200/90 shadow-[0_10px_35px_rgba(15,23,42,0.18)] animate-in slide-in-from-bottom-2">
        {originalCoord ? (
          <div className="grid grid-cols-2 gap-2 mb-2">
            {/* New Moving Position */}
            <div className="bg-emerald-50/80 rounded-2xl p-2 border border-emerald-200">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                  <span>📌</span> Titik Baru
                </span>
                <span className="text-[8px] font-bold px-1.5 py-0.2 bg-emerald-600 text-white rounded-md">
                  Aktif
                </span>
              </div>
              <div className="font-mono text-[10px] text-slate-800 font-bold">
                <div>Lat: <span className="text-emerald-700">{pinCoord.lat.toFixed(6)}</span></div>
                <div>Lng: <span className="text-emerald-700">{pinCoord.lng.toFixed(6)}</span></div>
              </div>
            </div>

            {/* Original Saved Position */}
            <div className="bg-amber-50/80 rounded-2xl p-2 border border-amber-200">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                  <span>📍</span> Titik Awal
                </span>
                <button
                  type="button"
                  onClick={resetToOriginal}
                  className="text-[8px] font-bold px-1.5 py-0.5 bg-white text-amber-900 border border-amber-300 hover:bg-amber-100 rounded-md flex items-center gap-0.5 cursor-pointer"
                  title="Kembalikan pin ke posisi awal"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset</span>
                </button>
              </div>
              <div className="text-[10px] text-slate-700">
                <div>Geser: <span className="font-bold text-amber-900">{formatDistance(shiftFromOriginal)}</span></div>
                <div className="text-[9px] text-slate-500 truncate">{poleCode || 'Posisi Awal'}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 mb-2">
            {/* Pole Coordinates */}
            <div className="bg-slate-50 rounded-2xl p-2 border border-slate-100">
              <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider block mb-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Koordinat Tiang
              </span>
              <div className="font-mono text-[10px] text-slate-800 font-bold">
                <div>Lat: <span className="text-emerald-600">{pinCoord.lat.toFixed(6)}</span></div>
                <div>Lng: <span className="text-emerald-600">{pinCoord.lng.toFixed(6)}</span></div>
              </div>
            </div>

            {/* Surveyor GPS & Distance Info */}
            <div className="bg-slate-50 rounded-2xl p-2 border border-slate-100">
              <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider block mb-0.5 flex items-center gap-1">
                <Locate className="w-3 h-3" /> Posisi Surveyor
              </span>
              <div className="text-[10px] text-slate-600">
                <div>Akurasi: <span className="font-bold text-slate-900">{gpsReading ? `±${gpsReading.accuracy.toFixed(0)}m${gpsReading.accuracy > 30 ? ' (WiFi)' : ''}` : '-'}</span></div>
                <div>Jarak: <span className={`font-bold ${locationQC.isWarningDistance ? 'text-amber-600' : 'text-emerald-600'}`}>{formatDistance(distance)}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Button */}
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-black text-xs rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>KONFIRMASI TITIK LOKASI INI &rarr;</span>
        </button>
      </div>

      {/* ======================================================= */}
      {/* Street View visual verification */}
      {/* ======================================================= */}
      {showStreetViewModal && (
        <div className="fixed inset-0 z-[600] flex flex-col bg-slate-950 text-white animate-in fade-in duration-200">
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

          {/* Interactive iframe is display-only from the app's point of view. */}
          <div className="flex-1 w-full relative bg-slate-950 overflow-hidden select-none">
            {/* Loading Indicator Overlay */}
            {isStreetViewLoading && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs text-white pointer-events-none">
                <Loader2 className="w-8 h-8 text-sky-300 animate-spin mb-2" />
                <p className="text-xs font-bold text-slate-300">Memuat Street View...</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Gunakan untuk memastikan lingkungan sekitar titik</p>
              </div>
            )}

            <iframe
              key={streetViewKey}
              src={getStreetViewEmbedUrl(pinCoord, 0, 16, 75)}
              title="Street View untuk cek lokasi"
              className="absolute inset-0 h-full w-full border-0"
              allowFullScreen
              loading="eager"
              onLoad={() => setIsStreetViewLoading(false)}
            />

            {/* Top Instruction Pill */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 max-w-[92vw] bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-[10px] font-bold text-slate-200 shadow-xl flex items-center gap-1.5 pointer-events-none text-center">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Geser layar 360° untuk melihat tiang. Titik dikunci dari peta.</span>
            </div>

            {/* Bottom Road Click Shield (Protects against accidental road arrow clicks) */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent pointer-events-auto z-15 flex items-end justify-center pb-2">
              <span className="text-[10px] text-slate-300/90 font-bold bg-slate-900/80 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm pointer-events-none">
                🔒 Geser 360° di area atas. Untuk pindah posisi, gunakan Peta 2D.
              </span>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="p-3 bg-slate-900/98 backdrop-blur-xl border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 flex-shrink-0">
            <div className="w-full sm:max-w-md rounded-2xl border border-slate-700 bg-slate-800/70 px-3 py-2">
              <p className="text-[11px] font-bold text-slate-100">Cek lokasi</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
                Jika belum pas, kembali ke peta lalu geser titik.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowStreetViewModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl transition-all cursor-pointer"
              >
                Kembali &amp; Geser Titik
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowStreetViewModal(false);
                  handleConfirm();
                }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs rounded-2xl shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
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

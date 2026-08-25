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
import { createDraggablePinIcon, createSurveyorBlueDotIcon } from './markerIcons';
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
} from 'lucide-react';

interface PinSelectorMapProps {
  initialPinCoord?: Coordinates;
  onConfirmLocation: (data: {
    poleCoord: Coordinates;
    deviceCoord?: Coordinates;
    gpsAccuracy?: number;
    distanceFromDevice?: number;
  }) => void;
}

export default function PinSelectorMap({
  initialPinCoord,
  onConfirmLocation,
}: PinSelectorMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const pinMarkerRef = useRef<L.Marker | null>(null);
  const surveyorMarkerRef = useRef<L.Marker | null>(null);
  const distanceLineRef = useRef<L.Polyline | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);
  const boundaryLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const isMountedRef = useRef<boolean>(true);

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

  // Load Leaflet library dynamically client-side
  useEffect(() => {
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
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!leafletLib || !mapContainerRef.current || mapInstanceRef.current) return;
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
    });

    // Tap map anywhere to move pin immediately
    map.on('click', (e: L.LeafletMouseEvent) => {
      pinMarker.setLatLng(e.latlng);
      setPinCoord({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    pinMarkerRef.current = pinMarker;
    mapInstanceRef.current = map;

    setTimeout(() => {
      if (isMountedRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    // Trigger high-accuracy geolocation
    requestGpsLocation(map, L, pinMarker);

    // Watch position continuously for live satellite refinement
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

  return (
    <div className="flex flex-col h-full w-full bg-slate-100 text-slate-800 relative select-none">
      {/* Top Search & GPS Status Bar */}
      <div className="z-10 bg-white/95 backdrop-blur-md px-3 py-2 border-b border-slate-200 shadow-sm flex items-center gap-2">
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 hover:bg-slate-50 text-slate-800 rounded-2xl shadow-lg border border-slate-200 text-xs font-bold backdrop-blur transition-all active:scale-95"
            title="Ganti Tampilan Peta / Satelit"
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[11px]">{tileMode === 'street' ? 'Satelit' : 'Peta'}</span>
          </button>

          {/* Kelurahan Boundaries Toggle */}
          <button
            type="button"
            onClick={toggleBoundaries}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl shadow-lg border text-xs font-bold backdrop-blur transition-all active:scale-95 ${
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
            className="flex items-center justify-center w-9 h-9 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-2xl shadow-lg border border-blue-500 transition-all"
            title="Fokus ke Posisi Saya (GPS)"
          >
            <Locate className={`w-4 h-4 ${isLocating ? 'animate-spin text-blue-200' : ''}`} />
          </button>

          {/* Zoom In (+) */}
          <button
            type="button"
            onClick={zoomIn}
            className="flex items-center justify-center w-9 h-9 bg-white/95 hover:bg-slate-50 active:scale-95 text-slate-700 rounded-2xl shadow-lg border border-slate-200 backdrop-blur transition-all font-bold"
            title="Perbesar Peta (+)"
          >
            <Plus className="w-4 h-4 text-slate-800 stroke-[3]" />
          </button>

          {/* Zoom Out (-) */}
          <button
            type="button"
            onClick={zoomOut}
            className="flex items-center justify-center w-9 h-9 bg-white/95 hover:bg-slate-50 active:scale-95 text-slate-700 rounded-2xl shadow-lg border border-slate-200 backdrop-blur transition-all font-bold"
            title="Perkecil Peta (-)"
          >
            <Minus className="w-4 h-4 text-slate-800 stroke-[3]" />
          </button>
        </div>

        {/* Draggable & Tap Hint Pill */}
        <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-700 shadow-md flex items-center gap-1.5 pointer-events-none">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Ketuk peta untuk geser Pin</span>
        </div>
      </div>

      {/* Floating Bottom Data Card & Action */}
      <div className="absolute bottom-4 left-3 right-3 z-[400] bg-white/98 backdrop-blur-xl rounded-3xl p-3 border border-slate-200/90 shadow-[0_10px_35px_rgba(15,23,42,0.18)] animate-in slide-in-from-bottom-2">
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
    </div>
  );
}

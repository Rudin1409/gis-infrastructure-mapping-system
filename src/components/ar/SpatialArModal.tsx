'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Compass,
  Camera,
  Maximize2,
  Minimize2,
  Scan,
  RefreshCw,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  Eye,
  Sliders,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type { Pole } from '@/types/pole';

interface SpatialArModalProps {
  isOpen: boolean;
  onClose: () => void;
  poles?: Pole[];
}

export default function SpatialArModal({ isOpen, onClose, poles = [] }: SpatialArModalProps) {
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [pitch, setPitch] = useState<number>(0);
  const [roll, setRoll] = useState<number>(0);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({
    lat: -3.2964,
    lng: 102.8613, // Pusat Kota Lubuklinggau
  });
  const [isGpsLocked, setIsGpsLocked] = useState(false);
  const [arMode, setArMode] = useState<'RADAR' | 'HAZARD' | 'WIREFRAME'>('RADAR');
  const [selectedPole, setSelectedPole] = useState<Pole | null>(null);
  const [snapshotTaken, setSnapshotTaken] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1. Get GPS Position
  useEffect(() => {
    if (!isOpen) return;

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setIsGpsLocked(true);
        },
        () => {
          setIsGpsLocked(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [isOpen]);

  // 2. Initialize Camera Feed
  useEffect(() => {
    if (!isOpen) {
      // Stop video track when modal closed
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setHasCamera(null);
      setCameraError(null);
      return;
    }

    let activeStream: MediaStream | null = null;

    async function initCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('WebRTC Camera tidak didukung oleh browser ini.');
        }

        // Try environment camera first (rear phone camera), fallback to any video (laptop webcam)
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          });
        } catch (_) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setHasCamera(true);
        setCameraError(null);
      } catch (err: any) {
        console.warn('[AR Camera] Notice:', err.message);
        setHasCamera(false);
        setCameraError('Kamera tidak aktif. Mode simulasi AR 3D spasial diaktifkan.');
      }
    }

    initCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  // 3. Device Orientation (Gyroscope / Compass)
  useEffect(() => {
    if (!isOpen) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) {
        setHeading(Math.round(e.alpha));
      }
      if (e.beta !== null) {
        setPitch(Math.round(e.beta));
      }
      if (e.gamma !== null) {
        setRoll(Math.round(e.gamma));
      }
    };

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientation', handleOrientation, true);
      }
    };
  }, [isOpen]);

  // Calculate Distance & Bearing to nearby poles
  const nearbyArPoles = useMemo(() => {
    if (!poles || poles.length === 0) return [];

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3; // metres
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(R * c);
    };

    const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
      const x =
        Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
        Math.sin((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.cos(((lon2 - lon1) * Math.PI) / 180);
      const θ = Math.atan2(y, x);
      const brng = ((θ * 180) / Math.PI + 360) % 360;
      return Math.round(brng);
    };

    return poles
      .filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat))
      .map((pole) => {
        const dist = calculateDistance(userCoords.lat, userCoords.lng, pole.lat, pole.lng);
        const bearing = calculateBearing(userCoords.lat, userCoords.lng, pole.lat, pole.lng);
        return {
          ...pole,
          distanceMeters: dist,
          bearingDegrees: bearing,
        };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 16);
  }, [poles, userCoords]);

  // Snapshot / Take AR Photo with watermark HUD
  const takeArSnapshot = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1280;
    canvas.height = 720;

    // 1. Draw video background or simulation background
    if (videoRef.current && hasCamera) {
      ctx.drawImage(videoRef.current, 0, 0, 1280, 720);
    } else {
      // Dark cyber simulated camera background
      const grad = ctx.createLinearGradient(0, 0, 0, 720);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);

      // Grid lines
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 1280; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 720);
        ctx.stroke();
      }
      for (let y = 0; y < 720; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1280, y);
        ctx.stroke();
      }
    }

    // 2. Watermark overlay
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(20, 20, 420, 90);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 420, 90);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('INFRA-MAP AR HUD SPASIAL', 36, 50);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText(`GPS: ${userCoords.lat.toFixed(6)}, ${userCoords.lng.toFixed(6)}`, 36, 74);
    ctx.fillText(`KOMPAS: ${heading}° | TANGGAL: ${new Date().toLocaleDateString('id-ID')}`, 36, 96);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setSnapshotTaken(dataUrl);
  };

  // Drag on Desktop to change heading
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const diff = e.clientX - dragStartX;
    setHeading((prev) => (prev - diff * 0.2 + 360) % 360);
    setDragStartX(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-5xl h-[92vh] max-h-[820px] bg-slate-950 rounded-3xl sm:rounded-[36px] overflow-hidden border border-slate-800 shadow-[0_25px_80px_rgba(0,0,0,0.8)] flex flex-col cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Hidden Canvas for AR Capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* 1. Video Element / Camera Stream */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            hasCamera ? 'opacity-90' : 'opacity-0'
          }`}
        />

        {/* Simulated Spatial World if Camera is off/denied */}
        {!hasCamera && (
          <div className="absolute inset-0 bg-radial from-slate-900 via-slate-950 to-black flex items-center justify-center overflow-hidden">
            {/* Cyber Spatial Grid (Moves with Heading) */}
            <div
              className="absolute inset-0 opacity-25 pointer-events-none transition-transform duration-100"
              style={{
                backgroundImage: `radial-gradient(circle at center, rgba(59, 130, 246, 0.15) 0, transparent 70%), linear-gradient(rgba(59, 130, 246, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.2) 1px, transparent 1px)`,
                backgroundSize: '100% 100%, 60px 60px, 60px 60px',
                transform: `translateX(${((heading % 360) / 360) * -200}px)`,
              }}
            />

            {/* Radar Circle Radar Sweep */}
            <div className="w-[420px] h-[420px] rounded-full border border-blue-500/20 relative flex items-center justify-center pointer-events-none">
              <div className="w-[300px] h-[300px] rounded-full border border-blue-500/30" />
              <div className="w-[180px] h-[180px] rounded-full border border-blue-500/40" />
              <div
                className="absolute inset-0 rounded-full border-t-2 border-r-2 border-cyan-400/60 animate-spin"
                style={{ animationDuration: '6s' }}
              />
            </div>
          </div>
        )}

        {/* 2. TOP HUD: Compass Azimuth Ribbon & Action Buttons */}
        <div className="relative z-20 p-3 sm:p-4 bg-gradient-to-b from-slate-950/90 via-slate-950/60 to-transparent flex items-center justify-between gap-3">
          {/* App & AR Badge */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-violet-600/30 border border-violet-500/50 text-violet-300 flex items-center justify-center shadow-lg">
              <Scan className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white tracking-wide uppercase font-mono">
                  Radar AR Spasial
                </span>
                <span className="px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 border border-violet-400/30 text-[9px] font-bold">
                  Live 3D
                </span>
              </div>
              <p className="text-[10px] text-slate-300 font-mono">
                {isGpsLocked ? 'GPS Akurat (Kota Lubuklinggau)' : 'Mode Navigasi Simulator'}
              </p>
            </div>
          </div>

          {/* Center Digital Compass Ribbon */}
          <div className="hidden md:flex flex-col items-center bg-slate-900/80 border border-slate-800 px-4 py-1.5 rounded-2xl backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-mono font-black text-white">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>{Math.round(heading)}°</span>
              <span className="text-cyan-400 font-bold">
                {heading >= 337.5 || heading < 22.5
                  ? 'UTARA (N)'
                  : heading >= 22.5 && heading < 67.5
                  ? 'TIMUR LAUT (NE)'
                  : heading >= 67.5 && heading < 112.5
                  ? 'TIMUR (E)'
                  : heading >= 112.5 && heading < 157.5
                  ? 'TENGGARA (SE)'
                  : heading >= 157.5 && heading < 202.5
                  ? 'SELATAN (S)'
                  : heading >= 202.5 && heading < 247.5
                  ? 'BARAT DAYA (SW)'
                  : heading >= 247.5 && heading < 292.5
                  ? 'BARAT (W)'
                  : 'BARAT LAUT (NW)'}
              </span>
            </div>
            <span className="text-[9px] text-slate-400 mt-0.5">
              Geser mouse pada layar untuk memutar kompas 360°
            </span>
          </div>

          {/* Close & Mode Switcher */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setArMode(
                  arMode === 'RADAR' ? 'HAZARD' : arMode === 'HAZARD' ? 'WIREFRAME' : 'RADAR'
                )
              }
              className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Ganti Mode Tampilan AR"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Mode:</span>
              <span className="text-blue-300 uppercase">{arMode}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-2xl bg-slate-900/90 hover:bg-rose-600 active:scale-95 text-slate-300 hover:text-white border border-slate-700/80 flex items-center justify-center transition-all cursor-pointer shadow-md"
              aria-label="Tutup AR"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* 3. CENTER AR HUD: Artificial Horizon & Targeting Reticle */}
        <div className="relative flex-1 pointer-events-none flex items-center justify-center">
          {/* Center Tactical Crosshair */}
          <div className="relative w-24 h-24 rounded-full border border-cyan-400/40 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-cyan-400/30 border border-cyan-400" />
            <div className="absolute top-0 w-0.5 h-3 bg-cyan-400" />
            <div className="absolute bottom-0 w-0.5 h-3 bg-cyan-400" />
            <div className="absolute left-0 h-0.5 w-3 bg-cyan-400" />
            <div className="absolute right-0 h-0.5 w-3 bg-cyan-400" />
          </div>

          {/* Horizon Line indicator */}
          <div
            className="absolute w-48 h-0.5 bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent transition-transform duration-150"
            style={{ transform: `rotate(${roll}deg) translateY(${pitch}px)` }}
          />

          {/* FLOATING AR TAGS: Render nearby poles relative to Heading */}
          <div className="absolute inset-0 overflow-hidden pointer-events-auto">
            {nearbyArPoles.slice(0, 8).map((pole, idx) => {
              // Calculate horizontal offset based on relative bearing to heading (-60° to +60° field of view)
              let relBearing = (pole.bearingDegrees - heading + 540) % 360 - 180;
              const inView = relBearing >= -50 && relBearing <= 50;

              // Normalized X position (10% to 90% screen width)
              const screenX = 50 + (relBearing / 50) * 40;
              // Y position varies by distance and index
              const screenY = 32 + (idx % 3) * 16;

              const isHazard =
                pole.condition === 'DAMAGED' ||
                pole.condition === 'NEEDS_REPAIR' ||
                pole.isHazardous ||
                pole.isMessyCable;

              if (!inView && arMode !== 'WIREFRAME') return null;

              return (
                <div
                  key={pole.id || idx}
                  onClick={() => setSelectedPole(pole)}
                  style={{
                    left: `${Math.max(8, Math.min(88, screenX))}%`,
                    top: `${screenY}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 transform hover:scale-110 ${
                    inView ? 'opacity-100 scale-100' : 'opacity-40 scale-75'
                  }`}
                >
                  <div
                    className={`p-2 rounded-2xl backdrop-blur-xl border shadow-xl flex items-center gap-2 ${
                      isHazard
                        ? 'bg-amber-950/80 border-amber-500/70 text-amber-200'
                        : 'bg-slate-900/85 border-cyan-400/60 text-slate-100'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono font-black text-xs ${
                        isHazard ? 'bg-amber-500 text-slate-950' : 'bg-cyan-500 text-slate-950'
                      }`}
                    >
                      {pole.poleType === 'BETON' ? 'B' : pole.poleType === 'BESI' ? 'Fe' : 'P'}
                    </div>

                    <div className="min-w-0 pr-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[11px] text-white truncate max-w-[110px]">
                          {pole.poleCode || pole.id}
                        </span>
                        <span className="px-1 py-0.2 rounded text-[8px] font-black uppercase bg-white/20 text-white">
                          {pole.distanceMeters}m
                        </span>
                      </div>
                      <p className="text-[9.5px] text-slate-300 truncate max-w-[120px]">
                        {pole.providerName || pole.providerId} &bull; {pole.road || 'Jalan Kota'}
                      </p>
                    </div>
                  </div>

                  {/* Marker Pin Stalk connecting to ground */}
                  <div className="w-0.5 h-6 bg-gradient-to-b from-cyan-400 to-transparent mx-auto mt-0.5" />
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. BOTTOM HUD: Controls, Compass Slider for Desktop, & Snapshot */}
        <div className="relative z-20 p-3 sm:p-4 bg-gradient-to-t from-slate-950/95 via-slate-950/75 to-transparent flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 bg-slate-900/85 border border-slate-800 px-3.5 py-2 rounded-2xl text-[11px] text-slate-300 backdrop-blur-md">
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            <span>
              Terdeteksi <strong>{nearbyArPoles.length} Tiang</strong> di radius sekitar
            </span>
          </div>

          {/* Desktop Heading Slider */}
          <div className="flex-1 max-w-sm w-full flex items-center gap-2 bg-slate-900/70 border border-slate-800 px-3 py-1.5 rounded-2xl backdrop-blur-md">
            <span className="text-[10px] text-slate-400 font-mono">0°</span>
            <input
              type="range"
              min="0"
              max="359"
              value={heading}
              onChange={(e) => setHeading(Number(e.target.value))}
              className="flex-1 accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              title="Putar Kompas AR"
            />
            <span className="text-[10px] text-slate-400 font-mono">360°</span>
          </div>

          {/* Snapshot Action */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={takeArSnapshot}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:opacity-95 active:scale-95 text-white font-bold text-xs shadow-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 stroke-[2.2]" />
              <span>Ambil Foto AR</span>
            </button>
          </div>
        </div>

        {/* Selected Pole Detail Modal Overlay */}
        {selectedPole && (
          <div className="absolute inset-x-4 bottom-20 sm:bottom-24 z-30 max-w-md mx-auto bg-slate-900/95 border border-cyan-500/60 rounded-3xl p-4 shadow-2xl backdrop-blur-2xl text-white animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-400">
                  Target Spasial AR
                </span>
                <h3 className="text-sm font-black text-white font-mono mt-0.5">
                  {selectedPole.poleCode || selectedPole.id}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {selectedPole.providerName || selectedPole.providerId} &bull; {selectedPole.road}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPole(null)}
                className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-center text-xs">
              <div className="bg-slate-800/60 p-2 rounded-xl">
                <span className="text-[9px] text-slate-400 block">Jarak</span>
                <span className="font-bold text-cyan-300 font-mono">
                  {(selectedPole as any).distanceMeters || 15} m
                </span>
              </div>
              <div className="bg-slate-800/60 p-2 rounded-xl">
                <span className="text-[9px] text-slate-400 block">Kondisi</span>
                <span
                  className={`font-bold ${
                    selectedPole.condition === 'GOOD' ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {selectedPole.condition === 'GOOD' ? 'Baik' : 'Perlu Audit'}
                </span>
              </div>
              <div className="bg-slate-800/60 p-2 rounded-xl">
                <span className="text-[9px] text-slate-400 block">Tinggi</span>
                <span className="font-bold text-slate-200">{selectedPole.height || '7m'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Snapshot Result Preview Modal */}
        {snapshotTaken && (
          <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-4 max-w-lg w-full space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Hasil Tangkapan Kamera AR</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setSnapshotTaken(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <img
                src={snapshotTaken}
                alt="AR Snapshot Preview"
                className="w-full rounded-2xl border border-slate-800 shadow"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <a
                  href={snapshotTaken}
                  download={`AR_INFRAMAP_${Date.now()}.jpg`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Simpan Gambar
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

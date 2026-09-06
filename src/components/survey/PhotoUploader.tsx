'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Trash2,
  CheckCircle,
  UploadCloud,
  AlertCircle,
  X,
  RefreshCw,
} from 'lucide-react';
import { compressImage } from '@/lib/utils/imageCompress';

interface PhotoUploaderProps {
  onPhotoSelected: (file: File, previewUrl: string) => void;
  onPhotoRemoved: () => void;
  previewUrl?: string;
  isUploading?: boolean;
}

export default function PhotoUploader({
  onPhotoSelected,
  onPhotoRemoved,
  previewUrl,
  isUploading = false,
}: PhotoUploaderProps) {
  const fileInputCameraRef = useRef<HTMLInputElement>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [compressing, setCompressing] = useState(false);
  const [compressInfo, setCompressInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live in-app camera modal state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Start live in-app camera
  const startLiveCamera = async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Fallback to native file capture if WebRTC getUserMedia not supported
        fileInputCameraRef.current?.click();
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch (err: any) {
      console.warn('Live WebRTC camera error, falling back to input capture:', err);
      // Fallback directly to native camera input
      fileInputCameraRef.current?.click();
    }
  };

  // Stop live camera stream
  const stopLiveCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  // Connect video element to stream when modal opens
  useEffect(() => {
    if (isCameraOpen && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch((e) => console.warn('Video play notice:', e));
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isCameraOpen, cameraStream]);

  // Capture photo from live video stream
  const takeSnapshot = async () => {
    if (!videoRef.current) return;

    try {
      setCompressing(true);
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      stopLiveCamera();

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setError('Gagal mengambil frame foto.');
            setCompressing(false);
            return;
          }

          const file = new File([blob], `pole-survey-${Date.now()}.jpg`, { type: 'image/jpeg' });
          const origSize = (file.size / (1024 * 1024)).toFixed(2);
          const { file: compressedFile, dataUrl } = await compressImage(file);
          const compSize = (compressedFile.size / 1024).toFixed(0);

          setCompressInfo(`Kompresi foto: ${origSize}MB ➔ ${compSize}KB`);
          onPhotoSelected(compressedFile, dataUrl);
          setCompressing(false);
        },
        'image/jpeg',
        0.92
      );
    } catch (err: any) {
      console.error('Snap error:', err);
      setError('Gagal memproses jepretan kamera.');
      setCompressing(false);
    }
  };

  // Handle standard file selection (Camera fallback or Gallery)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setCompressing(true);

    try {
      const origSize = (file.size / (1024 * 1024)).toFixed(2);
      const { file: compressedFile, dataUrl } = await compressImage(file);
      const compSize = (compressedFile.size / 1024).toFixed(0);

      setCompressInfo(`Kompresi foto: ${origSize}MB ➔ ${compSize}KB`);
      onPhotoSelected(compressedFile, dataUrl);
    } catch (err: any) {
      console.error('Compression error:', err);
      setError('Gagal memproses foto. Silakan coba lagi.');
    } finally {
      setCompressing(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Hidden File Inputs for native hardware fallback */}
      <input
        ref={fileInputCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={fileInputGalleryRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Photo Preview State */}
      {previewUrl ? (
        <div className="relative rounded-3xl overflow-hidden border border-slate-200 bg-slate-900 group shadow-md">
          {previewUrl.includes('/api/streetview/photo?') ? (
            <div className="relative w-full h-56 bg-slate-950 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Foto Street View tiang yang terkunci"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-emerald-700/90 backdrop-blur rounded-xl text-[10px] text-white font-bold border border-emerald-400/30 flex items-center gap-1 z-10">
                <Camera className="w-3 h-3" />
                <span>Foto Street View Bersih</span>
              </div>
            </div>
          ) : previewUrl.includes('google.com') || previewUrl.includes('svembed') ? (
            /* Clean & Pure Street View Photo — CSS-cropped to remove Google Maps UI chrome */
            <div className="relative w-full h-56 bg-slate-950 overflow-hidden">
              {/* The iframe is scaled up and shifted to crop out the Google Maps top address bar, 
                  bottom toolbar, compass, and navigation arrows — leaving ONLY clean panorama */}
              <iframe
                src={previewUrl}
                className="border-0 pointer-events-none"
                style={{
                  position: 'absolute',
                  top: '-70px',
                  left: '-15px',
                  width: 'calc(100% + 30px)',
                  height: 'calc(100% + 130px)',
                }}
                loading="lazy"
                title="Foto Street View Tiang"
              />
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-emerald-700/90 backdrop-blur rounded-xl text-[10px] text-white font-bold border border-emerald-400/30 flex items-center gap-1 z-10">
                <Camera className="w-3 h-3" />
                <span>📸 Foto Street View Terkunci</span>
              </div>
            </div>
          ) : (
            /* Standard Uploaded / Captured Image */
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={previewUrl} alt="Survey Pole Preview" className="w-full h-56 object-cover" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-3.5 z-10 pointer-events-auto">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
              <CheckCircle className="w-4 h-4" />
              <span>Foto Lapangan Siap</span>
            </div>

            <button
              type="button"
              onClick={onPhotoRemoved}
              disabled={isUploading}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-lg backdrop-blur transition-all active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Ganti / Ambil Ulang</span>
            </button>
          </div>

          {compressInfo && (
            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-black/70 backdrop-blur rounded-xl text-[10px] text-slate-200 font-mono font-bold border border-white/10">
              {compressInfo}
            </div>
          )}
        </div>
      ) : (
        /* Empty State: Take Photo / Gallery Buttons */
        <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-3xl p-5 bg-slate-50 text-center transition-colors">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3 shadow-inner">
            <Camera className="w-6 h-6" />
          </div>

          <h4 className="text-sm font-bold text-slate-900 mb-1">Dokumentasi Foto Fisik Tiang</h4>
          <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto">
            Arahkan kamera ke tiang untuk merekam fisik, kabel, nomor plat, atau kondisi sekitar
          </p>

          <div className="flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={startLiveCamera}
              disabled={compressing}
              className="flex-1 max-w-[170px] py-3 px-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black rounded-2xl shadow-md shadow-blue-500/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Buka Kamera</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputGalleryRef.current?.click()}
              disabled={compressing}
              className="flex-1 max-w-[170px] py-3 px-3.5 bg-white hover:bg-slate-100 active:scale-95 text-slate-700 text-xs font-bold rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-slate-500" />
              <span>Pilih Galeri</span>
            </button>
          </div>

          {compressing && (
            <div className="mt-3 text-xs text-blue-600 font-bold flex items-center justify-center gap-1.5 animate-pulse">
              <UploadCloud className="w-4 h-4 animate-bounce" />
              <span>Mengompres foto untuk upload cepat...</span>
            </div>
          )}

          {error && (
            <div className="mt-3 text-xs text-rose-600 font-bold flex items-center justify-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Live In-App Camera Viewfinder Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[1200] bg-black flex flex-col justify-between p-4 animate-in fade-in select-none">
          {/* Top Bar */}
          <div className="flex items-center justify-between z-10">
            <span className="px-3 py-1 bg-black/60 backdrop-blur rounded-full text-white text-xs font-bold">
              📸 Bidik Objek Tiang
            </span>
            <button
              type="button"
              onClick={stopLiveCamera}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Live Video Stream Feed */}
          <div className="relative flex-1 my-3 rounded-3xl overflow-hidden bg-black flex items-center justify-center border border-white/20">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Viewfinder Overlay Grid */}
            <div className="absolute inset-0 pointer-events-none border-2 border-white/30 rounded-3xl flex items-center justify-center">
              <div className="w-48 h-48 border border-white/50 rounded-2xl"></div>
            </div>
          </div>

          {/* Shutter Controls */}
          <div className="flex items-center justify-center pb-4 z-10">
            <button
              type="button"
              onClick={takeSnapshot}
              className="w-20 h-20 rounded-full bg-white border-4 border-blue-600 shadow-2xl flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
              aria-label="Ambil Foto"
            >
              <div className="w-14 h-14 rounded-full bg-blue-600"></div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

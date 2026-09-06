'use client';

import React, { useState, useEffect } from 'react';
import PinSelectorMap from '@/components/map/PinSelectorMap';
import SurveyForm from '@/components/survey/SurveyForm';
import { Coordinates } from '@/types/gis';
import { Provider } from '@/types/provider';
import { DEFAULT_PROVIDERS } from '@/config/providers';

export default function NewPoleSurveyPage() {
  const [step, setStep] = useState<'MAP_PIN' | 'FORM'>('MAP_PIN');
  const [confirmedLocation, setConfirmedLocation] = useState<{
    poleCoord: Coordinates;
    deviceCoord?: Coordinates;
    gpsAccuracy?: number;
    distanceFromDevice?: number;
    photoUrl?: string;
    roadSide?: 'KIRI' | 'KANAN';
  } | null>(null);

  const [providers, setProviders] = useState<Provider[]>(DEFAULT_PROVIDERS);

  // Fetch providers master from API
  useEffect(() => {
    async function loadProviders() {
      try {
        const res = await fetch('/api/providers');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setProviders(json.data);
          }
        }
      } catch (err) {
        console.warn('Using default providers fallback:', err);
      }
    }
    loadProviders();
  }, []);

  const handleLocationConfirmed = (data: {
    poleCoord: Coordinates;
    deviceCoord?: Coordinates;
    gpsAccuracy?: number;
    distanceFromDevice?: number;
    photoUrl?: string;
    roadSide?: 'KIRI' | 'KANAN';
  }) => {
    setConfirmedLocation(data);
    setStep('FORM');
  };

  const handleBackToMap = () => {
    setStep('MAP_PIN');
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Visual Step Progress Tracker Header */}
      <div className="bg-white px-3.5 py-2 border-b border-slate-200 shadow-2xs z-30 flex-shrink-0">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {step === 'MAP_PIN' ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
                  1
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-blue-600 block leading-none">
                    Tahap 1 dari 2
                  </span>
                  <h2 className="text-xs font-black text-slate-900 leading-tight">
                    Kunci Posisi Titik Tiang di Peta
                  </h2>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-400">Geser Pin / GPS</span>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black shadow-xs">
                  ✓
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-emerald-600 block leading-none">
                    Tahap 2: Pengisian Data
                  </span>
                  <h2 className="text-xs font-black text-slate-900 leading-tight">
                    Formulir Survei Teknis Tiang
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={handleBackToMap}
                className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-xl flex items-center gap-1 transition-all cursor-pointer"
              >
                <span>🗺️ Ubah Titik Peta</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Viewport */}
      <div className="flex-1 w-full relative overflow-hidden">
        {step === 'MAP_PIN' ? (
          <div className="w-full h-full flex flex-col relative overflow-hidden">
            <PinSelectorMap
              initialPinCoord={confirmedLocation?.poleCoord}
              onConfirmLocation={handleLocationConfirmed}
            />
          </div>
        ) : (
          confirmedLocation && (
            <div className="w-full h-full overflow-y-auto p-3 pb-12">
              <SurveyForm
                confirmedCoord={confirmedLocation.poleCoord}
                deviceCoord={confirmedLocation.deviceCoord}
                gpsAccuracy={confirmedLocation.gpsAccuracy}
                distanceFromDevice={confirmedLocation.distanceFromDevice}
                initialPhotoUrl={confirmedLocation.photoUrl}
                initialRoadSide={confirmedLocation.roadSide}
                providers={providers}
                onBackToMap={handleBackToMap}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}

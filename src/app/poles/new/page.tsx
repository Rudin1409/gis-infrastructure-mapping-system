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
      <div className="bg-white px-4 py-2 border-b border-slate-200 shadow-sm z-30 flex-shrink-0">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* Step 1 Pill */}
          <button
            type="button"
            onClick={() => setStep('MAP_PIN')}
            className={`flex items-center gap-1.5 transition-all text-left ${
              step === 'MAP_PIN'
                ? 'opacity-100 scale-100'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                step === 'MAP_PIN'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'bg-emerald-500 text-white'
              }`}
            >
              {confirmedLocation && step === 'FORM' ? '✓' : '1'}
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block leading-none">
                Langkah 1
              </span>
              <span className={`text-xs font-bold ${step === 'MAP_PIN' ? 'text-blue-600' : 'text-slate-700'}`}>
                Kunci Titik Peta
              </span>
            </div>
          </button>

          {/* Connector Arrow */}
          <div className="w-6 h-[2px] bg-slate-200 mx-1 flex-shrink-0" />

          {/* Step 2 Pill */}
          <div
            className={`flex items-center gap-1.5 transition-all text-left ${
              step === 'FORM'
                ? 'opacity-100 scale-100'
                : 'opacity-40'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                step === 'FORM'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              2
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block leading-none">
                Langkah 2
              </span>
              <span className={`text-xs font-bold ${step === 'FORM' ? 'text-blue-600' : 'text-slate-600'}`}>
                Data &amp; Foto
              </span>
            </div>
          </div>
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

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function MapLoading() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white relative overflow-hidden">
      {/* Background Satellite Grid Simulation */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

      <div className="relative z-10 flex flex-col items-center gap-3 p-6 text-center animate-pulse">
        <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-400/40 flex items-center justify-center text-blue-400 shadow-xl backdrop-blur-md">
          <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
        </div>
        <div>
          <h3 className="text-sm font-black tracking-tight text-white uppercase font-mono">
            Memuat Peta GIS Lubuklinggau
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Sinkronisasi Layer Satelit &amp; Titik Tiang...
          </p>
        </div>
      </div>
    </div>
  );
}

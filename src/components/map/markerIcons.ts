import type L from 'leaflet';

/**
 * Generates custom HTML/SVG DivIcons for Leaflet
 */
export function createSurveyorBlueDotIcon(LInstance: typeof L) {
  const html = `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping"></div>
      <div class="relative w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-md flex items-center justify-center">
        <div class="w-2 h-2 bg-white rounded-full"></div>
      </div>
    </div>
  `;

  return LInstance.divIcon({
    html,
    className: 'custom-surveyor-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export function createDraggablePinIcon(LInstance: typeof L) {
  const html = `
    <div class="relative flex flex-col items-center group cursor-grab active:cursor-grabbing">
      <div class="w-10 h-10 bg-gradient-to-tr from-blue-700 to-indigo-600 rounded-full border-3 border-white shadow-xl flex items-center justify-center text-white font-bold text-xs transform transition-transform group-hover:scale-110">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
      <div class="w-2.5 h-2.5 bg-blue-900 rotate-45 -mt-1.5 shadow-sm"></div>
      <div class="w-3 h-1 bg-black/30 rounded-full blur-[1px] mt-0.5"></div>
    </div>
  `;

  return LInstance.divIcon({
    html,
    className: 'custom-draggable-pin',
    iconSize: [40, 48],
    iconAnchor: [20, 46],
  });
}

export function createConditionMarkerIcon(
  LInstance: typeof L,
  condition: 'GOOD' | 'NEEDS_REPAIR' | 'DAMAGED' | 'UNKNOWN',
  label?: string
) {
  let bgClass = 'from-emerald-500 to-emerald-600';
  let arrowClass = 'bg-emerald-600';

  if (condition === 'NEEDS_REPAIR') {
    bgClass = 'from-amber-400 to-amber-500';
    arrowClass = 'bg-amber-500';
  } else if (condition === 'DAMAGED') {
    bgClass = 'from-rose-500 to-rose-600';
    arrowClass = 'bg-rose-600';
  } else if (condition === 'UNKNOWN') {
    bgClass = 'from-slate-500 to-slate-600';
    arrowClass = 'bg-slate-600';
  }

  const html = `
    <div class="relative flex flex-col items-center group cursor-pointer select-none">
      <div class="w-6 h-6 bg-gradient-to-tr ${bgClass} rounded-full border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-[9px] transform transition-transform group-hover:scale-125">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
      <div class="w-1.5 h-1.5 ${arrowClass} rotate-45 -mt-1 shadow-sm"></div>
      ${
        label
          ? `<span class="mt-0.5 px-1 py-0.2 text-[8px] font-bold font-mono bg-white/95 text-slate-800 rounded shadow-xs border border-slate-200/90 whitespace-nowrap pointer-events-none">${label}</span>`
          : ''
      }
    </div>
  `;

  return LInstance.divIcon({
    html,
    className: 'custom-condition-marker',
    iconSize: [28, 36],
    iconAnchor: [14, 24],
    popupAnchor: [0, -24],
  });
}

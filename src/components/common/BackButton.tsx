'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

interface BackButtonProps {
  fallbackUrl?: string;
  className?: string;
  label?: string;
}

export default function BackButton({
  fallbackUrl = '/map',
  className = 'inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 py-1.5 px-3 rounded-xl bg-white border border-slate-200 shadow-2xs transition-all hover:bg-slate-50 active:scale-95 cursor-pointer',
  label = 'Kembali',
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackUrl);
    }
  };

  return (
    <button type="button" onClick={handleBack} className={className} aria-label={label}>
      <ChevronLeft className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}

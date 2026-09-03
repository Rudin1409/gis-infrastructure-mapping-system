import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes cache

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ success: false, error: 'Latitude dan longitude wajib diisi' }, { status: 400 });
  }

  const cacheKey = `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ success: true, data: cached.data });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=19&addressdetails=1&extratags=1&namedetails=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'InfraMap-Lubuklinggau-GIS/2.0 (admin@lubuklinggaukota.go.id)',
        'Accept-Language': 'id,en',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, error: `Nominatim status ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    cache.set(cacheKey, { data, timestamp: Date.now() });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.warn('Reverse geocode proxy error:', error?.message || error);
    return NextResponse.json({ success: false, error: error?.message || 'Geocoding failed' }, { status: 500 });
  }
}

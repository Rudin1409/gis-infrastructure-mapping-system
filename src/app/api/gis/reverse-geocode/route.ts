import { withAuth, requestUser } from '@/lib/security/api';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes cache

function getLocationIqApiKey() {
  return process.env.LOCATIONIQ_API_KEY?.trim() || '';
}

function normalizeProviderPayload(payload: any, source: 'locationiq' | 'osm') {
  if (!payload || payload.error) return null;
  return {
    ...payload,
    address: payload.address || {},
    extratags: payload.extratags || {},
    namedetails: payload.namedetails || {},
    source,
  };
}

async function GETHandler(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json(
      { success: false, error: 'Latitude dan longitude wajib diisi' },
      { status: 400 }
    );
  }

  const cacheKey = `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ success: true, data: cached.data });
  }

  try {
    const locationIqApiKey = getLocationIqApiKey();

    if (locationIqApiKey) {
      const locationIqUrl = `https://us1.locationiq.com/v1/reverse?key=${encodeURIComponent(
        locationIqApiKey
      )}&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(
        lng
      )}&format=json&addressdetails=1&normalizeaddress=1&accept-language=id,en`;
      const locationIqRes = await fetch(locationIqUrl, {
        next: { revalidate: 3600 },
      });

      if (locationIqRes.ok) {
        const locationIqPayload = await locationIqRes.json();
        const normalizedLocationIqData = normalizeProviderPayload(locationIqPayload, 'locationiq');
        if (normalizedLocationIqData) {
          cache.set(cacheKey, { data: normalizedLocationIqData, timestamp: Date.now() });
          return NextResponse.json({
            success: true,
            data: normalizedLocationIqData,
          });
        }
      } else {
        console.warn('LocationIQ reverse geocode status:', locationIqRes.status);
      }
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=19&addressdetails=1&extratags=1&namedetails=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'InfraMap-Lubuklinggau-GIS/2.0 (admin@lubuklinggaukota.go.id)',
        'Accept-Language': 'id,en',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Nominatim status ${res.status}` },
        { status: 502 }
      );
    }

    const payload = await res.json();
    const data = normalizeProviderPayload(payload, 'osm') || payload;
    cache.set(cacheKey, { data, timestamp: Date.now() });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.warn('Reverse geocode proxy error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Geocoding failed' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(GETHandler, {});

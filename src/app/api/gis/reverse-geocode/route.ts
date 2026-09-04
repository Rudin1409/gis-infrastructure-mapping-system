import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes cache

function getGoogleMapsApiKey() {
  return (
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    ''
  );
}

function findGoogleComponent(
  components: Array<{ long_name: string; short_name: string; types: string[] }>,
  type: string
) {
  return components.find((component) => component.types.includes(type))?.long_name || '';
}

function normalizeGoogleGeocodeResult(payload: any) {
  const results = Array.isArray(payload?.results) ? payload.results : [];
  if (payload?.status !== 'OK' || results.length === 0) return null;

  const routeResult =
    results.find((result: any) =>
      result.address_components?.some((component: any) => component.types?.includes('route'))
    ) || results[0];

  const components = routeResult.address_components || [];
  const address = {
    road: findGoogleComponent(components, 'route'),
    neighbourhood:
      findGoogleComponent(components, 'neighborhood') ||
      findGoogleComponent(components, 'sublocality_level_2'),
    suburb: findGoogleComponent(components, 'sublocality_level_1'),
    village:
      findGoogleComponent(components, 'administrative_area_level_4') ||
      findGoogleComponent(components, 'administrative_area_level_3'),
    city:
      findGoogleComponent(components, 'locality') ||
      findGoogleComponent(components, 'administrative_area_level_2'),
    state: findGoogleComponent(components, 'administrative_area_level_1'),
    postcode: findGoogleComponent(components, 'postal_code'),
    country: findGoogleComponent(components, 'country'),
  };

  return {
    display_name: routeResult.formatted_address || '',
    address,
    extratags: {},
    namedetails: {},
    source: 'google',
  };
}

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
    const googleApiKey = getGoogleMapsApiKey();

    if (googleApiKey) {
      const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(
        `${lat},${lng}`
      )}&language=id&region=id&key=${encodeURIComponent(googleApiKey)}`;
      const googleRes = await fetch(googleUrl, {
        next: { revalidate: 3600 },
      });

      if (googleRes.ok) {
        const googlePayload = await googleRes.json();
        const normalizedGoogleData = normalizeGoogleGeocodeResult(googlePayload);
        if (normalizedGoogleData) {
          cache.set(cacheKey, { data: normalizedGoogleData, timestamp: Date.now() });
          return NextResponse.json({
            success: true,
            data: normalizedGoogleData,
          });
        }
      } else {
        console.warn('Google reverse geocode status:', googleRes.status);
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

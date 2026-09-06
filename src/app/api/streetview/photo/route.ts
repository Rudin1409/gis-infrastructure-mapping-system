import { withAuth, requestUser } from '@/lib/security/api';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function parseBoundedNumber(value: string | null, min: number, max: number): number | null {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

async function GETHandler(request: NextRequest) {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY?.trim() || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Street View Static API belum dikonfigurasi.' },
      { status: 503 }
    );
  }

  const lat = parseBoundedNumber(request.nextUrl.searchParams.get('lat'), -90, 90);
  const lng = parseBoundedNumber(request.nextUrl.searchParams.get('lng'), -180, 180);
  const heading = parseBoundedNumber(request.nextUrl.searchParams.get('heading'), -360, 720);
  const pitch = parseBoundedNumber(request.nextUrl.searchParams.get('pitch'), -90, 90);
  const fov = parseBoundedNumber(request.nextUrl.searchParams.get('fov'), 10, 120);

  if (lat === null || lng === null) {
    return NextResponse.json({ error: 'Koordinat Street View tidak valid.' }, { status: 400 });
  }

  const googleUrl = new URL('https://maps.googleapis.com/maps/api/streetview');
  googleUrl.searchParams.set('size', '640x640');
  googleUrl.searchParams.set('location', `${lat},${lng}`);
  googleUrl.searchParams.set('heading', String(Math.round(heading ?? 0)));
  googleUrl.searchParams.set('pitch', String(Math.round(pitch ?? 0)));
  googleUrl.searchParams.set('fov', String(Math.round(fov ?? 75)));
  googleUrl.searchParams.set('return_error_code', 'true');
  googleUrl.searchParams.set('key', apiKey);

  try {
    const response = await fetch(googleUrl, { next: { revalidate: 86400 } });
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Google Street View tidak menyediakan foto untuk sudut ini.' },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Respons Street View bukan gambar.' }, { status: 502 });
    }

    return new NextResponse(await response.arrayBuffer(), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    console.error('Street View static photo proxy error:', error);
    return NextResponse.json({ error: 'Gagal mengambil foto Street View.' }, { status: 502 });
  }
}

export const GET = withAuth(GETHandler, { limit: 40 });

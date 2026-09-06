import { withAuth, requestUser } from '@/lib/security/api';
import { NextRequest, NextResponse } from 'next/server';
import { poleService } from '@/services/PoleService';
import { createPoleSchema } from '@/lib/validation/poleSchema';
import { sheetsBackupService } from '@/services/sheetsBackupService';
import { isDataMutationAllowed } from '@/lib/ai/aiConfig';
import { calculateHaversineDistance } from '@/lib/gis/haversine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function GETHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId') || undefined;
    const condition = searchParams.get('condition') || undefined;
    const kecamatan = searchParams.get('kecamatan') || undefined;
    const kelurahan = searchParams.get('kelurahan') || undefined;
    const poleType = searchParams.get('poleType') || undefined;
    const search = searchParams.get('search') || undefined;
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const lat = latParam !== null ? Number(latParam) : null;
    const lng = lngParam !== null ? Number(lngParam) : null;
    const radius = Math.min(Math.max(Number(searchParams.get('radius')) || 75, 10), 500);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 20, 1), 100);

    const poles = await poleService.getPoles({
      providerId,
      condition,
      kecamatan,
      kelurahan,
      poleType,
      search,
    });

    const hasNearbyFilter =
      lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng);
    const data = hasNearbyFilter
      ? poles
          .map((pole) => ({
            ...pole,
            distanceMeters: Math.round(
              calculateHaversineDistance(
                { lat, lng },
                { lat: pole.poleLatitude, lng: pole.poleLongitude }
              )
            ),
          }))
          .filter((pole) => pole.distanceMeters <= radius)
          .sort((a, b) => a.distanceMeters - b.distanceMeters)
          .slice(0, limit)
      : poles;

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
      nearby: hasNearbyFilter
        ? {
            lat,
            lng,
            radius,
            limit,
          }
        : undefined,
    });
  } catch (error: any) {
    console.error('API GET /api/poles error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memuat data tiang' }, { status: 500 });
  }
}

async function POSTHandler(request: NextRequest) {
  try {
    if (!isDataMutationAllowed()) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Penambahan data tiang dinonaktifkan pada versi demo. Silakan gunakan server resmi VPS.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = createPoleSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validasi data gagal',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const user = requestUser(request);
    const input = { ...validationResult.data, surveyorId: user.id, surveyorName: user.name };
    // Only the original submitter may acknowledge an existing offline draft.
    if (input.id) {
      const existing = await poleService.getPoleById(input.id);
      if (existing && existing.surveyorId !== user.id)
        return NextResponse.json(
          { success: false, error: 'ID survei sudah dipakai petugas lain.' },
          { status: 409 }
        );
    }
    const newPole = await poleService.createPole(input as any);

    // Fire-and-forget: backup ke Google Sheets sebagai cadangan
    sheetsBackupService.backupPoleToSheets(newPole).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        message: 'Data tiang berhasil disimpan',
        data: newPole,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('API POST /api/poles error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menyimpan data tiang' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(GETHandler, {});

export const POST = withAuth(POSTHandler, {});

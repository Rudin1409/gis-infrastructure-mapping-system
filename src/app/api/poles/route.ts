import { NextRequest, NextResponse } from 'next/server';
import { poleService } from '@/services/PoleService';
import { createPoleSchema } from '@/lib/validation/poleSchema';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId') || undefined;
    const condition = searchParams.get('condition') || undefined;
    const kecamatan = searchParams.get('kecamatan') || undefined;
    const kelurahan = searchParams.get('kelurahan') || undefined;
    const poleType = searchParams.get('poleType') || undefined;
    const search = searchParams.get('search') || undefined;

    const poles = await poleService.getPoles({
      providerId,
      condition,
      kecamatan,
      kelurahan,
      poleType,
      search,
    });

    return NextResponse.json({
      success: true,
      data: poles,
      count: poles.length,
    });
  } catch (error: any) {
    console.error('API GET /api/poles error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat data tiang' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const newPole = await poleService.createPole(validationResult.data as any);

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
      { success: false, error: error.message || 'Gagal menyimpan data tiang' },
      { status: 500 }
    );
  }
}

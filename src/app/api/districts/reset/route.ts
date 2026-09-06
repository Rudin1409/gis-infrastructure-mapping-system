import { withAuth, requestUser } from '@/lib/security/api';
import { NextRequest, NextResponse } from 'next/server';
import { getDistrictRepository } from '@/repositories/DistrictRepositoryFactory';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function POSTHandler(request: NextRequest) {
  try {
    const repo = getDistrictRepository();
    const defaults = await repo.resetToDefaults();

    return NextResponse.json({
      success: true,
      message: 'Data kecamatan & kelurahan berhasil direset ke standar resmi (72 Kelurahan)',
      count: defaults.length,
    });
  } catch (error: any) {
    console.error('API POST /api/districts/reset error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mereset data kelurahan' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(POSTHandler, { admin: true });

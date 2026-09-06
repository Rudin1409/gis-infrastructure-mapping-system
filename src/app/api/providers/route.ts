import { withAuth, requestUser } from '@/lib/security/api';
import { NextRequest, NextResponse } from 'next/server';
import { getProviderRepository } from '@/repositories/GoogleSheetsProviderRepository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function GETHandler(request: NextRequest) {
  try {
    const repo = getProviderRepository();
    const providers = await repo.findAll();

    return NextResponse.json({
      success: true,
      data: providers,
    });
  } catch (error: any) {
    console.error('API GET /api/providers error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memuat provider' }, { status: 500 });
  }
}

export const GET = withAuth(GETHandler, {});

import { NextRequest, NextResponse } from 'next/server';
import { getProviderRepository } from '@/repositories/GoogleSheetsProviderRepository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const repo = getProviderRepository();
    const providers = await repo.findAll();

    return NextResponse.json({
      success: true,
      data: providers,
    });
  } catch (error: any) {
    console.error('API GET /api/providers error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat provider' },
      { status: 500 }
    );
  }
}

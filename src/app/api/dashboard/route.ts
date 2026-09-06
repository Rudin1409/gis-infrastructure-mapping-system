import { withAuth, requestUser } from '@/lib/security/api';
import { NextRequest, NextResponse } from 'next/server';
import { dashboardService } from '@/services/DashboardService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function GETHandler(request: NextRequest) {
  try {
    const stats = await dashboardService.getStats();
    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('API GET /api/dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memuat statistik dashboard' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(GETHandler, {});

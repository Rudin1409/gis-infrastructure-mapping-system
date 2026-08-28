import { NextResponse } from 'next/server';
import { poleService } from '@/services/PoleService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/poles/codes
 * Returns all existing poleCode values from the database.
 * Used by the client-side SurveyForm to generate sequential codes.
 */
export async function GET() {
  try {
    const allPoles = await poleService.getPoles();

    const codes = allPoles
      .map((p) => p.poleCode)
      .filter((code): code is string => !!code && code.trim() !== '');

    return NextResponse.json({
      success: true,
      codes,
      count: codes.length,
    });
  } catch (error: any) {
    console.error('API GET /api/poles/codes error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat kode tiang' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSegmentRepository } from '@/repositories/GoogleSheetsSegmentRepository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const repo = getSegmentRepository();
    const segments = await repo.findAll();

    return NextResponse.json({
      success: true,
      data: segments,
      count: segments.length,
    });
  } catch (error: any) {
    console.error('API GET /api/segments error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat jalur segmen kabel' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const repo = getSegmentRepository();
    const segment = await repo.create(body);

    return NextResponse.json(
      {
        success: true,
        message: 'Segmen jalur kabel berhasil disimpan',
        data: segment,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('API POST /api/segments error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menyimpan segmen kabel' },
      { status: 500 }
    );
  }
}

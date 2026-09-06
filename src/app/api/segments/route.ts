import { z } from 'zod';
import { withAuth, requestUser } from '@/lib/security/api';
import { NextRequest, NextResponse } from 'next/server';
import { getSegmentRepository } from '@/repositories/GoogleSheetsSegmentRepository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function GETHandler(request: NextRequest) {
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
      { success: false, error: 'Gagal memuat jalur segmen kabel' },
      { status: 500 }
    );
  }
}

async function POSTHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const repo = getSegmentRepository();
    const parsed = z
      .object({
        segmentCode: z.string().max(128).optional(),
        fromNodeId: z.string().min(1).max(128),
        toNodeId: z.string().min(1).max(128),
        providerId: z.string().min(1).max(128),
        providerName: z.string().max(200).optional(),
        networkType: z.enum(['FIBER_OPTIC', 'COPPER', 'COAXIAL', 'OTHER']),
        installationType: z.enum(['AERIAL', 'UNDERGROUND', 'OTHER']),
        estimatedDistance: z.number().finite().nonnegative().max(40075000).optional(),
        status: z.enum(['ACTIVE', 'MAINTENANCE', 'DISMANTLED', 'UNKNOWN']),
        description: z.string().max(5000).optional(),
      })
      .safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { success: false, error: 'Data segmen tidak valid' },
        { status: 400 }
      );
    const segment = await repo.create(parsed.data);

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
      { success: false, error: 'Gagal menyimpan segmen kabel' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(GETHandler, {});

export const POST = withAuth(POSTHandler, {});

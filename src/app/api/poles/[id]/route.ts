import { NextRequest, NextResponse } from 'next/server';
import { poleService } from '@/services/PoleService';
import { updatePoleSchema } from '@/lib/validation/poleSchema';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const pole = await poleService.getPoleById(id);

    if (!pole) {
      return NextResponse.json(
        { success: false, error: `Tiang dengan ID ${id} tidak ditemukan` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: pole,
    });
  } catch (error: any) {
    console.error(`API GET /api/poles/${params.id} error:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat detail tiang' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const validationResult = updatePoleSchema.safeParse({ ...body, id });

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

    const updated = await poleService.updatePole(id, validationResult.data as any);

    return NextResponse.json({
      success: true,
      message: 'Data tiang berhasil diperbarui',
      data: updated,
    });
  } catch (error: any) {
    console.error(`API PUT /api/poles/${params.id} error:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memperbarui data tiang' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const success = await poleService.deletePole(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: `Tiang dengan ID ${id} tidak ditemukan` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Tiang ${id} berhasil dihapus`,
    });
  } catch (error: any) {
    console.error(`API DELETE /api/poles/${params.id} error:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menghapus tiang' },
      { status: 500 }
    );
  }
}

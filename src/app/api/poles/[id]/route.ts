import { withAuth, requestUser } from '@/lib/security/api';
import { NextRequest, NextResponse } from 'next/server';
import { poleService } from '@/services/PoleService';
import { updatePoleSchema } from '@/lib/validation/poleSchema';
import { sheetsBackupService } from '@/services/sheetsBackupService';
import { isDataMutationAllowed } from '@/lib/ai/aiConfig';

async function GETHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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
    console.error(`API GET /api/poles/${(await params).id} error:`, error);
    return NextResponse.json(
      { success: false, error: 'Gagal memuat detail tiang' },
      { status: 500 }
    );
  }
}

async function PUTHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isDataMutationAllowed()) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Pembaruan data tiang dinonaktifkan pada versi demo. Silakan gunakan server resmi VPS.',
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    // Editing remains shared, but authorship is not a client-editable identity.
    delete body.surveyorId;
    delete body.surveyorName;
    delete body.id;
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

    // Fire-and-forget: backup update ke Google Sheets
    sheetsBackupService.backupUpdatePoleToSheets(updated).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Data tiang berhasil diperbarui',
      data: updated,
    });
  } catch (error: any) {
    console.error(`API PUT /api/poles/${(await params).id} error:`, error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui data tiang' },
      { status: 500 }
    );
  }
}

async function DELETEHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isDataMutationAllowed()) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Penghapusan data tiang dinonaktifkan pada versi demo. Silakan gunakan server resmi VPS.',
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const success = await poleService.deletePole(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: `Tiang dengan ID ${id} tidak ditemukan` },
        { status: 404 }
      );
    }

    // Fire-and-forget: backup delete dari Google Sheets
    sheetsBackupService.backupDeletePoleFromSheets(id).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Tiang ${id} berhasil dihapus`,
    });
  } catch (error: any) {
    console.error(`API DELETE /api/poles/${(await params).id} error:`, error);
    return NextResponse.json({ success: false, error: 'Gagal menghapus tiang' }, { status: 500 });
  }
}

export const GET = withAuth(GETHandler, {});

export const PUT = withAuth(PUTHandler, {});

export const DELETE = withAuth(DELETEHandler, {});

import { withAuth, requestUser } from '@/lib/security/api';
import { NextRequest, NextResponse } from 'next/server';
import { getDistrictRepository } from '@/repositories/DistrictRepositoryFactory';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function GETHandler(request: NextRequest) {
  try {
    const repo = getDistrictRepository();
    const grouped = await repo.getGroupedDistricts();

    return NextResponse.json({
      success: true,
      data: grouped,
    });
  } catch (error: any) {
    console.error('API GET /api/districts error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memuat data kecamatan & kelurahan' },
      { status: 500 }
    );
  }
}

async function POSTHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, kecamatan, code } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama kelurahan wajib diisi' },
        { status: 400 }
      );
    }
    if (!kecamatan || !kecamatan.trim()) {
      return NextResponse.json(
        { success: false, error: 'Kecamatan wajib dipilih' },
        { status: 400 }
      );
    }

    const repo = getDistrictRepository();
    const created = await repo.create({
      name: name.trim(),
      kecamatan: kecamatan.trim(),
      code: code ? code.trim() : undefined,
    });

    return NextResponse.json({
      success: true,
      data: created,
      message: `Kelurahan "${created.name}" berhasil ditambahkan ke ${created.kecamatan}`,
    });
  } catch (error: any) {
    console.error('API POST /api/districts error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menambahkan kelurahan' },
      { status: 500 }
    );
  }
}

async function PUTHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, kecamatan, code, oldName, cascadeUpdatePoles } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID kelurahan tidak ditemukan' },
        { status: 400 }
      );
    }
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama kelurahan tidak boleh kosong' },
        { status: 400 }
      );
    }
    if (!kecamatan || !kecamatan.trim()) {
      return NextResponse.json(
        { success: false, error: 'Kecamatan tidak boleh kosong' },
        { status: 400 }
      );
    }

    const repo = getDistrictRepository();
    const updated = await repo.update({
      id,
      name: name.trim(),
      kecamatan: kecamatan.trim(),
      code: code ? code.trim() : undefined,
      oldName: oldName ? oldName.trim() : undefined,
      cascadeUpdatePoles: cascadeUpdatePoles !== false,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Data kelurahan berhasil diperbarui menjadi "${updated.name}"`,
    });
  } catch (error: any) {
    console.error('API PUT /api/districts error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui kelurahan' },
      { status: 500 }
    );
  }
}

async function DELETEHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID kelurahan wajib disertakan' },
        { status: 400 }
      );
    }

    const repo = getDistrictRepository();
    const deleted = await repo.delete(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Gagal menghapus kelurahan' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Kelurahan berhasil dihapus',
    });
  } catch (error: any) {
    console.error('API DELETE /api/districts error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus kelurahan' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(GETHandler, {});

export const POST = withAuth(POSTHandler, { admin: true });

export const PUT = withAuth(PUTHandler, { admin: true });

export const DELETE = withAuth(DELETEHandler, { admin: true });

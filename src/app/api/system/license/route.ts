import { withAuth, requestUser } from '@/lib/security/api';
import { NextRequest, NextResponse } from 'next/server';
import { getSystemLicenseConfig, setSystemLicenseConfig } from '@/lib/systemLicense';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MASTER_SECURITY_PIN = process.env.MASTER_SECURITY_PIN || '';

async function GETHandler() {
  try {
    const config = await getSystemLicenseConfig();
    return NextResponse.json({
      success: true,
      ...config,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Permintaan gagal diproses.',
      },
      { status: 500 }
    );
  }
}

async function POSTHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin, isLocked, reason } = body;

    if (!MASTER_SECURITY_PIN || typeof pin !== 'string' || pin !== MASTER_SECURITY_PIN) {
      return NextResponse.json(
        {
          success: false,
          error: 'PIN Otorisasi Master salah atau tidak valid.',
        },
        { status: 401 }
      );
    }

    const updated = await setSystemLicenseConfig(!!isLocked, reason);

    return NextResponse.json({
      success: true,
      message: updated.isLocked
        ? 'Peta GIS berhasil DIKUNCI (Mode Berbayar / Kuota Habis Aktif)'
        : 'Peta GIS berhasil DIBUKA (Mode Normal Aktif)',
      ...updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Permintaan gagal diproses.',
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(GETHandler, {});

export const POST = withAuth(POSTHandler, { admin: true });

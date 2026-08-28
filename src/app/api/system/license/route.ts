import { NextRequest, NextResponse } from 'next/server';
import { getSystemLicenseConfig, setSystemLicenseConfig } from '@/lib/systemLicense';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MASTER_SECURITY_PIN = process.env.MASTER_SECURITY_PIN || '140924';

export async function GET() {
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
        error: err.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin, isLocked, reason } = body;

    if (!pin || pin !== MASTER_SECURITY_PIN) {
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
        error: err.message,
      },
      { status: 500 }
    );
  }
}

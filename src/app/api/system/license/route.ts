import { withAuth, requestUser } from '@/lib/security/api';
import { NextRequest, NextResponse } from 'next/server';
import { getSystemLicenseConfig, setSystemLicenseConfig } from '@/lib/systemLicense';
import { consumeLimit } from '@/lib/security/store';
import { timingSafeEqual, createHash } from 'node:crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MASTER_SECURITY_PIN = process.env.MASTER_SECURITY_PIN || '140924';

function safeComparePin(inputPin: string, expectedPin: string): boolean {
  if (typeof inputPin !== 'string' || typeof expectedPin !== 'string') return false;
  const hashA = createHash('sha256').update(inputPin).digest();
  const hashB = createHash('sha256').update(expectedPin).digest();
  return timingSafeEqual(hashA, hashB);
}

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
    const user = requestUser(req);
    const body = await req.json();
    const { pin, isLocked, reason } = body;

    // Rate Limiting Anti-Bruteforce: Max 5 percobaan PIN dalam 15 menit per user/IP
    const rateLimitKey = `pin_attempt:${user?.id || 'admin'}`;
    const allowed = await consumeLimit(rateLimitKey, 5, 900);
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Terlalu banyak percobaan PIN yang salah. Akses ditangguhkan selama 15 menit demi keamanan.',
        },
        { status: 429, headers: { 'Retry-After': '900' } }
      );
    }

    if (!pin || !safeComparePin(pin, MASTER_SECURITY_PIN)) {
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

import { NextRequest, NextResponse } from 'next/server';
import { revokeSession } from '@/lib/security/session';
import { sameOriginRequest } from '@/lib/security/policy';

export async function POST(request: NextRequest) {
  if (!sameOriginRequest(request)) return NextResponse.json({ success: false }, { status: 403 });
  const response = NextResponse.json(
    { success: true },
    { headers: { 'Cache-Control': 'no-store' } }
  );
  try {
    await revokeSession(request, response);
  } catch {
    return NextResponse.json(
      { success: false, error: 'Logout belum berhasil. Coba kembali.' },
      { status: 503 }
    );
  }
  return response;
}

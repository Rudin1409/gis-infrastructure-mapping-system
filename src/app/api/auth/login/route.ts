import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DEFAULT_ACCOUNTS } from '@/lib/security/userDirectory';
import { findLoginUser, consumeLimit } from '@/lib/security/store';
import { publicUser, revokeSession, setSession } from '@/lib/security/session';
import { verifyPassword, hashPassword } from '@/lib/security/password';
import { sameOriginRequest } from '@/lib/security/policy';
import { bodyWithinLimit } from '@/lib/security/api';

export const dynamic = 'force-dynamic';
const schema = z
  .object({ email: z.string().trim().min(1).max(254), password: z.string().min(1).max(256) })
  .strict();
let dummyHash: Promise<string> | undefined;

export async function POST(request: NextRequest) {
  const fail = (status: number, error: string) =>
    NextResponse.json(
      { success: false, error },
      {
        status,
        headers: {
          'Cache-Control': 'no-store',
          ...(status === 429 ? { 'Retry-After': '900' } : {}),
        },
      }
    );
  if (!sameOriginRequest(request)) return fail(403, 'Asal permintaan tidak diizinkan.');
  try {
    if (!(await bodyWithinLimit(request, 4096))) return fail(413, 'Permintaan terlalu besar.');
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return fail(400, 'Email/nomor telepon dan password wajib diisi.');
    const identifier = parsed.data.email.toLowerCase();
    const alias = DEFAULT_ACCOUNTS.find(
      (account) =>
        account.email.toLowerCase() === identifier ||
        account.alternativeEmails?.some((value) => value.toLowerCase() === identifier)
    );
    // Never fall back to hardcoded passwords or a second identity provider after failure.
    if (
      !(await consumeLimit('login:global', 120, 60)) ||
      !(await consumeLimit(`login:${alias?.id || identifier}`, 10, 900))
    ) {
      return fail(429, 'Percobaan masuk terlalu sering. Tunggu 15 menit lalu coba lagi.');
    }
    const row = await findLoginUser(identifier, alias?.id);
    const user = publicUser(row);
    // All accounts must be migrated offline before activation. A plaintext password
    // or old public fallback credential can never establish a new session.
    dummyHash ||= hashPassword('unusable-dummy-password-' + Date.now());
    const valid = await verifyPassword(parsed.data.password, user ? row.password : await dummyHash);
    if (!user || !valid)
      return fail(401, 'Email atau password tidak sesuai, atau akun belum diaktifkan.');
    const response = NextResponse.json(
      { success: true, user, source: 'SERVER_DATABASE' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
    await revokeSession(request, response);
    await setSession(response, row);
    return response;
  } catch {
    return fail(503, 'Layanan login belum tersedia. Hubungi admin atau coba kembali nanti.');
  }
}

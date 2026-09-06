import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import type { AuthUser } from '@/types/auth';
import { currentUser } from './session';
import { isAdmin, sameOriginRequest } from './policy';
import { consumeLimit } from './store';

const verifiedUsers = new WeakMap<NextRequest, AuthUser>();
export function requestUser(request: NextRequest): AuthUser {
  const user = verifiedUsers.get(request);
  if (!user) throw new Error('Handler must be protected by withAuth');
  return user;
}

export async function bodyWithinLimit(request: NextRequest, maxBytes: number): Promise<boolean> {
  const size = Number(request.headers.get('content-length') || 0);
  if (!Number.isFinite(size) || size > maxBytes) return false;
  const reader = request.clone().body?.getReader();
  if (!reader) return true;
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return true;
      total += value.byteLength;
      if (total > maxBytes) {
        void reader.cancel();
        return false;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function withAuth<C = unknown>(
  handler: (request: NextRequest, context: C) => Promise<Response>,
  options: { admin?: boolean; limit?: number; maxBytes?: number } = {}
) {
  return async (request: NextRequest, context: C): Promise<Response> => {
    const fail = (status: number, error: string) =>
      NextResponse.json(
        { success: false, error },
        { status, headers: { 'Cache-Control': 'no-store' } }
      );
    try {
      const user = await currentUser(request);
      if (!user)
        return fail(401, 'Sesi berakhir. Silakan masuk kembali; antrean survei tetap tersimpan.');
      if (options.admin && !isAdmin(user)) return fail(403, 'Tindakan ini memerlukan akses admin.');
      if (!sameOriginRequest(request)) return fail(403, 'Asal permintaan tidak diizinkan.');
      if (
        !['GET', 'HEAD'].includes(request.method) &&
        !(await bodyWithinLimit(request, options.maxBytes || 8 * 1024 * 1024))
      ) {
        return fail(413, 'Ukuran permintaan terlalu besar.');
      }
      if (
        options.limit &&
        !(await consumeLimit(`api:${user.id}:${request.nextUrl.pathname}`, options.limit, 60))
      ) {
        const response = fail(429, 'Terlalu banyak permintaan. Coba lagi sebentar.');
        response.headers.set('Retry-After', '60');
        return response;
      }
      verifiedUsers.set(request, user);
      const response = await handler(request, context);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    } catch (error) {
      // Never serialize database/provider errors or credentials into API responses.
      console.error('[API] Request failed:', error instanceof Error ? error.name : 'UnknownError');
      return fail(
        503,
        'Layanan sementara tidak tersedia. Data lokal tetap tersimpan; coba kembali nanti.'
      );
    }
  };
}

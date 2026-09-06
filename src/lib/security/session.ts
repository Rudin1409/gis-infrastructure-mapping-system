import 'server-only';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest, NextResponse } from 'next/server';
import type { AuthUser } from '@/types/auth';
import { readSession, readUser, writeSession, deleteSession } from './store';
import { digestToken } from './password';
import { sessionCookieSecure } from './policy';

export const SESSION_COOKIE = 'inframap_session';
const SESSION_SECONDS = 7 * 24 * 60 * 60;

export function publicUser(row: any): AuthUser | null {
  if (
    !row ||
    String(row.id).startsWith('_') ||
    !['AKTIF', 'ACTIVE'].includes(row.status) ||
    !['ADMIN_KOMINFO', 'SUPER_ADMIN', 'SURVEYOR'].includes(row.role)
  )
    return null;
  const team =
    row.team === 'BAPENDA' || String(row.agency).toLowerCase().includes('bapenda')
      ? 'BAPENDA'
      : 'KOMINFO';
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    agency: row.agency || '',
    team,
    phone: row.phone || '',
    roleLabel:
      row.role_label ||
      (row.role === 'SURVEYOR' ? 'Petugas Survei Spasial' : 'Administrator DISKOMINFOTIKSAN'),
    avatar: row.avatar || (row.role === 'SURVEYOR' ? '👨‍💼' : '🏢'),
  };
}

export async function currentUser(request?: NextRequest): Promise<AuthUser | null> {
  const token = request
    ? request.cookies.get(SESSION_COOKIE)?.value
    : (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await readSession(token);
  if (!session) return null;
  const row = await readUser(session.user_id);
  if (!row || digestToken(row.password || '') !== session.credential_hash) return null;
  return publicUser(row);
}

export async function requirePageUser(): Promise<AuthUser> {
  const user = await currentUser();
  if (!user) redirect('/login');
  return user;
}

export async function setSession(response: NextResponse, row: any): Promise<void> {
  const token = randomBytes(32).toString('hex');
  await writeSession(token, row, new Date(Date.now() + SESSION_SECONDS * 1000).toISOString());
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: sessionCookieSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_SECONDS,
  });
}

export async function revokeSession(request: NextRequest, response: NextResponse): Promise<void> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: sessionCookieSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

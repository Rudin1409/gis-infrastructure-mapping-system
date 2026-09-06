import type { AuthUser } from '@/types/auth';

export function isAdmin(user: AuthUser): boolean {
  return user.role === 'ADMIN_KOMINFO' || user.role === 'SUPER_ADMIN';
}

export function canViewSurveyors(user: AuthUser): boolean {
  return isAdmin(user) || user.team === 'KOMINFO';
}

export function sameOriginRequest(request: Request): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const origin = request.headers.get('origin');
  if (!origin) return false;
  // APP_ORIGIN is private, trusted deployment configuration. Never trust an
  // arbitrary forwarded host to decide which website may submit mutations.
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  try {
    return new URL(origin).origin === new URL(expected).origin;
  } catch {
    return false;
  }
}

export function sessionCookieSecure(): boolean {
  if (process.env.NODE_ENV !== 'production') return false;
  // Allow local production-build testing, never downgrade cookies on a public host.
  try {
    const url = new URL(process.env.APP_ORIGIN || 'https://invalid.local');
    return !(
      url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    );
  } catch {
    return true;
  }
}

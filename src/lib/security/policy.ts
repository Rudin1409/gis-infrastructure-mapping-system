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

  try {
    const originUrl = new URL(origin);

    // 1. Match configured APP_ORIGIN (supports comma-separated list)
    if (process.env.APP_ORIGIN) {
      const allowed = process.env.APP_ORIGIN.split(',').map((s) => s.trim());
      for (const item of allowed) {
        try {
          if (new URL(item).origin === originUrl.origin) return true;
        } catch (_) {}
      }
    }

    // 2. Match request URL origin
    try {
      if (new URL(request.url).origin === originUrl.origin) return true;
    } catch (_) {}

    // 3. Match Host or X-Forwarded-Host header
    const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host');
    if (hostHeader) {
      const cleanHost = hostHeader.split(':')[0].toLowerCase();
      if (
        originUrl.hostname.toLowerCase() === cleanHost ||
        originUrl.host.toLowerCase() === hostHeader.toLowerCase()
      ) {
        return true;
      }
    }

    // 4. Match known official hostnames of this deployment
    const trustedHosts = [
      'inframap.my.id',
      'www.inframap.my.id',
      '103.179.57.4',
      '27.124.75.241',
      'localhost',
      '127.0.0.1',
    ];
    if (
      trustedHosts.includes(originUrl.hostname) ||
      originUrl.hostname.endsWith('.lubuklinggaukota.go.id') ||
      originUrl.hostname.endsWith('.trycloudflare.com')
    ) {
      return true;
    }

    return false;
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
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]', '27.124.75.241'].includes(url.hostname)
    );
  } catch {
    return true;
  }
}

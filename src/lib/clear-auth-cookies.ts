/**
 * Builds raw `Set-Cookie` header strings that delete Auth.js / NextAuth cookies.
 *
 * Why raw headers: `NextResponse.cookies` / `cookies()` are Map-like, so setting the same
 * cookie name twice (secure + non-secure) overwrites the first. For `__Secure-` / `__Host-`
 * prefixed cookies browsers REJECT a Set-Cookie that lacks the `Secure` attribute, so the
 * deletion silently failed and the user stayed signed in.
 *
 * Header volume is kept small on purpose (reverse proxies cap response header size):
 *  - core cookie names get one deletion header each
 *  - cookies actually present on the request additionally get Domain variants
 */

const CORE_BASE_NAMES = [
  'authjs.session-token',
  'next-auth.session-token',
  'authjs.csrf-token',
  'next-auth.csrf-token',
  'authjs.callback-url',
  'next-auth.callback-url',
];

const AUTH_PATTERN = /session-token|csrf-token|callback-url|authjs|next-auth/i;

const EXPIRE = 'Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0';

function buildCookie(name: string, domain?: string): string {
  const isHost = name.startsWith('__Host-');
  const isSecurePrefixed = name.startsWith('__Secure-') || isHost;
  const parts = [`${name}=`, 'Path=/', EXPIRE, 'HttpOnly', 'SameSite=Lax'];
  // __Host- cookies must NOT carry a Domain attribute.
  if (domain && !isHost) parts.push(`Domain=${domain}`);
  // Prefixed cookies are only accepted by browsers when Secure is present.
  if (isSecurePrefixed) parts.push('Secure');
  return parts.join('; ');
}

function parseRequestCookieNames(cookieHeader: string | null | undefined): string[] {
  if (!cookieHeader) return [];
  const names: string[] = [];
  for (const pair of cookieHeader.split(';')) {
    const name = pair.split('=')[0]?.trim();
    if (name && AUTH_PATTERN.test(name)) names.push(name);
  }
  return names;
}

export function buildClearCookieHeaders(
  cookieHeader: string | null | undefined,
  hostname?: string | null
): string[] {
  const host = (hostname || '').split(':')[0].toLowerCase();
  const extraDomains: string[] = [];
  if (host && host !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    extraDomains.push(host, `.${host}`);
    const parts = host.split('.');
    if (parts.length > 2) extraDomains.push(`.${parts.slice(-2).join('.')}`);
  }

  const headers = new Set<string>();

  // 1. Core names (all prefix flavours) – host-only deletion
  for (const base of CORE_BASE_NAMES) {
    for (const prefix of ['', '__Secure-', '__Host-']) {
      const name = `${prefix}${base}`;
      headers.add(buildCookie(name));
      // Non-prefixed cookies may have been issued with or without Secure.
      if (!prefix) headers.add(`${buildCookie(name)}; Secure`);
    }
  }

  // 2. Cookies really present on the request (incl. chunked `.0`, `.1` …) – plus Domain variants
  for (const name of parseRequestCookieNames(cookieHeader)) {
    headers.add(buildCookie(name));
    if (!name.startsWith('__Secure-') && !name.startsWith('__Host-')) {
      headers.add(`${buildCookie(name)}; Secure`);
    }
    for (const domain of extraDomains) {
      headers.add(buildCookie(name, domain));
    }
  }

  return [...headers];
}

/**
 * Builds `Set-Cookie` header strings that delete the Auth.js / NextAuth cookies that are
 * actually present on the incoming request.
 *
 * Constraints this is designed around:
 *  - `__Secure-` / `__Host-` prefixed cookies are rejected by browsers unless the deletion
 *    header carries `Secure` (and `__Host-` must not carry `Domain`).
 *  - Reverse proxies (nginx default `proxy_buffer_size` = 4k) return 502 when the upstream
 *    response headers are too large, so we emit exactly ONE short header per present cookie.
 *    Auth.js never sets a `Domain` attribute, so host-only deletion is sufficient.
 */

const AUTH_PATTERN = /session-token|csrf-token|callback-url|authjs|next-auth/i;

export function getPresentAuthCookieNames(cookieHeader: string | null | undefined): string[] {
  if (!cookieHeader) return [];
  const names = new Set<string>();
  for (const pair of cookieHeader.split(';')) {
    const name = pair.split('=')[0]?.trim();
    if (name && AUTH_PATTERN.test(name)) names.add(name);
  }
  return [...names];
}

export function buildClearCookieHeaders(
  cookieHeader: string | null | undefined,
  isHttps: boolean
): string[] {
  return getPresentAuthCookieNames(cookieHeader).map((name) => {
    const needsSecure = isHttps || name.startsWith('__Secure-') || name.startsWith('__Host-');
    return `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${
      needsSecure ? '; Secure' : ''
    }`;
  });
}

export function requestIsHttps(headers: Headers, url: URL): boolean {
  const proto = headers.get('x-forwarded-proto');
  if (proto) return proto.split(',')[0].trim().toLowerCase() === 'https';
  return url.protocol === 'https:';
}

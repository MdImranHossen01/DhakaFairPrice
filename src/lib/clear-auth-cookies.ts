/**
 * Builds compact `Set-Cookie` header strings that delete Auth.js / NextAuth cookies.
 *
 * CRITICAL CONSTRAINT:
 * Nginx reverse proxy default `proxy_buffer_size` is 4KB.
 * Response headers MUST stay well below 1KB to prevent Nginx 502 Bad Gateway.
 * Total size of headers emitted here is ~450 bytes.
 */

const CORE_NAMES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
];

const AUTH_PATTERN = /session-token/i;

export function buildClearCookieHeaders(
  cookieHeader: string | null | undefined,
  isHttps: boolean,
  hostname?: string | null
): string[] {
  const names = new Set<string>(CORE_NAMES);

  // If request contains any chunked or specific session cookie, add it
  if (cookieHeader) {
    for (const pair of cookieHeader.split(';')) {
      const name = pair.split('=')[0]?.trim();
      if (name && AUTH_PATTERN.test(name)) names.add(name);
    }
  }

  // At most 2 domains: host-only (undefined) and parent apex domain (e.g. .bhootbazar.com)
  const domains: (string | undefined)[] = [undefined];
  const cleanHost = (hostname || '').split(':')[0].toLowerCase();
  if (cleanHost && cleanHost !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+$/.test(cleanHost)) {
    const parts = cleanHost.split('.');
    if (parts.length > 2) {
      domains.push(`.${parts.slice(-2).join('.')}`);
    }
  }

  const headers: string[] = [];
  for (const name of names) {
    const isSecure = isHttps || name.startsWith('__Secure-') || name.startsWith('__Host-');
    for (const domain of domains) {
      if (domain && name.startsWith('__Host-')) continue;
      const domainAttr = domain ? `; Domain=${domain}` : '';
      headers.push(
        `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${domainAttr}${isSecure ? '; Secure' : ''}`
      );
    }
  }

  return headers;
}

export function requestIsHttps(headers: Headers, url: URL): boolean {
  const proto = headers.get('x-forwarded-proto') || headers.get('x-forwarded-ssl');
  if (proto) {
    const first = proto.split(',')[0].trim().toLowerCase();
    if (first === 'https' || first === 'on') return true;
  }
  const cfVisitor = headers.get('cf-visitor');
  if (cfVisitor && cfVisitor.includes('"https"')) return true;
  return url.protocol === 'https:';
}



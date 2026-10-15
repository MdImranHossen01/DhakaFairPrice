/**
 * Builds `Set-Cookie` header strings that delete Auth.js / NextAuth cookies across
 * root domains, subdomains, and reseller custom domains (e.g. bhootbazar.com / www.bhootbazar.com).
 *
 * Keeps total response header size small (~1.2KB) to stay well within nginx proxy_buffer_size (4KB).
 */

const CORE_AUTH_COOKIES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'authjs.csrf-token',
  '__Host-authjs.csrf-token',
  'next-auth.csrf-token',
  '__Host-next-auth.csrf-token',
];

const AUTH_PATTERN = /session-token|csrf-token|callback-url|authjs|next-auth/i;

export function getPresentAuthCookieNames(cookieHeader: string | null | undefined): string[] {
  const names = new Set<string>(CORE_AUTH_COOKIES);
  if (cookieHeader) {
    for (const pair of cookieHeader.split(';')) {
      const name = pair.split('=')[0]?.trim();
      if (name && AUTH_PATTERN.test(name)) names.add(name);
    }
  }
  return [...names];
}

export function buildClearCookieHeaders(
  cookieHeader: string | null | undefined,
  isHttps: boolean,
  hostname?: string | null
): string[] {
  const headers = new Set<string>();
  const names = getPresentAuthCookieNames(cookieHeader);

  // Extract clean hostname and parent apex domain (e.g. www.bhootbazar.com -> bhootbazar.com)
  const cleanHost = (hostname || '').split(':')[0].toLowerCase();
  const domains: (string | undefined)[] = [undefined]; // undefined = host-only deletion

  if (cleanHost && cleanHost !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+$/.test(cleanHost)) {
    const parts = cleanHost.split('.');
    if (parts.length > 2) {
      const apex = parts.slice(-2).join('.');
      domains.push(apex);
      domains.push(`.${apex}`);
    }
  }

  const expirePart = 'Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax';

  for (const name of names) {
    const isHostOnlyPrefix = name.startsWith('__Host-');
    const isSecurePrefix = name.startsWith('__Secure-') || isHostOnlyPrefix;

    for (const domain of domains) {
      // RFC: __Host- cookies must NOT have a Domain attribute
      if (domain && isHostOnlyPrefix) continue;

      const domainAttr = domain ? `; Domain=${domain}` : '';

      if (isSecurePrefix) {
        headers.add(`${name}=; ${expirePart}${domainAttr}; Secure`);
      } else {
        // Non-prefixed cookie might have been issued with or without Secure
        if (isHttps) {
          headers.add(`${name}=; ${expirePart}${domainAttr}; Secure`);
          headers.add(`${name}=; ${expirePart}${domainAttr}`);
        } else {
          headers.add(`${name}=; ${expirePart}${domainAttr}`);
          headers.add(`${name}=; ${expirePart}${domainAttr}; Secure`);
        }
      }
    }
  }

  return [...headers];
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


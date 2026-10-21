/**
 * Helper to identify reseller subdomain and cart storage key in browser
 */

export function getResellerSubdomain(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Check path prefix /store/[subdomain]
  const pathname = window.location.pathname;
  const storeMatch = pathname.match(/^\/store\/([^/]+)/);
  if (storeMatch && storeMatch[1]) {
    return storeMatch[1];
  }

  // 2. Check document meta tag (injected in reseller layout)
  const metaSubdomain = document.querySelector('meta[name="reseller-subdomain"]')?.getAttribute('content');
  if (metaSubdomain) return metaSubdomain;

  // 3. Check hostname
  const host = window.location.hostname.split(':')[0].toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return null;
  }

  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dhakafairprice.com').toLowerCase();
  const reserved = ['www', 'admin', 'api', 'app', 'mail', 'smtp', 'ftp', 'cdn', 'static'];

  if (rootDomain && host.endsWith(`.${rootDomain}`)) {
    const sub = host.slice(0, host.length - rootDomain.length - 1);
    if (sub && !reserved.includes(sub)) {
      return sub;
    }
  }

  // Fallback: subdomain in 3-part hostname
  const parts = host.split('.');
  if (parts.length >= 3 && !reserved.includes(parts[0])) {
    return parts[0];
  }

  return null;
}

export function getCartStorageKey(): string {
  const sub = getResellerSubdomain();
  return sub ? `rscart_${sub}` : 'cart';
}

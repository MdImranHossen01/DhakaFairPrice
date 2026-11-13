import NextAuth from "next-auth"
import authConfig from "./auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig);

// Root domain — subdomains of this are treated as reseller stores
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || '';
// Subdomains reserved for the main platform (not reseller stores)
const RESERVED_SUBDOMAINS = new Set(['www', 'admin', 'api', 'app', 'mail', 'smtp', 'ftp', 'cdn', 'static']);

function extractSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0];

  // During local development — skip subdomain routing
  if (host === 'localhost' || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return null;
  }

  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const sub = host.slice(0, host.length - ROOT_DOMAIN.length - 1);
    if (!sub || RESERVED_SUBDOMAINS.has(sub)) return null;
    return sub;
  }

  return null;
}

function getSafeRedirectUrl(req: any, path: string): URL {
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const forwardedProto = req.headers.get('x-forwarded-proto') || (req.url && req.url.startsWith('https:') ? 'https' : 'http');
  if (forwardedHost && !forwardedHost.startsWith('localhost:') && forwardedHost !== 'localhost' && forwardedHost !== '127.0.0.1') {
    return new URL(path, `${forwardedProto}://${forwardedHost}`);
  }
  return new URL(path, req.nextUrl);
}

export const proxy = auth(async (req) => {
  const { nextUrl } = req;
  const hostname = req.headers.get('host') || '';
  const isLoggedIn = !!req.auth;
  const role = (req.auth?.user as any)?.role as string | undefined;

  // Redirect /track-order/:id -> /track-order?id=:id so all email tracking links use the main tracker route cleanly
  if (nextUrl.pathname.startsWith('/track-order/') && nextUrl.pathname.length > '/track-order/'.length) {
    const rawTrackId = nextUrl.pathname.slice('/track-order/'.length).replace(/\/+$/, '');
    if (rawTrackId && !rawTrackId.includes('/')) {
      let cleanTrackId = rawTrackId;
      try {
        cleanTrackId = decodeURIComponent(rawTrackId);
      } catch {}
      return NextResponse.redirect(getSafeRedirectUrl(req, `/track-order?id=${encodeURIComponent(cleanTrackId)}`));
    }
  }

  // ── 1. Multi-Tenant Subdomain & Custom Domain Routing ──────────────────────
  let targetSubdomain = extractSubdomain(hostname);
  const cleanHost = hostname.split(':')[0].toLowerCase();

  // If not a subdomain of ${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'store.com'}, and not localhost/IP, check if it's a custom domain
  if (cleanHost &&
      !nextUrl.pathname.startsWith('/api/') &&
      !targetSubdomain && 
      cleanHost !== 'localhost' && 
      cleanHost !== '127.0.0.1' && 
      !/^\d+\.\d+\.\d+\.\d+$/.test(cleanHost) &&
      cleanHost !== ROOT_DOMAIN &&
      cleanHost !== `www.${ROOT_DOMAIN}`) {
    try {
      // Lookup custom domain via internal origin fetch
      const lookupUrl = new URL(`/api/reseller/domain-lookup?domain=${encodeURIComponent(cleanHost)}`, nextUrl.origin);
      const res = await fetch(lookupUrl.toString(), {
        headers: { 'x-internal-lookup': 'true' },
        next: { revalidate: 60 } // cache resolution for 60 seconds
      });
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.subdomain) {
          targetSubdomain = data.subdomain;
        }
      }
    } catch (err) {
      console.error('Custom domain lookup failed in proxy:', err);
    }
  }

  const isAuthRoute = nextUrl.pathname.startsWith("/login") || 
                      nextUrl.pathname.startsWith("/register") || 
                      nextUrl.pathname.startsWith("/forgot-password") || 
                      nextUrl.pathname.startsWith("/reset-password");

  if (targetSubdomain) {
    if (nextUrl.pathname === '/favicon.ico') {
      const url = nextUrl.clone();
      url.pathname = `/api/store/${targetSubdomain}/favicon`;
      return NextResponse.rewrite(url);
    }

    // ── Reseller Dashboard via own domain ──────────────────────────────
    // If the reseller visits /reseller, /reseller-dashboard, /reseller-panel, or any subpath
    // from their own shop domain, rewrite it to the storefront reseller-panel route.
    const isResellerPanelRoute =
      nextUrl.pathname === '/reseller' ||
      nextUrl.pathname.startsWith('/reseller/') ||
      nextUrl.pathname === '/reseller-dashboard' ||
      nextUrl.pathname.startsWith('/reseller-dashboard/') ||
      nextUrl.pathname === '/reseller-panel' ||
      nextUrl.pathname.startsWith('/reseller-panel/');

    let resellerSubPath = '';
    if (isResellerPanelRoute) {
      const stripped = nextUrl.pathname
        .replace(/^\/(reseller-dashboard|reseller-panel|reseller)/, '')
        .replace(/^\//, '');
      if (stripped) {
        resellerSubPath = `/${stripped}`;
      }
    }

    const isStorefrontExemptPath = 
      nextUrl.pathname === '/forgot-password' || 
      nextUrl.pathname === '/reset-password';

    const rewrittenPath = isResellerPanelRoute
      ? `/store/${targetSubdomain}/reseller-panel${resellerSubPath}`
      : isStorefrontExemptPath
      ? nextUrl.pathname
      : `/store/${targetSubdomain}${nextUrl.pathname === '/' ? '' : nextUrl.pathname}`;

    const url = nextUrl.clone();
    url.pathname = rewrittenPath;
    
    // To pass headers to Server Components (like app/layout.tsx headers()), 
    // we must set them on the request object for the rewrite.
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-reseller-subdomain', targetSubdomain);
    requestHeaders.set('x-pathname', nextUrl.pathname);

    const response = NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      }
    });

    // Also set on response just in case
    response.headers.set('x-reseller-subdomain', targetSubdomain);
    response.headers.set('x-pathname', nextUrl.pathname);
    return response;
  }

  if (nextUrl.pathname === '/reseller-dashboard' || nextUrl.pathname.startsWith('/reseller-dashboard/')) {
    const sub = nextUrl.pathname.replace(/^\/reseller-dashboard/, '') || '/dashboard';
    const target = sub === '/' ? '/dashboard' : (sub.startsWith('/') ? sub : `/${sub}`);
    const redir = NextResponse.redirect(getSafeRedirectUrl(req, `/reseller${target}`));
    redir.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    return redir;
  }

  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isResellerRoute = nextUrl.pathname.startsWith("/reseller") && !nextUrl.pathname.startsWith("/reseller-program");

  // ── 2. Reseller dashboard protection ──────────────────────────────────────
  const isResellerRegisterPage = nextUrl.pathname === '/reseller/register';

  if (isResellerRoute) {
    if (!isLoggedIn) {
      if (!isResellerRegisterPage) {
        return NextResponse.redirect(getSafeRedirectUrl(req, "/login"));
      }
    } else {
      // /reseller/register is open to any logged-in user (so customers can apply)
      if (!isResellerRegisterPage && (!role || !['reseller', 'admin', 'super_admin'].includes(role))) {
        return NextResponse.redirect(getSafeRedirectUrl(req, "/"));
      }
    }
  }

  // ── 3. Redirect logged-in users away from auth pages ──────────────────────
  if (isAuthRoute && isLoggedIn) {
    if (role === "admin" || role === "super_admin" || role === "manager" || role === "moderator") {
      return NextResponse.redirect(getSafeRedirectUrl(req, "/admin/dashboard"));
    }
    if (role === "reseller") {
      return NextResponse.redirect(getSafeRedirectUrl(req, "/reseller/dashboard"));
    }
    return NextResponse.redirect(getSafeRedirectUrl(req, "/"));
  }

  // ── 4. Admin route protection ──────────────────────────────────────────────
  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(getSafeRedirectUrl(req, "/login"));
    }

    if (role !== "admin" && role !== "super_admin" && role !== "manager" && role !== "moderator") {
      return NextResponse.redirect(getSafeRedirectUrl(req, "/"));
    }

    if (role === "manager" || role === "moderator") {
      const allowedPaths = [
        "/admin/dashboard",
        "/admin/products",
        "/admin/categories",
        "/admin/brands",
        "/admin/upcoming-expiry",
        "/admin/low-stock",
        "/admin/orders",
        "/admin/offers",
        "/admin/coupons",
        "/admin/chalans",
        "/admin/bills",
        "/admin/abandoned-carts",
        "/admin/cms",
        "/admin/landing-pages",
        "/admin/catalog",
        "/admin/blogs",
        "/admin/subscribers",
        "/admin/fraud-checker",
        "/admin/marketing"
      ];
      const isPathAllowed = allowedPaths.some(path =>
        nextUrl.pathname === path || nextUrl.pathname.startsWith(path + "/")
      );
      if (!isPathAllowed) {
        return NextResponse.redirect(getSafeRedirectUrl(req, "/admin/dashboard"));
      }
    }

    // /admin/system-design for super_admin and admin
    if (nextUrl.pathname.startsWith("/admin/system-design") && role !== "super_admin" && role !== "admin") {
      return NextResponse.redirect(getSafeRedirectUrl(req, "/admin/dashboard"));
    }
  }

  // ── 5. /dashboard redirect ─────────────────────────────────────────────────
  // Note: /dashboard/wishlist is customer-facing and must never redirect away!
  if (nextUrl.pathname === "/dashboard") {
    if (role === "admin" || role === "super_admin" || role === "manager" || role === "moderator") {
      return NextResponse.redirect(getSafeRedirectUrl(req, "/admin/dashboard"));
    }
    if (role === "reseller") {
      return NextResponse.redirect(getSafeRedirectUrl(req, "/reseller/dashboard"));
    }
    if (!isLoggedIn) {
      return NextResponse.redirect(getSafeRedirectUrl(req, "/login"));
    }
  } else if (nextUrl.pathname.startsWith("/dashboard/") && nextUrl.pathname !== "/dashboard/wishlist") {
    if (!isLoggedIn) {
      return NextResponse.redirect(getSafeRedirectUrl(req, "/login"));
    }
  }

  req.headers.set('x-pathname', nextUrl.pathname);
  const response = NextResponse.next({
    request: { headers: req.headers },
  });
  response.headers.set('x-pathname', nextUrl.pathname);
  if (isAdminRoute || isResellerRoute || nextUrl.pathname.startsWith('/dashboard')) {
    response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    response.headers.set('Vary', 'RSC, Next-Router-State-Tree, Next-Router-Prefetch, Cookie');
  }
  return response;
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|sitemap.xml|robots.txt|manifest.json|assets|icons).*)',
  ],
};

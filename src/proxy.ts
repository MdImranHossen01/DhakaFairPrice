import NextAuth from "next-auth"
import authConfig from "./auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig);

// Root domain — subdomains of this are treated as reseller stores
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'swapnobaz.com';
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

export const proxy = auth(async (req) => {
  const { nextUrl } = req;
  const hostname = req.headers.get('host') || '';
  const isLoggedIn = !!req.auth;
  const role = (req.auth?.user as any)?.role as string | undefined;

  // ── 1. Multi-Tenant Subdomain & Custom Domain Routing ──────────────────────
  let targetSubdomain = extractSubdomain(hostname);
  const cleanHost = hostname.split(':')[0].toLowerCase();

  // If not a subdomain of swapnobaz.com, and not localhost/IP, check if it's a custom domain
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
    const url = nextUrl.clone();
    const rewrittenPath = `/store/${targetSubdomain}${nextUrl.pathname === '/' ? '' : nextUrl.pathname}`;
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

  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isResellerRoute = nextUrl.pathname.startsWith("/reseller") && !nextUrl.pathname.startsWith("/reseller-program");

  // ── 2. Reseller dashboard protection ──────────────────────────────────────
  const isResellerRegisterPage = nextUrl.pathname === '/reseller/register';

  if (isResellerRoute) {
    if (!isLoggedIn) {
      if (!isResellerRegisterPage) {
        return NextResponse.redirect(new URL("/login", nextUrl));
      }
    } else {
      // /reseller/register is open to any logged-in user (so customers can apply)
      if (!isResellerRegisterPage && (!role || !['reseller', 'admin', 'super_admin'].includes(role))) {
        return NextResponse.redirect(new URL("/", nextUrl));
      }
    }
  }

  // ── 3. Redirect logged-in users away from auth pages ──────────────────────
  if (isAuthRoute && isLoggedIn) {
    if (role === "admin" || role === "super_admin" || role === "manager" || role === "moderator") {
      return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
    }
    if (role === "reseller") {
      return NextResponse.redirect(new URL("/reseller/dashboard", nextUrl));
    }
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // ── 4. Admin route protection ──────────────────────────────────────────────
  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }

    if (role !== "admin" && role !== "super_admin" && role !== "manager" && role !== "moderator") {
      return NextResponse.redirect(new URL("/", nextUrl));
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
        return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
      }
    }

    // /admin/system-design strictly for super_admin only
    if (nextUrl.pathname.startsWith("/admin/system-design") && role !== "super_admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
    }
  }

  // ── 5. /dashboard redirect ─────────────────────────────────────────────────
  if (nextUrl.pathname === "/dashboard" || nextUrl.pathname.startsWith("/dashboard/")) {
    if (role === "admin" || role === "super_admin" || role === "manager" || role === "moderator") {
      return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
    }
    if (role === "reseller") {
      return NextResponse.redirect(new URL("/reseller/dashboard", nextUrl));
    }
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
  }

  req.headers.set('x-pathname', nextUrl.pathname);
  const response = NextResponse.next({
    request: { headers: req.headers },
  });
  response.headers.set('x-pathname', nextUrl.pathname);
  return response;
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json|assets|icons).*)',
  ],
};

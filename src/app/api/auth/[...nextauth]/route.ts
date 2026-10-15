import { handlers } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { buildClearCookieHeaders, requestIsHttps } from '@/lib/clear-auth-cookies';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  const isSignOut = req.nextUrl.pathname.endsWith('/signout');
  if (!isSignOut) return handlers.POST(req);

  const cookieHeader = req.headers.get('cookie');
  const https = requestIsHttps(req.headers, req.nextUrl);
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.hostname;

  let source: Response;
  try {
    source = await handlers.POST(req);
  } catch {
    // e.g. CSRF mismatch on a custom domain – still sign the user out.
    source = NextResponse.json({ url: req.nextUrl.origin });
  }

  // Re-wrap so headers are guaranteed mutable (Response.redirect() headers are immutable).
  const headers = new Headers(source.headers);
  for (const header of buildClearCookieHeaders(cookieHeader, https, host)) {
    headers.append('Set-Cookie', header);
  }
  if (https) {
    headers.set('Clear-Site-Data', '"cookies", "storage"');
  }
  return new Response(source.body, {
    status: source.status,
    statusText: source.statusText,
    headers,
  });
}


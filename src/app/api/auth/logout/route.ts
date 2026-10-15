import { NextRequest, NextResponse } from 'next/server';
import { buildClearCookieHeaders, requestIsHttps } from '@/lib/clear-auth-cookies';

export const dynamic = 'force-dynamic';

function logout(req: NextRequest) {
  const response = NextResponse.json({ success: true });
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.hostname;
  const isHttps = requestIsHttps(req.headers, req.nextUrl);

  const headers = buildClearCookieHeaders(
    req.headers.get('cookie'),
    isHttps,
    host
  );
  for (const header of headers) {
    response.headers.append('Set-Cookie', header);
  }
  if (isHttps) {
    response.headers.set('Clear-Site-Data', '"cookies"');
  }
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}

export async function POST(req: NextRequest) {
  return logout(req);
}

export async function GET(req: NextRequest) {
  return logout(req);
}


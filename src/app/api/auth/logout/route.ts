import { NextRequest, NextResponse } from 'next/server';
import { buildClearCookieHeaders, requestIsHttps } from '@/lib/clear-auth-cookies';

export const dynamic = 'force-dynamic';

function logout(req: NextRequest) {
  const response = NextResponse.json({ success: true });
  const headers = buildClearCookieHeaders(
    req.headers.get('cookie'),
    requestIsHttps(req.headers, req.nextUrl)
  );
  for (const header of headers) {
    response.headers.append('Set-Cookie', header);
  }
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function POST(req: NextRequest) {
  return logout(req);
}

export async function GET(req: NextRequest) {
  return logout(req);
}

import { NextRequest, NextResponse } from 'next/server';
import { buildClearCookieHeaders } from '@/lib/clear-auth-cookies';

export const dynamic = 'force-dynamic';

function logout(req: NextRequest) {
  const response = NextResponse.json({ success: true });
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');

  for (const header of buildClearCookieHeaders(req.headers.get('cookie'), host)) {
    response.headers.append('Set-Cookie', header);
  }

  // Backstop: ask the browser to drop all cookies for this origin (HTTPS only).
  response.headers.set('Clear-Site-Data', '"cookies"');
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function POST(req: NextRequest) {
  return logout(req);
}

export async function GET(req: NextRequest) {
  return logout(req);
}

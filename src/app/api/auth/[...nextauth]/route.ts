import { handlers } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { buildClearCookieHeaders } from '@/lib/clear-auth-cookies';

export const dynamic = 'force-dynamic';

function attachClearCookies(res: Response, req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  for (const header of buildClearCookieHeaders(req.headers.get('cookie'), host)) {
    res.headers.append('Set-Cookie', header);
  }
}

export async function GET(req: NextRequest) {
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  const isSignOut = req.nextUrl.pathname.endsWith('/signout');
  if (!isSignOut) return handlers.POST(req);

  let res: Response;
  try {
    res = await handlers.POST(req);
  } catch {
    // e.g. CSRF mismatch on a custom domain – still sign the user out.
    res = NextResponse.json({ url: req.headers.get('referer') || req.nextUrl.origin });
  }
  attachClearCookies(res, req);
  return res;
}

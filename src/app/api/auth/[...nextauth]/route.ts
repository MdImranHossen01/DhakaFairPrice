import { handlers } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const KNOWN_AUTH_COOKIES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'authjs.csrf-token',
  '__Host-authjs.csrf-token',
  'next-auth.csrf-token',
  '__Host-next-auth.csrf-token',
  'authjs.callback-url',
  '__Secure-authjs.callback-url',
  'next-auth.callback-url',
  '__Secure-next-auth.callback-url',
];

function appendClearCookies(res: Response, req: NextRequest) {
  // 1. Collect all potential auth cookie names and chunk variations (.0 to .5)
  const cookieNamesToClear = new Set<string>();

  KNOWN_AUTH_COOKIES.forEach((name) => {
    cookieNamesToClear.add(name);
    for (let i = 0; i < 6; i++) {
      cookieNamesToClear.add(`${name}.${i}`);
    }
  });

  // 2. Also harvest any cookies in the incoming request that match auth patterns
  try {
    req.cookies.getAll().forEach((c) => {
      const lower = c.name.toLowerCase();
      if (
        lower.includes('session-token') ||
        lower.includes('csrf') ||
        lower.includes('authjs') ||
        lower.includes('next-auth') ||
        lower.includes('callback-url')
      ) {
        cookieNamesToClear.add(c.name);
      }
    });
  } catch {
    // Ignore cookie read issues
  }

  // 3. Clear each cookie across both Secure and non-Secure flags to guarantee deletion
  // on custom domains, reverse proxies, and Cloudflare setups.
  cookieNamesToClear.forEach((name) => {
    // Non-secure clear
    res.headers.append(
      'Set-Cookie',
      `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax`
    );
    // Secure clear
    res.headers.append(
      'Set-Cookie',
      `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax; Secure`
    );
  });
}

export async function GET(req: NextRequest) {
  const isSignOut = req.nextUrl.pathname.endsWith('/signout');
  const response = await handlers.GET(req);
  if (isSignOut) {
    appendClearCookies(response, req);
  }
  return response;
}

export async function POST(req: NextRequest) {
  const isSignOut = req.nextUrl.pathname.endsWith('/signout');

  let response: Response;
  try {
    response = await handlers.POST(req);
  } catch (error) {
    if (isSignOut) {
      // If NextAuth throws (e.g. CSRF mismatch across custom domain), fallback gracefully with redirect URL
      const fallbackUrl = req.headers.get('referer') || req.nextUrl.origin || '/';
      response = NextResponse.json({ url: fallbackUrl });
    } else {
      throw error;
    }
  }

  if (isSignOut) {
    appendClearCookies(response, req);
  }

  return response;
}

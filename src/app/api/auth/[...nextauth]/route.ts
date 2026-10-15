import { handlers } from '@/auth';
import { cookies } from 'next/headers';
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

async function clearAllSessionCookies(response?: Response) {
  try {
    const cookieStore = await cookies();
    const allExisting = cookieStore.getAll();
    const toDelete = new Set<string>();

    KNOWN_AUTH_COOKIES.forEach((name) => {
      toDelete.add(name);
      for (let i = 0; i < 6; i++) {
        toDelete.add(`${name}.${i}`);
      }
    });

    allExisting.forEach((c) => {
      const lower = c.name.toLowerCase();
      if (
        lower.includes('session-token') ||
        lower.includes('csrf') ||
        lower.includes('authjs') ||
        lower.includes('next-auth') ||
        lower.includes('callback-url')
      ) {
        toDelete.add(c.name);
      }
    });

    toDelete.forEach((name) => {
      try {
        cookieStore.delete(name);
        cookieStore.set(name, '', {
          path: '/',
          maxAge: 0,
          expires: new Date(0),
          httpOnly: true,
          sameSite: 'lax',
          secure: true,
        });
        cookieStore.set(name, '', {
          path: '/',
          maxAge: 0,
          expires: new Date(0),
          httpOnly: true,
          sameSite: 'lax',
          secure: false,
        });
      } catch {
        // Ignore
      }

      if (response && 'cookies' in response) {
        try {
          (response as any).cookies.delete(name);
          (response as any).cookies.set(name, '', {
            path: '/',
            maxAge: 0,
            expires: new Date(0),
            httpOnly: true,
            sameSite: 'lax',
            secure: true,
          });
        } catch {
          // Ignore
        }
      }
    });
  } catch (err) {
    console.error('Error clearing cookies in nextauth route:', err);
  }
}

export async function GET(req: NextRequest) {
  const isSignOut = req.nextUrl.pathname.endsWith('/signout');
  if (isSignOut) {
    await clearAllSessionCookies();
  }
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  const isSignOut = req.nextUrl.pathname.endsWith('/signout');

  if (isSignOut) {
    await clearAllSessionCookies();
    try {
      const res = await handlers.POST(req);
      await clearAllSessionCookies(res);
      return res;
    } catch {
      const fallbackUrl = req.headers.get('referer') || req.nextUrl.origin || '/';
      const fallbackResponse = NextResponse.json({ url: fallbackUrl });
      await clearAllSessionCookies(fallbackResponse);
      return fallbackResponse;
    }
  }

  return handlers.POST(req);
}

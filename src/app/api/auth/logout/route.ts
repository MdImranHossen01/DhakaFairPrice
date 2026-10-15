import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const KNOWN_COOKIES = [
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

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const allExisting = cookieStore.getAll();

  const toDelete = new Set<string>();

  KNOWN_COOKIES.forEach((name) => {
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

  const response = NextResponse.json({ success: true });

  toDelete.forEach((name) => {
    // 1. Delete in cookieStore
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

    // 2. Delete on response.cookies
    try {
      response.cookies.delete(name);
      response.cookies.set(name, '', {
        path: '/',
        maxAge: 0,
        expires: new Date(0),
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
      });
      response.cookies.set(name, '', {
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
  });

  return response;
}

export async function GET(req: NextRequest) {
  return POST(req);
}

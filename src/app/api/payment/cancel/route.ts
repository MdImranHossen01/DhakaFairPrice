import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const forwardedProto = req.headers.get('x-forwarded-proto') || (forwardedHost?.includes('localhost') ? 'http' : 'https');
  let origin = (forwardedHost && !forwardedHost.includes('0.0.0.0'))
    ? `${forwardedProto}://${forwardedHost}`
    : (req.nextUrl.origin && !req.nextUrl.origin.includes('0.0.0.0'))
      ? req.nextUrl.origin
      : (process.env.NEXT_PUBLIC_API_URL || process.env.NEXTAUTH_URL || 'https://www.dhakafairprice.com');
  origin = origin.replace(/\/$/, '');

  return NextResponse.redirect(`${origin}/checkout`, 303);
}


import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await params;
    await dbConnect();
    const reseller = await Reseller.findOne({ subdomain }).select('faviconUrl logoUrl').lean();

    const targetIcon = reseller?.faviconUrl || reseller?.logoUrl;
    if (targetIcon) {
      if (targetIcon.startsWith('http://') || targetIcon.startsWith('https://')) {
        try {
          const imageRes = await fetch(targetIcon);
          if (imageRes.ok) {
            const contentType = imageRes.headers.get('content-type') || 'image/png';
            const buffer = await imageRes.arrayBuffer();
            return new NextResponse(buffer, {
              headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
              },
            });
          }
        } catch (fetchErr) {
          console.error('Failed to proxy reseller favicon image:', fetchErr);
        }
        return NextResponse.redirect(targetIcon, 302);
      } else {
        return NextResponse.redirect(new URL(targetIcon, req.url), 302);
      }
    }

    return NextResponse.redirect(new URL('/favicon.ico', req.url), 302);
  } catch (error) {
    console.error('Error serving reseller favicon:', error);
    return NextResponse.redirect(new URL('/favicon.ico', req.url), 302);
  }
}

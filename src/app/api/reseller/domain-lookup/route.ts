import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');

    if (!domain) {
      return NextResponse.json({ found: false, error: 'Domain is required' }, { status: 400 });
    }

    const cleanDomain = domain
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '')
      .split(':')[0];

    await dbConnect();

    // 1. Check exact domain match
    let reseller = await Reseller.findOne({
      customDomain: cleanDomain,
      status: 'active',
    }).select('subdomain status customDomain').lean();

    // 2. Check www or non-www variant if not found
    if (!reseller) {
      const altDomain = cleanDomain.startsWith('www.')
        ? cleanDomain.slice(4)
        : `www.${cleanDomain}`;

      reseller = await Reseller.findOne({
        customDomain: altDomain,
        status: 'active',
      }).select('subdomain status customDomain').lean();
    }

    if (reseller && (reseller as any).subdomain) {
      return NextResponse.json({
        found: true,
        subdomain: (reseller as any).subdomain,
      });
    }

    return NextResponse.json({ found: false });
  } catch (error: any) {
    console.error('Domain lookup error:', error);
    return NextResponse.json({ found: false, error: error.message }, { status: 500 });
  }
}

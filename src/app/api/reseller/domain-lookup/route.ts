import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');

    if (!domain) {
      return NextResponse.json({ error: 'Domain parameter is required' }, { status: 400 });
    }

    const cleanDomain = domain.split(':')[0].toLowerCase().trim();
    await dbConnect();

    // Check if domain matches customDomain or www.customDomain
    const reseller = await Reseller.findOne({
      $or: [
        { customDomain: cleanDomain },
        { customDomain: cleanDomain.replace(/^www\./, '') },
        { customDomain: `www.${cleanDomain}` }
      ],
      status: 'active'
    }).select('subdomain storeName customDomain').lean();

    if (!reseller) {
      return NextResponse.json({ found: false }, { status: 404 });
    }

    return NextResponse.json({
      found: true,
      subdomain: reseller.subdomain,
      storeName: reseller.storeName,
      customDomain: reseller.customDomain
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

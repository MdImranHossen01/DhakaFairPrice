import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await params;
    await dbConnect();
    const reseller = await Reseller.findOne({ subdomain, status: 'active' })
      .select('storeName logoUrl faviconUrl')
      .lean();

    if (!reseller) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    return NextResponse.json({
      storeName: reseller.storeName,
      logoUrl: reseller.logoUrl || null,
      faviconUrl: reseller.faviconUrl || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
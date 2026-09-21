import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await dbConnect();
    
    // Find either by Reseller _id or linked userId
    let reseller = await Reseller.findById(id).select('storeName subdomain').lean();
    if (!reseller) {
      reseller = await Reseller.findOne({ userId: id }).select('storeName subdomain').lean();
    }

    if (!reseller) {
      return NextResponse.json({ error: 'Reseller not found' }, { status: 404 });
    }

    return NextResponse.json({
      storeName: reseller.storeName,
      subdomain: reseller.subdomain,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error looking up store' }, { status: 500 });
  }
}

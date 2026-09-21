import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import Product from '@/models/Product';
import { addProductToReseller } from '@/lib/syncEngine';

/**
 * POST /api/reseller/products/sync-own
 * Syncs all products uploaded by the reseller into their ResellerProduct storefront catalog.
 * Use this to fix existing products that were added before auto-linking was implemented.
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const reseller = await Reseller.findOne({ userId: (session.user as any).id }).lean();
    if (!reseller) {
      return NextResponse.json({ error: 'Reseller not found' }, { status: 404 });
    }

    // Find all products uploaded by this reseller
    const products = await Product.find({ uploadedBy: reseller._id }).lean();

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const product of products) {
      const retailPrice =
        product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;
      const result = await addProductToReseller(
        reseller._id.toString(),
        product._id.toString(),
        retailPrice ?? 0
      );
      if (result.success) {
        synced++;
      } else {
        failed++;
        errors.push(`${product.name}: ${result.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      total: products.length,
      synced,
      failed,
      errors,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

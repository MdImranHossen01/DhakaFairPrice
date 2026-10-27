import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Reseller from '@/models/Reseller';
import ResellerProduct from '@/models/ResellerProduct';
import Product from '@/models/Product';
import { auth } from '@/auth';

async function getResellerContext() {
  const session = await auth();
  if (!session?.user) return null;

  const role = (session.user as any)?.role;
  const isReseller = role === 'reseller';
  const isAdmin = ['admin', 'super_admin'].includes(role) || session.user.email === 'imranshuvo101@gmail.com';

  if (!isReseller && !isAdmin) return null;

  await connectToDatabase();

  let reseller = null;
  const resellerId = (session.user as any)?.resellerId;
  if (resellerId) {
    reseller = await Reseller.findById(resellerId);
  }

  if (!reseller) {
    reseller = await Reseller.findOne({ userId: session.user.id });
  }

  return reseller;
}

export async function GET(req: NextRequest) {
  try {
    const reseller = await getResellerContext();
    if (!reseller) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const limit = parseInt(searchParams.get('limit') || '15', 10);

    await connectToDatabase();

    const searchRegex = search ? new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

    // 1. Fetch Sourced ResellerProducts
    const rpFilter: any = {
      resellerId: reseller._id,
      isPublished: true,
      isAvailableOnMother: true,
    };
    if (searchRegex) {
      rpFilter.name = searchRegex;
    }

    const resellerProducts = await ResellerProduct.find(rpFilter)
      .populate('productId', 'price salePrice images variants description')
      .limit(limit)
      .lean();

    const formattedProducts: any[] = [];
    const seenIds = new Set<string>();

    for (const rp of resellerProducts) {
      const pDoc = rp.productId as any;
      const id = pDoc?._id ? pDoc._id.toString() : rp.productId.toString();
      seenIds.add(id);

      const firstVariant = rp.variants?.[0];
      const effectivePrice = firstVariant?.retailPrice ?? rp.retailPrice;

      formattedProducts.push({
        _id: id,
        resellerProductId: rp._id.toString(),
        name: rp.name,
        slug: rp.slug,
        price: effectivePrice,
        salePrice: effectivePrice,
        image: rp.images?.[0] || pDoc?.images?.[0] || '/assets/product-placeholder.webp',
        images: rp.images?.length ? rp.images : (pDoc?.images || []),
        stock: rp.stock ?? 0,
        variants: rp.variants || pDoc?.variants || [],
      });
    }

    // 2. Fetch Reseller Personal Products (uploaded directly by this reseller)
    if (formattedProducts.length < limit && reseller.userId) {
      const prodFilter: any = {
        uploadedBy: reseller.userId,
        isPublished: true,
      };
      if (searchRegex) {
        prodFilter.name = searchRegex;
      }

      const personalProducts = await Product.find(prodFilter)
        .limit(limit - formattedProducts.length)
        .lean();

      for (const p of personalProducts) {
        const id = p._id.toString();
        if (seenIds.has(id)) continue;

        const firstVariant = p.variants?.[0];
        const effectivePrice = firstVariant?.price ?? p.price;

        formattedProducts.push({
          _id: id,
          name: p.name,
          slug: p.slug,
          price: effectivePrice,
          salePrice: p.salePrice || effectivePrice,
          image: p.images?.[0] || '/assets/product-placeholder.webp',
          images: p.images || [],
          stock: p.stock ?? 0,
          variants: p.variants || [],
        });
      }
    }

    return NextResponse.json({ products: formattedProducts });
  } catch (error: any) {
    console.error('Error fetching reseller landing page products:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import Product from '@/models/Product';
import ResellerProduct from '@/models/ResellerProduct';
import { addProductToReseller } from '@/lib/syncEngine';

async function getResellerId(userId: string) {
  await dbConnect();
  const reseller = await Reseller.findOne({ userId });
  return reseller?._id || null;
}

// GET: Fetch products available for sourcing (Admin or other Resellers' shared products)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resellerId = await getResellerId(session.user.id);
    if (!resellerId) {
      return NextResponse.json({ error: 'Reseller profile not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    let page = parseInt(searchParams.get('page') || '1', 10);
    if (isNaN(page) || page < 1) page = 1;

    let limit = parseInt(searchParams.get('limit') || '12', 10);
    if (isNaN(limit) || limit < 1) limit = 12;
    if (limit > 100) limit = 100;

    const search = searchParams.get('search') || '';
    const sourceFilter = searchParams.get('source') || 'all'; // 'all' | 'top_selling' | 'admin' | 'reseller' | 'sourced'

    // Build query based on source filter
    let query: Record<string, any> = { isPublished: true };
    let sortOption: Record<string, any> = { createdAt: -1 };

    if (sourceFilter === 'admin') {
      // Only Main Store / Admin products
      query.$or = [
        { uploadedBy: null },
        { uploadedBy: { $exists: false } },
      ];
    } else if (sourceFilter === 'reseller') {
      // Only other resellers' shared products
      query.uploadedBy = { $ne: resellerId };
      query.isShared = true;
      // Exclude products with no uploadedBy (admin)
      query['$and'] = [{ uploadedBy: { $ne: null } }, { uploadedBy: { $exists: true } }];
    } else if (sourceFilter === 'top_selling') {
      query.$or = [
        { uploadedBy: null },
        { uploadedBy: { $exists: false } },
        { uploadedBy: { $ne: resellerId }, isShared: true },
      ];
      sortOption = { totalSales: -1, views: -1, ratings: -1, createdAt: -1 };
    } else {
      // 'all' or 'sourced' — default: show admin + other resellers' shared products
      query.$or = [
        { uploadedBy: null },
        { uploadedBy: { $exists: false } },
        { uploadedBy: { $ne: resellerId }, isShared: true },
      ];
    }

    if (search) {
      const sanitized = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      query.name = { $regex: sanitized, $options: 'i' };
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('categories', 'name slug')
        .populate('uploadedBy', 'storeName subdomain logoUrl')
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    // Find already sourced products by this reseller
    const productIds = products.map((p) => p._id);
    const sourced = await ResellerProduct.find({
      resellerId,
      productId: { $in: productIds },
    }).lean();

    const sourcedMap = new Map(sourced.map((s) => [s.productId.toString(), s]));

    let mappedProducts = products.map((product: any) => {
      const sourcedItem: any = sourcedMap.get(product._id.toString());
      const isFromReseller = Boolean(product.uploadedBy);
      const resellerName = typeof product.uploadedBy === 'object' && product.uploadedBy !== null
        ? (product.uploadedBy.storeName || product.uploadedBy.name)
        : null;

      return {
        ...product,
        isSourced: !!sourcedItem,
        sourceType: (!product.uploadedBy) ? 'admin' : 'reseller',
        sourceStoreName: isFromReseller ? (resellerName || 'Reseller') : 'Main Store (Swapnobaz)',
        sourcedDetails: sourcedItem
          ? {
              _id: sourcedItem._id,
              retailPrice: sourcedItem.retailPrice,
              isPublished: sourcedItem.isPublished,
              syncedAt: sourcedItem.syncedAt,
            }
          : null,
      };
    });

    // If filter = 'sourced', only return products already added to store
    if (sourceFilter === 'sourced') {
      mappedProducts = mappedProducts.filter((p: any) => p.isSourced);
    }

    // Count totals for tab badges
    const allProducts = (await Product.find({
      isPublished: true,
      $or: [
        { uploadedBy: null },
        { uploadedBy: { $exists: false } },
        { uploadedBy: { $ne: resellerId }, isShared: true },
      ],
    }).select('_id uploadedBy totalSales').lean()) as any[];

    const adminCount = allProducts.filter((p: any) => !p.uploadedBy).length;
    const resellerCount = allProducts.filter((p: any) => p.uploadedBy).length;
    const topSellingCount = allProducts.filter((p: any) => (p.totalSales || 0) > 0).length || allProducts.length;
    const sourcedCount = sourced.length;

    return NextResponse.json({
      products: mappedProducts,
      pagination: { total: sourceFilter === 'sourced' ? mappedProducts.length : total, page, limit, totalPages: sourceFilter === 'sourced' ? 1 : Math.ceil(total / limit) },
      counts: {
        all: allProducts.length,
        top_selling: topSellingCount,
        admin: adminCount,
        reseller: resellerCount,
        sourced: sourcedCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add or update a product in the reseller's storefront catalog
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resellerId = await getResellerId(session.user.id);
    if (!resellerId) {
      return NextResponse.json({ error: 'Reseller profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { productId, retailPrice } = body;

    if (!productId || retailPrice === undefined || isNaN(Number(retailPrice)) || Number(retailPrice) <= 0) {
      return NextResponse.json({ error: 'Product ID and a valid retail price are required' }, { status: 400 });
    }

    const result = await addProductToReseller(resellerId.toString(), productId, Number(retailPrice));
    
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

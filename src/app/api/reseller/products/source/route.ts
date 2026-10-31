import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import Product from '@/models/Product';
import ResellerProduct from '@/models/ResellerProduct';
import { addProductToReseller } from '@/lib/syncEngine';

async function getResellerInfo(userId: string) {
  await dbConnect();
  const reseller = await Reseller.findOne({ userId }).select('_id subdomain customDomain storeName').lean();
  return reseller || null;
}

// GET: Fetch products available for sourcing (Admin or other Resellers' shared products)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentReseller = await getResellerInfo(session.user.id);
    if (!currentReseller) {
      return NextResponse.json({ error: 'Reseller profile not found' }, { status: 404 });
    }
    const resellerId = currentReseller._id;

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

      if (sourceFilter === 'sourced') {
        const sourcedProductIds = await ResellerProduct.find({ resellerId }).distinct('productId');
        query._id = { $in: sourcedProductIds };
      } else if (sourceFilter === 'admin') {
        // Only Main Store / Admin products
        query.$or = [
          { uploadedBy: null },
          { uploadedBy: { $exists: false } },
        ];
      } else if (sourceFilter === 'reseller') {
        // Only other resellers' shared products that have been approved by Mother Shop Admin
        query.uploadedBy = { $ne: resellerId };
        query.isShared = true;
        query.isApprovedByAdmin = true;
        // Exclude products with no uploadedBy (admin)
        query['$and'] = [{ uploadedBy: { $ne: null } }, { uploadedBy: { $exists: true } }];
      } else if (sourceFilter === 'top_selling') {
        query.$or = [
          { uploadedBy: null },
          { uploadedBy: { $exists: false } },
          { uploadedBy: { $ne: resellerId }, isShared: true, isApprovedByAdmin: true },
        ];
        sortOption = { totalSales: -1, views: -1, ratings: -1, createdAt: -1 };
      } else {
        // 'all' — default: show admin + other resellers' shared products that are approved
        query.$or = [
          { uploadedBy: null },
          { uploadedBy: { $exists: false } },
          { uploadedBy: { $ne: resellerId }, isShared: true, isApprovedByAdmin: true },
        ];
      }

      if (search) {
        const sanitized = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        query.name = { $regex: sanitized, $options: 'i' };
      }

      const [products, total] = await Promise.all([
        Product.find(query)
          .populate('categories', 'name slug')
          .populate('uploadedBy', 'storeName subdomain customDomain logoUrl')
          .sort(sortOption)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Product.countDocuments(query),
      ]);

      // Find already sourced products by this reseller for current page products
      const productIds = products.map((p) => p._id);
      const sourced = await ResellerProduct.find({
        resellerId,
        productId: { $in: productIds },
      }).lean();

      const sourcedMap = new Map(sourced.map((s) => [s.productId.toString(), s]));

      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dhakafairprice.com';
      const isDev = process.env.NODE_ENV !== 'production';
      const protocol = isDev ? 'http' : 'https';
      const mainStoreBaseUrl = `${protocol}://www.${rootDomain}`;

      const mappedProducts = products.map((product: any) => {
        const sourcedItem: any = sourcedMap.get(product._id.toString());
        const isSourced = Boolean(sourcedItem);
        const isFromReseller = Boolean(product.uploadedBy);
        const resellerName = typeof product.uploadedBy === 'object' && product.uploadedBy !== null
          ? (product.uploadedBy.storeName || product.uploadedBy.name)
          : null;

        let storefrontUrl = `${mainStoreBaseUrl}/product/${product.slug}`;
        if (isSourced) {
          // Product is added to the current reseller's store -> use current reseller's store link
          if ((currentReseller as any).customDomain) {
            storefrontUrl = `${protocol}://${(currentReseller as any).customDomain}/product/${product.slug}`;
          } else if ((currentReseller as any).subdomain) {
            storefrontUrl = `${protocol}://${(currentReseller as any).subdomain}.${rootDomain}/product/${product.slug}`;
          }
        } else {
          // Product is NOT added to current reseller's store -> use source's link
          if (isFromReseller && typeof product.uploadedBy === 'object') {
            const sourceReseller = product.uploadedBy;
            if (sourceReseller.customDomain) {
              storefrontUrl = `${protocol}://${sourceReseller.customDomain}/product/${product.slug}`;
            } else if (sourceReseller.subdomain) {
              storefrontUrl = `${protocol}://${sourceReseller.subdomain}.${rootDomain}/product/${product.slug}`;
            }
          }
        }

        return {
          ...product,
          isSourced,
          storefrontUrl,
          sourceType: (!product.uploadedBy) ? 'admin' : 'reseller',
          sourceStoreName: isFromReseller ? (resellerName || 'Reseller') : `Main Store (${process.env.NEXT_PUBLIC_STORE_NAME || 'Mother Store'})`,
          sourcedDetails: sourcedItem
            ? {
              _id: sourcedItem._id,
              retailPrice: sourcedItem.retailPrice,
              isPublished: sourcedItem.isPublished,
              variants: sourcedItem.variants || [],
              syncedAt: sourcedItem.syncedAt,
            }
            : null,
        };
      });

        // Count totals for tab badges
        const [allProducts, sourcedCount] = await Promise.all([
          Product.find({
            isPublished: true,
            $or: [
              { uploadedBy: null },
              { uploadedBy: { $exists: false } },
              { uploadedBy: { $ne: resellerId }, isShared: true, isApprovedByAdmin: true },
            ],
          }).select('_id uploadedBy totalSales').lean(),
          ResellerProduct.countDocuments({ resellerId }),
        ]);

        const adminCount = (allProducts as any[]).filter((p: any) => !p.uploadedBy).length;
        const resellerCount = (allProducts as any[]).filter((p: any) => p.uploadedBy).length;
        const topSellingCount = (allProducts as any[]).filter((p: any) => (p.totalSales || 0) > 0).length || allProducts.length;

        return NextResponse.json({
          products: mappedProducts,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
          },
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

        const currentReseller = await getResellerInfo(session.user.id);
        if (!currentReseller) {
          return NextResponse.json({ error: 'Reseller profile not found' }, { status: 404 });
        }
        const resellerId = currentReseller._id;

        const body = await request.json();
        const { productId, retailPrice, variants } = body;

        if (!productId || retailPrice === undefined || isNaN(Number(retailPrice)) || Number(retailPrice) <= 0) {
          return NextResponse.json({ error: 'Product ID and a valid retail price are required' }, { status: 400 });
        }

        const result = await addProductToReseller(resellerId.toString(), productId, Number(retailPrice), variants);

        if (!result.success) {
          return NextResponse.json({ error: result.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: result.message });
      } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

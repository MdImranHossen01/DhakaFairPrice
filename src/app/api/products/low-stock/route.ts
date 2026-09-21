import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import Reseller from '@/models/Reseller';
import ResellerProduct from '@/models/ResellerProduct';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !session.user || !['admin', 'super_admin', 'manager', 'reseller'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    let resellerRecord: any = null;
    let sourcedSet = new Set<string>();

    if (userRole === 'reseller') {
      resellerRecord = await Reseller.findOne({ userId: (session.user as any).id }).lean();
      if (resellerRecord) {
        const sourced = await ResellerProduct.find({ resellerId: resellerRecord._id }).select('productId').lean();
        sourcedSet = new Set(sourced.map((s: any) => s.productId.toString()));
      }
    }

    // Fetch low stock products (less than 5 units)
    const products = await Product.find({
      isPublished: true,
      $or: [
        { stock: { $lt: 5 } },
        { 'variants.stock': { $lt: 5 } }
      ]
    })
      .populate('uploadedBy', 'storeName subdomain')
      .lean();

    const lowStockItems: any[] = [];

    for (const product of products) {
      const uploadedById = (product.uploadedBy as any)?._id?.toString() || (product.uploadedBy ? product.uploadedBy.toString() : null);
      const uploadedByStoreName = (product.uploadedBy as any)?.storeName || null;

      const isOwnProduct = userRole === 'reseller'
        ? Boolean(resellerRecord && uploadedById === resellerRecord._id.toString())
        : !uploadedById; // For Admin, true only if uploaded by Mother/Admin

      const isSourced = userRole === 'reseller'
        ? Boolean(sourcedSet.has(product._id.toString()))
        : false;

      // Check Base/Central Stock
      if ((product.stock ?? 0) < 5) {
        lowStockItems.push({
          id: `${product._id}-base`,
          productId: product._id.toString(),
          name: product.name,
          slug: product.slug,
          color: null,
          size: null,
          location: 'Main Inventory',
          stock: product.stock ?? 0,
          price: product.price ?? 0,
          salePrice: product.salePrice,
          resellerPrice: product.resellerPrice,
          purchasePrice: product.purchasePrice,
          images: product.images || [],
          uploadedBy: uploadedById,
          uploadedByStoreName,
          isOwnProduct,
          isSourced,
          sourceType: uploadedById ? (isOwnProduct ? 'own' : 'other_reseller') : 'mother',
        });
      }

      // Check Variants
      if (product.variants && Array.isArray(product.variants)) {
        for (const variant of product.variants) {
          if ((variant.stock ?? 0) < 5) {
            lowStockItems.push({
              id: `${product._id}-variant-${variant._id || variant.sku}`,
              productId: product._id.toString(),
              name: product.name,
              slug: product.slug,
              color: variant.color || null,
              size: variant.size || null,
              location: 'Variant Stock',
              stock: variant.stock ?? 0,
              price: variant.price ?? product.price ?? 0,
              salePrice: variant.salePrice ?? product.salePrice,
              resellerPrice: variant.resellerPrice ?? product.resellerPrice,
              purchasePrice: variant.purchasePrice ?? product.purchasePrice,
              images: variant.image ? [variant.image] : (product.images || []),
              uploadedBy: uploadedById,
              uploadedByStoreName,
              isOwnProduct,
              isSourced,
              sourceType: uploadedById ? (isOwnProduct ? 'own' : 'other_reseller') : 'mother',
            });
          }
        }
      }
    }

    lowStockItems.sort((a, b) => a.stock - b.stock);

    return NextResponse.json({ items: lowStockItems }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching low stock:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

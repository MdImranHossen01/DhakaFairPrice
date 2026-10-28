import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import Product from '@/models/Product';
import ResellerProduct from '@/models/ResellerProduct';
import { generateUniqueSlug } from '@/lib/slugify-server';
import { slugify } from '@/lib/slugify';
import { addProductToReseller } from '@/lib/syncEngine';

import GlobalSettings from '@/models/GlobalSettings';

async function getResellerId(userId: string) {
  await dbConnect();
  const reseller = await Reseller.findOne({ userId });
  if (!reseller) throw new Error('Reseller not found');
  return reseller._id;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const resellerId = await getResellerId(session.user.id);

    const sp = request.nextUrl.searchParams;
    const page = parseInt(sp.get('page') || '1');
    const limit = parseInt(sp.get('limit') || '10');
    const search = sp.get('search') || '';

    // Filter by uploadedBy (since Products store the reseller ID in uploadedBy)
    const query: Record<string, any> = { uploadedBy: resellerId };
    if (search) query.name = { $regex: search, $options: 'i' };

    const [products, total] = await Promise.all([
      Product.find(query).populate('uploadedBy', 'storeName subdomain').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Product.countDocuments(query),
    ]);

    return NextResponse.json({
      products,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create reseller product
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const resellerId = await getResellerId(session.user.id);
    const body = await request.json();

    const { name, slug, description, sku, barcode, categories, tags, images, attributes, variants, isFeatured, isNewArrival, isPublished, isShared, discountRate } = body;
    let { price, salePrice, purchasePrice, resellerPrice, stock } = body;

    const parsedPrice = Number(price) || 0;
    const parsedSalePrice = salePrice ? Number(salePrice) : undefined;
    const parsedPurchasePrice = Number(purchasePrice) || 0;
    const parsedResellerPrice = Number(resellerPrice) || 0;
    const parsedStock = Number(stock) || 0;
    const parsedDiscountRate = discountRate ? Number(discountRate) : undefined;
    const baseSlug = slug ? slugify(slug) : slugify(name || 'product');
    const uniqueSlug = await generateUniqueSlug(Product, baseSlug);

    const resellerDoc = await Reseller.findById(resellerId).lean();
    const settings = await GlobalSettings.findOne().lean();
    const commissionPct = resellerDoc?.systemFeePercent ?? resellerDoc?.commissionRate ?? settings?.platformCommissionRate ?? 15;

    const hasVariants = Array.isArray(variants) && variants.length > 0;
    if (!hasVariants) {
      if (parsedPurchasePrice <= 0) {
        return NextResponse.json({ error: 'Reseller / Base price is required and must be greater than zero' }, { status: 400 });
      }
      if (parsedPrice > 0 && parsedPurchasePrice > parsedPrice) {
        return NextResponse.json({ error: 'Reseller / Base price cannot exceed retail price' }, { status: 400 });
      }
    } else {
      for (const v of variants) {
        const vPurchase = Number(v.purchasePrice) || 0;
        const vPrice = Number(v.price) || 0;
        if (vPurchase <= 0) {
          return NextResponse.json({ error: 'Reseller / Base price is required for each variant and must be greater than zero' }, { status: 400 });
        }
        if (vPrice > 0 && vPurchase > vPrice) {
          return NextResponse.json({ error: 'Reseller / Base price cannot exceed retail price for each variant' }, { status: 400 });
        }
      }
    }

    // Automatically calculate resellerPrice (Base purchase price + System Commission %)
    let computedResellerPrice = parsedResellerPrice;
    if (parsedPurchasePrice && parsedPurchasePrice > 0) {
      computedResellerPrice = Math.round(parsedPurchasePrice * (1 + commissionPct / 100));
    }


    // Also calculate for variants if present
    const processedVariants = Array.isArray(variants) ? variants.map((v: any) => {
      const vPurchase = Number(v.purchasePrice) || 0;
      let vReseller = Number(v.resellerPrice) || 0;
      if (vPurchase > 0) {
        vReseller = Math.round(vPurchase * (1 + commissionPct / 100));
      }
      return {
        ...v,
        resellerPrice: vReseller || undefined,
      };
    }) : [];

    const newProduct = await Product.create({
      name,
      slug: uniqueSlug,
      description,
      price: parsedPrice,
      salePrice: parsedSalePrice,
      purchasePrice: parsedPurchasePrice,
      resellerPrice: computedResellerPrice,
      discountRate: parsedDiscountRate,
      sku,
      barcode: barcode?.trim() || undefined,
      stock: parsedStock,
      categories: categories || [],
      tags: tags || [],
      images: images || [],
      attributes: attributes || [],
      variants: processedVariants.length > 0 ? processedVariants : (variants || []),
      isFeatured: !!isFeatured,
      isNewArrival: !!isNewArrival,
      isPublished: body.isPublished !== undefined ? Boolean(body.isPublished) : true,
      isApprovedByAdmin: false, // Default unapproved until Mother Shop approves
      isShared: isShared !== undefined ? !!isShared : false,
      isMotherProduct: false,
      uploadedBy: resellerId, // Set reseller ID as the owner
      metaTitle: body.metaTitle ? String(body.metaTitle).slice(0, 70) : undefined,
      metaDescription: body.metaDescription ? String(body.metaDescription).slice(0, 160) : undefined,
      videoUrl: body.videoUrl ? String(body.videoUrl).trim() : undefined,
    });

    // Auto-link product to reseller's own storefront so it shows up in their store immediately
    const retailPrice = parsedSalePrice && parsedSalePrice > 0 ? parsedSalePrice : parsedPrice;
    await addProductToReseller(resellerId.toString(), newProduct._id.toString(), retailPrice);

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update reseller product
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const resellerId = await getResellerId(session.user.id);
    
    const sp = request.nextUrl.searchParams;
    const id = sp.get('id');
    const body = await request.json();

    // Prevent reseller from modifying admin approval
    delete (body as any).isApprovedByAdmin;

    // Support both body.id and query param id
    const targetId = id || body.id;
    if (!targetId) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });

    const allowedFields = [
      'name', 'slug', 'description', 'price', 'salePrice', 'purchasePrice', 'discountRate',
      'sku', 'barcode', 'stock', 'categories', 'tags', 'images', 'batches',
      'attributes', 'variants', 'isFeatured', 'isNewArrival', 'isPublished', 'isShared', 'deliveryCharge',
      'metaTitle', 'metaDescription', 'videoUrl'
    ];
    const updateData: any = {};
    Object.keys(body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updateData[key] = body[key];
      }
    });

    if (updateData.metaTitle !== undefined) {
      updateData.metaTitle = updateData.metaTitle ? String(updateData.metaTitle).slice(0, 70) : '';
    }
    if (updateData.metaDescription !== undefined) {
      updateData.metaDescription = updateData.metaDescription ? String(updateData.metaDescription).slice(0, 160) : '';
    }
    if (updateData.videoUrl !== undefined) {
      updateData.videoUrl = updateData.videoUrl ? String(updateData.videoUrl).trim() : '';
    }

    const resellerDoc = await Reseller.findById(resellerId).lean();
    const settings = await GlobalSettings.findOne().lean();
    const commissionPct = resellerDoc?.systemFeePercent ?? resellerDoc?.commissionRate ?? settings?.platformCommissionRate ?? 15;

    if (updateData.purchasePrice !== undefined) {
      const pPrice = Number(updateData.purchasePrice) || 0;
      const refPrice = Number(updateData.salePrice && updateData.salePrice > 0 ? updateData.salePrice : (updateData.price ?? 0));
      if (pPrice <= 0) {
        return NextResponse.json({ error: 'Reseller / Base price is required and must be greater than zero' }, { status: 400 });
      }
      if (refPrice > 0 && pPrice > refPrice) {
        return NextResponse.json({ error: 'Reseller / Base price cannot exceed retail price' }, { status: 400 });
      }
      updateData.resellerPrice = Math.round(pPrice * (1 + commissionPct / 100));
    }

    if (Array.isArray(updateData.variants)) {
      for (const v of updateData.variants) {
        if (v.purchasePrice !== undefined) {
          const vPurchase = Number(v.purchasePrice) || 0;
          const vPrice = Number(v.price) || 0;
          if (vPurchase <= 0) {
            return NextResponse.json({ error: 'Reseller / Base price is required for each variant and must be greater than zero' }, { status: 400 });
          }
          if (vPrice > 0 && vPurchase > vPrice) {
            return NextResponse.json({ error: 'Reseller / Base price cannot exceed retail price for each variant' }, { status: 400 });
          }
        }
      }
      updateData.variants = updateData.variants.map((v: any) => {
        const vPurchase = Number(v.purchasePrice) || 0;
        let vReseller = Number(v.resellerPrice) || 0;
        if (vPurchase > 0) {
          vReseller = Math.round(vPurchase * (1 + commissionPct / 100));
        }
        return {
          ...v,
          resellerPrice: vReseller || undefined,
        };
      });
    }

    const product = await Product.findOneAndUpdate(
      { _id: targetId, uploadedBy: resellerId },
      { $set: updateData },
      { new: true }
    );

    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    // Sync the reseller's own storefront listing with updated product data
    await ResellerProduct.findOneAndUpdate(
      { resellerId, productId: product._id },
      {
        $set: {
          resellerId,
          productId: product._id,
          retailPrice: product.salePrice && product.salePrice > 0 ? product.salePrice : product.price,
          name: product.name,
          slug: product.slug,
          images: product.images ?? [],
          stock: product.stock ?? 0,
          purchasePrice: product.resellerPrice || product.purchasePrice || 0,
          motherPrice: product.price ?? 0,
          isAvailableOnMother: true,
          isPublished: product.isPublished !== undefined ? product.isPublished : true,
          syncedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const resellerId = await getResellerId(session.user.id);
    const id = request.nextUrl.searchParams.get('id');
    const existingProduct = await Product.findOne({ _id: id, uploadedBy: resellerId });
    if (!existingProduct) return NextResponse.json({ error: 'Product not found or not owned by you' }, { status: 404 });

    // Guard: Prevent deleting product if there are active / pending orders
    const Order = (await import('@/models/Order')).default;
    const ResellerOrder = (await import('@/models/ResellerOrder')).default;
    const pId = existingProduct._id;
    const pIdStr = existingProduct._id.toString();
    const resellerProductIds = (await ResellerProduct.find({ productId: pId }).distinct('_id')) || [];

    const activeOrders = await Order.countDocuments({
      'items.product': { $in: [pId, pIdStr] },
      status: { $nin: ['Delivered', 'Cancelled'] },
      deletedAt: null,
    });

    const activeResellerOrders = await ResellerOrder.countDocuments({
      $or: [
        { 'items.productId': { $in: [pId, pIdStr] } },
        { 'items.resellerProductId': { $in: [pId, pIdStr, ...resellerProductIds] } },
      ],
      status: { $nin: ['Delivered', 'Cancelled'] },
      deletedAt: null,
    });

    const totalActiveOrders = activeOrders + activeResellerOrders;
    if (totalActiveOrders > 0) {
      return NextResponse.json({
        error: `Cannot delete product: There are ${totalActiveOrders} active/pending order(s) for this product. Please complete or cancel the pending orders first, or unpublish it instead.`
      }, { status: 400 });
    }

    const deleted = await Product.findOneAndDelete({ _id: id, uploadedBy: resellerId });
    if (!deleted) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    // Also delete any associated ResellerProduct records to avoid orphaned entries
    await ResellerProduct.deleteMany({ productId: id });

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

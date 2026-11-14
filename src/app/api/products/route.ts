/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import { auth } from '@/auth';
import { generateUniqueSlug } from '@/lib/slugify-server';
import { purgeCloudflareCache } from '@/lib/cloudflareCache';

// GET all products
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const searchParams = req.nextUrl.searchParams;
    const ids = searchParams.get('ids');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    // TODO: Consider requiring admin auth for limits > 100 or implementing a separate bulk endpoint
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get('limit') || '40')));
    const skip = (page - 1) * limit;

    const andConditions: any[] = [];

    if (ids) {
      andConditions.push({ _id: { $in: ids.split(',') } });
    }

    const search = searchParams.get('search');
    if (search) {
      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100);
      andConditions.push({
        $or: [
          { name: { $regex: sanitizedSearch, $options: 'i' } },
          { description: { $regex: sanitizedSearch, $options: 'i' } },
          { sku: { $regex: sanitizedSearch, $options: 'i' } }
        ]
      });
    }

    const category = searchParams.get('category');
    if (category) {
      andConditions.push({ categories: { $in: category.split(',') } });
    }

    const uploadedBy = searchParams.get('uploadedBy') || searchParams.get('resellerId');
    if (uploadedBy && uploadedBy !== 'all') {
      if (uploadedBy === 'mother' || uploadedBy === 'null' || uploadedBy === 'admin' || uploadedBy === 'main') {
        andConditions.push({
          $or: [
            { isMotherProduct: true },
            { uploadedBy: null },
            { uploadedBy: { $exists: false } },
          ]
        });
      } else {
        andConditions.push({ uploadedBy });
      }
    }

    const tab = searchParams.get('tab') || 'all';
    const session = await auth();
    const isAdmin = session?.user && ['admin', 'super_admin', 'manager', 'moderator'].includes((session.user as any).role);
    const isReseller = session?.user && (session.user as any).role === 'reseller';
    
    if (isAdmin) {
      // Self-heal orphan products from deleted resellers
      const Reseller = (await import('@/models/Reseller')).default;
      const activeResellers = await Reseller.find({}, { _id: 1 }).lean();
      const validResellerIds = new Set(activeResellers.map(r => r._id.toString()));

      const allResellerProducts = await Product.find({ uploadedBy: { $ne: null, $exists: true } }, { _id: 1, uploadedBy: 1 }).lean();
      const orphanIds = allResellerProducts
        .filter(p => p.uploadedBy && !validResellerIds.has(p.uploadedBy.toString()))
        .map(p => p._id);

      if (orphanIds.length > 0) {
        await Product.deleteMany({ _id: { $in: orphanIds } });
      }

      // Exclude reseller draft products from admin catalog: only show published reseller products
      andConditions.push({
        $or: [
          { uploadedBy: null },
          { uploadedBy: { $exists: false } },
          { uploadedBy: { $ne: null, $exists: true }, isPublished: true }
        ]
      });

      if (tab === 'mother') {
        andConditions.push({
          $or: [
            { isMotherProduct: true },
            { uploadedBy: null, isMotherProduct: { $ne: false } },
            { uploadedBy: { $exists: false }, isMotherProduct: { $ne: false } },
          ]
        });
      } else if (tab === 'reseller') {
        andConditions.push({
          uploadedBy: { $ne: null, $exists: true },
          isPublished: true
        });
      } else if (tab === 'pending') {
        andConditions.push({
          uploadedBy: { $ne: null, $exists: true },
          isPublished: true,
          $or: [{ isApprovedByAdmin: false }, { isApprovedByAdmin: { $exists: false } }]
        });
      }
    } else if (isReseller) {
      // Logged-in reseller querying products for order editing or catalog lookup
      andConditions.push({ isPublished: true });
    } else {
      // Non-admin storefront customers: strictly show active Mother Shop products
      andConditions.push({
        isPublished: true,
        $or: [
          { isMotherProduct: true },
          { uploadedBy: null, isMotherProduct: { $ne: false } },
          { uploadedBy: { $exists: false }, isMotherProduct: { $ne: false } },
        ]
      });
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('categories')
        .populate('brand')
        .populate('uploadedBy', 'storeName subdomain customDomain')
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query)
    ]);

    let counts = undefined;
    if (isAdmin) {
      const buildCountQuery = (extraCondition: any) => {
        const conds: any[] = [];
        if (uploadedBy && uploadedBy !== 'all') {
          if (uploadedBy === 'mother' || uploadedBy === 'null' || uploadedBy === 'admin' || uploadedBy === 'main') {
            conds.push({
              $or: [
                { isMotherProduct: true },
                { uploadedBy: null },
                { uploadedBy: { $exists: false } },
              ]
            });
          } else {
            conds.push({ uploadedBy });
          }
        }
        if (extraCondition) {
          conds.push(extraCondition);
        }
        return conds.length > 0 ? { $and: conds } : {};
      };

      const [allCount, motherCount, resellerCount, pendingCount] = await Promise.all([
        Product.countDocuments(buildCountQuery({
          $or: [
            { uploadedBy: null },
            { uploadedBy: { $exists: false } },
            { uploadedBy: { $ne: null, $exists: true }, isPublished: true }
          ]
        })),
        Product.countDocuments(buildCountQuery({
          $or: [
            { isMotherProduct: true },
            { uploadedBy: null, isMotherProduct: { $ne: false } },
            { uploadedBy: { $exists: false }, isMotherProduct: { $ne: false } },
          ]
        })),
        Product.countDocuments(buildCountQuery({
          uploadedBy: { $ne: null, $exists: true },
          isPublished: true
        })),
        Product.countDocuments(buildCountQuery({
          uploadedBy: { $ne: null, $exists: true },
          isPublished: true,
          $or: [{ isApprovedByAdmin: false }, { isApprovedByAdmin: { $exists: false } }]
        })),
      ]);
      counts = { all: allCount, mother: motherCount, reseller: resellerCount, pending: pendingCount };
    }

    return NextResponse.json({
      products,
      counts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST create a new product (Admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user || !(['admin', 'super_admin', 'manager', 'moderator'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json({ message: 'Invalid JSON request body' }, { status: 400 });
    }

    const { name, slug, description, sku, barcode, categories, brand, tags, images, attributes, variants, batches, isFeatured, isNewArrival, isFlashSale, isPublished, isShared, discountRate, metaTitle, metaDescription, videoUrl } = body;
    const { price, salePrice, purchasePrice, resellerPrice, stock } = body;

    // Numeric validation and coercion
    const rawPrice = parseFloat(price);
    const parsedPrice = Number.isFinite(rawPrice) ? rawPrice : 0;

    const rawSalePrice = parseFloat(salePrice);
    // Strict Rule: If salePrice <= 0 or >= parsedPrice, treat as NO DISCOUNT (undefined)
    const parsedSalePrice = (Number.isFinite(rawSalePrice) && rawSalePrice > 0 && (parsedPrice === 0 || rawSalePrice < parsedPrice))
      ? rawSalePrice
      : undefined;

    const rawPurchasePrice = parseFloat(purchasePrice);
    const parsedPurchasePrice = Number.isFinite(rawPurchasePrice) ? rawPurchasePrice : undefined;

    const rawResellerPrice = parseFloat(resellerPrice);
    const parsedResellerPrice = Number.isFinite(rawResellerPrice) ? rawResellerPrice : undefined;

    const rawStock = parseInt(stock, 10);
    const parsedStock = Number.isFinite(rawStock) ? rawStock : 0;

    const rawDiscountRate = parseFloat(discountRate);
    const parsedDiscountRate = (parsedSalePrice !== undefined && Number.isFinite(rawDiscountRate) && rawDiscountRate > 0 && rawDiscountRate < 100)
      ? rawDiscountRate
      : undefined;

    // Validate required fields and price
    const hasVariants = variants && variants.length > 0;
    if (!name || !slug || !description ||
      (!hasVariants && (!sku || isNaN(parsedPrice) || parsedPrice <= 0))) {
      return NextResponse.json({
        message: 'Invalid or missing required fields. When not using variants, Price must be a positive number and SKU is required.'
      }, { status: 400 });
    }

    // Coerce variant numeric fields and whitelist properties
    const coercedVariants = (variants || []).map((v: any) => {
      const vPrice = Number.isFinite(parseFloat(v.price)) ? parseFloat(v.price) : 0;
      const rawVSale = parseFloat(v.salePrice);
      const vSalePrice = (Number.isFinite(rawVSale) && rawVSale > 0 && (vPrice === 0 || rawVSale < vPrice)) ? rawVSale : undefined;
      const rawVDisc = parseFloat(v.discountRate);
      const vDiscountRate = (vSalePrice !== undefined && Number.isFinite(rawVDisc) && rawVDisc > 0 && rawVDisc < 100) ? rawVDisc : undefined;

      return {
        _id: v._id || v.id,
        color: v.color,
        size: v.size,
        sku: v.sku,
        barcode: v.barcode?.trim() || undefined,
        image: v.image,
        images: Array.isArray(v.images) ? v.images : (v.image ? [v.image] : []),
        price: vPrice,
        salePrice: vSalePrice,
        purchasePrice: Number.isFinite(parseFloat(v.purchasePrice)) ? parseFloat(v.purchasePrice) : undefined,
        resellerPrice: Number.isFinite(parseFloat(v.resellerPrice)) ? parseFloat(v.resellerPrice) : undefined,
        stock: Number.isFinite(parseInt(v.stock, 10)) ? parseInt(v.stock, 10) : 0,
        discountRate: vDiscountRate,
        batches: Array.isArray(v.batches) ? v.batches.map((b: any) => ({
          batchNumber: b.batchNumber,
          expiryDate: b.expiryDate ? new Date(b.expiryDate) : undefined,
          stock: Number.isFinite(parseInt(b.stock, 10)) ? parseInt(b.stock, 10) : 0,
        })) : [],
      };
    });

    let finalPrice = parsedPrice;
    let finalSalePrice = parsedSalePrice;
    let finalDiscountRate = parsedDiscountRate;
    let finalPurchasePrice = parsedPurchasePrice;
    let finalResellerPrice = parsedResellerPrice;
    let finalStock = parsedStock;

    // Strict Rule: If product has variants, root pricing MUST be derived strictly from the first variant (ignore main pricing)
    if (coercedVariants.length > 0) {
      const firstV = coercedVariants[0];
      finalPrice = firstV.price || 0;
      finalSalePrice = (firstV.salePrice !== undefined && firstV.salePrice > 0 && firstV.salePrice < finalPrice) ? firstV.salePrice : undefined;
      finalDiscountRate = finalSalePrice ? (firstV.discountRate || Math.round((1 - finalSalePrice / finalPrice) * 100)) : undefined;
      finalPurchasePrice = firstV.purchasePrice;
      finalResellerPrice = firstV.resellerPrice;
      finalStock = coercedVariants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
    }

    const sanitizedBatches = Array.isArray(batches) ? batches.map((b: any) => ({
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate ? new Date(b.expiryDate) : undefined,
      stock: Number.isFinite(parseInt(b.stock, 10)) ? parseInt(b.stock, 10) : 0,
    })) : [];

    await connectToDatabase();

    const maxRetries = 3;
    let attempt = 0;
    let lastError;

    while (attempt < maxRetries) {
      attempt++;
      const currentSlug = attempt === 1 ? slug : `${slug}-${attempt - 1}`;
      const uniqueSlug = await generateUniqueSlug(Product, currentSlug);

      try {
        const newProduct = await Product.create({
          name,
          slug: uniqueSlug,
          description,
          price: finalPrice,
          salePrice: finalSalePrice,
          purchasePrice: finalPurchasePrice,
          resellerPrice: finalResellerPrice,
          discountRate: finalDiscountRate,
          sku,
          barcode: barcode?.trim() || undefined,
          stock: finalStock,
          categories: categories || [],
          brand: brand || undefined,
          tags: tags || [],
          images: images || [],
          batches: sanitizedBatches,
          attributes: attributes || [],
          variants: coercedVariants,
          isFeatured: isFeatured !== undefined ? isFeatured : false,
          isNewArrival: isNewArrival !== undefined ? isNewArrival : false,
          isFlashSale: isFlashSale !== undefined ? Boolean(isFlashSale) : false,
          isPublished: isPublished !== undefined ? isPublished : true,
          isShared: isShared !== undefined ? isShared : false,
          isMotherProduct: true,
          metaTitle: metaTitle ? String(metaTitle).slice(0, 70) : undefined,
          metaDescription: metaDescription ? String(metaDescription).slice(0, 160) : undefined,
          videoUrl: videoUrl ? String(videoUrl).trim() : undefined,
        });

        revalidateTag('products', 'max');
        revalidatePath('/', 'layout');
        revalidatePath('/shop', 'page');
        purgeCloudflareCache().catch(() => {});
        return NextResponse.json(newProduct, { status: 201 });
      } catch (error: any) {
        lastError = error;
        if (error.code === 11000 && error.keyPattern?.slug) {
          // If slug conflict, retry with incremented slug
          continue;
        }

        // If other duplicate error (e.g. SKU), or other DB error, return 400
        if (error.code === 11000) {
          const field = Object.keys(error.keyPattern || {})[0] || 'slug/SKU';
          return NextResponse.json({
            message: `Product with this ${field} already exists.`
          }, { status: 400 });
        }
        throw error;
      }
    }

    // If we exhausted retries
    return NextResponse.json({
      message: 'Failed to generate a unique slug after several attempts. Please try a different name or slug.',
      error: lastError?.message
    }, { status: 400 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// Bulk DELETE products (Mother Shop products only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let targetIds: string[] = [];
    const { searchParams } = new URL(req.url);
    const queryIds = searchParams.get('ids');
    if (queryIds) {
      targetIds = queryIds.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body?.ids)) {
        targetIds = body.ids.map((s: any) => String(s).trim()).filter(Boolean);
      } else if (body?.id) {
        targetIds = [String(body.id).trim()];
      }
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ message: 'No product ID(s) provided' }, { status: 400 });
    }

    await connectToDatabase();
    const mongoose = (await import('mongoose')).default;
    const validObjectIds = targetIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validObjectIds.length === 0) {
      return NextResponse.json({ message: 'Invalid product ID(s)' }, { status: 400 });
    }

    // Fetch products
    const products = await Product.find({ _id: { $in: validObjectIds } });
    if (products.length === 0) {
      return NextResponse.json({ message: 'No products found' }, { status: 404 });
    }

    // STRICT USER RULE: Only mother shop's own uploaded products can be deleted by Mother Admin!
    // Reseller uploaded products (even if sourced/approved in Mother Shop) CANNOT be deleted permanently by Mother Admin!
    const motherProducts = products.filter(p => !p.uploadedBy);
    const resellerProducts = products.filter(p => Boolean(p.uploadedBy));

    if (motherProducts.length === 0) {
      return NextResponse.json({
        message: 'None of the selected products can be deleted: they were uploaded by resellers. Reseller products cannot be deleted by Mother Admin (you can hide, unpublish, or revoke approval instead).'
      }, { status: 403 });
    }

    const motherPIds = motherProducts.map(p => p._id);
    const motherPIdStrs = motherProducts.map(p => p._id.toString());

    // Check active orders for mother products
    const Order = (await import('@/models/Order')).default;
    const ResellerOrder = (await import('@/models/ResellerOrder')).default;
    const ResellerProduct = (await import('@/models/ResellerProduct')).default;
    const resellerProductIds = (await ResellerProduct.find({ productId: { $in: motherPIds } }).distinct('_id')) || [];

    const activeOrders = await Order.countDocuments({
      'items.product': { $in: [...motherPIds, ...motherPIdStrs] },
      status: { $nin: ['Delivered', 'Cancelled'] },
      deletedAt: null,
    });

    const activeResellerOrders = await ResellerOrder.countDocuments({
      $or: [
        { 'items.productId': { $in: [...motherPIds, ...motherPIdStrs] } },
        { 'items.resellerProductId': { $in: [...motherPIds, ...motherPIdStrs, ...resellerProductIds] } },
      ],
      status: { $nin: ['Delivered', 'Cancelled'] },
      deletedAt: null,
    });

    const totalActiveOrders = activeOrders + activeResellerOrders;
    if (totalActiveOrders > 0) {
      return NextResponse.json({
        message: `Cannot delete selected product(s): There are ${totalActiveOrders} active/pending order(s) for them. Please complete or cancel pending orders first, or unpublish instead.`
      }, { status: 400 });
    }

    // Collect images to delete from Cloudflare R2
    const imagesToDelete: string[] = [];
    motherProducts.forEach((p: any) => {
      if (Array.isArray(p.images)) imagesToDelete.push(...p.images);
      if (p.image) imagesToDelete.push(p.image);
      if (p.featuredImage) imagesToDelete.push(p.featuredImage);
      if (p.thumbnail) imagesToDelete.push(p.thumbnail);
      if (Array.isArray(p.variants)) {
        p.variants.forEach((v: any) => {
          if (v?.image) imagesToDelete.push(v.image);
          if (Array.isArray(v?.images)) imagesToDelete.push(...v.images);
        });
      }
    });

    // Delete mother products
    const deleteResult = await Product.deleteMany({
      _id: { $in: motherPIds },
      uploadedBy: null,
    });

    // Remove from reseller catalogs
    await ResellerProduct.deleteMany({ productId: { $in: motherPIds } });

    const { unpublishProductFromResellers } = await import('@/lib/syncEngine');
    for (const idStr of motherPIdStrs) {
      await unpublishProductFromResellers(idStr).catch(() => {});
    }

    // Automatically purge images from Cloudflare R2
    if (imagesToDelete.length > 0) {
      try {
        const { deleteMultipleFromR2 } = await import('@/lib/r2');
        await deleteMultipleFromR2(imagesToDelete);
      } catch (r2CleanErr) {
        console.error('Failed to clean up product images from Cloudflare R2:', r2CleanErr);
      }
    }

    revalidateTag('products', 'max');
    revalidatePath('/', 'layout');
    revalidatePath('/shop', 'page');
    purgeCloudflareCache().catch(() => {});

    let message = `Deleted ${deleteResult.deletedCount} Mother Shop product(s) successfully and purged images from Cloudflare R2.`;
    if (resellerProducts.length > 0) {
      message += ` (${resellerProducts.length} reseller product(s) were protected and preserved).`;
    }

    return NextResponse.json({
      success: true,
      message,
      deletedCount: deleteResult.deletedCount,
      skippedResellerCount: resellerProducts.length,
    });
  } catch (error: any) {
    console.error('Error in bulk delete products:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}


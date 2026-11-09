import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
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
    const search = sp.get('search')?.trim() || '';
    const tab = sp.get('tab') || 'all';

    const andConditions: any[] = [{ uploadedBy: resellerId }];

    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } }
        ]
      });
    }

    if (tab === 'approved') {
      andConditions.push({ isApprovedByAdmin: true });
    } else if (tab === 'pending' || tab === 'not_approved') {
      andConditions.push({
        $or: [
          { isApprovedByAdmin: false },
          { isApprovedByAdmin: { $exists: false } }
        ]
      });
    } else if (tab === 'published') {
      andConditions.push({ isPublished: true });
    } else if (tab === 'draft') {
      andConditions.push({ isPublished: false });
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    const baseAnd: any[] = [{ uploadedBy: resellerId }];
    if (search) {
      baseAnd.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } }
        ]
      });
    }

    const [products, total, allCount, approvedCount, pendingCount, publishedCount, draftCount] = await Promise.all([
      Product.find(query)
        .populate('uploadedBy', 'storeName subdomain')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
      Product.countDocuments({ $and: baseAnd }),
      Product.countDocuments({ $and: [...baseAnd, { isApprovedByAdmin: true }] }),
      Product.countDocuments({ $and: [...baseAnd, { $or: [{ isApprovedByAdmin: false }, { isApprovedByAdmin: { $exists: false } }] }] }),
      Product.countDocuments({ $and: [...baseAnd, { isPublished: true }] }),
      Product.countDocuments({ $and: [...baseAnd, { isPublished: false }] }),
    ]);

    const counts = {
      all: allCount,
      approved: approvedCount,
      pending: pendingCount,
      published: publishedCount,
      draft: draftCount,
    };

    return NextResponse.json({
      products,
      counts,
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

    const { name, slug, description, sku, barcode, categories, tags, images, attributes, variants, isFeatured, isNewArrival, isFlashSale, isPublished, isShared, discountRate } = body;
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
    const commissionPct = resellerDoc?.systemFeePercent ?? resellerDoc?.commissionRate ?? settings?.platformCommissionRate ?? 10;

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
      isFlashSale: isFlashSale !== undefined ? Boolean(isFlashSale) : false,
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

    // Trigger Admin & Reseller Notifications
    try {
      const { createAdminNotification, createNotification } = await import('@/lib/notifications');
      await createAdminNotification({
        title: '📦 New Product Approval Request',
        message: `${(resellerDoc as any)?.storeName || (resellerDoc as any)?.name || 'Reseller'} submitted "${newProduct.name}" for admin approval.`,
        type: 'product',
        link: '/admin/products',
        sendPush: true,
      });

      // Instant Telegram Alert for New Product Submission
      try {
        const { sendTelegramProductNotification } = await import('@/lib/telegram');
        sendTelegramProductNotification({
          resellerStoreName: (resellerDoc as any)?.storeName || (resellerDoc as any)?.name || 'Reseller Store',
          productName: newProduct.name,
          price: retailPrice,
          stock: newProduct.stock,
          category: (newProduct as any)?.category?.name || undefined,
        }).catch(err => console.error('[Product Telegram Alert Error]', err));
      } catch (tgErr) {
        console.error('[Product Telegram Alert Import Error]', tgErr);
      }

      if (resellerDoc?.userId) {
        await createNotification({
          userId: resellerDoc.userId,
          resellerId: resellerDoc._id,
          title: '📦 Product Submitted for Review',
          message: `Your product "${newProduct.name}" was submitted and is awaiting admin approval.`,
          type: 'product',
          link: '/reseller/products',
          sendPush: false,
        });
      }
    } catch (notifErr) {
      console.error('[Reseller Product Notification Error]', notifErr);
    }

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
      'attributes', 'variants', 'isFeatured', 'isNewArrival', 'isFlashSale', 'isPublished', 'isShared', 'deliveryCharge',
      'metaTitle', 'metaDescription', 'videoUrl'
    ];
    const updateData: any = {};
    Object.keys(body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updateData[key] = body[key];
      }
    });

    if (updateData.isFlashSale !== undefined) {
      updateData.isFlashSale = Boolean(updateData.isFlashSale);
    }
    if (updateData.isFeatured !== undefined) {
      updateData.isFeatured = Boolean(updateData.isFeatured);
    }
    if (updateData.isNewArrival !== undefined) {
      updateData.isNewArrival = Boolean(updateData.isNewArrival);
    }
    if (updateData.isPublished !== undefined) {
      updateData.isPublished = Boolean(updateData.isPublished);
    }
    if (updateData.isShared !== undefined) {
      updateData.isShared = Boolean(updateData.isShared);
    }

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
    const commissionPct = resellerDoc?.systemFeePercent ?? resellerDoc?.commissionRate ?? settings?.platformCommissionRate ?? 10;

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

    revalidateTag('products', 'max');
    revalidatePath('/', 'layout');
    revalidatePath('/shop', 'page');

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
    
    // Support single id or multiple ids from query params or body
    const body = await request.json().catch(() => ({}));
    const queryId = request.nextUrl.searchParams.get('id');
    const queryIds = request.nextUrl.searchParams.get('ids');
    
    let targetIds: string[] = [];
    if (Array.isArray(body.ids) && body.ids.length > 0) {
      targetIds = body.ids;
    } else if (body.id) {
      targetIds = [body.id];
    } else if (queryIds) {
      targetIds = queryIds.split(',').filter(Boolean);
    } else if (queryId) {
      targetIds = [queryId];
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'No product ID(s) provided' }, { status: 400 });
    }

    const Order = (await import('@/models/Order')).default;
    const ResellerOrder = (await import('@/models/ResellerOrder')).default;

    // Verify ownership
    const productsToDelete = await Product.find({
      _id: { $in: targetIds },
      uploadedBy: resellerId,
    });

    if (productsToDelete.length === 0) {
      return NextResponse.json({ error: 'No matching products found owned by you' }, { status: 404 });
    }

    const pIds = productsToDelete.map(p => p._id);
    const pIdStrs = productsToDelete.map(p => p._id.toString());
    const resellerProductIds = (await ResellerProduct.find({ productId: { $in: pIds } }).distinct('_id')) || [];

    // Guard: check active orders
    const activeOrders = await Order.countDocuments({
      'items.product': { $in: [...pIds, ...pIdStrs] },
      status: { $nin: ['Delivered', 'Cancelled'] },
      deletedAt: null,
    });

    const activeResellerOrders = await ResellerOrder.countDocuments({
      $or: [
        { 'items.productId': { $in: [...pIds, ...pIdStrs] } },
        { 'items.resellerProductId': { $in: [...pIds, ...pIdStrs, ...resellerProductIds] } },
      ],
      status: { $nin: ['Delivered', 'Cancelled'] },
      deletedAt: null,
    });

    const totalActiveOrders = activeOrders + activeResellerOrders;
    if (totalActiveOrders > 0) {
      return NextResponse.json({
        error: `Cannot delete selected product(s): There are ${totalActiveOrders} active/pending order(s) for them. Please complete or cancel pending orders first, or unpublish instead.`
      }, { status: 400 });
    }

    const deleteResult = await Product.deleteMany({
      _id: { $in: pIds },
      uploadedBy: resellerId,
    });

    await ResellerProduct.deleteMany({ productId: { $in: pIds } });

    // Automatically clean up all product images from Cloudflare R2
    try {
      const { deleteMultipleFromR2 } = await import('@/lib/r2');
      const imagesToDelete: string[] = [];
      productsToDelete.forEach((p: any) => {
        if (Array.isArray(p.images)) {
          imagesToDelete.push(...p.images);
        }
        if (p.image) {
          imagesToDelete.push(p.image);
        }
        if (p.featuredImage) {
          imagesToDelete.push(p.featuredImage);
        }
        if (p.thumbnail) {
          imagesToDelete.push(p.thumbnail);
        }
        if (Array.isArray(p.variants)) {
          p.variants.forEach((v: any) => {
            if (v?.image) imagesToDelete.push(v.image);
            if (Array.isArray(v?.images)) imagesToDelete.push(...v.images);
          });
        }
      });

      if (imagesToDelete.length > 0) {
        await deleteMultipleFromR2(imagesToDelete);
      }
    } catch (r2CleanErr) {
      console.error('Failed to clean up reseller product images from Cloudflare R2:', r2CleanErr);
    }

    revalidateTag('products', 'max');
    revalidatePath('/', 'layout');
    revalidatePath('/shop', 'page');

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleteResult.deletedCount} product(s) successfully`,
      deletedCount: deleteResult.deletedCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

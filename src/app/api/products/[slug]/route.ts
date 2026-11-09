/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import { auth } from '@/auth';
import { generateUniqueSlug } from '@/lib/slugify-server';
import { CACHE_TAGS } from '@/lib/data-fetching';
async function triggerResellerSyncBestEffort(productId: string) {
  try {
    const { enqueueProductSync } = await import('@/lib/queue');
    const enqueued = await enqueueProductSync(productId);
    if (!enqueued) {
      console.log('[Product API Helper] Queue offline or not configured. Falling back to synchronous sync.');
      const { syncProductToResellers } = await import('@/lib/syncEngine');
      await syncProductToResellers(productId);
    }
  } catch (error) {
    console.error('[Product API Helper] Synchronization error isolated:', error);
  }
}

// GET a single product
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await connectToDatabase();

    const session = await auth();
    const isAdmin = session?.user && ['admin', 'super_admin', 'manager', 'moderator'].includes((session.user as any).role);

    const query: any = mongoose.Types.ObjectId.isValid(slug)
      ? { _id: slug }
      : { slug: slug };

    if (!isAdmin) {
      query.isPublished = true;
      query.$or = [
        { isMotherProduct: true },
        { uploadedBy: null, isMotherProduct: { $ne: false } },
        { uploadedBy: { $exists: false }, isMotherProduct: { $ne: false } },
      ];
    }

    const product = await Product.findOne(query).populate('categories').populate('brand');

    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT update a product (Admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();

    if (!session || !session.user || !(['admin', 'super_admin', 'manager', 'moderator'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Whitelist allowed fields to prevent mass-assignment
    const allowedFields = [
      'name', 'slug', 'description', 'price', 'salePrice', 'purchasePrice', 'resellerPrice', 'discountRate',
      'sku', 'barcode', 'stock', 'categories', 'brand', 'tags', 'images', 'batches',
      'attributes', 'variants', 'isFeatured', 'isNewArrival', 'isFlashSale', 'isPublished', 'isShared', 'isMotherProduct', 'isApprovedByAdmin', 'deliveryCharge',
      'metaTitle', 'metaDescription', 'videoUrl'
    ];
    const safeUpdate: any = {};

    Object.keys(body).forEach((key) => {
      if (allowedFields.includes(key)) {
        let value = body[key];

        // Boolean coercion
        if (['isFeatured', 'isNewArrival', 'isFlashSale', 'isPublished', 'isShared', 'isMotherProduct', 'isApprovedByAdmin'].includes(key)) {
          value = Boolean(value);
        }

        // String handling for SEO and media
        if (key === 'metaTitle') {
          value = value ? String(value).slice(0, 70) : '';
        }
        if (key === 'metaDescription') {
          value = value ? String(value).slice(0, 160) : '';
        }
        if (key === 'videoUrl') {
          value = value ? String(value).trim() : '';
        }

        // Numeric coercion for main fields
        if (['price', 'salePrice', 'purchasePrice', 'resellerPrice', 'stock', 'discountRate'].includes(key)) {
          if (value === '' || value === undefined || value === null) {
            value = (key === 'salePrice' || key === 'purchasePrice' || key === 'resellerPrice' || key === 'discountRate') ? undefined : 0;
          } else {
            const parsed = key === 'stock' ? parseInt(value, 10) : parseFloat(value);
            value = Number.isFinite(parsed) ? parsed : ((key === 'salePrice' || key === 'purchasePrice' || key === 'resellerPrice' || key === 'discountRate') ? undefined : 0);
          }
          // Strict Rule: If salePrice <= 0, treat as NO DISCOUNT
          if (key === 'salePrice' && typeof value === 'number' && value <= 0) {
            value = undefined;
          }
          if (key === 'discountRate' && typeof value === 'number' && value <= 0) {
            value = undefined;
          }
        }

        // Deep coercion for variants
        if (key === 'variants' && Array.isArray(value)) {
          value = value.map((v: any) => {
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
              purchasePrice: Number.isFinite(parseFloat(v.purchasePrice)) ? parseFloat(v.purchasePrice) : undefined,
              resellerPrice: Number.isFinite(parseFloat(v.resellerPrice)) ? parseFloat(v.resellerPrice) : undefined,
              salePrice: vSalePrice,
              stock: Number.isFinite(parseInt(v.stock, 10)) ? parseInt(v.stock, 10) : 0,
              discountRate: vDiscountRate,
              batches: Array.isArray(v.batches) ? v.batches.map((b: any) => ({
                batchNumber: b.batchNumber,
                expiryDate: b.expiryDate ? new Date(b.expiryDate) : undefined,
                stock: Number.isFinite(parseInt(b.stock, 10)) ? parseInt(b.stock, 10) : 0,
              })) : [],
            };
          });
        }

        // Deep coercion for batches
        if (key === 'batches' && Array.isArray(value)) {
          value = value.map((b: any) => ({
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate ? new Date(b.expiryDate) : undefined,
            stock: Number.isFinite(parseInt(b.stock, 10)) ? parseInt(b.stock, 10) : 0,
          }));
        }

        safeUpdate[key] = value;
      }
    });

    if (Object.keys(safeUpdate).length === 0) {
      return NextResponse.json({ message: 'No valid fields provided for update' }, { status: 400 });
    }

    await connectToDatabase();

    const query = mongoose.Types.ObjectId.isValid(slug)
      ? { _id: slug }
      : { slug: slug };

    const existingProduct = await Product.findOne(query);
    if (!existingProduct) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    // Protect Reseller Products: Mother Admin cannot edit physical specifications, details, or stock of reseller products;
    // however, Mother Admin CAN manage Mother Shop approval (isMotherProduct), Mother Shop selling price (price, salePrice, discountRate), and visibility (isPublished, isShared, isFeatured, isNewArrival, isFlashSale).
    if (existingProduct.uploadedBy) {
      const allowedKeysForResellerProducts = [
        'isMotherProduct',
        'isApprovedByAdmin',
        'price',
        'salePrice',
        'discountRate',
        'isPublished',
        'isShared',
        'isFeatured',
        'isNewArrival',
        'isFlashSale',
      ];
      const incomingKeys = Object.keys(body);
      const isAllowedForMotherAdmin = incomingKeys.every(k => allowedKeysForResellerProducts.includes(k));

      if (!isAllowedForMotherAdmin) {
        return NextResponse.json({
          message: 'Reseller product specifications and stock cannot be modified by Mother Admin. You may only manage Mother Shop pricing, approval, and storefront visibility.'
        }, { status: 403 });
      }
    }

    const unsetFields: Record<string, 1> = {};

    // Strict Rule: If product has variants, root pricing MUST be derived strictly from the first variant (ignore main pricing)
    const activeVariants = safeUpdate.variants !== undefined ? safeUpdate.variants : existingProduct.variants;
    if (activeVariants && Array.isArray(activeVariants) && activeVariants.length > 0) {
      const firstV = activeVariants[0];
      if (firstV) {
        safeUpdate.price = Number(firstV.price || 0);
        const rawVSale = firstV.salePrice !== undefined && firstV.salePrice !== null ? Number(firstV.salePrice) : undefined;
        if (rawVSale !== undefined && rawVSale > 0 && rawVSale < safeUpdate.price) {
          safeUpdate.salePrice = rawVSale;
          safeUpdate.discountRate = firstV.discountRate;
          delete unsetFields.salePrice;
          delete unsetFields.discountRate;
        } else {
          delete safeUpdate.salePrice;
          delete safeUpdate.discountRate;
          unsetFields.salePrice = 1;
          unsetFields.discountRate = 1;
        }
      }
    } else {
      if (
        body.salePrice === null || 
        body.salePrice === '' || 
        (existingProduct.uploadedBy && (body.salePrice === null || body.salePrice === undefined || (safeUpdate.price && existingProduct.salePrice && existingProduct.salePrice >= safeUpdate.price)))
      ) {
        if (!body.salePrice || Number(body.salePrice) <= 0 || (safeUpdate.price && Number(body.salePrice) >= safeUpdate.price)) {
          unsetFields.salePrice = 1;
          delete safeUpdate.salePrice;
        }
      }
      if (body.discountRate === null || body.discountRate === '' || unsetFields.salePrice) {
        if (!body.discountRate || unsetFields.salePrice) {
          unsetFields.discountRate = 1;
          delete safeUpdate.discountRate;
        }
      }
    }

    const baseUpdateOps: any = { $set: safeUpdate };
    if (Object.keys(unsetFields).length > 0) {
      baseUpdateOps.$unset = unsetFields;
    }

    if (safeUpdate.slug) {
      const maxRetries = 3;
      let attempt = 0;
      let lastError;

      while (attempt < maxRetries) {
        attempt++;
        const currentSlugCandidate = attempt === 1 ? safeUpdate.slug : `${safeUpdate.slug}-${attempt - 1}`;

        let actualId = slug;
        if (!mongoose.Types.ObjectId.isValid(slug)) {
          const existingProduct = await Product.findOne({ slug: slug });
          if (existingProduct) actualId = existingProduct._id.toString();
        }

        const uniqueSlug = await generateUniqueSlug(Product, currentSlugCandidate, actualId);

        try {
          const updatedProduct = await Product.findOneAndUpdate(
            query,
            { ...baseUpdateOps, $set: { ...safeUpdate, slug: uniqueSlug } },
            { new: true, runValidators: true }
          );

          if (!updatedProduct) {
            return NextResponse.json({ message: 'Product not found' }, { status: 404 });
          }

          // Trigger sync to reseller storefronts
          await triggerResellerSyncBestEffort(updatedProduct._id.toString());

          revalidateTag(CACHE_TAGS.products, 'max');
          revalidatePath('/', 'layout');
          revalidatePath('/shop', 'page');
          return NextResponse.json(updatedProduct);
        } catch (error: any) {
          lastError = error;
          if (error.code === 11000 && error.keyPattern?.slug) {
            continue;
          }
          if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || 'slug/SKU';
            return NextResponse.json({ message: `Product with this ${field} already exists.` }, { status: 400 });
          }
          throw error;
        }
      }

      return NextResponse.json({
        message: 'Failed to generate a unique slug after several attempts.',
        error: lastError?.message
      }, { status: 400 });
    }

    const updatedProduct = await Product.findOneAndUpdate(
      query,
      baseUpdateOps,
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedProduct) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    // Trigger sync to reseller storefronts
    await triggerResellerSyncBestEffort(updatedProduct._id.toString());

    // If Admin approved a reseller's product, notify the reseller
    if (body.isApprovedByAdmin === true && updatedProduct.uploadedBy) {
      try {
        const Reseller = (await import('@/models/Reseller')).default;
        const reseller = await Reseller.findById(updatedProduct.uploadedBy);
        if (reseller) {
          const { createNotification } = await import('@/lib/notifications');
          await createNotification({
            userId: reseller.userId,
            resellerId: reseller._id,
            title: '🚀 Product Approved!',
            message: 'Your product "' + updatedProduct.name + '" has been approved and is now live in store.',
            type: 'product',
            link: '/reseller/products',
            sendPush: true,
          });
        }
      } catch (prodNotifErr) {
        console.error('[Product Approval Notif Error]', prodNotifErr);
      }
    }

    revalidateTag(CACHE_TAGS.products, 'max');
    revalidatePath('/', 'layout');
    revalidatePath('/shop', 'page');

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE a product (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();

    if (!session || !session.user || !(['admin', 'super_admin', 'manager', 'moderator'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const query = mongoose.Types.ObjectId.isValid(slug)
      ? { _id: slug }
      : { slug: slug };

    const existingProduct = await Product.findOne(query);
    if (!existingProduct) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    if (existingProduct.uploadedBy) {
      return NextResponse.json({
        message: 'Reseller products cannot be deleted by Mother Admin. You can hide or unpublish it from the storefront instead.'
      }, { status: 403 });
    }

    // Guard: Prevent deleting product if there are active / pending orders
    const Order = (await import('@/models/Order')).default;
    const ResellerOrder = (await import('@/models/ResellerOrder')).default;
    const ResellerProduct = (await import('@/models/ResellerProduct')).default;
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
        message: `Cannot delete product: There are ${totalActiveOrders} active/pending order(s) for this product. Please complete or cancel the pending orders first, or unpublish the product instead.`
      }, { status: 400 });
    }

    const deletedProduct = await Product.findOneAndDelete(query);
    if (deletedProduct) {
      // Mark unavailable on reseller storefronts
      const { unpublishProductFromResellers } = await import('@/lib/syncEngine');
      await unpublishProductFromResellers(deletedProduct._id.toString());

      // Automatically clean up all product images from Cloudflare R2
      try {
        const { deleteMultipleFromR2 } = await import('@/lib/r2');
        const imagesToDelete: string[] = [];
        if (Array.isArray(deletedProduct.images)) {
          imagesToDelete.push(...deletedProduct.images);
        }
        if ((deletedProduct as any).image) {
          imagesToDelete.push((deletedProduct as any).image);
        }
        if (Array.isArray(deletedProduct.variants)) {
          deletedProduct.variants.forEach((v: any) => {
            if (v?.image) imagesToDelete.push(v.image);
          });
        }
        if (imagesToDelete.length > 0) {
          await deleteMultipleFromR2(imagesToDelete);
        }
      } catch (r2CleanErr) {
        console.error('Failed to clean up product images from Cloudflare R2:', r2CleanErr);
      }
    }

    try {
      revalidateTag(CACHE_TAGS.products, 'max');
      revalidatePath('/', 'layout');
      revalidatePath('/shop', 'page');
    } catch (revalidateError) {
      console.error('Failed to revalidate product tags:', revalidateError);
    }

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}


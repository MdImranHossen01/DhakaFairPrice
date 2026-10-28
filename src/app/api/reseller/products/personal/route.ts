/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import Product from '@/models/Product';
import ResellerProduct from '@/models/ResellerProduct';
import { generateUniqueSlug } from '@/lib/slugify-server';
import { addProductToReseller } from '@/lib/syncEngine';
import { slugify } from '@/lib/slugify';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const reseller = await Reseller.findOne({ userId: (session.user as any).id }).lean();
  if (!reseller) {
    return NextResponse.json({ error: 'Reseller profile not found' }, { status: 404 });
  }

  try {
    const products = await Product.find({ uploadedBy: reseller._id })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ products });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const reseller = await Reseller.findOne({ userId: (session.user as any).id });
  if (!reseller) {
    return NextResponse.json({ error: 'Reseller profile not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const {
      name,
      slug,
      description,
      sku,
      barcode,
      categories,
      tags,
      images,
      attributes,
      variants,
      isFeatured,
      isNewArrival,
      isFlashSale,
      isPublished,
      discountRate,
      price,
      salePrice,
      purchasePrice,
      stock,
      isShared,
      metaTitle,
      metaDescription,
      videoUrl,
    } = body;

    if (!name || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const numPrice = Number(price || 0);
    const numSalePrice = salePrice !== undefined && salePrice !== '' ? Number(salePrice) : undefined;
    const numPurchasePrice = Number(purchasePrice || 0);
    const numStock = Number(stock || 0);
    const numDiscountRate = discountRate !== undefined && discountRate !== '' ? Number(discountRate) : undefined;

    const currentSlug = slug || slugify(name);
    const uniqueSlug = await generateUniqueSlug(Product, currentSlug);

    const commissionPct = reseller.systemFeePercent ?? 15;
    const computedResellerPrice = numPurchasePrice > 0 ? Math.round(numPurchasePrice * (1 + commissionPct / 100)) : (numPrice || 0);

    // Coerce variant numeric fields
    const coercedVariants = (variants || []).map((v: any) => {
      const vPurchase = Number.isFinite(parseFloat(v.purchasePrice)) ? parseFloat(v.purchasePrice) : undefined;
      const vResellerPrice = vPurchase && vPurchase > 0 ? Math.round(vPurchase * (1 + commissionPct / 100)) : undefined;
      return {
        _id: v._id || v.id,
        color: v.color,
        size: v.size,
        sku: v.sku,
        barcode: v.barcode?.trim() || undefined,
        image: v.image,
        images: Array.isArray(v.images) ? v.images : (v.image ? [v.image] : []),
        price: Number.isFinite(parseFloat(v.price)) ? parseFloat(v.price) : 0,
        salePrice: Number.isFinite(parseFloat(v.salePrice)) ? parseFloat(v.salePrice) : undefined,
        purchasePrice: vPurchase,
        resellerPrice: vResellerPrice,
        stock: Number.isFinite(parseInt(v.stock, 10)) ? parseInt(v.stock, 10) : 0,
        discountRate: Number.isFinite(parseFloat(v.discountRate)) ? parseFloat(v.discountRate) : undefined,
      };
    });

    // Create the Product document
    const product = await Product.create({
      name,
      slug: uniqueSlug,
      description,
      price: numPrice,
      salePrice: numSalePrice,
      purchasePrice: numPurchasePrice,
      resellerPrice: computedResellerPrice,
      discountRate: numDiscountRate,
      sku,
      barcode: barcode?.trim() || undefined,
      stock: numStock,
      categories: categories || [],
      tags: tags || [],
      images: images || [],
      attributes: attributes || [],
      variants: coercedVariants,
      uploadedBy: reseller._id,
      isShared: Boolean(isShared),
      isMotherProduct: false,
      isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
      isApprovedByAdmin: false, // Default unapproved until Mother Shop approves
      isFeatured: Boolean(isFeatured),
      isNewArrival: Boolean(isNewArrival),
      isFlashSale: Boolean(isFlashSale),
      metaTitle: metaTitle ? String(metaTitle).slice(0, 70) : undefined,
      metaDescription: metaDescription ? String(metaDescription).slice(0, 160) : undefined,
      videoUrl: videoUrl ? String(videoUrl).trim() : undefined,
    });

    // Automatically link this product to the creator's reseller storefront catalog
    await addProductToReseller(reseller._id.toString(), product._id.toString(), numPrice);

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const reseller = await Reseller.findOne({ userId: (session.user as any).id }).lean();
  if (!reseller) {
    return NextResponse.json({ error: 'Reseller profile not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const {
      productId,
      name,
      slug,
      description,
      sku,
      barcode,
      categories,
      tags,
      images,
      attributes,
      variants,
      isFeatured,
      isNewArrival,
      isFlashSale,
      isPublished,
      discountRate,
      price,
      salePrice,
      purchasePrice,
      stock,
      isShared,
      metaTitle,
      metaDescription,
      videoUrl,
    } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const product = await Product.findOne({ _id: productId, uploadedBy: reseller._id });
    if (!product) {
      return NextResponse.json({ error: 'Product not found or not owned by you' }, { status: 404 });
    }

    if (name) product.name = name;
    if (slug) {
      product.slug = await generateUniqueSlug(Product, slug);
    }
    if (description) product.description = description;
    if (sku !== undefined) product.sku = sku;
    if (barcode !== undefined) product.barcode = barcode?.trim() || undefined;
    if (categories !== undefined) product.categories = categories;
    if (tags !== undefined) product.tags = tags;
    if (images !== undefined) product.images = images;
    if (attributes !== undefined) product.attributes = attributes;
    if (metaTitle !== undefined) product.metaTitle = metaTitle ? String(metaTitle).slice(0, 70) : '';
    if (metaDescription !== undefined) product.metaDescription = metaDescription ? String(metaDescription).slice(0, 160) : '';
    if (videoUrl !== undefined) product.videoUrl = videoUrl ? String(videoUrl).trim() : '';
    if (variants !== undefined) {
      product.variants = (variants || []).map((v: any) => {
        const vPurchase = Number.isFinite(parseFloat(v.purchasePrice)) ? parseFloat(v.purchasePrice) : undefined;
        const vResellerPrice = vPurchase && vPurchase > 0 ? Math.round(vPurchase * (1 + (reseller.systemFeePercent ?? 15) / 100)) : undefined;
        return {
          _id: v._id || v.id,
          color: v.color,
          size: v.size,
          sku: v.sku,
          barcode: v.barcode?.trim() || undefined,
          image: v.image,
          images: Array.isArray(v.images) ? v.images : (v.image ? [v.image] : []),
          price: Number.isFinite(parseFloat(v.price)) ? parseFloat(v.price) : 0,
          salePrice: Number.isFinite(parseFloat(v.salePrice)) ? parseFloat(v.salePrice) : undefined,
          purchasePrice: vPurchase,
          resellerPrice: vResellerPrice,
          stock: Number.isFinite(parseInt(v.stock, 10)) ? parseInt(v.stock, 10) : 0,
          discountRate: Number.isFinite(parseFloat(v.discountRate)) ? parseFloat(v.discountRate) : undefined,
        };
      });
    }
    if (isFeatured !== undefined) product.isFeatured = Boolean(isFeatured);
    if (isNewArrival !== undefined) product.isNewArrival = Boolean(isNewArrival);
    if (isFlashSale !== undefined) product.isFlashSale = Boolean(isFlashSale);
    if (isPublished !== undefined) product.isPublished = Boolean(isPublished);
    if (price !== undefined) product.price = Number(price);
    if (salePrice !== undefined) product.salePrice = salePrice !== '' ? Number(salePrice) : undefined;
    if (purchasePrice !== undefined) {
      product.purchasePrice = Number(purchasePrice);
      const commissionPct = reseller.systemFeePercent ?? 15;
      product.resellerPrice = product.purchasePrice > 0 ? Math.round(product.purchasePrice * (1 + commissionPct / 100)) : product.price;
    }
    if (discountRate !== undefined) product.discountRate = discountRate !== '' ? Number(discountRate) : undefined;
    if (stock !== undefined) product.stock = Number(stock);
    if (isShared !== undefined) product.isShared = Boolean(isShared);

    await product.save();

    // Sync uploader's storefront listing price & info
    await ResellerProduct.findOneAndUpdate(
      { resellerId: reseller._id, productId: product._id },
      {
        $set: {
          resellerId: reseller._id,
          productId: product._id,
          retailPrice: product.salePrice && product.salePrice > 0 ? product.salePrice : Number(product.price),
          name: product.name,
          slug: product.slug,
          images: product.images,
          stock: product.stock,
          purchasePrice: product.resellerPrice || product.purchasePrice || 0,
          motherPrice: product.price || 0,
          isAvailableOnMother: true,
          isPublished: product.isPublished !== undefined ? product.isPublished : true,
          syncedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const reseller = await Reseller.findOne({ userId: (session.user as any).id }).lean();
  if (!reseller) {
    return NextResponse.json({ error: 'Reseller profile not found' }, { status: 404 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const product = await Product.findOne({ _id: productId, uploadedBy: reseller._id });
    if (!product) {
      return NextResponse.json({ error: 'Product not found or not owned by you' }, { status: 404 });
    }

    // Guard: Prevent deleting product if there are active / pending orders
    const Order = (await import('@/models/Order')).default;
    const ResellerOrder = (await import('@/models/ResellerOrder')).default;
    const pId = product._id;
    const pIdStr = product._id.toString();
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

    await Product.deleteOne({ _id: productId });
    // Only delete the owner's own ResellerProduct record.
    // Other resellers who sourced this product will have their entries
    // automatically hidden via isAvailableOnMother: false (set by unpublishProductFromResellers).
    // We don't delete other resellers' records - that would break their order history.
    await ResellerProduct.deleteOne({ resellerId: reseller._id, productId });

    return NextResponse.json({ success: true, message: 'Personal product deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import Reseller from '@/models/Reseller';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = body.items || body.cartItems;
    
    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ message: 'Invalid items array' }, { status: 400 });
    }

    await connectToDatabase();

    const validItems = [];
    let removedCount = 0;
    const sellerIds = new Set<string>();

    // Fetch product documents in bulk
    const productDocs = await Product.find({
      _id: { $in: items.map(i => i.productId).filter(Boolean) },
      isPublished: true
    }).lean();

    const productMap = new Map(productDocs.map(p => [p._id.toString(), p]));

    // Find all resellers for uploadedBy
    const uploaderIds = Array.from(new Set(productDocs.map(p => p.uploadedBy?.toString()).filter((id): id is string => Boolean(id))));
    const resellers = uploaderIds.length > 0 
      ? await Reseller.find({ _id: { $in: uploaderIds } }).select('storeName name subdomain').lean()
      : [];
    const resellerMap = new Map(resellers.map((r: any) => [r._id.toString(), r]));

    for (const item of items) {
      const product: any = productMap.get(String(item.productId));

      if (!product) {
        removedCount++;
        continue;
      }

      // If item has variant details, check if they still exist and check stock
      let availableStock = product.stock || 0;
      let variantId = undefined;

      if (item.color || item.size) {
        const variant = product.variants?.find((v: any) => 
          String(v.color || '').trim() === String(item.color || '').trim() &&
          String(v.size || '').trim() === String(item.size || '').trim()
        );
        
        if (!variant) {
          removedCount++;
          continue;
        }
        availableStock = variant.stock || 0;
        variantId = variant._id;
      }

      const rawUploader = product.uploadedBy ? product.uploadedBy.toString() : null;
      const sellerId = rawUploader || 'mother';
      sellerIds.add(sellerId);

      let sellerName = 'Official Store';
      if (rawUploader) {
        const r: any = resellerMap.get(rawUploader);
        sellerName = r?.storeName || r?.name || 'Reseller Store';
      }

      validItems.push({
        ...item,
        uploadedBy: rawUploader,
        sellerId,
        sellerName,
        availableStock,
        isInsufficient: availableStock < item.quantity,
        variantId
      });
    }

    const hasMultipleSellers = sellerIds.size > 1;

    // Group items by seller for UI display and actions
    const sellerGroups: Record<string, { sellerId: string; sellerName: string; items: any[] }> = {};
    for (const item of validItems) {
      if (!sellerGroups[item.sellerId]) {
        sellerGroups[item.sellerId] = {
          sellerId: item.sellerId,
          sellerName: item.sellerName,
          items: []
        };
      }
      sellerGroups[item.sellerId].items.push(item);
    }

    return NextResponse.json({ 
      validItems, 
      removedCount,
      hasInsufficientStock: validItems.some(i => i.isInsufficient),
      hasMultipleSellers,
      sellerGroups: Object.values(sellerGroups),
      multipleSellersMessage: hasMultipleSellers 
        ? 'আপনার কার্টে একাধিক শপের পণ্য রয়েছে। প্রতিটি শপের পণ্য ভিন্ন লোকেশন থেকে পাঠানো হয়, তাই একসাথে অর্ডার করা সম্ভব নয়। অনুগ্রহ করে একটি নির্দিষ্ট শপের পণ্য রেখে বাকিগুলো আলাদাভাবে অর্ডার করুন।'
        : null
    });

  } catch (error) {
    console.error('Cart sync error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

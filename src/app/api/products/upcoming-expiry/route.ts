import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !session.user || !['admin', 'super_admin', 'manager', 'reseller'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Calculate the date 30 days from now
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const next30Days = new Date(today);
    next30Days.setDate(next30Days.getDate() + 30);
    next30Days.setHours(23, 59, 59, 999);

    const queryConditions: any[] = [
      { 'batches.expiryDate': { $exists: true } },
      { 'variants.batches.expiryDate': { $exists: true } }
    ];

    // If reseller, filter by reseller's uploaded products
    if (userRole === 'reseller') {
      const Reseller = (await import('@/models/Reseller')).default;
      const reseller = await Reseller.findOne({ userId: (session.user as any).id }).lean();
      if (reseller) {
        queryConditions.push({ uploadedBy: reseller._id });
      }
    }

    const products = await Product.find({
      $or: [
        { 'batches.expiryDate': { $exists: true } },
        { 'variants.batches.expiryDate': { $exists: true } }
      ]
    }).lean();

    const expiringBatches: any[] = [];

    for (const product of products) {
      // Top level batches
      if (product.batches && Array.isArray(product.batches)) {
        for (const batch of product.batches) {
          if (batch.expiryDate) {
            const expDate = new Date(batch.expiryDate);
            if (expDate <= next30Days && (batch.stock ?? 0) > 0) {
              expiringBatches.push({
                id: `${product._id}-${batch.batchNumber}`,
                productId: product._id,
                name: product.name,
                color: null,
                size: null,
                batchNumber: batch.batchNumber,
                expiryDate: batch.expiryDate,
                stock: batch.stock ?? product.stock,
              });
            }
          }
        }
      }

      // Variant level batches
      if (product.variants && Array.isArray(product.variants)) {
        for (const variant of product.variants) {
          if (variant.batches && Array.isArray(variant.batches)) {
            for (const batch of variant.batches) {
              if (batch.expiryDate) {
                const expDate = new Date(batch.expiryDate);
                if (expDate <= next30Days && (batch.stock ?? 0) > 0) {
                  expiringBatches.push({
                    id: `${product._id}-${variant._id}-${batch.batchNumber}`,
                    productId: product._id,
                    name: product.name,
                    color: variant.color || null,
                    size: variant.size || null,
                    batchNumber: batch.batchNumber,
                    expiryDate: batch.expiryDate,
                    stock: batch.stock ?? variant.stock,
                  });
                }
              }
            }
          }
        }
      }
    }

    // Sort by closest expiry date
    expiringBatches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    return NextResponse.json({ batches: expiringBatches }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching upcoming expiry:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

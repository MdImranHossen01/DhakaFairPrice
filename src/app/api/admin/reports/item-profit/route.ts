/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const brand = searchParams.get('brand') || '';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    await connectToDatabase();

    const matchQuery: any = {
      status: { $in: ['Paid', 'Confirmed', 'Processing', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] },
      deletedAt: null
    };

    if (from || to) {
      matchQuery.createdAt = {};
      if (from) matchQuery.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = toDate;
      }
    }

    const itemAggregation = await Order.aggregate([
      { $match: matchQuery },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          itemName: { $first: '$items.name' },
          itemImage: { $first: '$items.image' },
          qty: { $sum: '$items.quantity' },
          totalSalePrice: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          totalPurchasePrice: {
            $sum: {
              $multiply: [
                '$items.quantity',
                { $ifNull: ['$items.purchasePrice', 0] }
              ]
            }
          },
          missingPurchasePriceQty: {
            $sum: {
              $cond: [{ $or: [{ $eq: ['$items.purchasePrice', null] }, { $not: ['$items.purchasePrice'] }] }, '$items.quantity', 0]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productDoc'
        }
      },
      { $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          itemName: { $ifNull: ['$productDoc.name', '$itemName'] },
          sku: { $ifNull: ['$productDoc.sku', { $concat: ['IC', { $substr: [{ $toString: '$_id' }, 18, 6] }] }] },
          category: '$productDoc.category',
          brand: '$productDoc.brand',
          qty: 1,
          totalSalePrice: 1,
          totalPurchasePrice: 1,
          profit: { $subtract: ['$totalSalePrice', '$totalPurchasePrice'] }
        }
      },
      { $sort: { profit: -1 } }
    ]);

    let filteredItems = itemAggregation;
    if (search) {
      filteredItems = filteredItems.filter(i =>
        i.itemName?.toLowerCase().includes(search.toLowerCase()) ||
        i.sku?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (category && category !== 'all') {
      filteredItems = filteredItems.filter(i => i.category?.toString() === category);
    }
    if (brand && brand !== 'all') {
      filteredItems = filteredItems.filter(i => i.brand?.toString() === brand);
    }

    return NextResponse.json({
      items: filteredItems,
      totalCount: filteredItems.length
    });
  } catch (error) {
    console.error('Item Profit API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

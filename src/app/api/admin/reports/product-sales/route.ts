/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'top'; // 'top' or 'low'
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '50'));

    await connectToDatabase();

    if (view === 'top') {
      const topProducts = await Order.aggregate([
        {
          $match: {
            status: { $in: ['Paid', 'Confirmed', 'Processing', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] },
            deletedAt: null
          }
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            itemName: { $first: '$items.name' },
            soldQty: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
          }
        },
        { $sort: { soldQty: -1 } },
        { $limit: limit },
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
            stock: '$productDoc.stock',
            soldQty: 1,
            totalRevenue: 1
          }
        }
      ]);

      return NextResponse.json({ view: 'top', items: topProducts });
    } else {
      // Low Sales Item Report (Products with 0 or very few sales)
      const soldProductIdsResult = await Order.aggregate([
        {
          $match: {
            status: { $in: ['Paid', 'Confirmed', 'Processing', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] },
            deletedAt: null
          }
        },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', count: { $sum: '$items.quantity' } } }
      ]);

      const soldMap = new Map();
      soldProductIdsResult.forEach((i: any) => soldMap.set(i._id?.toString(), i.count));

      const allPublishedProducts = await Product.find({ isPublished: true })
        .select('name sku stock price')
        .lean();

      const lowSalesItems = allPublishedProducts.map((p: any) => {
        const soldQty = soldMap.get(p._id.toString()) || 0;
        return {
          _id: p._id,
          itemName: p.name,
          sku: p.sku || `IC${p._id.toString().slice(-6)}`,
          stock: p.stock || 0,
          soldQty
        };
      })
        .sort((a: any, b: any) => a.soldQty - b.soldQty)
        .slice(0, limit);

      return NextResponse.json({ view: 'low', items: lowSalesItems });
    }
  } catch (error) {
    console.error('Product Sales API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizedReseller } from '@/lib/resellerReportsHelper';
import ResellerOrder from '@/models/ResellerOrder';

export async function GET(req: NextRequest) {
  try {
    const { error, status, reseller } = await getAuthorizedReseller();
    if (error || !reseller) {
      return NextResponse.json({ message: error || 'Unauthorized' }, { status: status || 401 });
    }

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'top'; // 'top' | 'low'
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '50', 10));
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const matchQuery: any = {
      resellerId: reseller._id,
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

    const sortDirection = view === 'low' ? 1 : -1;

    const productsAgg = await ResellerOrder.aggregate([
      { $match: matchQuery },
      { $unwind: '$items' },
      {
        $group: {
          _id: { $ifNull: ['$items.productId', '$items.name'] },
          itemName: { $first: '$items.name' },
          itemImage: { $first: '$items.image' },
          soldQty: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.retailPrice', '$items.quantity'] } },
          totalProfit: {
            $sum: {
              $multiply: [
                { $subtract: ['$items.retailPrice', { $ifNull: ['$items.purchasePrice', 0] }] },
                '$items.quantity'
              ]
            }
          }
        }
      },
      { $sort: { soldQty: sortDirection, totalRevenue: sortDirection } },
      { $limit: limit }
    ]);

    const products = productsAgg.map((p: any) => ({
      _id: p._id,
      name: p.itemName || 'Product',
      image: p.itemImage || '',
      soldQty: p.soldQty,
      totalRevenue: p.totalRevenue,
      totalProfit: p.totalProfit,
      avgPrice: p.soldQty > 0 ? p.totalRevenue / p.soldQty : 0
    }));

    return NextResponse.json({
      view,
      products,
      totalCount: products.length
    });
  } catch (error: any) {
    console.error('Failed to get reseller product sales report:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

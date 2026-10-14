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
    const search = searchParams.get('search') || '';
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

    const itemAggregation = await ResellerOrder.aggregate([
      { $match: matchQuery },
      { $unwind: '$items' },
      {
        $group: {
          _id: { $ifNull: ['$items.productId', '$items.name'] },
          itemName: { $first: '$items.name' },
          itemImage: { $first: '$items.image' },
          qty: { $sum: '$items.quantity' },
          totalSalePrice: { $sum: { $multiply: ['$items.retailPrice', '$items.quantity'] } },
          totalPurchasePrice: {
            $sum: {
              $multiply: [
                '$items.quantity',
                { $ifNull: ['$items.purchasePrice', 0] }
              ]
            }
          }
        }
      },
      { $sort: { qty: -1 } }
    ]);

    let filtered = itemAggregation;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(item => (item.itemName || '').toLowerCase().includes(q));
    }

    let summaryQty = 0;
    let summarySales = 0;
    let summaryPurchase = 0;
    let summaryProfit = 0;

    const items = filtered.map((row: any) => {
      const profit = row.totalSalePrice - row.totalPurchasePrice;
      const margin = row.totalSalePrice > 0 ? (profit / row.totalSalePrice) * 100 : 0;

      summaryQty += row.qty;
      summarySales += row.totalSalePrice;
      summaryPurchase += row.totalPurchasePrice;
      summaryProfit += profit;

      return {
        _id: row._id,
        name: row.itemName || 'Product',
        image: row.itemImage || '',
        soldQty: row.qty,
        totalSalePrice: row.totalSalePrice,
        totalPurchasePrice: row.totalPurchasePrice,
        avgSalePrice: row.qty > 0 ? row.totalSalePrice / row.qty : 0,
        avgPurchasePrice: row.qty > 0 ? row.totalPurchasePrice / row.qty : 0,
        profit,
        margin: Math.round(margin * 10) / 10
      };
    });

    return NextResponse.json({
      items,
      summary: {
        totalQty: summaryQty,
        totalSales: summarySales,
        totalPurchase: summaryPurchase,
        totalProfit: summaryProfit,
        avgMargin: summarySales > 0 ? Math.round((summaryProfit / summarySales) * 1000) / 10 : 0
      }
    });
  } catch (error: any) {
    console.error('Failed to get reseller item profit report:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

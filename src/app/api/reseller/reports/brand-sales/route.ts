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
    const now = new Date();
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');

    const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

    if (isNaN(month) || month < 1 || month > 12 || isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ message: 'Invalid month or year parameter' }, { status: 400 });
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999));

    const brandSalesAgg = await ResellerOrder.aggregate([
      {
        $match: {
          resellerId: reseller._id,
          status: { $in: ['Paid', 'Confirmed', 'Processing', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] },
          createdAt: { $gte: startDate, $lte: endDate },
          deletedAt: null
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productDoc'
        }
      },
      { $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$productDoc.brand', 'Generic / Unbranded'] },
          soldQty: { $sum: '$items.quantity' },
          totalSales: { $sum: { $multiply: ['$items.retailPrice', '$items.quantity'] } },
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
      {
        $lookup: {
          from: 'brands',
          localField: '_id',
          foreignField: '_id',
          as: 'brandDoc'
        }
      },
      { $unwind: { path: '$brandDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          brandName: { $ifNull: ['$brandDoc.name', 'Generic / Other'] },
          brandLogo: '$brandDoc.logo',
          soldQty: 1,
          totalSales: 1,
          totalProfit: 1
        }
      },
      { $sort: { totalSales: -1 } }
    ]);

    const totalQty = brandSalesAgg.reduce((acc, curr) => acc + (curr.soldQty || 0), 0);
    const totalSales = brandSalesAgg.reduce((acc, curr) => acc + (curr.totalSales || 0), 0);
    const totalProfit = brandSalesAgg.reduce((acc, curr) => acc + (curr.totalProfit || 0), 0);

    return NextResponse.json({
      year,
      month,
      brandSales: brandSalesAgg,
      summary: {
        totalBrands: brandSalesAgg.length,
        totalQty,
        totalSales,
        totalProfit
      }
    });
  } catch (error: any) {
    console.error('Failed to get reseller brand sales report:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

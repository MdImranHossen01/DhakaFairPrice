import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Reseller from '@/models/Reseller';
import ResellerOrder from '@/models/ResellerOrder';
import ResellerWalletTransaction from '@/models/ResellerWalletTransaction';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const resellerId = searchParams.get('resellerId');
    const search = searchParams.get('search') || '';

    await connectToDatabase();

    const resellerMatch: any = {};
    if (resellerId && resellerId !== 'all') {
      resellerMatch._id = resellerId;
    }
    if (search) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      resellerMatch.$or = [
        { storeName: { $regex: escaped, $options: 'i' } },
        { subdomain: { $regex: escaped, $options: 'i' } }
      ];
    }

    const resellers = await Reseller.find(resellerMatch)
      .select('storeName subdomain commissionRate walletBalance pendingBalance status')
      .populate('userId', 'name email phone')
      .lean();

    const resellerIds = resellers.map((r: any) => r._id);

    // Grouped aggregation for all fetched resellers in two queries
    const [ordersAggList, payoutsAggList] = await Promise.all([
      ResellerOrder.aggregate([
        { $match: { resellerId: { $in: resellerIds } } },
        {
          $group: {
            _id: '$resellerId',
            totalOrders: { $sum: 1 },
            totalSales: { $sum: '$totalAmount' },
            deliveredOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] }
            }
          }
        }
      ]),
      ResellerWalletTransaction.aggregate([
        {
          $match: {
            resellerId: { $in: resellerIds },
            type: 'commission_earned'
          }
        },
        {
          $group: {
            _id: '$resellerId',
            totalEarnedCommission: { $sum: '$amount' }
          }
        }
      ])
    ]);

    const ordersMap = new Map<string, any>();
    ordersAggList.forEach((item: any) => ordersMap.set(item._id.toString(), item));

    const payoutsMap = new Map<string, number>();
    payoutsAggList.forEach((item: any) => payoutsMap.set(item._id.toString(), item.totalEarnedCommission || 0));

    const resellerData = resellers.map((reseller: any) => {
      const orderInfo = ordersMap.get(reseller._id.toString()) || { totalOrders: 0, totalSales: 0, deliveredOrders: 0 };
      const totalEarned = payoutsMap.get(reseller._id.toString()) || 0;

      return {
        _id: reseller._id,
        storeName: reseller.storeName,
        subdomain: reseller.subdomain,
        ownerName: reseller.userId?.name || 'Unknown',
        ownerPhone: reseller.userId?.phone || '',
        status: reseller.status,
        walletBalance: reseller.walletBalance || 0,
        pendingBalance: reseller.pendingBalance || 0,
        totalOrders: orderInfo.totalOrders,
        deliveredOrders: orderInfo.deliveredOrders,
        totalSales: orderInfo.totalSales,
        totalEarnedCommission: totalEarned
      };
    });

    return NextResponse.json({ resellers: resellerData });
  } catch (error) {
    console.error('Reseller Sales API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

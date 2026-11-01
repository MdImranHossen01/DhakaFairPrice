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
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const sortBy = searchParams.get('sortBy') || 'sales';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    await connectToDatabase();

    const resellerMatch: any = {};
    if (resellerId && resellerId !== 'all') {
      resellerMatch._id = resellerId;
    }

    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      let userIds: any[] = [];
      try {
        const User = (await import('@/models/User')).default;
        const matchedUsers = await User.find({
          $or: [
            { name: { $regex: escaped, $options: 'i' } },
            { phone: { $regex: escaped, $options: 'i' } },
            { email: { $regex: escaped, $options: 'i' } },
          ]
        }).select('_id').lean();
        userIds = matchedUsers.map(u => u._id);
      } catch (uErr) {
        console.warn('Error querying matching users for search:', uErr);
      }

      resellerMatch.$or = [
        { storeName: { $regex: escaped, $options: 'i' } },
        { subdomain: { $regex: escaped, $options: 'i' } },
        { 'contact.phone': { $regex: escaped, $options: 'i' } },
        { 'contact.email': { $regex: escaped, $options: 'i' } },
        ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : []),
      ];
    }

    const resellers = await Reseller.find(resellerMatch)
      .select('storeName subdomain commissionRate walletBalance pendingBalance status')
      .populate('userId', 'name email phone')
      .lean();

    const resellerIds = resellers.map((r: any) => r._id);

    // Build date filters for orders and transactions
    const orderDateMatch: any = {};
    const txDateMatch: any = {};
    if (from || to) {
      if (from) {
        const fromDate = new Date(from);
        orderDateMatch.$gte = fromDate;
        txDateMatch.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        orderDateMatch.$lte = toDate;
        txDateMatch.$lte = toDate;
      }
    }

    const orderMatchQuery: any = {
      resellerId: { $in: resellerIds },
      $or: [
        { deletedAt: null },
        { commissionStatus: 'cleared' },
        { status: 'Delivered' }
      ]
    };
    if (from || to) {
      orderMatchQuery.createdAt = orderDateMatch;
    }

    const txMatchQuery: any = {
      resellerId: { $in: resellerIds },
      type: 'commission_earned',
      status: { $ne: 'cancelled' }
    };
    if (from || to) {
      txMatchQuery.createdAt = txDateMatch;
    }

    // Grouped aggregation for all fetched resellers in two queries
    const [ordersAggList, payoutsAggList] = await Promise.all([
      ResellerOrder.aggregate([
        { $match: orderMatchQuery },
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
        { $match: txMatchQuery },
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

    // Performance-based sorting: Top sellers on top
    resellerData.sort((a: any, b: any) => {
      let diff = 0;
      if (sortBy === 'orders') {
        diff = a.totalOrders - b.totalOrders;
      } else if (sortBy === 'delivered') {
        diff = a.deliveredOrders - b.deliveredOrders;
      } else if (sortBy === 'commission') {
        diff = a.totalEarnedCommission - b.totalEarnedCommission;
      } else if (sortBy === 'wallet') {
        diff = a.walletBalance - b.walletBalance;
      } else if (sortBy === 'store') {
        diff = a.storeName.localeCompare(b.storeName);
      } else {
        // Default is 'sales' (Sales Volume)
        diff = a.totalSales - b.totalSales;
      }

      if (diff === 0) {
        // Tie-breakers: totalSales -> totalOrders -> deliveredOrders -> commission
        if (b.totalSales !== a.totalSales) return b.totalSales - a.totalSales;
        if (b.totalOrders !== a.totalOrders) return b.totalOrders - a.totalOrders;
        if (b.deliveredOrders !== a.deliveredOrders) return b.deliveredOrders - a.deliveredOrders;
        return (b.totalEarnedCommission || 0) - (a.totalEarnedCommission || 0);
      }

      return sortOrder === 'asc' ? diff : -diff;
    });

    // Summary calculation
    const summary = {
      totalResellers: resellerData.length,
      activeResellers: resellerData.filter((r: any) => r.totalOrders > 0).length,
      totalOrders: resellerData.reduce((acc: number, r: any) => acc + (r.totalOrders || 0), 0),
      deliveredOrders: resellerData.reduce((acc: number, r: any) => acc + (r.deliveredOrders || 0), 0),
      totalSales: resellerData.reduce((acc: number, r: any) => acc + (r.totalSales || 0), 0),
      totalEarnedCommission: resellerData.reduce((acc: number, r: any) => acc + (r.totalEarnedCommission || 0), 0),
    };

    return NextResponse.json({ resellers: resellerData, summary });
  } catch (error) {
    console.error('Reseller Sales API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

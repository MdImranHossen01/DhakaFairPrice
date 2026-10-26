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
    const parsedPage = parseInt(searchParams.get('page') || '1', 10);
    const parsedLimit = parseInt(searchParams.get('limit') || '25', 10);
    const page = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const limit = isNaN(parsedLimit) || parsedLimit < 1 ? 25 : Math.min(100, parsedLimit);
    const search = searchParams.get('search') || '';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const statusFilter = searchParams.get('status');

    const matchQuery: any = {
      resellerId: reseller._id,
      $or: [
        { deletedAt: null },
        { commissionStatus: 'cleared' },
        { status: 'Delivered' }
      ]
    };

    if (statusFilter && statusFilter !== 'all') {
      matchQuery.status = statusFilter;
    } else {
      matchQuery.status = { $in: ['Paid', 'Confirmed', 'Processing', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] };
    }

    if (from || to) {
      matchQuery.createdAt = {};
      if (from) matchQuery.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = toDate;
      }
    }

    if (search) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      matchQuery.$or = [
        { shortId: { $regex: escaped, $options: 'i' } },
        { 'customer.name': { $regex: escaped, $options: 'i' } },
        { 'customer.phone': { $regex: escaped, $options: 'i' } }
      ];
    }

    const [totalCount, orders, totalsAgg] = await Promise.all([
      ResellerOrder.countDocuments(matchQuery),
      ResellerOrder.find(matchQuery)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ResellerOrder.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$totalAmount' },
            totalDelivery: { $sum: '$deliveryCharge' },
            totalCommission: { $sum: '$resellerCommission' }
          }
        }
      ])
    ]);

    const formattedOrders = orders.map((order: any) => {
      const totalAmount = order.totalAmount || 0;
      const deliveryCharge = order.deliveryCharge || 0;
      const netSales = Math.max(0, totalAmount - deliveryCharge);

      let totalCOGS = 0;
      let totalQty = 0;
      if (Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const qty = item.quantity || 1;
          totalQty += qty;
          const purchasePrice = item.purchasePrice || 0;
          totalCOGS += qty * purchasePrice;
        });
      }

      const profit = order.resellerCommission !== undefined && order.resellerCommission !== null && order.resellerCommission > 0
        ? order.resellerCommission
        : Math.max(0, netSales - totalCOGS);

      return {
        _id: order._id,
        invoiceNo: order.shortId || `RO-${order._id.toString().slice(-6).toUpperCase()}`,
        date: order.createdAt,
        customerName: order.customer?.name || 'Customer',
        customerPhone: order.customer?.phone || '-',
        itemCount: totalQty,
        itemsSummary: order.items?.map((it: any) => `${it.name} (x${it.quantity})`).join(', ') || '',
        netSales,
        deliveryCost: deliveryCharge,
        totalAmount,
        cogs: totalCOGS,
        profit,
        status: order.status,
        commissionStatus: order.commissionStatus || 'pending'
      };
    });

    const summary = totalsAgg[0] || { totalSales: 0, totalDelivery: 0, totalCommission: 0 };

    return NextResponse.json({
      orders: formattedOrders,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
      currentPage: page,
      summary: {
        totalSales: summary.totalSales,
        totalDelivery: summary.totalDelivery,
        netSales: Math.max(0, summary.totalSales - summary.totalDelivery),
        totalCommission: summary.totalCommission
      }
    });
  } catch (error: any) {
    console.error('Failed to get reseller order profit report:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

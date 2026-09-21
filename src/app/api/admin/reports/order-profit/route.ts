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
    const parsedPage = parseInt(searchParams.get('page') || '1', 10);
    const parsedLimit = parseInt(searchParams.get('limit') || '25', 10);
    const page = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const limit = isNaN(parsedLimit) || parsedLimit < 1 ? 25 : Math.min(100, parsedLimit);
    const search = searchParams.get('search') || '';
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

    if (search) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      matchQuery.$or = [
        { slug: { $regex: escaped, $options: 'i' } },
        { 'shippingAddress.fullName': { $regex: escaped, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: escaped, $options: 'i' } }
      ];
    }

    const [totalCountResult, orders] = await Promise.all([
      Order.countDocuments(matchQuery),
      Order.find(matchQuery)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('slug totalAmount deliveryCharge status createdAt items shippingAddress')
        .populate('user', 'name email phone')
        .lean()
    ]);

    const formattedOrders = orders.map((order: any) => {
      const totalAmount = order.totalAmount || 0;
      const deliveryCharge = order.deliveryCharge || 0;
      const netSales = Math.max(0, totalAmount - deliveryCharge);

      let totalCOGS = 0;
      if (Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const qty = item.quantity || 1;
          const purchasePrice = item.purchasePrice || (item.price ? item.price * 0.7 : 0);
          totalCOGS += qty * purchasePrice;
        });
      }

      const profit = netSales - totalCOGS;

      return {
        _id: order._id,
        slug: order.slug,
        invoiceNo: order.slug?.replace('order-', 'INV-') || `ORD-${order._id.toString().slice(-6)}`,
        date: order.createdAt,
        customerName: order.shippingAddress?.fullName || order.user?.name || 'Walk-in Customer',
        customerPhone: order.shippingAddress?.phone || order.user?.phone || '',
        netSales,
        deliveryCost: deliveryCharge,
        total: totalAmount,
        purchasePrice: totalCOGS,
        profit,
        status: order.status
      };
    });

    return NextResponse.json({
      orders: formattedOrders,
      totalCount: totalCountResult,
      page,
      totalPages: Math.ceil(totalCountResult / limit)
    });
  } catch (error) {
    console.error('Order Profit API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

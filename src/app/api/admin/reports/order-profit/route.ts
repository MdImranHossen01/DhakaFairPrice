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
    const parsedPage = parseInt(searchParams.get('page') || '1', 10);
    const parsedLimit = parseInt(searchParams.get('limit') || '25', 10);
    const page = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const limit = isNaN(parsedLimit) || parsedLimit < 1 ? 25 : Math.min(100, parsedLimit);
    const search = searchParams.get('search') || '';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const source = searchParams.get('source'); // 'all' | 'mother' | 'reseller'

    await connectToDatabase();

    const matchQuery: any = {
      status: { $in: ['Paid', 'Confirmed', 'Processing', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] },
      $or: [
        { deletedAt: null },
        { paymentStatus: 'Paid' },
        { status: 'Delivered' }
      ],
    };

    if (source === 'mother') {
      matchQuery.orderSource = { $ne: 'reseller_storefront' };
      matchQuery.systemNote = { $not: /^Reseller Order/ };
    } else if (source === 'reseller') {
      matchQuery.$or = [
        { orderSource: 'reseller_storefront' },
        { systemNote: /^Reseller Order/ }
      ];
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
        .select('shortId slug totalAmount deliveryCharge status createdAt items shippingAddress orderSource resellerCommission systemFee systemNote disbursement')
        .populate('user', 'name email phone')
        .populate('items.product', 'name uploadedBy isMotherProduct purchasePrice variants price')
        .lean()
    ]);

    const formattedOrders = orders.map((order: any) => {
      const totalAmount = order.totalAmount || 0;
      const deliveryCharge = order.deliveryCharge || 0;
      const netSales = Math.max(0, totalAmount - deliveryCharge);
      const resellerCommission = Number(order.resellerCommission) || 0;
      const systemFee = Number(order.systemFee) || 0;

      const isResellerOrder = order.orderSource === 'reseller_storefront' ||
        /^Reseller Order/i.test(order.systemNote || '') ||
        order.resellerId != null;

      let totalCOGS = 0;
      let hasPersonalProducts = false;
      let hasMotherProducts = false;

      if (Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const qty = item.quantity || 1;
          const prod = item.product;

          // Personal / own product uploaded by reseller
          const isPersonal = prod && (prod.uploadedBy != null || prod.isMotherProduct === false);

          if (isPersonal) {
            hasPersonalProducts = true;
            // Mother shop COGS is 0 for personal products owned/fulfilled by resellers!
          } else {
            hasMotherProducts = true;
            // For Mother shop catalog products, Mother Shop's actual cost to acquire/produce
            let motherItemCOGS = 0;
            if (prod && Number(prod.purchasePrice) > 0) {
              motherItemCOGS = Number(prod.purchasePrice);
            } else if (!isResellerOrder && Number(item.purchasePrice) > 0) {
              motherItemCOGS = Number(item.purchasePrice);
            } else if (item.price) {
              motherItemCOGS = Math.round(item.price * 0.7);
            }
            totalCOGS += qty * motherItemCOGS;
          }
        });
      }

      // Resilient check for own-product orders
      if (!hasPersonalProducts && isResellerOrder && (/own product/i.test(order.systemNote || '') || (systemFee > 0 && Math.abs(netSales - (resellerCommission + systemFee)) <= 5))) {
        hasPersonalProducts = true;
        totalCOGS = 0;
      }

      let profit = 0;
      if (!isResellerOrder) {
        // Direct Mother Shop Order
        profit = netSales - totalCOGS;
      } else if (hasPersonalProducts && !hasMotherProducts) {
        // Pure Reseller Personal-Product order (e.g. Farzaner Recipe Orange Tub Cake)
        totalCOGS = 0;
        profit = systemFee > 0 ? systemFee : Math.max(0, netSales - resellerCommission);
      } else {
        // Dropshipping from Mother Catalog (or mixed)
        const motherRevenue = Math.max(0, netSales - resellerCommission);
        profit = motherRevenue - totalCOGS;
      }

      return {
        _id: order._id,
        shortId: order.shortId,
        slug: order.slug,
        invoiceNo: order.shortId ? `#${order.shortId}` : (order.slug?.replace('order-', 'INV-') || `ORD-${order._id.toString().slice(-6)}`),
        date: order.createdAt,
        customerName: order.shippingAddress?.fullName || order.user?.name || 'Walk-in Customer',
        customerPhone: order.shippingAddress?.phone || order.user?.phone || '',
        netSales,
        deliveryCost: deliveryCharge,
        total: totalAmount,
        purchasePrice: totalCOGS,
        resellerCommission,
        orderSource: order.orderSource,
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

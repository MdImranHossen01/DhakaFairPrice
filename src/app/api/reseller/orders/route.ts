/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import ResellerOrder from '@/models/ResellerOrder';
import Order from '@/models/Order';
import Reseller from '@/models/Reseller';

async function getResellerId(userId: string) {
  await dbConnect();
  const reseller = await Reseller.findOne({ userId });
  if (!reseller) throw new Error('Reseller not found');
  return reseller._id;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resellerId = await getResellerId(session.user.id);
    const searchParams = request.nextUrl.searchParams;

    let page = parseInt(searchParams.get('page') || '1', 10);
    if (isNaN(page) || page < 1) page = 1;

    let limit = parseInt(searchParams.get('limit') || '20', 10);
    if (isNaN(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100;

    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const commissionStatus = searchParams.get('commissionStatus') || '';

    // Auto-sync any existing ResellerOrders whose mother order status was updated
    try {
      const resellerOrdersWithMother = await ResellerOrder.find({
        resellerId,
        motherOrderId: { $exists: true, $ne: null }
      }).select('_id status paymentStatus motherOrderId').lean();

      if (resellerOrdersWithMother.length > 0) {
        const motherIds = resellerOrdersWithMother.map(o => o.motherOrderId).filter(Boolean) as any[];
        const motherOrders = await Order.find({ _id: { $in: motherIds } }).select('_id status paymentStatus').lean();
        const motherMap = new Map(motherOrders.map(m => [m._id.toString(), m]));

        const updatesToRun: Promise<any>[] = [];
        for (const ro of resellerOrdersWithMother) {
          const mother = ro.motherOrderId ? motherMap.get(ro.motherOrderId.toString()) : null;
          if (mother && (ro.status !== mother.status || ro.paymentStatus !== mother.paymentStatus)) {
            const syncUpdate: any = { status: mother.status, paymentStatus: mother.paymentStatus };
            if (mother.status === 'Cancelled') {
              syncUpdate.commissionStatus = 'cancelled';
            } else if (mother.status === 'Delivered' || mother.status === 'Paid') {
              syncUpdate.commissionStatus = 'cleared';
            }
            updatesToRun.push(
              ResellerOrder.updateOne({ _id: ro._id }, { $set: syncUpdate })
            );
          }
        }
        if (updatesToRun.length > 0) {
          await Promise.all(updatesToRun);
        }
      }
    } catch (syncErr) {
      console.error('[Reseller Orders Sync Error]', syncErr);
    }

    const query: Record<string, any> = { resellerId, deletedAt: null };
    if (status) query.status = status;
    if (commissionStatus && commissionStatus !== 'All') query.commissionStatus = commissionStatus;
    if (search) {
      const sanitizedSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      query.$or = [
        { shortId: { $regex: sanitizedSearch, $options: 'i' } },
        { 'customer.phone': { $regex: sanitizedSearch, $options: 'i' } },
        { 'customer.name': { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    const [orders, total, statusAggregation] = await Promise.all([
      ResellerOrder.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({
          path: 'items.productId',
          select: 'uploadedBy'
        })
        .lean(),
      ResellerOrder.countDocuments(query),
      ResellerOrder.aggregate([
        { $match: { resellerId, deletedAt: null } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ])
    ]);

    const statusCounts = {
      all: 0, placed: 0, confirmed: 0, paid: 0, hold: 0, processing: 0, ready: 0, released: 0, delivered: 0, cancelled: 0
    };

    statusAggregation.forEach(item => {
      statusCounts.all += item.count;
      switch (item._id) {
        case 'Order Placed': statusCounts.placed = item.count; break;
        case 'Confirmed': statusCounts.confirmed = item.count; break;
        case 'Paid': statusCounts.paid = item.count; break;
        case 'Hold': statusCounts.hold = item.count; break;
        case 'Processing': statusCounts.processing = item.count; break;
        case 'Ready for Delivery': statusCounts.ready = item.count; break;
        case 'Released for Delivery': statusCounts.released = item.count; break;
        case 'Delivered': statusCounts.delivered = item.count; break;
        case 'Cancelled': statusCounts.cancelled = item.count; break;
      }
    });

    return NextResponse.json({ orders, total, page, limit, statusCounts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resellerId = await getResellerId(session.user.id);
    const { orderId, status, internalNote } = await request.json();

    if (!orderId || !/^[0-9a-fA-F]{24}$/.test(orderId)) {
      return NextResponse.json({ error: 'Missing or malformed orderId' }, { status: 400 });
    }

    const validStatuses = ['Order Placed', 'Confirmed', 'Hold', 'Cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid or unsupported status for reseller' }, { status: 400 });
    }

    const existingOrder = await ResellerOrder.findOne({ _id: orderId, resellerId });
    if (!existingOrder) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    if (status === 'Hold') {
      const finalNote = internalNote !== undefined ? internalNote : existingOrder.internalNote;
      if (!finalNote || !finalNote.trim()) {
        return NextResponse.json({ error: 'An internal note / reason is mandatory when setting order status to Hold' }, { status: 400 });
      }
    }

    const updateFields: any = { status };
    if (internalNote !== undefined) updateFields.internalNote = internalNote;

    const order = await ResellerOrder.findOneAndUpdate(
      { _id: orderId, resellerId },
      { $set: updateFields },
      { new: true }
    );

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // If motherOrderId exists, also sync status & commission
    if (order.motherOrderId) {
      await Order.findByIdAndUpdate(order.motherOrderId, { $set: { status } });
      const { syncResellerCommissionForMotherOrder } = await import('@/lib/resellerCommissionSync');
      await syncResellerCommissionForMotherOrder({
        motherOrderId: order.motherOrderId,
        newStatus: status,
      });
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

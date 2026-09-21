import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import GlobalSettings from '@/models/GlobalSettings';
import { getSteadfastStatus } from '@/lib/steadfast';

/**
 * Cron Job: Sync Courier Delivery Status
 * 
 * Checks Steadfast for delivery updates on all active courier shipments.
 * If courier shows "delivered", order status is updated to "Delivered".
 * Also handles "cancelled" courier status.
 * 
 * Scheduled to run every 2 hours via vercel.json
 * Protected by CRON_SECRET env variable.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();

    // Get Steadfast credentials from settings
    const settingsDoc = await GlobalSettings.findOne();
    if (!settingsDoc) {
      return NextResponse.json({ message: 'Global settings not found' }, { status: 404 });
    }

    const apiKey = settingsDoc.courierConfig?.steadfast?.apiKey;
    const secretKey = settingsDoc.courierConfig?.steadfast?.secretKey;

    if (!apiKey || !secretKey) {
      return NextResponse.json({ message: 'Steadfast credentials not configured' }, { status: 400 });
    }

    const courierConfig = { apiKey, secretKey };

    // Find all orders that have been sent to Steadfast but not yet Delivered or Cancelled
    const pendingOrders = await Order.find({
      'shippingDetails.consignmentId': { $exists: true, $ne: null },
      'shippingDetails.courierName': 'Steadfast',
      status: { $nin: ['Delivered', 'Cancelled'] },
      deletedAt: null
    }).select('_id shortId status shippingDetails paymentStatus');

    if (pendingOrders.length === 0) {
      return NextResponse.json({ message: 'No active courier shipments to sync', updated: 0 });
    }

    let deliveredCount = 0;
    let cancelledCount = 0;
    let errorCount = 0;
    const results: any[] = [];

    for (const order of pendingOrders) {
      try {
        const consignmentId = order.shippingDetails?.consignmentId;
        if (!consignmentId) continue;

        const statusData = await getSteadfastStatus(consignmentId, courierConfig);

        // Steadfast returns delivery_status: "delivered" | "partial_delivered" | "cancelled" | "hold" | "in_review" | "unknown" etc.
        const courierStatus = statusData?.delivery_status || statusData?.status || '';
        const normalizedStatus = courierStatus.toLowerCase();

        // Update the shippingDetails.courierStatus regardless
        const updateFields: any = {
          'shippingDetails.courierStatus': courierStatus
        };

        if (normalizedStatus === 'delivered' || normalizedStatus === 'partial_delivered') {
          updateFields.status = 'Delivered';
          // If COD order and delivered, mark payment as Paid
          if (order.paymentStatus !== 'Paid') {
            updateFields.paymentStatus = 'Paid';
          }
          deliveredCount++;
          results.push({ orderId: order._id, shortId: order.shortId, action: 'marked_delivered', courierStatus });
        } else if (normalizedStatus === 'cancelled') {
          // Don't auto-cancel orders; just update courier status tag
          cancelledCount++;
          results.push({ orderId: order._id, shortId: order.shortId, action: 'courier_cancelled', courierStatus });
        } else {
          results.push({ orderId: order._id, shortId: order.shortId, action: 'no_change', courierStatus });
        }

        await Order.updateOne({ _id: order._id }, { $set: updateFields });

        if (updateFields.status || updateFields.paymentStatus) {
          const { syncResellerCommissionForMotherOrder } = await import('@/lib/resellerCommissionSync');
          await syncResellerCommissionForMotherOrder({
            motherOrderId: order._id,
            newStatus: updateFields.status,
            newPaymentStatus: updateFields.paymentStatus,
          });
        }

      } catch (err: any) {
        errorCount++;
        results.push({ orderId: order._id, shortId: order.shortId, action: 'error', error: err.message });
        console.error(`Courier sync error for order ${order._id}:`, err.message);
      }
    }

    return NextResponse.json({
      message: `Synced ${pendingOrders.length} shipments. Delivered: ${deliveredCount}, Cancelled by courier: ${cancelledCount}, Errors: ${errorCount}`,
      deliveredCount,
      cancelledCount,
      errorCount,
      results
    });

  } catch (error: any) {
    console.error('CRITICAL: Courier sync cron error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

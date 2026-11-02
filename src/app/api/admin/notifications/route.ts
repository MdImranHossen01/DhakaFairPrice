import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Notification from '@/models/Notification';
import Order from '@/models/Order';
import ResellerWalletTransaction from '@/models/ResellerWalletTransaction';
import Reseller from '@/models/Reseller';
import Product from '@/models/Product';

async function verifyAdminAuth() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || !['admin', 'super_admin', 'manager', 'moderator'].includes(role)) {
    return null;
  }
  return session;
}

export async function GET(req: NextRequest) {
  try {
    const session = await verifyAdminAuth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const type = searchParams.get('type');

    // 1. Calculate live queue action items (all orders fulfilled via mother logistics)
    const [
      pendingOrdersCount,
      pendingPayoutsCount,
      pendingResellersCount,
      pendingProductsCount,
      lowStockCount,
    ] = await Promise.all([
      Order.countDocuments({
        status: 'Order Placed',
        deletedAt: null,
      } as any),
      ResellerWalletTransaction.countDocuments({ type: 'payout_released', status: 'pending' }),
      Reseller.countDocuments({ status: 'pending' }),
      Product.countDocuments({
        uploadedBy: { $ne: null, $exists: true },
        isPublished: true,
        $or: [{ isApprovedByAdmin: false }, { isApprovedByAdmin: { $exists: false } }],
      }),
      Product.countDocuments({ stock: { $gt: 0, $lt: 5 } }),
    ]);

    const totalQueueActions =
      pendingOrdersCount +
      pendingPayoutsCount +
      pendingResellersCount +
      pendingProductsCount;

    // Backfill notification for any unapproved reseller products that had no notification logged
    if (pendingProductsCount > 0) {
      try {
        const unapprovedProducts = await Product.find({
          uploadedBy: { $ne: null, $exists: true },
          isPublished: true,
          $or: [{ isApprovedByAdmin: false }, { isApprovedByAdmin: { $exists: false } }],
        }).lean();

        for (const prod of unapprovedProducts) {
          const exists = await Notification.findOne({
            forAdmin: true,
            type: 'product',
            link: '/admin/products',
            message: { $regex: prod.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
          });

          if (!exists) {
            const reseller = await Reseller.findById(prod.uploadedBy).lean();
            await Notification.create({
              forAdmin: true,
              title: '📦 New Product Approval Request',
              message: `${(reseller as any)?.storeName || (reseller as any)?.name || 'Reseller'} submitted "${prod.name}" for admin approval.`,
              type: 'product',
              link: '/admin/products',
              read: false,
            });
          }
        }
      } catch (backfillErr) {
        console.error('[Notification Backfill Error]', backfillErr);
      }
    }

    // 2. Fetch logged admin notifications
    const filter: any = { forAdmin: true };
    if (type && type !== 'all') {
      filter.type = type;
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Notification.countDocuments({ forAdmin: true, read: false }),
    ]);

    return NextResponse.json({
      queues: {
        pendingOrders: pendingOrdersCount,
        pendingPayouts: pendingPayoutsCount,
        pendingResellers: pendingResellersCount,
        pendingProducts: pendingProductsCount,
        lowStock: lowStockCount,
        totalQueueActions,
      },
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error('Error fetching admin notifications:', error);
    return NextResponse.json(
      { message: 'Failed to fetch admin notifications', error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await verifyAdminAuth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json().catch(() => ({}));
    const { id, markAll } = body;

    if (markAll) {
      await Notification.updateMany({ forAdmin: true, read: false }, { $set: { read: true } });
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (id) {
      await Notification.updateOne({ _id: id, forAdmin: true }, { $set: { read: true } });
      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    }

    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating admin notification:', error);
    return NextResponse.json(
      { message: 'Failed to update notification', error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await verifyAdminAuth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Notification ID is required' }, { status: 400 });
    }

    await Notification.deleteOne({ _id: id, forAdmin: true });
    return NextResponse.json({ success: true, message: 'Notification deleted' });
  } catch (error: any) {
    console.error('Error deleting admin notification:', error);
    return NextResponse.json(
      { message: 'Failed to delete notification', error: error.message },
      { status: 500 }
    );
  }
}

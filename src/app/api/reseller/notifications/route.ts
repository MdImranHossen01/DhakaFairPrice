import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Notification from '@/models/Notification';
import Reseller from '@/models/Reseller';
import ResellerOrder from '@/models/ResellerOrder';
import Product from '@/models/Product';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!session || !user || user.role !== 'reseller') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const reseller = await Reseller.findOne({ userId: user.id }).lean();
    if (!reseller) {
      return NextResponse.json({ message: 'Reseller not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const type = searchParams.get('type');

    const [pendingOrdersCount, pendingProductsCount, lowStockCount] = await Promise.all([
      ResellerOrder.countDocuments({
        resellerId: reseller._id,
        status: 'Order Placed' as any,
      }),
      Product.countDocuments({
        uploadedBy: reseller._id,
        $or: [{ isApprovedByAdmin: false }, { isApprovedByAdmin: { $exists: false } }],
      }),
      Product.countDocuments({
        uploadedBy: reseller._id,
        stock: { $gt: 0, $lt: 5 },
      }),
    ]);

    const totalQueueActions = pendingOrdersCount + pendingProductsCount;

    const filter: any = {
      $or: [{ resellerId: reseller._id }, { userId: user.id }],
      forAdmin: false,
    };
    if (type && type !== 'all') {
      filter.type = type;
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Notification.countDocuments({
        $or: [{ resellerId: reseller._id }, { userId: user.id }],
        forAdmin: false,
        read: false,
      }),
    ]);

    return NextResponse.json({
      queues: {
        pendingOrders: pendingOrdersCount,
        pendingProducts: pendingProductsCount,
        lowStock: lowStockCount,
        walletBalance: reseller.walletBalance || 0,
        pendingBalance: reseller.pendingBalance || 0,
        totalQueueActions,
      },
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error('Error fetching reseller notifications:', error);
    return NextResponse.json(
      { message: 'Failed to fetch reseller notifications', error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!session || !user || user.role !== 'reseller') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const reseller = await Reseller.findOne({ userId: user.id }).select('_id').lean();
    if (!reseller) {
      return NextResponse.json({ message: 'Reseller not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { id, markAll } = body;

    const userFilter = {
      $or: [{ resellerId: reseller._id }, { userId: user.id }],
      forAdmin: false,
    };

    if (markAll) {
      await Notification.updateMany({ ...userFilter, read: false }, { $set: { read: true } });
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (id) {
      await Notification.updateOne({ _id: id, ...userFilter }, { $set: { read: true } });
      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    }

    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating reseller notification:', error);
    return NextResponse.json(
      { message: 'Failed to update notification', error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!session || !user || user.role !== 'reseller') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const reseller = await Reseller.findOne({ userId: user.id }).select('_id').lean();
    if (!reseller) {
      return NextResponse.json({ message: 'Reseller not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ message: 'Notification ID required' }, { status: 400 });
    }

    const userFilter = {
      _id: id,
      $or: [{ resellerId: reseller._id }, { userId: user.id }],
      forAdmin: false,
    };

    await Notification.deleteOne(userFilter);
    return NextResponse.json({ success: true, message: 'Notification deleted' });
  } catch (error: any) {
    console.error('Error deleting reseller notification:', error);
    return NextResponse.json(
      { message: 'Failed to delete notification', error: error.message },
      { status: 500 }
    );
  }
}

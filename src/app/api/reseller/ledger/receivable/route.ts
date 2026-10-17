import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Reseller from '@/models/Reseller';
import ResellerOrder from '@/models/ResellerOrder';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const reseller = await Reseller.findOne({ userId: session.user.id });
    if (!reseller) {
      return NextResponse.json({ message: 'Reseller profile not found' }, { status: 404 });
    }

    // Auto-sync: If any Delivered orders or orders with cleared commissions are still marked paymentStatus: Pending, mark them Paid
    await ResellerOrder.updateMany(
      {
        resellerId: reseller._id,
        paymentStatus: { $ne: 'Paid' },
        $or: [
          { status: 'Delivered' },
          { status: 'Paid' },
          { commissionStatus: 'cleared' }
        ],
        deletedAt: null
      },
      { $set: { paymentStatus: 'Paid' } }
    );

    // Pending In-transit customer orders (COD / In-transit receivables for this reseller)
    // Note: Once an order is Delivered, COD has been paid upon delivery.
    // Also, Mother Shop orders where commission has cleared are not pending customer receivables.
    const pendingOrders = await ResellerOrder.find({
      resellerId: reseller._id,
      paymentStatus: { $ne: 'Paid' },
      status: { $in: ['Order Placed', 'Confirmed', 'Processing', 'Ready for Delivery', 'Released for Delivery'] },
      commissionStatus: { $ne: 'cleared' },
      deletedAt: null
    })
      .select('shortId customer totalAmount status paymentMethod shippingAddress createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const totalReceivable = pendingOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return NextResponse.json({
      summary: {
        totalReceivable,
        pendingOrdersCount: pendingOrders.length,
      },
      orders: pendingOrders
    });
  } catch (error: any) {
    console.error('Fetch Reseller Receivable Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

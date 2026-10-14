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

    // Pending/Delivered Unpaid Orders (COD / In-transit receivables for this reseller)
    const pendingOrders = await ResellerOrder.find({
      resellerId: reseller._id,
      paymentStatus: { $ne: 'Paid' },
      status: { $in: ['Order Placed', 'Confirmed', 'Processing', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] },
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

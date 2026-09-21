import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Bill from '@/models/Bill';
import Order from '@/models/Order';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const [dueBills, allClientBills, pendingOrders] = await Promise.all([
      // 1. Unpaid Client Invoices / Credit Bills
      Bill.find({
        status: 'Due',
        documentType: { $ne: 'offer' }
      })
        .sort({ date: -1 })
        .lean(),

      // 2. All bills to aggregate client-wise statistics
      Bill.find({
        documentType: { $ne: 'offer' }
      })
        .sort({ date: -1 })
        .lean(),

      // 3. Pending/Delivered Unpaid Orders (COD / In-transit receivables)
      Order.find({
        paymentStatus: { $ne: 'Paid' },
        status: { $in: ['Order Placed', 'Confirmed', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] },
        deletedAt: null
      })
        .select('shortId customer totalAmount status paymentMethod shippingDetails shippingAddress createdAt')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean()
    ]);

    // Aggregate client-wise dues
    const clientMap = new Map<string, any>();
    for (const b of allClientBills) {
      const key = (b.clientPhone || b.clientName || 'unknown').trim();
      if (!clientMap.has(key)) {
        clientMap.set(key, {
          clientName: b.clientName,
          clientPhone: b.clientPhone,
          clientAddress: b.clientAddress,
          totalInvoices: 0,
          totalBilled: 0,
          totalCollected: 0,
          totalDue: 0,
          lastInvoiceDate: b.date
        });
      }
      const client = clientMap.get(key);
      client.totalInvoices += 1;
      client.totalBilled += b.gTotal || b.total || 0;
      client.totalCollected += b.cashIn || 0;
      client.totalDue += b.currentBillDue || 0;
      if (new Date(b.date) > new Date(client.lastInvoiceDate)) {
        client.lastInvoiceDate = b.date;
      }
    }

    const clientDues = Array.from(clientMap.values())
      .filter((c: any) => c.totalDue > 0)
      .sort((a: any, b: any) => b.totalDue - a.totalDue);

    // Calculate totals
    const totalClientBillsDue = dueBills.reduce((acc: number, curr: any) => acc + (curr.currentBillDue || 0), 0);
    const totalPendingOrdersReceivable = pendingOrders.reduce((acc: number, curr: any) => acc + (curr.totalAmount || 0), 0);
    const grandTotalReceivable = totalClientBillsDue + totalPendingOrdersReceivable;

    return NextResponse.json({
      clientPayables: {
        totalDue: totalClientBillsDue,
        dueBills,
        clientDues
      },
      orderReceivables: {
        totalPending: totalPendingOrdersReceivable,
        count: pendingOrders.length,
        orders: pendingOrders.map((o: any) => ({
          _id: o._id,
          shortId: o.shortId || (o._id ? o._id.toString().slice(-8).toUpperCase() : 'N/A'),
          customerName: o.shippingAddress?.fullName || 'Customer',
          customerPhone: o.shippingAddress?.phone || 'N/A',
          city: o.shippingAddress?.city || 'N/A',
          totalAmount: o.totalAmount || 0,
          status: o.status,
          paymentMethod: o.paymentMethod,
          courierName: o.shippingDetails?.courierName || 'Pending Courier',
          createdAt: o.createdAt
        }))
      },
      grandTotalReceivable
    });
  } catch (error) {
    console.error('Fetch Receivables Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

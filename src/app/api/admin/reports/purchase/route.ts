import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Bill from '@/models/Bill';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    await connectToDatabase();

    const matchQuery: any = {};
    if (from || to) {
      matchQuery.date = {};
      if (from) matchQuery.date.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        matchQuery.date.$lte = toDate;
      }
    }

    if (search) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      matchQuery.$or = [
        { invoiceNo: { $regex: escaped, $options: 'i' } },
        { clientName: { $regex: escaped, $options: 'i' } },
        { clientPhone: { $regex: escaped, $options: 'i' } }
      ];
    }

    const bills = await Bill.find(matchQuery)
      .sort({ date: -1 })
      .limit(100)
      .lean()
      .catch(() => []);

    const formattedBills = (bills || []).map((bill: any) => ({
      _id: bill._id,
      date: bill.date,
      invoiceNo: bill.invoiceNo,
      supplierName: bill.clientName,
      supplierPhone: bill.clientPhone,
      itemsCount: bill.items?.length || 0,
      totalAmount: bill.total || bill.gTotal || 0,
      paidAmount: bill.cashIn || 0,
      dueAmount: bill.currentBillDue || 0,
      status: bill.status || (bill.currentBillDue > 0 ? 'Due' : 'Paid')
    }));

    return NextResponse.json({ purchases: formattedBills });
  } catch (error) {
    console.error('Purchase Report API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

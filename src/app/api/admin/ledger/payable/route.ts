import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Supplier from '@/models/Supplier';
import SupplierBill from '@/models/SupplierBill';
import Reseller from '@/models/Reseller';
import ResellerOrder from '@/models/ResellerOrder';
import ResellerWalletTransaction from '@/models/ResellerWalletTransaction';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const [suppliers, dueSupplierBills, resellers, pendingPayouts] = await Promise.all([
      // 1. Suppliers with their total bills and balance
      Supplier.find({}).sort({ name: 1 }).lean(),

      // 2. Unpaid Supplier Bills
      SupplierBill.find({ status: 'Due' })
        .populate('supplier', 'name companyName phone')
        .sort({ date: -1 })
        .lean(),

      // 3. Resellers with their payable wallet balances
      Reseller.find({
        $or: [{ walletBalance: { $gt: 0 } }, { pendingBalance: { $gt: 0 } }]
      })
        .populate('userId', 'name email phone')
        .sort({ walletBalance: -1 })
        .lean(),

      // 4. Pending Reseller Payouts/Withdrawals
      ResellerWalletTransaction.find({ type: 'payout_released', status: 'pending' })
        .populate({
          path: 'resellerId',
          select: 'storeName subdomain userId',
          populate: { path: 'userId', select: 'name email phone' }
        })
        .sort({ createdAt: -1 })
        .lean()
    ]);

    // Calculate aggregated order count & lifetime earnings for resellers
    const resellerIds = resellers.map((r: any) => r._id);
    const [orderCounts, earningsData] = await Promise.all([
      ResellerOrder.aggregate([
        { $match: { resellerId: { $in: resellerIds }, deletedAt: null } },
        { $group: { _id: '$resellerId', count: { $sum: 1 } } }
      ]),
      ResellerWalletTransaction.aggregate([
        { $match: { resellerId: { $in: resellerIds }, type: 'commission_earned', status: { $in: ['cleared', 'completed'] } } },
        { $group: { _id: '$resellerId', totalEarned: { $sum: '$amount' } } }
      ])
    ]);

    const orderCountMap = new Map(orderCounts.map((o: any) => [o._id.toString(), o.count]));
    const earningsMap = new Map(earningsData.map((e: any) => [e._id.toString(), e.totalEarned]));

    // Calculate totals
    const totalSupplierDue = dueSupplierBills.reduce((acc: number, curr: any) => acc + (curr.dueAmount || 0), 0);
    const totalResellerWalletPayable = resellers.reduce((acc: number, curr: any) => acc + (curr.walletBalance || 0), 0);
    const totalResellerPendingCommission = resellers.reduce((acc: number, curr: any) => acc + (curr.pendingBalance || 0), 0);

    return NextResponse.json({
      supplierPayables: {
        totalDue: totalSupplierDue,
        suppliers,
        dueBills: dueSupplierBills
      },
      resellerPayables: {
        totalWalletPayable: totalResellerWalletPayable,
        totalPendingCommission: totalResellerPendingCommission,
        resellers: resellers.map((r: any) => ({
          _id: r._id,
          storeName: r.storeName,
          subdomain: r.subdomain,
          ownerName: r.userId?.name || 'Reseller',
          ownerPhone: r.userId?.phone || '',
          walletBalance: r.walletBalance || 0,
          pendingBalance: r.pendingBalance || 0,
          totalOrders: orderCountMap.get(r._id.toString()) ?? (r.totalOrders || 0),
          totalEarnings: earningsMap.get(r._id.toString()) || (r.totalEarnings || 0),
          commissionRate: r.commissionRate ?? 10,
          status: r.status
        })),
        pendingPayouts
      },
      grandTotalPayable: totalSupplierDue + totalResellerWalletPayable
    });
  } catch (error) {
    console.error('Fetch Payables Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

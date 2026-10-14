import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Reseller from '@/models/Reseller';
import ResellerWalletTransaction from '@/models/ResellerWalletTransaction';

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

    // Pending payouts and transactions requested by reseller
    const pendingPayouts = await ResellerWalletTransaction.find({
      resellerId: reseller._id,
      type: 'payout_released',
      status: 'pending'
    }).sort({ createdAt: -1 }).lean();

    const totalPendingPayouts = pendingPayouts.reduce((sum, p) => sum + Math.abs(p.amount || 0), 0);

    return NextResponse.json({
      summary: {
        totalPayable: totalPendingPayouts,
        pendingPayoutsCount: pendingPayouts.length,
        walletBalance: reseller.walletBalance || 0,
        pendingBalance: reseller.pendingBalance || 0
      },
      pendingPayouts
    });
  } catch (error: any) {
    console.error('Fetch Reseller Payable Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

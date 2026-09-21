import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import ResellerWalletTransaction from '@/models/ResellerWalletTransaction';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();

    const reseller = await Reseller.findOne({ userId: session.user.id });
    if (!reseller) return NextResponse.json({ error: 'Reseller not found' }, { status: 404 });

    const entries = await ResellerWalletTransaction.find({ resellerId: reseller._id })
      .sort({ createdAt: -1 }).limit(50).lean();

    const balance = {
      available: reseller.walletBalance || 0,
      pending: reseller.pendingBalance || 0,
      withdrawn: reseller.totalEarnings
        ? reseller.totalEarnings - reseller.walletBalance - reseller.pendingBalance
        : 0,
    };

    const mapped = entries.map(e => ({
      ...e,
      type: e.amount > 0 ? 'credit' : 'debit',
      reference: (e as any).orderId?.toString() || '',
    }));

    return NextResponse.json({ entries: mapped, balance });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

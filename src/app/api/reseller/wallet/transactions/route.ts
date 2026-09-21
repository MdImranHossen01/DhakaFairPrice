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
    if (!reseller) return NextResponse.json({ transactions: [] });

    // Auto-reconcile any Delivered/Paid orders that haven't been cleared yet
    const { reconcileResellerCommissions } = await import('@/lib/resellerCommissionSync');
    await reconcileResellerCommissions(reseller._id);

    const transactions = await ResellerWalletTransaction.find({ resellerId: reseller._id })
      .sort({ createdAt: -1 }).limit(50).lean();

    return NextResponse.json({ transactions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

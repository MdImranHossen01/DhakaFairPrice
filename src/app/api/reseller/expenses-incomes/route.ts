import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import ResellerWalletTransaction from '@/models/ResellerWalletTransaction';

async function getResellerId(userId: string) {
  await dbConnect();
  const reseller = await Reseller.findOne({ userId });
  return reseller?._id || null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const resellerId = await getResellerId(session.user.id);
    if (!resellerId) {
      return NextResponse.json({ error: 'Reseller account not found' }, { status: 404 });
    }

    const income = await ResellerWalletTransaction.aggregate([
      { $match: { resellerId, amount: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const expenses = await ResellerWalletTransaction.aggregate([
      { $match: { resellerId, amount: { $lt: 0 } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const totalIncome = income[0]?.total || 0;
    const totalExpenses = Math.abs(expenses[0]?.total || 0);

    const entries = await ResellerWalletTransaction.find({ resellerId })
      .sort({ createdAt: -1 }).limit(50).lean();

    const mapped = entries.map(e => ({
      ...e,
      type: e.amount > 0 ? 'income' : 'expense',
      date: e.createdAt,
    }));

    return NextResponse.json({
      entries: mapped,
      summary: { totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import ResellerWalletTransaction from '@/models/ResellerWalletTransaction';
import Reseller from '@/models/Reseller';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const resellerId = searchParams.get('resellerId');
    const search = searchParams.get('search') || '';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    await connectToDatabase();

    const matchQuery: any = {};
    if (resellerId && resellerId !== 'all') {
      const mongoose = (await import('mongoose')).default;
      if (mongoose.Types.ObjectId.isValid(resellerId)) {
        matchQuery.resellerId = resellerId;
      }
    }

    if (from || to) {
      matchQuery.createdAt = {};
      if (from) matchQuery.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = toDate;
      }
    }

    if (search) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Search by description or payoutReference
      matchQuery.$or = [
        { description: { $regex: escaped, $options: 'i' } },
        { payoutReference: { $regex: escaped, $options: 'i' } },
        { payoutMethod: { $regex: escaped, $options: 'i' } }
      ];
    }

    const [transactions, resellersList] = await Promise.all([
      ResellerWalletTransaction.find(matchQuery)
        .sort({ createdAt: -1 })
        .limit(200)
        .populate({
          path: 'resellerId',
          select: 'storeName subdomain userId walletBalance',
          populate: { path: 'userId', select: 'name email phone' }
        })
        .lean(),
      Reseller.find({}).select('storeName subdomain').lean()
    ]);

    const formattedTx = (transactions || []).map((tx: any) => {
      const isCredit = ['commission_earned', 'refund'].includes(tx.type) || (!['payout_released', 'order_cancelled'].includes(tx.type) && tx.amount > 0);
      const absAmount = Math.abs(tx.amount || 0);

      return {
        _id: tx._id,
        date: tx.createdAt,
        resellerName: tx.resellerId?.userId?.name || 'Reseller',
        storeName: tx.resellerId?.storeName || 'Store',
        subdomain: tx.resellerId?.subdomain || '',
        rawType: tx.type,
        type: isCredit ? 'credit' : 'debit',
        amount: absAmount,
        payoutMethod: tx.payoutMethod || '',
        payoutReference: tx.payoutReference || '',
        currentWallet: tx.resellerId?.walletBalance || 0,
        description: tx.description || (isCredit ? 'Commission credit' : 'Payout withdrawal'),
        status: tx.status || 'cleared'
      };
    });

    return NextResponse.json({ 
      transactions: formattedTx,
      resellers: resellersList
    });
  } catch (error) {
    console.error('Reseller Commission API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

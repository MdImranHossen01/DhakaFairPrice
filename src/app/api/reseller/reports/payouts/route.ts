import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizedReseller } from '@/lib/resellerReportsHelper';
import ResellerWalletTransaction from '@/models/ResellerWalletTransaction';

export async function GET(req: NextRequest) {
  try {
    const { error, status, reseller } = await getAuthorizedReseller();
    if (error || !reseller) {
      return NextResponse.json({ message: error || 'Unauthorized' }, { status: status || 401 });
    }

    const { searchParams } = new URL(req.url);
    const parsedPage = parseInt(searchParams.get('page') || '1', 10);
    const parsedLimit = parseInt(searchParams.get('limit') || '25', 10);
    const page = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const limit = isNaN(parsedLimit) || parsedLimit < 1 ? 25 : Math.min(100, parsedLimit);
    const type = searchParams.get('type');
    const statusParam = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const matchQuery: any = { resellerId: reseller._id };

    if (type && type !== 'all') matchQuery.type = type;
    if (statusParam && statusParam !== 'all') matchQuery.status = statusParam;

    if (from || to) {
      matchQuery.createdAt = {};
      if (from) matchQuery.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = toDate;
      }
    }

    const [totalCount, transactions, summaryAgg] = await Promise.all([
      ResellerWalletTransaction.countDocuments(matchQuery),
      ResellerWalletTransaction.find(matchQuery)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('orderId', 'shortId totalAmount status')
        .lean(),
      ResellerWalletTransaction.aggregate([
        { $match: { resellerId: reseller._id } },
        {
          $group: {
            _id: '$type',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    let totalCommissionEarned = 0;
    let totalPayoutReleased = 0;
    let totalAdjustments = 0;

    summaryAgg.forEach((item: any) => {
      if (item._id === 'commission_earned') totalCommissionEarned = item.totalAmount;
      else if (item._id === 'payout_released') totalPayoutReleased = Math.abs(item.totalAmount);
      else if (item._id === 'adjustment' || item._id === 'order_cancelled') totalAdjustments += item.totalAmount;
    });

    return NextResponse.json({
      transactions,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
      currentPage: page,
      walletInfo: {
        currentBalance: reseller.walletBalance || 0,
        pendingBalance: reseller.pendingBalance || 0,
        totalWithdrawn: totalPayoutReleased,
        totalEarned: totalCommissionEarned
      },
      summary: {
        totalCommissionEarned,
        totalPayoutReleased,
        totalAdjustments
      }
    });
  } catch (error: any) {
    console.error('Failed to get reseller payouts report:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

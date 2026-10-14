import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizedReseller } from '@/lib/resellerReportsHelper';
import Expense from '@/models/Expense';

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req: NextRequest) {
  try {
    const { error, status, reseller } = await getAuthorizedReseller();
    if (error || !reseller) {
      return NextResponse.json({ message: error || 'Unauthorized' }, { status: status || 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const search = searchParams.get('search') || '';

    const matchQuery: any = {
      resellerId: reseller._id,
      type: { $ne: 'income' }
    };

    if (category && category !== 'all') {
      matchQuery.category = category;
    }

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
      const escaped = escapeRegex(search.trim());
      matchQuery.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } }
      ];
    }

    const [expenses, totalAggregation, categoryAggregation, totalCount] = await Promise.all([
      Expense.find(matchQuery)
        .sort({ date: -1 })
        .limit(100)
        .lean(),
      Expense.aggregate([
        { $match: matchQuery },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]),
      Expense.countDocuments(matchQuery)
    ]);

    const totalExpenseAmount = totalAggregation[0]?.total || 0;

    return NextResponse.json({
      expenses,
      totalCount,
      totalExpenseAmount,
      categoryBreakdown: categoryAggregation
    });
  } catch (error: any) {
    console.error('Failed to get reseller expense report:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

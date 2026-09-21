import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Expense from '@/models/Expense';

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const search = searchParams.get('search') || '';

    await connectToDatabase();

    const matchQuery: any = { type: { $ne: 'income' } };
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

    const [expenses, totalAggregation, totalCount] = await Promise.all([
      Expense.find(matchQuery)
        .sort({ date: -1 })
        .limit(100)
        .lean(),
      Expense.aggregate([
        { $match: matchQuery },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Expense.countDocuments(matchQuery)
    ]);

    const totalExpenseAmount = totalAggregation[0]?.total || 0;

    return NextResponse.json({
      expenses,
      totalExpenseAmount,
      totalCount
    });
  } catch (error) {
    console.error('Expense Report API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

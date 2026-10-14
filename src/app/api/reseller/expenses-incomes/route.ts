import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Reseller from '@/models/Reseller';
import Expense from '@/models/Expense';
import LedgerAccount from '@/models/LedgerAccount';
import LedgerTransaction from '@/models/LedgerTransaction';

async function getReseller(userId: string) {
  await connectToDatabase();
  return await Reseller.findOne({ userId });
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const reseller = await getReseller(session.user.id);
    if (!reseller) {
      return NextResponse.json({ message: 'Reseller profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const search = searchParams.get('search');

    const query: any = { resellerId: reseller._id };

    if (category && category !== 'all') query.category = category;
    if (type && type !== 'all') query.type = type;

    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { category: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    if (from || to) {
      const dateQuery: any = {};
      if (from) {
        const fromTimestamp = Date.parse(from);
        if (!isNaN(fromTimestamp)) {
          dateQuery.$gte = new Date(fromTimestamp);
        }
      }
      if (to) {
        const toTimestamp = Date.parse(to);
        if (!isNaN(toTimestamp)) {
          const toDateObj = new Date(toTimestamp);
          const endOfDayTimestamp = new Date(toDateObj.getFullYear(), toDateObj.getMonth(), toDateObj.getDate(), 23, 59, 59, 999).getTime();
          dateQuery.$lte = new Date(endOfDayTimestamp);
        }
      }
      if (dateQuery.$gte || dateQuery.$lte) {
        query.date = dateQuery;
      }
    }

    const [entries, incomeAgg, expenseAgg] = await Promise.all([
      Expense.find(query)
        .sort({ date: -1, createdAt: -1 })
        .populate('paymentAccountId', 'name code category currentBalance')
        .lean(),
      Expense.aggregate([
        { $match: { resellerId: reseller._id, type: 'income' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        { $match: { resellerId: reseller._id, type: 'expense' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const totalIncome = incomeAgg[0]?.total || 0;
    const totalExpenses = expenseAgg[0]?.total || 0;

    return NextResponse.json({
      entries,
      summary: {
        totalIncome,
        totalExpenses,
        netProfit: totalIncome - totalExpenses,
      },
    });
  } catch (error: any) {
    console.error('Error fetching reseller transactions:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let dbSession: mongoose.ClientSession | null = null;
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const reseller = await getReseller(session.user.id);
    if (!reseller) {
      return NextResponse.json({ message: 'Reseller profile not found' }, { status: 404 });
    }

    const body = await req.json();
    const { title, amount, category, date, description, type, paymentAccountId } = body;

    const numAmount = Number(amount);
    if (!title || !numAmount || numAmount <= 0 || !category || !type) {
      return NextResponse.json({ message: 'Missing or invalid required fields' }, { status: 400 });
    }

    if (!['expense', 'income'].includes(type)) {
      return NextResponse.json({ message: 'Invalid transaction type' }, { status: 400 });
    }

    await connectToDatabase();

    dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    let account = null;
    if (paymentAccountId) {
      if (!mongoose.Types.ObjectId.isValid(paymentAccountId)) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: 'Invalid payment account ID' }, { status: 400 });
      }

      account = await LedgerAccount.findOne({
        _id: paymentAccountId,
        resellerId: reseller._id,
      }).session(dbSession);

      if (!account) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: 'Selected payment account not found in your store' }, { status: 404 });
      }
    }

    const txDate = date ? new Date(date) : new Date();

    const [expense] = await Expense.create(
      [
        {
          title: title.trim(),
          amount: numAmount,
          category,
          type,
          paymentAccountId: paymentAccountId || undefined,
          resellerId: reseller._id,
          date: txDate,
          description: description?.trim() || undefined,
        },
      ],
      { session: dbSession }
    );

    // If an account is selected, atomically update balance and record LedgerTransaction
    if (account) {
      const incAmount = type === 'expense' ? -numAmount : numAmount;
      const updatedAccount = await LedgerAccount.findOneAndUpdate(
        { _id: account._id, resellerId: reseller._id },
        { $inc: { currentBalance: incAmount } },
        { new: true, session: dbSession }
      );

      await LedgerTransaction.create(
        [
          {
            account: account._id,
            resellerId: reseller._id,
            date: txDate,
            description: `${type === 'expense' ? 'Expense' : 'Income'}: ${title} (${category})`,
            type: type === 'expense' ? 'debit' : 'credit',
            amount: numAmount,
            reference: expense._id.toString(),
            balanceAfter: updatedAccount?.currentBalance ?? (account.currentBalance + incAmount),
          },
        ],
        { session: dbSession }
      );
    }

    await dbSession.commitTransaction();
    dbSession.endSession();
    dbSession = null;

    return NextResponse.json(expense, { status: 201 });
  } catch (error: any) {
    if (dbSession) {
      try {
        await dbSession.abortTransaction();
        dbSession.endSession();
      } catch (abortErr) {
        console.error('Error aborting reseller expense session:', abortErr);
      }
    }
    console.error('Error creating reseller transaction:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

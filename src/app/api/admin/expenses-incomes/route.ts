import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Expense from '@/models/Expense';
import LedgerAccount from '@/models/LedgerAccount';
import LedgerTransaction from '@/models/LedgerTransaction';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager', 'moderator'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const query: any = {};
    if (category && category !== 'all') query.category = category;
    if (type && type !== 'all') query.type = type;
    
    if (from || to) {
      const dateQuery: any = {};

      if (from) {
        const fromTimestamp = Date.parse(from);
        if (isNaN(fromTimestamp)) {
          return NextResponse.json({ message: 'Invalid "from" date format' }, { status: 400 });
        }
        dateQuery.$gte = new Date(fromTimestamp);
      }

      if (to) {
        const toTimestamp = Date.parse(to);
        if (isNaN(toTimestamp)) {
          return NextResponse.json({ message: 'Invalid "to" date format' }, { status: 400 });
        }
        const toDateObj = new Date(toTimestamp);
        const endOfDayTimestamp = new Date(toDateObj.getFullYear(), toDateObj.getMonth(), toDateObj.getDate(), 23, 59, 59, 999).getTime();
        dateQuery.$lte = new Date(endOfDayTimestamp);
      }

      query.date = dateQuery;
    }

    const expenses = await Expense.find(query)
      .sort({ date: -1 })
      .populate('paymentAccountId', 'name code category currentBalance')
      .lean();

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let dbSession: mongoose.ClientSession | null = null;
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager', 'moderator'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, amount, category, date, description, type, paymentAccountId } = body;

    const numAmount = Number(amount);
    if (!title || !numAmount || numAmount <= 0 || !category || !type) {
      return NextResponse.json({ message: 'Missing or invalid required fields' }, { status: 400 });
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

      account = await LedgerAccount.findById(paymentAccountId).session(dbSession);
      if (!account) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: 'Selected payment account not found' }, { status: 404 });
      }
    }

    const txDate = date ? new Date(date) : new Date();

    const [expense] = await Expense.create(
      [
        {
          title,
          amount: numAmount,
          category,
          type,
          paymentAccountId: paymentAccountId || undefined,
          date: txDate,
          description
        }
      ],
      { session: dbSession }
    );

    // If an account is selected, atomically update balance using $inc and record LedgerTransaction
    if (account) {
      const incAmount = type === 'expense' ? -numAmount : numAmount;
      const updatedAccount = await LedgerAccount.findByIdAndUpdate(
        account._id,
        { $inc: { currentBalance: incAmount } },
        { new: true, session: dbSession }
      );

      await LedgerTransaction.create(
        [
          {
            account: account._id,
            date: txDate,
            description: `${type === 'expense' ? 'Expense' : 'Income'}: ${title} (${category})`,
            type: type === 'expense' ? 'debit' : 'credit',
            amount: numAmount,
            balanceAfter: updatedAccount?.currentBalance ?? (account.currentBalance + incAmount)
          }
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
        console.error('Error aborting expense session:', abortErr);
      }
    }
    console.error('Error creating transaction:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

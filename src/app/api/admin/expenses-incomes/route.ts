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

    const query: any = {
      $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
    };
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

      account = await LedgerAccount.findOne({
        _id: paymentAccountId,
        $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
      }).session(dbSession);
      if (!account) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: 'Selected payment account not found' }, { status: 404 });
      }
    }

    if (type === 'expense') {
      if (!account) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: 'A payment account is required for recording expenses' }, { status: 400 });
      }
      if ((account.currentBalance || 0) <= 0) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ 
          message: `Cannot record expense from ${account.name} because its balance is zero or negative (৳${Math.round(account.currentBalance || 0).toLocaleString()}).` 
        }, { status: 400 });
      }
      if (numAmount > (account.currentBalance || 0)) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ 
          message: `Insufficient balance in ${account.name}. Available balance is ৳${Math.round(account.currentBalance || 0).toLocaleString()}` 
        }, { status: 400 });
      }
    }

    let txDate = new Date();
    if (date) {
      const parsed = new Date(date);
      const now = new Date();
      if (parsed.toDateString() === now.toDateString()) {
        txDate = now;
      } else {
        txDate = parsed;
      }
    }

    const [expense] = await Expense.create(
      [
        {
          title,
          amount: numAmount,
          category,
          type,
          paymentAccountId: paymentAccountId || undefined,
          resellerId: null,
          date: txDate,
          description
        }
      ],
      { session: dbSession }
    );

    // If an account is selected, atomically update balance using $inc and record LedgerTransaction
    if (account) {
      const incAmount = type === 'expense' ? -numAmount : numAmount;
      const filter: any = { _id: account._id };
      if (type === 'expense') {
        filter.currentBalance = { $gte: numAmount };
      }

      const updatedAccount = await LedgerAccount.findOneAndUpdate(
        filter,
        { $inc: { currentBalance: incAmount } },
        { new: true, session: dbSession }
      );

      if (!updatedAccount && type === 'expense') {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ 
          message: `Insufficient balance in ${account.name}. The transaction could not be completed.` 
        }, { status: 400 });
      }

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

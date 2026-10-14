import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Reseller from '@/models/Reseller';
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

    await connectToDatabase();

    const transactions = await LedgerTransaction.find({ resellerId: reseller._id })
      .populate('account')
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('Error fetching reseller ledger transactions:', error);
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
    const {
      entryType, // 'deposit' | 'withdrawal' | 'transfer'
      accountId,
      fromAccountId,
      toAccountId,
      amount,
      description,
      date,
    } = body;

    const numAmount = Number(amount);
    if (!entryType || !numAmount || numAmount <= 0 || !description) {
      return NextResponse.json({ message: 'Invalid or missing fields' }, { status: 400 });
    }

    await connectToDatabase();

    const txDate = date ? new Date(date) : new Date();

    dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    if (entryType === 'deposit' || entryType === 'withdrawal') {
      const targetAccId = accountId || fromAccountId;
      if (!targetAccId || !mongoose.Types.ObjectId.isValid(targetAccId)) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: 'Invalid account ID' }, { status: 400 });
      }

      const account = await LedgerAccount.findOne({ _id: targetAccId, resellerId: reseller._id }).session(dbSession);
      if (!account) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: 'Account not found in your store' }, { status: 404 });
      }

      const isDeposit = entryType === 'deposit';
      const incAmount = isDeposit ? numAmount : -numAmount;

      if (!isDeposit && (account.currentBalance || 0) < numAmount) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: `Insufficient balance in ${account.name}. Available: ৳${account.currentBalance}` }, { status: 400 });
      }

      const updatedAccount = await LedgerAccount.findOneAndUpdate(
        { _id: account._id, resellerId: reseller._id },
        { $inc: { currentBalance: incAmount } },
        { new: true, session: dbSession }
      );

      const [transaction] = await LedgerTransaction.create(
        [
          {
            account: account._id,
            resellerId: reseller._id,
            date: txDate,
            description: description.trim(),
            type: isDeposit ? 'credit' : 'debit',
            amount: numAmount,
            balanceAfter: updatedAccount?.currentBalance ?? (account.currentBalance + incAmount),
          },
        ],
        { session: dbSession }
      );

      await dbSession.commitTransaction();
      dbSession.endSession();
      dbSession = null;

      return NextResponse.json(transaction, { status: 201 });
    }

    if (entryType === 'transfer') {
      if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: 'Select valid and distinct from and to accounts' }, { status: 400 });
      }

      const [fromAcc, toAcc] = await Promise.all([
        LedgerAccount.findOne({ _id: fromAccountId, resellerId: reseller._id }).session(dbSession),
        LedgerAccount.findOne({ _id: toAccountId, resellerId: reseller._id }).session(dbSession),
      ]);

      if (!fromAcc || !toAcc) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: 'One or both accounts not found in your store' }, { status: 404 });
      }

      const updatedFrom = await LedgerAccount.findOneAndUpdate(
        { _id: fromAccountId, currentBalance: { $gte: numAmount }, resellerId: reseller._id },
        { $inc: { currentBalance: -numAmount } },
        { new: true, session: dbSession }
      );

      if (!updatedFrom) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: `Insufficient balance in ${fromAcc.name}` }, { status: 400 });
      }

      const updatedTo = await LedgerAccount.findOneAndUpdate(
        { _id: toAccountId, resellerId: reseller._id },
        { $inc: { currentBalance: numAmount } },
        { new: true, session: dbSession }
      );

      await Promise.all([
        LedgerTransaction.create(
          [
            {
              account: fromAcc._id,
              resellerId: reseller._id,
              date: txDate,
              description: `Transfer to ${toAcc.name} (${description})`,
              type: 'debit',
              amount: numAmount,
              balanceAfter: updatedFrom?.currentBalance ?? (fromAcc.currentBalance - numAmount),
            },
          ],
          { session: dbSession }
        ),
        LedgerTransaction.create(
          [
            {
              account: toAcc._id,
              resellerId: reseller._id,
              date: txDate,
              description: `Transfer from ${fromAcc.name} (${description})`,
              type: 'credit',
              amount: numAmount,
              balanceAfter: updatedTo?.currentBalance ?? (toAcc.currentBalance + numAmount),
            },
          ],
          { session: dbSession }
        ),
      ]);

      await dbSession.commitTransaction();
      dbSession.endSession();
      dbSession = null;

      return NextResponse.json({ message: 'Transfer recorded successfully' }, { status: 201 });
    }

    await dbSession.abortTransaction();
    dbSession.endSession();
    return NextResponse.json({ message: 'Invalid entry type' }, { status: 400 });
  } catch (error: any) {
    if (dbSession) {
      try {
        await dbSession.abortTransaction();
        dbSession.endSession();
      } catch (abortErr) {
        console.error('Abort session error:', abortErr);
      }
    }
    console.error('Reseller ledger transaction error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

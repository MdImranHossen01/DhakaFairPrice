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

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');

    const resellerAccounts = await LedgerAccount.find({ resellerId: reseller._id }).select('_id').lean();
    const accountIds = resellerAccounts.map((a: any) => a._id);

    const queryFilter: any = {
      $or: [
        { resellerId: reseller._id },
        { account: { $in: accountIds } }
      ]
    };

    if (accountId && mongoose.Types.ObjectId.isValid(accountId)) {
      queryFilter.account = new mongoose.Types.ObjectId(accountId);
    }

    const transactions = await LedgerTransaction.find(queryFilter)
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

      const updateFilter: any = { _id: account._id, resellerId: reseller._id };
      if (!isDeposit) {
        updateFilter.currentBalance = { $gte: numAmount };
      }

      const updatedAccount = await LedgerAccount.findOneAndUpdate(
        updateFilter,
        { $inc: { currentBalance: incAmount } },
        { new: true, session: dbSession }
      );

      if (!updatedAccount) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: `Insufficient balance or account unavailable in ${account.name}` }, { status: 400 });
      }

      const [transaction] = await LedgerTransaction.create(
        [
          {
            account: account._id,
            resellerId: reseller._id,
            date: txDate,
            description: description.trim(),
            type: isDeposit ? 'credit' : 'debit',
            amount: numAmount,
            balanceAfter: updatedAccount.currentBalance,
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

      const isTransferable = (acc: any) => {
        const name = (acc.name || '').toLowerCase();
        const code = (acc.code || '').toLowerCase();
        if (name.includes('receivable') || code.includes('receivable') || name.includes('প্রাপ্য')) return false;
        if (name.includes('payable') || code.includes('payable') || name.includes('প্রদেয়')) return false;
        return true;
      };

      if (!isTransferable(fromAcc) || !isTransferable(toAcc)) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({
          message: 'Accounts Payable and Accounts Receivable cannot be used for fund transfers. Transfers are only permitted between liquid accounts (Cash, Bank, MFS).'
        }, { status: 400 });
      }

      if ((fromAcc.currentBalance || 0) <= 0) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({
          message: `Cannot transfer from ${fromAcc.name} because its balance is zero or negative (Available: ৳${fromAcc.currentBalance || 0}).`
        }, { status: 400 });
      }

      const updatedFrom = await LedgerAccount.findOneAndUpdate(
        { _id: fromAccountId, currentBalance: { $gte: numAmount }, resellerId: reseller._id },
        { $inc: { currentBalance: -numAmount } },
        { new: true, session: dbSession }
      );

      if (!updatedFrom) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json({ message: `Insufficient balance in ${fromAcc.name}. Available: ৳${fromAcc.currentBalance}` }, { status: 400 });
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

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Reseller from '@/models/Reseller';
import LedgerAccount from '@/models/LedgerAccount';
import LedgerTransaction from '@/models/LedgerTransaction';
import { isTransferableAccount } from '@/lib/utils';

async function getReseller(userId: string) {
  await connectToDatabase();
  return await Reseller.findOne({ userId });
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
    const { fromAccountId, toAccountId, amount, note, date } = body;

    const transferAmount = Number(amount);
    if (!fromAccountId || !toAccountId || !transferAmount || transferAmount <= 0) {
      return NextResponse.json({ message: 'Valid source, destination, and amount are required' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(fromAccountId) || !mongoose.Types.ObjectId.isValid(toAccountId)) {
      return NextResponse.json({ message: 'Invalid source or destination account ID' }, { status: 400 });
    }

    if (fromAccountId === toAccountId) {
      return NextResponse.json({ message: 'Source and destination accounts cannot be the same' }, { status: 400 });
    }

    let txDate = new Date();
    if (date) {
      const parsedDate = Date.parse(date);
      if (!isNaN(parsedDate)) {
        txDate = new Date(parsedDate);
      }
    }

    await connectToDatabase();

    dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    const [fromAccount, toAccount] = await Promise.all([
      LedgerAccount.findOne({ _id: fromAccountId, resellerId: reseller._id }).session(dbSession),
      LedgerAccount.findOne({ _id: toAccountId, resellerId: reseller._id }).session(dbSession)
    ]);

    if (!fromAccount || !toAccount) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      dbSession = null;
      return NextResponse.json({ message: 'One or both accounts not found in your store' }, { status: 404 });
    }

    if (!isTransferableAccount(fromAccount) || !isTransferableAccount(toAccount)) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      dbSession = null;
      return NextResponse.json({
        message: 'Accounts Payable and Accounts Receivable cannot be used for fund transfers. Transfers are only permitted between liquid accounts (Cash, Bank, MFS).'
      }, { status: 400 });
    }

    if ((fromAccount.currentBalance || 0) <= 0) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      dbSession = null;
      return NextResponse.json(
        { message: `Cannot transfer from ${fromAccount.name} because its balance is zero or negative (Available: ৳${fromAccount.currentBalance || 0}).` },
        { status: 400 }
      );
    }

    // Atomically decrement source with sufficiency filter within session
    const updatedFrom = await LedgerAccount.findOneAndUpdate(
      { _id: fromAccountId, currentBalance: { $gte: transferAmount }, resellerId: reseller._id },
      { $inc: { currentBalance: -transferAmount } },
      { new: true, session: dbSession }
    );

    if (!updatedFrom) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      dbSession = null;
      return NextResponse.json(
        { message: `Insufficient balance in ${fromAccount.name}. Available: ৳${fromAccount.currentBalance}` },
        { status: 400 }
      );
    }

    // Atomically increment destination within session
    const updatedTo = await LedgerAccount.findOneAndUpdate(
      { _id: toAccountId, resellerId: reseller._id },
      { $inc: { currentBalance: transferAmount } },
      { new: true, session: dbSession }
    );

    if (!updatedTo) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      dbSession = null;
      return NextResponse.json({ message: 'Destination account not found' }, { status: 404 });
    }

    await Promise.all([
      // Debit source account
      LedgerTransaction.create(
        [
          {
            account: fromAccount._id,
            resellerId: reseller._id,
            date: txDate,
            description: `Transfer to ${toAccount.name}${note ? ` (${note})` : ''}`,
            type: 'debit',
            amount: transferAmount,
            balanceAfter: updatedFrom?.currentBalance ?? (fromAccount.currentBalance - transferAmount)
          }
        ],
        { session: dbSession }
      ),
      // Credit destination account
      LedgerTransaction.create(
        [
          {
            account: toAccount._id,
            resellerId: reseller._id,
            date: txDate,
            description: `Transfer from ${fromAccount.name}${note ? ` (${note})` : ''}`,
            type: 'credit',
            amount: transferAmount,
            balanceAfter: updatedTo?.currentBalance ?? (toAccount.currentBalance + transferAmount)
          }
        ],
        { session: dbSession }
      )
    ]);

    await dbSession.commitTransaction();
    dbSession.endSession();
    dbSession = null;

    return NextResponse.json({ message: 'Transfer completed successfully' });
  } catch (error: any) {
    if (dbSession) {
      try {
        await dbSession.abortTransaction();
        dbSession.endSession();
      } catch (abortErr) {
        console.error('Abort transfer session error:', abortErr);
      }
    }
    console.error('Reseller transfer error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

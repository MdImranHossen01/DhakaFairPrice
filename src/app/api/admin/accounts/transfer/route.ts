import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import LedgerAccount from '@/models/LedgerAccount';
import LedgerTransaction from '@/models/LedgerTransaction';

export async function POST(req: NextRequest) {
  let dbSession: mongoose.ClientSession | null = null;
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin', 'manager', 'moderator'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
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
      if (isNaN(parsedDate)) {
        return NextResponse.json({ message: 'Invalid transfer date format' }, { status: 400 });
      }
      txDate = new Date(parsedDate);
    }

    await connectToDatabase();

    dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    const [fromAccount, toAccount] = await Promise.all([
      LedgerAccount.findById(fromAccountId).session(dbSession),
      LedgerAccount.findById(toAccountId).session(dbSession)
    ]);

    if (!fromAccount || !toAccount) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      dbSession = null;
      return NextResponse.json({ message: 'One or both accounts not found' }, { status: 404 });
    }

    // Atomically decrement source with sufficiency filter within session
    const updatedFrom = await LedgerAccount.findOneAndUpdate(
      { _id: fromAccountId, currentBalance: { $gte: transferAmount } },
      { $inc: { currentBalance: -transferAmount } },
      { new: true, session: dbSession }
    );

    if (!updatedFrom) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      dbSession = null;
      return NextResponse.json(
        { message: `Insufficient balance or account unavailable in ${fromAccount.name}. Available: ৳${fromAccount.currentBalance}` },
        { status: 400 }
      );
    }

    // Atomically increment destination within session
    const updatedTo = await LedgerAccount.findByIdAndUpdate(
      toAccountId,
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

    return NextResponse.json({
      message: `Successfully transferred ৳${transferAmount} from ${fromAccount.name} to ${toAccount.name}`
    });
  } catch (error: any) {
    if (dbSession) {
      try {
        await dbSession.abortTransaction();
        dbSession.endSession();
      } catch (abortErr) {
        console.error('Error aborting transfer session:', abortErr);
      }
    }
    console.error('Transfer Fund Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

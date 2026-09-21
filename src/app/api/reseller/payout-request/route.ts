import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import ResellerWalletTransaction from '@/models/ResellerWalletTransaction';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { resellerId, method, number, amount } = body;

    if (!resellerId || !method || !number || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    await dbConnect();

    // Verify reseller belongs to current user
    const reseller = await Reseller.findOne({ _id: resellerId, userId: (session.user as any).id });
    if (!reseller) {
      return NextResponse.json({ error: 'Reseller profile not found or forbidden' }, { status: 403 });
    }

    if (reseller.walletBalance < amount) {
      return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 });
    }

    const mongoose = (await import('mongoose')).default;
    const sessionConn = await mongoose.startSession();
    sessionConn.startTransaction();

    try {
      // Deduct from walletBalance immediately to prevent double spending / race condition
      const updatedReseller = await Reseller.findOneAndUpdate(
        { _id: resellerId, walletBalance: { $gte: amount } },
        { $inc: { walletBalance: -amount } },
        { new: true, session: sessionConn }
      );

      if (!updatedReseller) {
        await sessionConn.abortTransaction();
        sessionConn.endSession();
        return NextResponse.json({ error: 'Wallet balance mismatch or concurrency issue' }, { status: 400 });
      }

      // Record transaction
      const [transaction] = await ResellerWalletTransaction.create([{
        resellerId: reseller._id,
        type: 'payout_released', // Represents money going out of wallet (pending release approval)
        amount: -amount, // Debit
        description: `Payout request to ${method} (${number})`,
        status: 'pending',
        payoutMethod: method,
        payoutReference: number, // account number
      }], { session: sessionConn });

      await sessionConn.commitTransaction();
      sessionConn.endSession();

      return NextResponse.json({
        success: true,
        message: 'Payout request submitted successfully',
        transactionId: transaction._id,
      });
    } catch (txnError) {
      await sessionConn.abortTransaction();
      sessionConn.endSession();
      throw txnError;
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

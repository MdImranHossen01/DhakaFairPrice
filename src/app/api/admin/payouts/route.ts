import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import ResellerWalletTransaction from '@/models/ResellerWalletTransaction';
import Reseller from '@/models/Reseller';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !['admin', 'super_admin'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  // Fetch all payout transactions
  const payouts = await ResellerWalletTransaction.find({ type: 'payout_released' })
    .populate({
      path: 'resellerId',
      select: 'storeName contact',
      populate: { path: 'userId', select: 'name email' }
    })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ payouts });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !['admin', 'super_admin'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { transactionId, action, payoutReference } = body;

    if (!transactionId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    await dbConnect();

    const sessionConn = await mongoose.startSession();
    sessionConn.startTransaction();

    try {
      // Atomic conditional status transition targeting pending state
      const transaction = await ResellerWalletTransaction.findOneAndUpdate(
        { _id: transactionId, status: 'pending' },
        {
          $set: {
            status: action === 'approve' ? 'cleared' : 'failed',
            payoutReference: action === 'approve' ? (payoutReference || 'ADMIN_MANUAL_PAYOUT') : undefined,
            processedBy: (session.user as any).id
          }
        },
        { session: sessionConn, new: false } // return the original document to read amount
      );

      if (!transaction) {
        await sessionConn.abortTransaction();
        sessionConn.endSession();
        return NextResponse.json({ error: 'Transaction not found or already processed' }, { status: 404 });
      }

      if (action === 'approve') {
        // Update reseller total lifetime earnings
        await Reseller.findByIdAndUpdate(
          transaction.resellerId,
          { $inc: { totalEarnings: Math.abs(transaction.amount) } },
          { session: sessionConn }
        );
      } else if (action === 'reject') {
        const refundAmount = Math.abs(transaction.amount);
        // Refund the money back to the reseller's wallet balance
        await Reseller.findByIdAndUpdate(
          transaction.resellerId,
          { $inc: { walletBalance: refundAmount } },
          { session: sessionConn }
        );

        // Record a positive-amount refund ledger entry
        await ResellerWalletTransaction.create(
          [{
            resellerId: transaction.resellerId,
            type: 'refund',
            amount: refundAmount,
            description: `Refund for rejected payout: ${transaction.description}`,
            status: 'cleared',
            payoutMethod: transaction.payoutMethod,
            payoutReference: transaction.payoutReference,
          }],
          { session: sessionConn }
        );
      }

      await sessionConn.commitTransaction();
      sessionConn.endSession();

      if (action === 'approve') {
        try {
          const { logPayoutToLedger } = await import('@/lib/ledgerHelper');
          const reseller = await Reseller.findById(transaction.resellerId);
          await logPayoutToLedger(
            { ...transaction.toObject(), payoutReference: payoutReference || transaction.payoutReference },
            reseller
          );
        } catch (ledgerErr) {
          console.error('[Ledger] Error logging payout to ledger:', ledgerErr);
        }
      }

      return NextResponse.json({ success: true, message: 'Payout updated successfully' });
    } catch (innerError) {
      await sessionConn.abortTransaction();
      sessionConn.endSession();
      throw innerError;
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

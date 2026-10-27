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
    const { transactionId, action, payoutReference, fromAccountId } = body;

    if (!transactionId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    await dbConnect();

    const sessionConn = await mongoose.startSession();
    sessionConn.startTransaction();

    try {
      let adminAccountDetails = '';
      let adminAccountName = '';
      let adminAccountNumber = '';

      if (action === 'approve' && fromAccountId) {
        const LedgerAccount = (await import('@/models/LedgerAccount')).default;
        const sourceAcc = await LedgerAccount.findById(fromAccountId).session(sessionConn);
        if (sourceAcc) {
          adminAccountName = sourceAcc.name || '';
          adminAccountNumber = sourceAcc.accountNumber || '';
          adminAccountDetails = `${sourceAcc.name}${sourceAcc.accountNumber ? ` (${sourceAcc.accountNumber})` : ''}`;
        }
      }

      // Atomic conditional status transition targeting pending state
      const transaction = await ResellerWalletTransaction.findOneAndUpdate(
        { _id: transactionId, status: 'pending' },
        {
          $set: {
            status: action === 'approve' ? 'cleared' : 'failed',
            payoutReference: action === 'approve' ? (payoutReference || 'ADMIN_MANUAL_PAYOUT') : undefined,
            adminTrxId: action === 'approve' ? (payoutReference || 'ADMIN_MANUAL_PAYOUT') : undefined,
            adminAccountId: action === 'approve' && fromAccountId ? fromAccountId : undefined,
            adminAccountDetails: action === 'approve' ? (adminAccountDetails || undefined) : undefined,
            adminAccountName: action === 'approve' ? (adminAccountName || undefined) : undefined,
            adminAccountNumber: action === 'approve' ? (adminAccountNumber || undefined) : undefined,
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

      if (action === 'reject') {
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

        // Clean up any previously created LedgerTransaction or Expense for this payout
        const shortId = transaction._id.toString().slice(-8).toUpperCase();
        const ref = `PAYOUT-REC-${shortId}`;
        const LedgerTransaction = (await import('@/models/LedgerTransaction')).default;
        const Expense = (await import('@/models/Expense')).default;
        await LedgerTransaction.deleteMany({ reference: ref }).session(sessionConn);
        await Expense.deleteMany({ reference: ref }).session(sessionConn);
      }

      await sessionConn.commitTransaction();
      sessionConn.endSession();

      if (action === 'approve') {
        try {
          const { logPayoutToLedger, logResellerPayoutDepositToAccount, recalculateLedgerBalanceByAccountId } = await import('@/lib/ledgerHelper');
          const LedgerAccount = (await import('@/models/LedgerAccount')).default;
          const LedgerTransaction = (await import('@/models/LedgerTransaction')).default;
          const reseller = await Reseller.findById(transaction.resellerId);
          const payoutPayload = {
            ...transaction.toObject(),
            payoutReference: payoutReference || transaction.payoutReference,
          };

          const amount = Math.abs(transaction.amount || 0);
          const shortId = transaction._id.toString().slice(-8).toUpperCase();
          const reference = `PAYOUT-${shortId}`;
          const storeName = reseller?.storeName || 'Reseller';

          if (fromAccountId) {
            const sourceAccount = await LedgerAccount.findOne({
              _id: fromAccountId,
              $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
            });

            if (sourceAccount) {
              const balanceAfter = (sourceAccount.currentBalance || 0) - amount;
              sourceAccount.currentBalance = balanceAfter;
              await sourceAccount.save();

              const exists = await LedgerTransaction.findOne({ reference, account: sourceAccount._id });
              if (!exists) {
                await LedgerTransaction.create({
                  account: sourceAccount._id,
                  resellerId: null,
                  date: new Date(),
                  description: `Reseller Commission Payout to ${storeName} via ${sourceAccount.name}${payoutPayload.payoutReference ? ` (Ref: ${payoutPayload.payoutReference})` : ''}`,
                  type: 'credit',
                  amount,
                  reference,
                  balanceAfter,
                });
              }

              await recalculateLedgerBalanceByAccountId(sourceAccount._id);
            } else {
              await logPayoutToLedger(payoutPayload, reseller);
            }
          } else {
            // Fallback: Log Mother Shop payout credit from Cash or Bank
            await logPayoutToLedger(payoutPayload, reseller);
          }

          // 2. Deposit payout into Reseller's designated LedgerAccount (bKash/Nagad/Bank)
          await logResellerPayoutDepositToAccount(payoutPayload);
        } catch (ledgerErr) {
          console.error('[Ledger] Error logging payout to ledger:', ledgerErr);
        }
      }

      // Reconcile and synchronize running balances for the reseller's wallet transactions
      const { reconcileResellerWalletBalances } = await import('@/lib/resellerCommissionSync');
      await reconcileResellerWalletBalances(transaction.resellerId);

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

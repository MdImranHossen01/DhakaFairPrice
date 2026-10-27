import mongoose from 'mongoose';
import ResellerOrder from '@/models/ResellerOrder';
import Reseller from '@/models/Reseller';
import ResellerWalletTransaction from '@/models/ResellerWalletTransaction';

/**
 * Synchronizes Reseller Commission & Wallet balance when an order status or payment status changes.
 *
 * Rules:
 * - If status is 'Delivered' OR status is 'Paid' OR paymentStatus is 'Paid':
 *     Commission is cleared to the reseller's available wallet balance.
 *     ResellerWalletTransaction status becomes 'cleared'.
 *     Reseller.walletBalance += commission, Reseller.pendingBalance -= commission.
 *
 * - If status is 'Cancelled':
 *     Commission is cancelled.
 *     ResellerWalletTransaction status becomes 'cancelled'.
 *     Deducts from pendingBalance (if pending) or walletBalance (if cleared), and deducts totalEarnings.
 */
export async function syncResellerCommissionForMotherOrder({
  motherOrderId,
  newStatus,
  newPaymentStatus,
  session,
}: {
  motherOrderId: string | mongoose.Types.ObjectId;
  newStatus?: string;
  newPaymentStatus?: string;
  session?: mongoose.ClientSession;
}) {
  const query = ResellerOrder.find({
    motherOrderId: new mongoose.Types.ObjectId(motherOrderId.toString()),
    deletedAt: null
  });
  if (session) query.session(session);
  const resellerOrders = await query;

  for (const rOrder of resellerOrders) {
    const currentCommissionStatus = rOrder.commissionStatus || 'pending';
    const commission = Number(rOrder.resellerCommission) || 0;
    const finalStatus = newStatus || rOrder.status;
    const finalPaymentStatus = newPaymentStatus || rOrder.paymentStatus;

    const shouldClear = finalStatus === 'Delivered' || finalStatus === 'Paid' || finalPaymentStatus === 'Paid';
    const isCancelled = finalStatus === 'Cancelled';

    if (isCancelled && currentCommissionStatus !== 'cancelled') {
      rOrder.commissionStatus = 'cancelled';
      if (newStatus) rOrder.status = newStatus as any;
      if (newPaymentStatus) rOrder.paymentStatus = newPaymentStatus as any;
      await rOrder.save({ session });

      const txQuery = ResellerWalletTransaction.updateMany(
        { orderId: rOrder._id, status: { $ne: 'cancelled' } },
        { $set: { status: 'cancelled' } }
      );
      if (session) txQuery.session(session);
      await txQuery;

      if (commission > 0) {
        const incUpdate: any = { totalEarnings: -commission };
        if (currentCommissionStatus === 'cleared') {
          incUpdate.walletBalance = -commission;
        } else {
          incUpdate.pendingBalance = -commission;
        }

        const resUpdate = Reseller.findByIdAndUpdate(
          rOrder.resellerId,
          { $inc: incUpdate }
        );
        if (session) resUpdate.session(session);
        await resUpdate;
      }
    } else if (shouldClear && currentCommissionStatus === 'pending') {
      rOrder.commissionStatus = 'cleared';
      if (newStatus) rOrder.status = newStatus as any;
      if (newPaymentStatus) {
        rOrder.paymentStatus = newPaymentStatus as any;
      } else if (finalStatus === 'Delivered' || finalStatus === 'Paid') {
        rOrder.paymentStatus = 'Paid';
      }
      await rOrder.save({ session });

      const txQuery = ResellerWalletTransaction.updateMany(
        { orderId: rOrder._id, status: 'pending' },
        { $set: { status: 'cleared' } }
      );
      if (session) txQuery.session(session);
      await txQuery;

      if (commission > 0) {
        const resUpdate = Reseller.findByIdAndUpdate(
          rOrder.resellerId,
          {
            $inc: {
              walletBalance: commission,
              totalEarnings: commission,
            }
          }
        );
        if (session) resUpdate.session(session);
        await resUpdate;

        // Accurate reconciliation of pendingBalance from active pending transactions
        const pendingAgg = await ResellerWalletTransaction.aggregate([
          {
            $match: {
              resellerId: rOrder.resellerId,
              type: 'commission_earned',
              status: 'pending'
            }
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const accuratePending = Math.max(0, pendingAgg[0]?.total || 0);
        const syncPending = Reseller.findByIdAndUpdate(
          rOrder.resellerId,
          { $set: { pendingBalance: accuratePending } }
        );
        if (session) syncPending.session(session);
        await syncPending;
      }
    } else {
      let changed = false;
      if (newStatus && rOrder.status !== newStatus) {
        rOrder.status = newStatus as any;
        changed = true;
      }
      if (newPaymentStatus && rOrder.paymentStatus !== newPaymentStatus) {
        rOrder.paymentStatus = newPaymentStatus as any;
        changed = true;
      }
      if (changed) {
        await rOrder.save({ session });
      }
    }
  }
}

/**
 * Reconciles and fixes any pending transactions for orders that have already reached Paid/Delivered status.
 */
export async function reconcileResellerCommissions(resellerId?: string | mongoose.Types.ObjectId) {
  const match: any = {
    deletedAt: null,
    commissionStatus: 'pending',
    $or: [
      { status: { $in: ['Delivered', 'Paid'] } },
      { paymentStatus: 'Paid' }
    ]
  };
  if (resellerId) {
    match.resellerId = new mongoose.Types.ObjectId(resellerId.toString());
  }

  const pendingClearedOrders = await ResellerOrder.find(match);

  for (const rOrder of pendingClearedOrders) {
    const commission = Number(rOrder.resellerCommission) || 0;

    rOrder.commissionStatus = 'cleared';
    if (rOrder.status === 'Delivered' || rOrder.status === 'Paid') {
      rOrder.paymentStatus = 'Paid';
    }
    await rOrder.save();

    await ResellerWalletTransaction.updateMany(
      { orderId: rOrder._id, status: 'pending' },
      { $set: { status: 'cleared' } }
    );

    if (commission > 0) {
      await Reseller.findByIdAndUpdate(
        rOrder.resellerId,
        {
          $inc: {
            walletBalance: commission,
          }
        }
      );
    }
  }

  // Recalibrate exact balances from wallet ledger transactions
  if (resellerId) {
    await reconcileResellerWalletBalances(resellerId);
  } else {
    const affectedResellerIds = [...new Set(pendingClearedOrders.map(o => o.resellerId.toString()))];
    for (const id of affectedResellerIds) {
      await reconcileResellerWalletBalances(id);
    }
  }
}

/**
 * Automatically reconciles and recalibrates a reseller's wallet balance, pending balance,
 * total earnings, and total payouts withdrawn directly from immutable ledger transactions.
 */
export async function reconcileResellerWalletBalances(resellerId: string | mongoose.Types.ObjectId) {
  const rId = new mongoose.Types.ObjectId(resellerId.toString());

  // 0. Chronologically calculate and persist balanceAfter (Running Balance) for all ledger transactions
  const allTxs = await ResellerWalletTransaction.find({ resellerId: rId }).sort({ createdAt: 1, _id: 1 });
  let running = 0;
  for (const tx of allTxs) {
    const isCredit = ['commission_earned', 'refund'].includes(tx.type) || (!['payout_released', 'order_cancelled'].includes(tx.type) && tx.amount > 0);
    const absAmount = Math.abs(tx.amount || 0);

    if (tx.type === 'payout_released') {
      running = Math.max(0, running - absAmount);
    } else if (tx.status === 'cleared') {
      if (isCredit) {
        running += absAmount;
      } else {
        running = Math.max(0, running - absAmount);
      }
    }

    if (tx.balanceAfter !== running) {
      await ResellerWalletTransaction.updateOne({ _id: tx._id }, { $set: { balanceAfter: running } });
    }
  }

  // 1. Cleared commission earnings
  const earningsAgg = await ResellerWalletTransaction.aggregate([
    {
      $match: {
        resellerId: rId,
        type: 'commission_earned',
        status: { $in: ['cleared', 'completed'] }
      }
    },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const actualTotalEarnings = earningsAgg[0]?.total || 0;

  // 2. Pending commissions
  const pendingAgg = await ResellerWalletTransaction.aggregate([
    {
      $match: {
        resellerId: rId,
        type: 'commission_earned',
        status: 'pending'
      }
    },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const actualPendingBalance = Math.max(0, pendingAgg[0]?.total || 0);

  // 3. Payouts withdrawn (cleared)
  const withdrawnAgg = await ResellerWalletTransaction.aggregate([
    {
      $match: {
        resellerId: rId,
        type: 'payout_released',
        status: 'cleared'
      }
    },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const actualTotalWithdrawn = Math.abs(withdrawnAgg[0]?.total || 0);

  // 4. Pending payouts requested
  const pendingPayoutAgg = await ResellerWalletTransaction.aggregate([
    {
      $match: {
        resellerId: rId,
        type: 'payout_released',
        status: 'pending'
      }
    },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const pendingPayouts = Math.abs(pendingPayoutAgg[0]?.total || 0);

  // 5. Accurate Available Balance = Cleared Lifetime Earnings - Cleared Payouts - Pending Payout Requests
  const accurateWalletBalance = Math.max(0, actualTotalEarnings - actualTotalWithdrawn - pendingPayouts);

  await Reseller.findByIdAndUpdate(rId, {
    $set: {
      walletBalance: accurateWalletBalance,
      pendingBalance: actualPendingBalance,
      totalEarnings: actualTotalEarnings,
      totalWithdrawn: actualTotalWithdrawn,
    }
  });

  return {
    walletBalance: accurateWalletBalance,
    pendingBalance: actualPendingBalance,
    totalEarnings: actualTotalEarnings,
    totalWithdrawn: actualTotalWithdrawn,
  };
}

import mongoose from 'mongoose';
import ResellerOrder from '@/models/ResellerOrder';
import Reseller from '@/models/Reseller';
import ResellerWalletTransaction from '@/models/ResellerWalletTransaction';
import Order from '@/models/Order';

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
  const motherOrderQuery = Order.findById(motherOrderId);
  if (session) motherOrderQuery.session(session);
  const motherOrder = await motherOrderQuery;

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

    if (isCancelled) {
      const wasCleared = currentCommissionStatus === 'cleared';
      rOrder.commissionStatus = 'cancelled';
      if (newStatus) rOrder.status = newStatus as any;
      if (newPaymentStatus) rOrder.paymentStatus = newPaymentStatus as any;
      await rOrder.save({ session });

      const txQuery = ResellerWalletTransaction.updateMany(
        { orderId: rOrder._id, type: 'commission_earned', status: { $ne: 'cancelled' } },
        { $set: { status: 'cancelled' } }
      );
      if (session) txQuery.session(session);
      await txQuery;

      if (wasCleared && commission > 0) {
        const resUpdate = Reseller.findByIdAndUpdate(
          rOrder.resellerId,
          { $inc: { walletBalance: -commission, totalEarnings: -commission } }
        );
        if (session) resUpdate.session(session);
        await resUpdate;
      }

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

    // ── Courier Return Delivery Loss Deduction & Reversal ──
    // If an order is Cancelled/Returned after being booked to a courier from Mother Shop's account,
    // and the order was not paid in advance online (e.g. COD), the courier return fee is deducted from the reseller's wallet.
    if (isCancelled) {
      const alreadyDeducted = Boolean(rOrder.courierReturnLossDeducted || motherOrder?.courierReturnLossDeducted);

      if (!alreadyDeducted) {
        const consignmentId = motherOrder?.shippingDetails?.consignmentId || rOrder.shippingDetails?.consignmentId;
        const trackingId = motherOrder?.shippingDetails?.trackingId || rOrder.shippingDetails?.trackingId;
        const isCourierBooked = Boolean(consignmentId || trackingId);

        // Advance payment check: if customer already paid online, Mother Shop already collected delivery fee
        const isPaidInAdvance = finalPaymentStatus === 'Paid' || motherOrder?.paymentStatus === 'Paid';

        if (isCourierBooked && !isPaidInAdvance) {
          const returnFee = Number(
            motherOrder?.courierCharge ||
            rOrder.courierCharge ||
            motherOrder?.deliveryCharge ||
            rOrder.deliveryCharge ||
            120
          );

          if (returnFee > 0) {
            // Atomically deduct return fee from reseller wallet balance
            const resUpdate = Reseller.findByIdAndUpdate(
              rOrder.resellerId,
              { $inc: { walletBalance: -returnFee } }
            );
            if (session) resUpdate.session(session);
            await resUpdate;

            const orderRef = motherOrder?.shortId || rOrder.shortId || rOrder._id.toString().slice(-8).toUpperCase();
            const lossTx = new ResellerWalletTransaction({
              resellerId: rOrder.resellerId,
              type: 'courier_return_loss',
              amount: -returnFee,
              orderId: rOrder._id,
              description: `Courier Return Delivery Loss - Order #${orderRef}`,
              status: 'cleared',
            });
            if (session) {
              await lossTx.save({ session });
            } else {
              await lossTx.save();
            }

            rOrder.courierReturnLossDeducted = true;
            rOrder.courierReturnLossAmount = returnFee;
            await rOrder.save({ session });

            if (motherOrder) {
              motherOrder.courierReturnLossDeducted = true;
              motherOrder.courierReturnLossAmount = returnFee;
              await motherOrder.save({ session });
            }
          }
        }
      }
    } else if (!isCancelled && (rOrder.courierReturnLossDeducted || motherOrder?.courierReturnLossDeducted)) {
      // Reversal: If status changed back from Cancelled to an active status, refund deducted loss
      const refundFee = Number(rOrder.courierReturnLossAmount || motherOrder?.courierReturnLossAmount || 0);
      if (refundFee > 0) {
        const resUpdate = Reseller.findByIdAndUpdate(
          rOrder.resellerId,
          { $inc: { walletBalance: refundFee } }
        );
        if (session) resUpdate.session(session);
        await resUpdate;

        const orderRef = motherOrder?.shortId || rOrder.shortId || rOrder._id.toString().slice(-8).toUpperCase();
        const revTx = new ResellerWalletTransaction({
          resellerId: rOrder.resellerId,
          type: 'refund',
          amount: refundFee,
          orderId: rOrder._id,
          description: `Reversal of Courier Return Loss - Order #${orderRef}`,
          status: 'cleared',
        });
        if (session) {
          await revTx.save({ session });
        } else {
          await revTx.save();
        }
      }

      rOrder.courierReturnLossDeducted = false;
      rOrder.courierReturnLossAmount = 0;
      await rOrder.save({ session });

      if (motherOrder) {
        motherOrder.courierReturnLossDeducted = false;
        motherOrder.courierReturnLossAmount = 0;
        await motherOrder.save({ session });
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
    const isCredit = ['commission_earned', 'refund'].includes(tx.type) || (!['payout_released', 'order_cancelled', 'courier_return_loss'].includes(tx.type) && tx.amount > 0);
    const absAmount = Math.abs(tx.amount || 0);

    if (tx.type === 'payout_released') {
      running -= absAmount;
    } else if (tx.status === 'cleared') {
      if (isCredit) {
        running += absAmount;
      } else {
        running -= absAmount;
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

  // 4.5 Courier Return Delivery Loss (cleared)
  const returnLossAgg = await ResellerWalletTransaction.aggregate([
    {
      $match: {
        resellerId: rId,
        type: 'courier_return_loss',
        status: 'cleared'
      }
    },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const actualCourierReturnLoss = Math.abs(returnLossAgg[0]?.total || 0);

  // 5. Accurate Available Balance = Cleared Lifetime Earnings - Cleared Payouts - Pending Payout Requests - Courier Return Losses
  const accurateWalletBalance = actualTotalEarnings - actualTotalWithdrawn - pendingPayouts - actualCourierReturnLoss;

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

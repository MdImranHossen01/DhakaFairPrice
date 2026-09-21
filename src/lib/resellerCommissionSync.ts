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
      if (newPaymentStatus) rOrder.paymentStatus = newPaymentStatus as any;
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
              pendingBalance: -commission,
            }
          }
        );
        if (session) resUpdate.session(session);
        await resUpdate;
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
            pendingBalance: -commission,
          }
        }
      );
    }
  }
}

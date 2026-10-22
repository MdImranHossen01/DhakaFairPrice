/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import User from '@/models/User';
import GlobalSettings from '@/models/GlobalSettings';
import WalletTransaction from '@/models/WalletTransaction';
import Coupon from '@/models/Coupon';
import Reseller from '@/models/Reseller';
import ResellerOrder from '@/models/ResellerOrder';
import { auth } from '@/auth';
// GET single order details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();
    if (!mongoose.isValidObjectId(slug)) {
      return NextResponse.json({ message: 'Invalid order ID' }, { status: 400 });
    }

    await connectToDatabase();
    const order = await Order.findOne({ _id: slug })
      .populate('user', 'name email image')
      .populate({
        path: 'items.product',
        select: 'name price images slug uploadedBy',
        populate: {
          path: 'uploadedBy',
          select: 'storeName subdomain customDomain pickupAddress contact',
        },
      })
      .populate('resellerId', 'storeName subdomain customDomain pickupAddress contact')
      .populate('storefrontResellerId', 'storeName subdomain customDomain pickupAddress contact');

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    const orderObj: any = order.toObject ? order.toObject() : order;

    if (!orderObj.resellerId && orderObj.storefrontResellerId) {
      orderObj.resellerId = orderObj.storefrontResellerId;
    }

    // Fallback/auto-sync from ResellerOrder if resellerId or internalNote missing
    try {
      const ro = await ResellerOrder.findOne({
        $or: [
          { motherOrderId: order._id },
          ...(order.shortId ? [{ shortId: order.shortId }] : [])
        ],
        deletedAt: null
      })
      .populate('resellerId', 'storeName subdomain customDomain pickupAddress contact')
      .lean();

      if (ro) {
        if (!orderObj.resellerId && ro.resellerId) {
          orderObj.resellerId = ro.resellerId;
          const rId = typeof ro.resellerId === 'object' && (ro.resellerId as any)._id ? (ro.resellerId as any)._id : ro.resellerId;
          Order.findByIdAndUpdate(order._id, { $set: { resellerId: rId } }).exec().catch(() => {});
        }
        if (!orderObj.internalNote && ro.internalNote) {
          orderObj.internalNote = ro.internalNote;
          Order.findByIdAndUpdate(order._id, { $set: { internalNote: ro.internalNote } }).exec().catch(() => {});
        }
        if (orderObj.resellerCommission === undefined && ro.resellerCommission !== undefined) {
          orderObj.resellerCommission = ro.resellerCommission;
        }
        if (orderObj.systemFee === undefined && ro.systemFee !== undefined) {
          orderObj.systemFee = ro.systemFee;
        }
        if (orderObj.salesProfit === undefined && ro.salesProfit !== undefined) {
          orderObj.salesProfit = ro.salesProfit;
        }
        if (!orderObj.commissionStatus && ro.commissionStatus) {
          orderObj.commissionStatus = ro.commissionStatus;
        }
      }
    } catch (roErr) {
      console.error('[Order Detail Reseller Sync Error]', roErr);
    }

    // If reseller is still an unpopulated string/ObjectId, fetch it
    if (typeof orderObj.resellerId === 'string' || (orderObj.resellerId && !orderObj.resellerId.storeName && mongoose.Types.ObjectId.isValid(orderObj.resellerId))) {
      try {
        const found = await Reseller.findById(orderObj.resellerId).select('storeName subdomain customDomain pickupAddress contact').lean();
        if (found) {
          orderObj.resellerId = found;
        }
      } catch (e) {}
    }

    // Authorization: Must be an admin OR the owner of the order OR it is a guest order
    const isAdmin = session?.user && ['admin', 'super_admin', 'manager', 'moderator'].includes((session.user as any)?.role);
    const isOwner = session?.user && order.user?._id?.toString() === (session.user as any).id;
    const isGuestOrder = !order.user;

    if (!isAdmin && !isOwner && !isGuestOrder) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Tenant Isolation: Non-admins can only view orders corresponding to the current shop context
    if (!isAdmin) {
      const { getStorefrontReseller } = await import('@/lib/resellerStore');
      const storefrontReseller = await getStorefrontReseller(req);
      if (storefrontReseller) {
        if (order.storefrontResellerId?.toString() !== storefrontReseller._id.toString()) {
          return NextResponse.json({ message: 'Order not found' }, { status: 404 });
        }
      } else {
        if (order.storefrontResellerId || order.orderSource === 'reseller_storefront') {
          return NextResponse.json({ message: 'Order not found' }, { status: 404 });
        }
      }
    }

    return NextResponse.json(orderObj);
  } catch (error) {
    console.error('Error fetching order detail:', error);
    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json({ message: 'Invalid order ID' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH update order status (Admin Only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();
    if (!session || !session.user || !(['admin', 'super_admin', 'manager', 'moderator'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }
    const {
      status,
      paymentStatus,
      shippingAddress,
      paymentMethod,
      transactionId,
      deliveryCharge,
      couponDiscountAmount,
      walletAmountUsed,
      items,
      internalNote,
      customerNote,
      systemNote
    } = body;

    const conn = await connectToDatabase();

    if (!mongoose.Types.ObjectId.isValid(slug)) {
      return NextResponse.json({ message: 'Invalid order id' }, { status: 400 });
    }

    const dbSession = await conn.startSession();
    dbSession.startTransaction();

    try {
      // Fetch the order within the session
      const order = await Order.findOne({ _id: slug }).session(dbSession);

      if (!order) {
        await dbSession.abortTransaction();
        return NextResponse.json({ message: 'Order not found' }, { status: 404 });
      }

      const allowedStatuses = ['Order Placed', 'Confirmed', 'Paid', 'Hold', 'Ready for Delivery', 'Released for Delivery', 'Cancelled', 'Delivered'];
      const allowedPaymentStatuses = ['Pending', 'Paid', 'Failed'];

      const updateData: any = {};
      if (internalNote !== undefined) updateData.internalNote = internalNote;
      if (customerNote !== undefined) updateData.customerNote = customerNote;
      if (systemNote !== undefined) updateData.systemNote = systemNote;
      if (status) {
        if (!allowedStatuses.includes(status)) {
          await dbSession.abortTransaction();
          return NextResponse.json({
            message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`
          }, { status: 400 });
        }
        if (status === 'Hold') {
          const finalInternalNote = internalNote !== undefined ? internalNote : order.internalNote;
          if (!finalInternalNote || !finalInternalNote.trim()) {
            await dbSession.abortTransaction();
            return NextResponse.json({
              message: 'Internal note is mandatory when setting order status to Hold'
            }, { status: 400 });
          }
        }
        updateData.status = status;
      }

      if (paymentStatus) {
        if (!allowedPaymentStatuses.includes(paymentStatus)) {
          await dbSession.abortTransaction();
          return NextResponse.json({
            message: `Invalid payment status. Allowed values: ${allowedPaymentStatuses.join(', ')}`
          }, { status: 400 });
        }
        updateData.paymentStatus = paymentStatus;
      }

      if (shippingAddress) {
        const currentAddr = order.shippingAddress && typeof (order.shippingAddress as any).toObject === 'function'
          ? (order.shippingAddress as any).toObject()
          : (order.shippingAddress || {});
        updateData.shippingAddress = {
          fullName: shippingAddress.fullName !== undefined ? shippingAddress.fullName : currentAddr.fullName,
          phone: shippingAddress.phone !== undefined ? shippingAddress.phone : currentAddr.phone,
          street: shippingAddress.street !== undefined ? shippingAddress.street : currentAddr.street,
          city: shippingAddress.city !== undefined ? shippingAddress.city : currentAddr.city,
          state: shippingAddress.state !== undefined ? shippingAddress.state : currentAddr.state,
          division: shippingAddress.division !== undefined ? shippingAddress.division : currentAddr.division,
          zipCode: shippingAddress.zipCode !== undefined ? shippingAddress.zipCode : currentAddr.zipCode,
          country: shippingAddress.country !== undefined ? shippingAddress.country : currentAddr.country,
        };
      }

      if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
      if (transactionId !== undefined) updateData.transactionId = transactionId;
      if (couponDiscountAmount !== undefined) updateData.couponDiscountAmount = Number(couponDiscountAmount) || 0;
      if (walletAmountUsed !== undefined) updateData.walletAmountUsed = Number(walletAmountUsed) || 0;

      if (deliveryCharge !== undefined) {
        updateData.deliveryCharge = Number(deliveryCharge) || 0;
      }

      if (items !== undefined && Array.isArray(items)) {
        updateData.items = items.map((item: any) => ({
          product: item.product?._id || item.product,
          name: item.name,
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          color: item.color,
          size: item.size,
          image: item.image,
          purchasePrice: Number(item.purchasePrice) || 0
        }));
      }

      // Recalculate totalAmount if items or deliveryCharge are updated
      if (updateData.items !== undefined || updateData.deliveryCharge !== undefined) {
        const finalItems = updateData.items !== undefined ? updateData.items : order.items;
        const finalDeliveryCharge = updateData.deliveryCharge !== undefined ? updateData.deliveryCharge : (order.deliveryCharge || 0);
        
        const itemsTotal = finalItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
        updateData.totalAmount = itemsTotal + finalDeliveryCharge;
      }

      // 1. Handle Sales Counting logic (Atomic-like within transaction)
      const targetStatus = updateData.status || order.status;
      const targetPayment = updateData.paymentStatus || order.paymentStatus;
      const saleBecomingValid = (['Confirmed', 'Paid', 'Delivered'].includes(targetStatus) || targetPayment === 'Paid') && targetStatus !== 'Cancelled';
      if (saleBecomingValid && !order.isSalesCounted && order.status !== 'Cancelled') {
        const Product = (await import('@/models/Product')).default;
        for (const item of order.items) {
          await Product.updateOne(
            { _id: item.product },
            { $inc: { totalSales: item.quantity } },
            { session: dbSession }
          );
        }
        updateData.isSalesCounted = true;
      }

      // Handle Stock Restoration on Cancel, or Stock Re-deduction if un-cancelling
      let stockActionProductIds: string[] = [];
      if (updateData.status === 'Cancelled' && order.status !== 'Cancelled') {
        const { restoreStockForOrder } = await import('@/lib/stockHelper');
        const stockRes = await restoreStockForOrder({
          orderId: order._id,
          session: dbSession,
          skipResellerSync: true,
        });
        stockActionProductIds = stockRes.affectedProductIds || [];
        updateData.isStockRestored = true;
        updateData.isSalesCounted = false;
      } else if (order.status === 'Cancelled' && updateData.status && updateData.status !== 'Cancelled') {
        const { reDeductStockForOrder } = await import('@/lib/stockHelper');
        const stockRes = await reDeductStockForOrder({
          orderId: order._id,
          session: dbSession,
          skipResellerSync: true,
        });
        stockActionProductIds = stockRes.affectedProductIds || [];
        updateData.isStockRestored = false;
        if (saleBecomingValid) {
          const Product = (await import('@/models/Product')).default;
          for (const item of order.items) {
            await Product.updateOne(
              { _id: item.product },
              { $inc: { totalSales: item.quantity } },
              { session: dbSession }
            );
          }
          updateData.isSalesCounted = true;
        }
      }

      // 2. Loyalty System: Award Tokens on Success
      const isOrderSuccessful = (status || order.status) === 'Delivered';
      if (isOrderSuccessful && !order.isRewarded && order.user) {
        const user = await User.findOne({ _id: order.user }).session(dbSession);
        const settings = await GlobalSettings.findOne().session(dbSession);
        const subConfig = {
          activationThreshold: settings?.subscriptionConfig?.activationThreshold ?? 5000,
          rewardPercentage: settings?.subscriptionConfig?.rewardPercentage ?? 5
        };

        if (user) {
          if (!user.isSubscriptionActive && order.totalAmount >= subConfig.activationThreshold) {
            user.isSubscriptionActive = true;
            await user.save({ session: dbSession });
          }

          const rewardAmount = order.earnedRewardAmount || 0;
          if ((user.isSubscriptionActive || order.totalAmount >= subConfig.activationThreshold) && rewardAmount > 0) {
            user.walletBalance = (user.walletBalance || 0) + rewardAmount;
            await user.save({ session: dbSession });

            await WalletTransaction.create([{
              userId: user._id,
              amount: rewardAmount,
              type: 'earned',
              status: 'completed',
              orderId: order._id,
              description: `Tokens earned from order #${order._id.toString().slice(-6).toUpperCase()}`
            }], { session: dbSession });
          }
          updateData.isRewarded = true;
        }
      }

      // Ensure required fields exist for old data
      if (order.deliveryCharge === undefined || order.deliveryCharge === null) {
        updateData.deliveryCharge = 0;
      }

      // In COD e-commerce, a Delivered order has collected cash upon delivery
      if ((updateData.status === 'Delivered' || order.status === 'Delivered') && !updateData.paymentStatus && order.paymentStatus !== 'Paid') {
        updateData.paymentStatus = 'Paid';
      }

      // Final update
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: slug },
        { $set: updateData },
        { session: dbSession, new: true }
      );

      // Sync linked ResellerOrder and clear/cancel commissions & wallet balance
      const { syncResellerCommissionForMotherOrder } = await import('@/lib/resellerCommissionSync');
      await syncResellerCommissionForMotherOrder({
        motherOrderId: slug,
        newStatus: updateData.status,
        newPaymentStatus: updateData.paymentStatus,
        session: dbSession,
      });

      // Also sync internalNote and customerNote to ResellerOrder
      if (updateData.internalNote !== undefined || updateData.customerNote !== undefined || updateData.status || updateData.paymentStatus) {
        const ResellerOrder = (await import('@/models/ResellerOrder')).default;
        const roUpdate: any = {};
        if (updateData.internalNote !== undefined) roUpdate.internalNote = updateData.internalNote;
        if (updateData.customerNote !== undefined) roUpdate.customerNote = updateData.customerNote;
        if (updateData.status) roUpdate.status = updateData.status;
        if (updateData.paymentStatus) roUpdate.paymentStatus = updateData.paymentStatus;
        await ResellerOrder.updateMany(
          { motherOrderId: slug },
          { $set: roUpdate },
          { session: dbSession }
        );
      }

      await dbSession.commitTransaction();

      if (stockActionProductIds.length > 0) {
        try {
          const { syncProductToResellers } = await import('@/lib/syncEngine');
          for (const pId of stockActionProductIds) {
            await syncProductToResellers(pId).catch((syncErr) =>
              console.error(`[Reseller Sync] Error syncing product ${pId}:`, syncErr)
            );
          }
        } catch (syncBatchErr) {
          console.error('[Reseller Sync Batch Error]', syncBatchErr);
        }
      }

      if (order.paymentStatus !== 'Paid' && updatedOrder?.paymentStatus === 'Paid') {
        try {
          const { logOrderPaymentToLedger } = await import('@/lib/ledgerHelper');
          await logOrderPaymentToLedger(updatedOrder);
        } catch (ledgerErr) {
          console.error('[Ledger] Error logging payment in single update:', ledgerErr);
        }
      } else if (order.paymentStatus === 'Paid' && (updatedOrder?.paymentStatus !== 'Paid' || ['Cancelled', 'Returned'].includes(updatedOrder?.status))) {
        try {
          const { default: LedgerTransaction } = await import('@/models/LedgerTransaction');
          const { recalculateLedgerBalance } = await import('@/lib/ledgerHelper');
          const shortId = slug.slice(-8).toUpperCase();
          await LedgerTransaction.deleteMany({ reference: `ORDER-${shortId}` });
          await recalculateLedgerBalance('CASH');
          await recalculateLedgerBalance('BANK');
        } catch (ledgerErr) {
          console.error('[Ledger] Error reverting order ledger payment:', ledgerErr);
        }
      }

      return NextResponse.json(updatedOrder);

    } catch (error) {
      await dbSession.abortTransaction();
      throw error;
    } finally {
      await dbSession.endSession();
    }
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE order (Admin Only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();
    if (!session || !session.user || !(['admin', 'super_admin', 'manager', 'moderator'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (!mongoose.Types.ObjectId.isValid(slug)) {
      return NextResponse.json({ message: 'Invalid order ID' }, { status: 400 });
    }

    await connectToDatabase();
    const deletedOrder = await Order.findOneAndDelete({ _id: slug });

    if (!deletedOrder) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    try {
      const { default: LedgerTransaction } = await import('@/models/LedgerTransaction');
      const { recalculateLedgerBalance } = await import('@/lib/ledgerHelper');
      const shortId = slug.slice(-8).toUpperCase();
      await LedgerTransaction.deleteMany({ reference: `ORDER-${shortId}` });
      await recalculateLedgerBalance('CASH');
      await recalculateLedgerBalance('BANK');
    } catch (ledgerErr) {
      console.error('[Ledger] Error cleaning order ledger transaction on delete:', ledgerErr);
    }

    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

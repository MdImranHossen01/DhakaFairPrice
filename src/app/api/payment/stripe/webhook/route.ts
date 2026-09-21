import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GlobalSettings from '@/models/GlobalSettings';
import ResellerOrder from '@/models/ResellerOrder';
import Reseller from '@/models/Reseller';
import ResellerWalletTransaction from '@/models/ResellerWalletTransaction';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    await dbConnect();

    const settings = await GlobalSettings.findOne().sort({ updatedAt: -1 });
    const stripeConfig = settings?.paymentConfig?.stripe;

    if (!stripeConfig?.secretKey || !stripeConfig?.webhookSecret) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 400 });
    }

    const stripe = new Stripe(stripeConfig.secretKey, {
      apiVersion: '2025-01-27.acac' as any,
    });

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, stripeConfig.webhookSecret);
    } catch (err: any) {
      console.error('[Stripe Webhook Verification Failed]', err.message);
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;

      if (!orderId) {
        return NextResponse.json({ error: 'Order ID not found in metadata' }, { status: 400 });
      }

      // 1. Mark Reseller Order as Paid atomically
      const updatedOrder = await ResellerOrder.findOneAndUpdate(
        { _id: orderId, paymentStatus: { $ne: 'Paid' } },
        { $set: { paymentStatus: 'Paid', status: 'Confirmed' } },
        { new: true }
      );

      if (!updatedOrder) {
        const orderExists = await ResellerOrder.findById(orderId);
        if (!orderExists) {
          return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }
        return NextResponse.json({ message: 'Order already marked as paid' }, { status: 200 });
      }

      // 2. Clear Reseller Commission Wallet Transaction atomically & update balance using atomic increment ($inc)
      const commissionTx = await ResellerWalletTransaction.findOneAndUpdate(
        {
          orderId: updatedOrder._id,
          type: 'commission_earned',
          status: 'pending',
        },
        { $set: { status: 'cleared' } },
        { new: false } // return the original document to check status transition success
      );

      if (commissionTx) {
        await Reseller.findByIdAndUpdate(updatedOrder.resellerId, {
          $inc: { walletBalance: updatedOrder.resellerCommission },
        });
      }

      // 3. Process any associated Fulfillment Orders
      const fulfillmentOrders = await ResellerOrder.find({
        shortId: { $regex: new RegExp("^" + updatedOrder.shortId + "-F") }
      });

      for (const fOrder of fulfillmentOrders) {
        const updatedFOrder = await ResellerOrder.findOneAndUpdate(
          { _id: fOrder._id, paymentStatus: { $ne: 'Paid' } },
          { $set: { paymentStatus: 'Paid', status: 'Confirmed' } },
          { new: true }
        );

        if (updatedFOrder) {
          const fTx = await ResellerWalletTransaction.findOneAndUpdate(
            {
              orderId: fOrder._id,
              type: 'commission_earned',
              status: 'pending',
            },
            { $set: { status: 'cleared' } },
            { new: false }
          );

          if (fTx) {
            await Reseller.findByIdAndUpdate(fOrder.resellerId, {
              $inc: { walletBalance: fOrder.resellerCommission },
            });
          }
        }
      }

      console.log(`[Stripe Webhook] Order ${updatedOrder.shortId} successfully marked as Paid. Commissions released.`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('[Stripe Webhook Error]', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

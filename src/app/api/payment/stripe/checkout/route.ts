import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GlobalSettings from '@/models/GlobalSettings';
import ResellerOrder from '@/models/ResellerOrder';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { orderId, subdomain } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const settings = await GlobalSettings.findOne().sort({ updatedAt: -1 });
    const stripeConfig = settings?.paymentConfig?.stripe;

    if (!stripeConfig?.secretKey) {
      return NextResponse.json({ error: 'Stripe is not configured on the system' }, { status: 400 });
    }

    const order = await ResellerOrder.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const stripe = new Stripe(stripeConfig.secretKey, {
      apiVersion: '2025-01-27.acac' as any,
    });

    const origin = request.nextUrl.origin;

    // Create line items for Stripe Checkout
    const lineItems = order.items.map((item: any) => ({
      price_data: {
        currency: 'bdt',
        product_data: {
          name: item.name,
          images: item.image ? [item.image] : [],
          metadata: {
            productId: item.productId.toString(),
            color: item.color || '',
            size: item.size || '',
          },
        },
        unit_amount: Math.round(item.retailPrice * 100), // Stripe expects unit amount in cents/paisa
      },
      quantity: item.quantity,
    }));

    // Add delivery charge as a line item if greater than 0
    if (order.deliveryCharge > 0) {
      lineItems.push({
        price_data: {
          currency: 'bdt',
          product_data: {
            name: 'Delivery Charge',
            images: [],
            metadata: {
              productId: 'delivery',
              color: '',
              size: '',
            },
          },
          unit_amount: Math.round(order.deliveryCharge * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/track-order?shortId=${order.shortId}&phone=${order.customer.phone}&payment=success`,
      cancel_url: `${origin}/checkout?orderId=${order._id}&payment=cancelled`,
      metadata: {
        orderId: order._id.toString(),
        subdomain: subdomain || '',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('[Stripe Checkout API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

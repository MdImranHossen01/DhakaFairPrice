import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import { validatePayment } from '@/lib/sslcommerz';

/**
 * Payment Success Callback Handler
 * This route is called by SSLCommerz after a successful payment transaction.
 */
export async function POST(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const orderId = searchParams.get('id');
    const body = await req.formData();
    const data = Object.fromEntries(body.entries());

    if (!orderId) {
      return NextResponse.json({ message: 'Order ID is required' }, { status: 400 });
    }

    // Verify Payment with SSLCommerz using native fetch
    const response = await validatePayment(data);

    if (response?.status === 'VALID' || response?.status === 'VALIDATED') {
      await connectToDatabase();
      
      // Atomic update to mark as paid and sales-counted in one go
      // This prevents multiple SSLCommerz callbacks from double-counting sales
      const order = await Order.findOneAndUpdate(
        { _id: orderId, isSalesCounted: { $ne: true } },
        { 
          $set: { 
            paymentStatus: 'Paid', 
            status: 'Confirmed', 
            transactionId: data.tran_id?.toString(),
            isSalesCounted: true 
          } 
        },
        { new: true }
      );

      if (order) {
        // Success: This is the first time we're processing this payment
        try {
          const Product = (await import('@/models/Product')).default;
          for (const item of order.items) {
            await Product.updateOne(
              { _id: item.product },
              { $inc: { totalSales: item.quantity } }
            );
          }
        } catch (salesError) {
          console.error('Error updating totalSales on payment success:', salesError);
        }

        try {
          const { logOrderPaymentToLedger } = await import('@/lib/ledgerHelper');
          await logOrderPaymentToLedger(order);
        } catch (ledgerErr) {
          console.error('Error logging payment to ledger on success:', ledgerErr);
        }

        // Update corresponding ResellerOrder if applicable
        try {
          const ResellerOrder = (await import('@/models/ResellerOrder')).default;
          await ResellerOrder.findOneAndUpdate(
            { motherOrderId: order._id },
            { 
              $set: { 
                paymentStatus: 'Paid', 
                status: 'Confirmed', 
                transactionId: data.tran_id?.toString() 
              } 
            }
          );
        } catch (roErr) {
          console.error('Error updating ResellerOrder on payment success:', roErr);
        }
      } else {
        // If findOneAndUpdate returns null, it means isSalesCounted was already true 
        // OR the order ID is invalid. Check if order exists for redirection.
        const existingOrder = await Order.findOne({ _id: orderId });
        if (!existingOrder) {
          return NextResponse.json({ message: 'Order not found' }, { status: 404 });
        }
      }

      // Determine valid origin to prevent redirecting to internal binding address (0.0.0.0)
      const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
      const forwardedProto = req.headers.get('x-forwarded-proto') || (forwardedHost?.includes('localhost') ? 'http' : 'https');
      
      let origin = (forwardedHost && !forwardedHost.includes('0.0.0.0'))
        ? `${forwardedProto}://${forwardedHost}`
        : (req.nextUrl.origin && !req.nextUrl.origin.includes('0.0.0.0'))
          ? req.nextUrl.origin
          : (process.env.NEXT_PUBLIC_API_URL || process.env.NEXTAUTH_URL || 'https://www.dhakafairprice.com');
      
      origin = origin.replace(/\/$/, '');

      // If order belongs to a reseller storefront, redirect back to reseller's domain
      const targetOrder = order || await Order.findById(orderId);
      if (targetOrder?.resellerId || targetOrder?.storefrontResellerId) {
        try {
          const Reseller = (await import('@/models/Reseller')).default;
          const reseller = await Reseller.findById(targetOrder.storefrontResellerId || targetOrder.resellerId).select('customDomain subdomain').lean() as any;
          if (reseller?.customDomain) {
            origin = `https://${reseller.customDomain}`;
          } else if (reseller?.subdomain) {
            const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dhakafairprice.com';
            origin = `https://${reseller.subdomain}.${rootDomain}`;
          }
        } catch (resellerErr) {
          console.error('Error resolving reseller domain for payment redirect:', resellerErr);
        }
      }

      return NextResponse.redirect(`${origin}/checkout?order=success&id=${orderId}`, 303);
    } else {
      console.error('SSLCommerz Validation Failed:', response);
      const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
      const forwardedProto = req.headers.get('x-forwarded-proto') || (forwardedHost?.includes('localhost') ? 'http' : 'https');
      let origin = (forwardedHost && !forwardedHost.includes('0.0.0.0'))
        ? `${forwardedProto}://${forwardedHost}`
        : (req.nextUrl.origin && !req.nextUrl.origin.includes('0.0.0.0'))
          ? req.nextUrl.origin
          : (process.env.NEXT_PUBLIC_API_URL || process.env.NEXTAUTH_URL || 'https://www.dhakafairprice.com');
      origin = origin.replace(/\/$/, '');

      return NextResponse.redirect(`${origin}/checkout?order=failed&id=${orderId}`, 303);
    }
  } catch (error) {
    console.error('Payment Success Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

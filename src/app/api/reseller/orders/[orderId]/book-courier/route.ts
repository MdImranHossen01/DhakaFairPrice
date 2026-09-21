import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Order from '@/models/Order';
import ResellerOrder from '@/models/ResellerOrder';
import GlobalSettings from '@/models/GlobalSettings';
import Reseller from '@/models/Reseller';
import { SteadfastProvider } from '@/lib/shipping/providers/steadfast';
import { PathaoProvider } from '@/lib/shipping/providers/pathao';
import { RedXProvider } from '@/lib/shipping/providers/redx';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';

async function getResellerId(userId: string) {
  await connectToDatabase();
  const reseller = await Reseller.findOne({ userId });
  if (!reseller) throw new Error('Reseller not found');
  return reseller._id;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await params;
    const body = await req.json();

    await connectToDatabase();
    
    const resellerId = await getResellerId(session.user.id);

    // Fetch the reseller order and populate the mother products to check uploadedBy
    const resellerOrder = await ResellerOrder.findOne({ _id: orderId, resellerId }).populate({
      path: 'items.productId',
      select: 'uploadedBy'
    });

    if (!resellerOrder) {
      return NextResponse.json({ message: 'Order not found or does not belong to you' }, { status: 404 });
    }

    // Verify ownership: all items in the order must have been uploaded by this reseller
    const isOwnerOfAllItems = resellerOrder.items.every(
      (item: any) => item.productId?.uploadedBy?.toString() === resellerId.toString()
    );

    if (!isOwnerOfAllItems) {
      return NextResponse.json({ message: 'You can only book couriers for orders containing products you uploaded.' }, { status: 403 });
    }

    if (!resellerOrder.motherOrderId) {
      return NextResponse.json({ message: 'Mother order not linked to this reseller order' }, { status: 400 });
    }

    // Atomically claim the Mother Order to prevent concurrent booking requests
    const order = await Order.findOneAndUpdate(
      {
        _id: resellerOrder.motherOrderId,
        $and: [
          {
            $or: [
              { 'shippingDetails.trackingId': { $exists: false } },
              { 'shippingDetails.trackingId': null },
              { 'shippingDetails.trackingId': '' }
            ]
          },
          {
            $or: [
              { 'shippingDetails.consignmentId': { $exists: false } },
              { 'shippingDetails.consignmentId': null },
              { 'shippingDetails.consignmentId': '' }
            ]
          },
          {
            $or: [
              { 'shippingDetails.courierStatus': { $exists: false } },
              { 'shippingDetails.courierStatus': null },
              { 'shippingDetails.courierStatus': { $ne: 'BOOKING_IN_PROGRESS' } }
            ]
          }
        ]
      },
      {
        $set: {
          'shippingDetails.courierStatus': 'BOOKING_IN_PROGRESS'
        }
      },
      { new: true }
    ).populate('user');

    if (!order) {
      return NextResponse.json({ message: 'Courier already booked or booking in progress for this order' }, { status: 409 });
    }

    const settings = await GlobalSettings.findOne(); // Fetch the singleton settings

    if (!settings || !settings.courierConfig || settings.courierConfig.activeProvider === 'none') {
      return NextResponse.json({ message: 'Courier service not configured by Mother Admin' }, { status: 400 });
    }

    const { activeProvider, steadfast, pathao, redx } = settings.courierConfig;
    let provider = null;
    let courierName = '';

    const addr = order.shippingAddress || {};
    
    // Validate required courier fields
    if (!addr.phone || addr.phone.trim() === "") {
      return NextResponse.json({ message: 'Recipient phone number is required for courier booking' }, { status: 400 });
    }

    const addressParts = [addr.street, addr.city, addr.zipCode].filter(Boolean);
    if (addressParts.length === 0) {
      return NextResponse.json({ message: 'At least one address part (street, city, or zip) is required' }, { status: 400 });
    }

    const shippingData = {
      invoice: order.shortId || order._id.toString().slice(-8).toUpperCase(),
      recipient_name: addr.fullName || "Customer",
      recipient_phone: addr.phone ? addr.phone.replace(/\D/g, '').slice(-11) : "",
      recipient_address: addressParts.join(', '),
      cod_amount: order.paymentStatus === 'Paid' ? 0 : (order.totalAmount || 0),
      note: body.note || `Payment: ${order.paymentMethod || "N/A"}`,
      // Extra fields for Pathao/RedX
      store_id: body.store_id || pathao?.storeId,
      city_id: body.city_id,
      zone_id: body.zone_id,
      area_id: body.area_id,
    };

    const sApiKey = steadfast?.apiKey;
    const sSecretKey = steadfast?.secretKey;

    if (activeProvider === 'steadfast' && sApiKey && sSecretKey) {
      provider = new SteadfastProvider(sApiKey, sSecretKey);
      courierName = 'Steadfast';
    } else if (activeProvider === 'pathao' && pathao?.clientId && pathao?.clientSecret) {
      provider = new PathaoProvider(pathao.clientId, pathao.clientSecret, pathao.storeId || '');
      courierName = 'Pathao';
    } else if (activeProvider === 'redx' && redx?.apiKey) {
      provider = new RedXProvider(redx.apiKey);
      courierName = 'RedX';
    }

    if (provider) {
      const result = await provider.createOrder(shippingData);

      if (result.success) {
        order.shippingDetails = {
          courierName,
          trackingId: result.tracking_code,
          consignmentId: result.consignment_id,
          trackingUrl: result.tracking_url,
          courierStatus: result.status,
        };
        
        order.status = 'Ready for Delivery';
        await order.save();

        // Also update the reseller order to reflect the status and tracking
        resellerOrder.shippingDetails = {
          courierName,
          trackingId: result.tracking_code,
          consignmentId: result.consignment_id,
          trackingUrl: result.tracking_url,
          courierStatus: result.status,
        };
        resellerOrder.status = 'Ready for Delivery';
        await resellerOrder.save();

        return NextResponse.json({ 
          message: `${courierName} booked successfully`, 
          trackingCode: result.tracking_code 
        });
      } else {
        // Release the claim on failure
        await Order.updateOne(
          { _id: order._id },
          { $unset: { 'shippingDetails.courierStatus': '' } }
        );
        return NextResponse.json({ 
            message: result.message || 'Courier booking failed',
            details: result
        }, { status: 400 });
      }
    }

    // Release claim if no provider initialized
    await Order.updateOne(
      { _id: order._id },
      { $unset: { 'shippingDetails.courierStatus': '' } }
    );
    return NextResponse.json({ message: 'Courier provider not properly configured by admin' }, { status: 400 });

  } catch (error: any) {
    console.error('Reseller Courier Booking Exception:', error);
    try {
      const { orderId } = await params;
      const resellerOrder = await ResellerOrder.findById(orderId);
      if (resellerOrder && resellerOrder.motherOrderId) {
         await Order.updateOne(
           { _id: resellerOrder.motherOrderId },
           { $unset: { 'shippingDetails.courierStatus': '' } }
         );
      }
    } catch (e) {
      console.error('Failed to release booking claim:', e);
    }
    return NextResponse.json({ 
      message: 'Internal server error during courier booking',
      debug: error.message 
    }, { status: 500 });
  }
}

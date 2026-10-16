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
    const body = await req.json().catch(() => ({}));

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

    if (!settings || !settings.courierConfig) {
      await Order.updateOne({ _id: order._id }, { $unset: { 'shippingDetails.courierStatus': '' } });
      return NextResponse.json({ message: 'Courier services not configured' }, { status: 400 });
    }

    const { activeProvider, steadfast, pathao, redx } = settings.courierConfig;
    const targetCourier = (body.courier || activeProvider || 'steadfast').toLowerCase();

    // Fetch Reseller profile to check pickup address
    let pickupNote = '';
    const r = await Reseller.findById(resellerId).select('pickupAddress storeName contact courierConfig').lean() as any;
    if (r?.pickupAddress?.address) {
      pickupNote = ` | 🚚 Pickup: ${r.pickupAddress.hubName || r.storeName} (${r.pickupAddress.address}, Ph: ${r.pickupAddress.phone || r.contact?.phone || ''})`;
    }

    const addr = order.shippingAddress || (resellerOrder.customer?.address ? {
      fullName: resellerOrder.customer.name,
      phone: resellerOrder.customer.phone,
      street: resellerOrder.customer.address.street,
      city: resellerOrder.customer.address.city,
      zipCode: resellerOrder.customer.address.zipCode,
    } : {});

    const recipientPhone = (addr.phone || resellerOrder.customer?.phone || '').replace(/\D/g, '').slice(-11);
    
    // Validate required courier fields
    if (!recipientPhone) {
      await Order.updateOne({ _id: order._id }, { $unset: { 'shippingDetails.courierStatus': '' } });
      return NextResponse.json({ message: 'Recipient phone number is required for courier booking' }, { status: 400 });
    }

    const addressParts = [addr.street, addr.city, addr.zipCode].filter(Boolean);
    if (addressParts.length === 0) {
      await Order.updateOne({ _id: order._id }, { $unset: { 'shippingDetails.courierStatus': '' } });
      return NextResponse.json({ message: 'At least one address part (street, city, or zip) is required' }, { status: 400 });
    }

    const itemsNote = (resellerOrder.items || order.items || []).map((i: any) => {
      const variantDesc = [i.color, i.size].filter(Boolean).join('/');
      return `${i.name}${variantDesc ? `(${variantDesc})` : ''}`;
    }).join(', ');

    const customNote = body.note ? `${body.note.trim()} - ` : '';
    const fullNote = `${customNote}${itemsNote.slice(0, 60)}${pickupNote}`;

    const pStoreId = body.store_id || (r?.courierConfig?.pathao?.storeId ? Number(r.courierConfig.pathao.storeId) : undefined) || pathao?.storeId;

    const shippingData = {
      invoice: resellerOrder.shortId || order.shortId || order._id.toString().slice(-8).toUpperCase(),
      recipient_name: addr.fullName || resellerOrder.customer?.name || "Customer",
      recipient_phone: recipientPhone,
      recipient_address: addressParts.join(', '),
      cod_amount: resellerOrder.paymentStatus === 'Paid' || order.paymentStatus === 'Paid' ? 0 : (resellerOrder.totalAmount || order.totalAmount || 0),
      note: fullNote.slice(0, 160),
      // Extra fields for Pathao/RedX
      store_id: pStoreId,
      city_id: body.city_id || 1,
      zone_id: body.zone_id || 1,
      area_id: body.area_id || 1,
      item_weight: body.item_weight || body.weight || 0.5,
    };

    let provider: any = null;
    let courierName = '';

    const sApiKey = r?.courierConfig?.steadfast?.apiKey || steadfast?.apiKey;
    const sSecretKey = r?.courierConfig?.steadfast?.secretKey || steadfast?.secretKey;

    const pClientId = pathao?.clientId;
    const pClientSecret = pathao?.clientSecret;

    const rApiKey = r?.courierConfig?.redx?.apiKey || redx?.apiKey;

    if (targetCourier === 'steadfast') {
      if (!sApiKey || !sSecretKey) {
        await Order.updateOne({ _id: order._id }, { $unset: { 'shippingDetails.courierStatus': '' } });
        return NextResponse.json({ message: 'Steadfast API credentials are not configured in settings.' }, { status: 400 });
      }
      provider = new SteadfastProvider(sApiKey, sSecretKey);
      courierName = 'Steadfast';
    } else if (targetCourier === 'pathao') {
      if (!pClientId || !pClientSecret) {
        await Order.updateOne({ _id: order._id }, { $unset: { 'shippingDetails.courierStatus': '' } });
        return NextResponse.json({ message: 'Pathao API credentials are not configured in settings.' }, { status: 400 });
      }
      provider = new PathaoProvider({
        clientId: pClientId,
        clientSecret: pClientSecret,
        storeId: String(pStoreId || ''),
        username: pathao?.username,
        password: pathao?.password,
        isSandbox: pathao?.isSandbox,
      });
      courierName = 'Pathao';
    } else if (targetCourier === 'redx') {
      if (!rApiKey) {
        await Order.updateOne({ _id: order._id }, { $unset: { 'shippingDetails.courierStatus': '' } });
        return NextResponse.json({ message: 'RedX API key is not configured in settings.' }, { status: 400 });
      }
      provider = new RedXProvider({
        apiKey: rApiKey,
        isSandbox: redx?.isSandbox,
      });
      courierName = 'RedX';
    } else {
      await Order.updateOne({ _id: order._id }, { $unset: { 'shippingDetails.courierStatus': '' } });
      return NextResponse.json({ message: `Unsupported courier: ${targetCourier}` }, { status: 400 });
    }

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
        message: result.message || `${courierName} booking failed`,
        details: result
      }, { status: 400 });
    }

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

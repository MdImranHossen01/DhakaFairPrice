import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Order from '@/models/Order';
import GlobalSettings from '@/models/GlobalSettings';
import { SteadfastProvider } from '@/lib/shipping/providers/steadfast';
import { PathaoProvider } from '@/lib/shipping/providers/pathao';
import { RedXProvider } from '@/lib/shipping/providers/redx';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager', 'moderator'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Connect to DB and fetch order and settings
    await connectToDatabase();
    
    // Check if order exists at all without locking
    const exists = await Order.findById(id);
    if (!exists) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    // Atomically claim the order to prevent concurrent booking requests
    const order = await Order.findOneAndUpdate(
      {
        _id: id,
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
      return NextResponse.json({ message: 'Courier service not configured in Settings.' }, { status: 400 });
    }

    const { steadfast, pathao, redx } = settings.courierConfig;
    const requestedProvider = body.provider || body.courier || (steadfast?.apiKey ? 'steadfast' : pathao?.clientId ? 'pathao' : redx?.apiKey ? 'redx' : 'none');

    let provider = null;
    let courierName = '';

    const addr = order.shippingAddress || {};
    
    // Validate required courier fields
    if (!addr.phone || addr.phone.trim() === "") {
      return NextResponse.json({ message: 'Recipient phone number is required for courier booking' }, { status: 400 });
    }

    const addressParts = [addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean);
    if (addressParts.length === 0) {
      return NextResponse.json({ message: 'At least one address part is required' }, { status: 400 });
    }

    let orderStoreId = body.store_id;
    if (!orderStoreId && order.resellerId) {
      const Reseller = (await import('@/models/Reseller')).default;
      const reseller = await Reseller.findById(order.resellerId);
      if (reseller?.courierConfig?.pathao?.storeId) {
        orderStoreId = Number(reseller.courierConfig.pathao.storeId);
      }
    }

    let pickupNote = '';
    if (order.pickupLocation?.address || order.pickupLocation?.phone) {
      pickupNote = ` | 🚚 Pickup: ${order.pickupLocation.hubName || ''} ${order.pickupLocation.address || ''}, Ph: ${order.pickupLocation.phone || ''}`;
    } else if (order.resellerId) {
      const ResellerModel = (await import('@/models/Reseller')).default;
      const r = await ResellerModel.findById(order.resellerId).select('pickupAddress storeName contact').lean();
      if (r?.pickupAddress?.address) {
        pickupNote = ` | 🚚 Pickup: ${r.pickupAddress.hubName || r.storeName} (${r.pickupAddress.address}, Ph: ${r.pickupAddress.phone || r.contact?.phone || ''})`;
      }
    }

    const shippingData = {
      invoice: order.shortId || order._id.toString().slice(-8).toUpperCase(),
      recipient_name: addr.fullName || "Customer",
      recipient_phone: addr.phone ? addr.phone.replace(/\D/g, '').slice(-11) : "",
      recipient_address: addressParts.join(', '),
      cod_amount: order.paymentStatus === 'Paid' ? 0 : (order.totalAmount || 0),
      note: (body.note ? `${body.note}${pickupNote}` : `Order #${order.shortId || order._id.toString().slice(-8).toUpperCase()} - ${order.paymentMethod || "N/A"}${pickupNote}`).slice(0, 160),
      // Extra fields for Pathao/RedX
      store_id: orderStoreId || pathao?.storeId,
      city_id: body.city_id || 1,
      zone_id: body.zone_id || 1,
      area_id: body.area_id,
      item_weight: body.weight || 0.5,
      item_quantity: (order.items || []).reduce((acc: number, i: any) => acc + (i.quantity || 1), 0) || 1,
    };

    if (requestedProvider === 'steadfast') {
      if (!steadfast?.apiKey || !steadfast?.secretKey) {
        return NextResponse.json({ message: 'Steadfast API credentials (API Key & Secret Key) are missing in Settings > Courier.' }, { status: 400 });
      }
      provider = new SteadfastProvider(steadfast.apiKey, steadfast.secretKey);
      courierName = 'Steadfast';
    } else if (requestedProvider === 'pathao') {
      if (!pathao?.clientId || !pathao?.clientSecret) {
        return NextResponse.json({ message: 'Pathao API credentials (Client ID & Client Secret) are missing in Settings > Courier.' }, { status: 400 });
      }
      provider = new PathaoProvider({
        clientId: pathao.clientId,
        clientSecret: pathao.clientSecret,
        storeId: body.store_id || pathao.storeId,
        username: pathao.username,
        password: pathao.password,
        isSandbox: pathao.isSandbox,
      });
      courierName = 'Pathao';
    } else if (requestedProvider === 'redx') {
      if (!redx?.apiKey) {
        return NextResponse.json({ message: 'RedX API Key is missing in Settings > Courier.' }, { status: 400 });
      }
      provider = new RedXProvider({
        apiKey: redx.apiKey,
        isSandbox: redx.isSandbox,
      });
      courierName = 'RedX';
    } else {
      return NextResponse.json({ message: 'No valid courier provider selected or configured.' }, { status: 400 });
    }

    if (provider) {
      console.log('[Courier Booking] Sending Data to', courierName, shippingData);
      const result = await provider.createOrder(shippingData);
      console.log('[Courier Booking] Provider Response:', result);

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

        // Sync shipping details to ResellerOrder if applicable
        const mongoose = require('mongoose');
        const ResellerOrder = mongoose.models.ResellerOrder || mongoose.model('ResellerOrder');
        await ResellerOrder.updateMany(
          { motherOrderId: order._id },
          { 
            $set: { 
              shippingDetails: order.shippingDetails,
              status: 'Ready for Delivery'
            }
          }
        );

        return NextResponse.json({ 
          message: `${courierName} booked successfully`, 
          trackingCode: result.tracking_code 
        });
      } else {
        console.error('[Courier Booking] Booking Failed:', result.message);
        // Release the claim on failure
        await Order.updateOne(
          { _id: id },
          { $unset: { 'shippingDetails.courierStatus': '' } }
        );
        // Change to 400 so the UI can show the actual error message
        return NextResponse.json({ 
            message: result.message || 'Courier booking failed',
            details: result
        }, { status: 400 });
      }
    }

    // Release claim if no provider initialized
    await Order.updateOne(
      { _id: id },
      { $unset: { 'shippingDetails.courierStatus': '' } }
    );
    console.error('[Courier Booking] No provider initialized. Requested:', requestedProvider);
    return NextResponse.json({ message: 'Courier provider not properly configured or keys missing' }, { status: 400 });

  } catch (error: any) {
    console.error('Courier Booking Exception:', error);
    try {
      const { id } = await params;
      await Order.updateOne(
        { _id: id },
        { $unset: { 'shippingDetails.courierStatus': '' } }
      );
    } catch (e) {
      console.error('Failed to release booking claim:', e);
    }
    return NextResponse.json({ 
      message: 'Internal server error during courier booking',
      debug: error.message 
    }, { status: 500 });
  }
}

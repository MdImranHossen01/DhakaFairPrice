import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import GlobalSettings from '@/models/GlobalSettings';
import { RedXProvider } from '@/lib/shipping/providers/redx';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager', 'moderator'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const settings = await GlobalSettings.findOne();
    const redxConfig = settings?.courierConfig?.redx;

    if (!redxConfig?.apiKey) {
      return NextResponse.json({ 
        message: 'RedX API key is not configured in Settings > Courier.' 
      }, { status: 400 });
    }

    const provider = new RedXProvider({
      apiKey: redxConfig.apiKey,
      isSandbox: redxConfig.isSandbox,
    });

    const searchParams = req.nextUrl.searchParams;
    const postCode = searchParams.get('post_code') || searchParams.get('postCode') || undefined;
    const district = searchParams.get('district') || searchParams.get('district_name') || undefined;
    const search = searchParams.get('search')?.toLowerCase()?.trim() || undefined;

    let areas = await provider.getAreas(postCode, district);

    if (search && Array.isArray(areas)) {
      areas = areas.filter((a: any) => 
        (a.name && a.name.toLowerCase().includes(search)) ||
        (a.post_code && String(a.post_code).includes(search)) ||
        (a.district_name && a.district_name.toLowerCase().includes(search)) ||
        (a.zone_name && a.zone_name.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({ areas: areas || [] });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Error communicating with RedX' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager', 'moderator'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { orderIds, area_id, note, weight } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ message: 'Order IDs are required' }, { status: 400 });
    }

    await connectToDatabase();
    const settings = await GlobalSettings.findOne();
    const redxConfig = settings?.courierConfig?.redx;

    if (!redxConfig?.apiKey) {
      return NextResponse.json({ 
        message: 'RedX API Key is not configured in Settings > Courier.' 
      }, { status: 400 });
    }

    const provider = new RedXProvider({
      apiKey: redxConfig.apiKey,
      isSandbox: redxConfig.isSandbox,
    });

    const results = [];

    for (const orderId of orderIds) {
      try {
        const order = await Order.findById(orderId);
        if (!order) {
          results.push({ id: orderId, success: false, message: 'Order not found' });
          continue;
        }

        if (order.shippingDetails?.consignmentId) {
          results.push({ id: orderId, success: false, message: 'Order already booked with courier' });
          continue;
        }

        const addr = order.shippingAddress || {};
        const addressParts = [addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean);

        // Auto resolve reseller pickup details
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

        const itemsSummary = (order.items || []).map((i: any) => `${i.name} (${i.quantity}x)`).join(', ');

        const shippingData = {
          invoice: order.shortId || order._id.toString().slice(-8).toUpperCase(),
          recipient_name: addr.fullName || 'Customer',
          recipient_phone: addr.phone ? addr.phone.replace(/\D/g, '').slice(-11) : '',
          recipient_address: addressParts.join(', ') || 'Address not provided',
          cod_amount: order.paymentStatus === 'Paid' ? 0 : (order.totalAmount || 0),
          note: (note ? `${note}${pickupNote}` : `Order #${order.shortId || order._id.toString().slice(-8).toUpperCase()} - ${itemsSummary.slice(0, 60)}${pickupNote}`).slice(0, 160),
          area_id: area_id || 1,
          item_weight: weight || 0.5,
          item_quantity: (order.items || []).reduce((acc: number, i: any) => acc + (i.quantity || 1), 0) || 1,
          item_description: itemsSummary.slice(0, 100) || 'Parcel',
        };

        const response = await provider.createOrder(shippingData);

        if (response.success) {
          order.shippingDetails = {
            courierName: 'RedX',
            consignmentId: response.consignment_id?.toString(),
            trackingId: response.tracking_code?.toString(),
            trackingUrl: response.tracking_url || `https://redx.com.bd/track-parcel/?trackingId=${response.tracking_code}`,
            courierStatus: response.status || 'Pending',
          };

          if (['Confirmed', 'Paid', 'Order Placed'].includes(order.status)) {
            order.status = 'Ready for Delivery';
          }

          await order.save();

          // Sync to ResellerOrder if applicable
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

          results.push({
            id: orderId,
            success: true,
            consignment_id: response.consignment_id,
            tracking_code: response.tracking_code,
          });
        } else {
          results.push({
            id: orderId,
            success: false,
            message: response.message || 'RedX booking rejected',
          });
        }
      } catch (err: any) {
        results.push({ id: orderId, success: false, message: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    return NextResponse.json({
      message: `Processed ${results.length} orders. Success: ${successCount}, Failed: ${failCount}`,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

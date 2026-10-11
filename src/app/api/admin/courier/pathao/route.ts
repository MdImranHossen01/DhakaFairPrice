import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import GlobalSettings from '@/models/GlobalSettings';
import { PathaoProvider } from '@/lib/shipping/providers/pathao';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager', 'moderator'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const settings = await GlobalSettings.findOne();
    const pathaoConfig = settings?.courierConfig?.pathao;

    if (!pathaoConfig?.clientId || !pathaoConfig?.clientSecret) {
      return NextResponse.json({ 
        message: 'Pathao API credentials are not configured in Settings > Courier.' 
      }, { status: 400 });
    }

    const provider = new PathaoProvider({
      clientId: pathaoConfig.clientId,
      clientSecret: pathaoConfig.clientSecret,
      storeId: pathaoConfig.storeId,
      username: pathaoConfig.username,
      password: pathaoConfig.password,
      isSandbox: pathaoConfig.isSandbox,
    });

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') || searchParams.get('action') || 'stores';
    const cityId = searchParams.get('cityId') || searchParams.get('city_id');
    const zoneId = searchParams.get('zoneId') || searchParams.get('zone_id');

    if (type === 'stores') {
      const stores = await provider.getStores();
      return NextResponse.json({ stores });
    } else if (type === 'cities') {
      const cities = await provider.getCities();
      return NextResponse.json({ cities });
    } else if (type === 'zones' && cityId) {
      const zones = await provider.getZones(cityId);
      return NextResponse.json({ zones });
    } else if (type === 'areas' && zoneId) {
      const areas = await provider.getAreas(zoneId);
      return NextResponse.json({ areas });
    }

    return NextResponse.json({ message: 'Invalid query parameters' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Error communicating with Pathao' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager', 'moderator'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { orderIds, city_id, zone_id, area_id, store_id, note, weight } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ message: 'Order IDs are required' }, { status: 400 });
    }

    await connectToDatabase();
    const settings = await GlobalSettings.findOne();
    const pathaoConfig = settings?.courierConfig?.pathao;

    if (!pathaoConfig?.clientId || !pathaoConfig?.clientSecret) {
      return NextResponse.json({ 
        message: 'Pathao API credentials (Client ID & Client Secret) are not configured in Settings > Courier.' 
      }, { status: 400 });
    }

    const provider = new PathaoProvider({
      clientId: pathaoConfig.clientId,
      clientSecret: pathaoConfig.clientSecret,
      storeId: store_id || pathaoConfig.storeId,
      username: pathaoConfig.username,
      password: pathaoConfig.password,
      isSandbox: pathaoConfig.isSandbox,
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

        let orderStoreId = store_id;
        if (!orderStoreId && order.resellerId) {
          const Reseller = (await import('@/models/Reseller')).default;
          const reseller = await Reseller.findById(order.resellerId);
          if (reseller?.courierConfig?.pathao?.storeId) {
            orderStoreId = Number(reseller.courierConfig.pathao.storeId);
          }
        }

        const itemsSummary = (order.items || []).map((i: any) => `${i.name} (${i.quantity}x)`).join(', ');

        const shippingData = {
          invoice: order.shortId || order._id.toString().slice(-8).toUpperCase(),
          recipient_name: addr.fullName || 'Customer',
          recipient_phone: addr.phone || '',
          recipient_address: addressParts.join(', ') || 'Address not provided',
          cod_amount: order.paymentStatus === 'Paid' ? 0 : (order.totalAmount || 0),
          note: note || `Order #${order.shortId || order._id.toString().slice(-8).toUpperCase()} - ${itemsSummary.slice(0, 100)}`,
          store_id: orderStoreId || pathaoConfig.storeId,
          city_id: city_id || 1,
          zone_id: zone_id || 1,
          area_id: area_id,
          item_weight: weight || 0.5,
          item_quantity: (order.items || []).reduce((acc: number, i: any) => acc + (i.quantity || 1), 0) || 1,
          item_description: itemsSummary.slice(0, 100) || 'Parcel',
        };

        const response = await provider.createOrder(shippingData);

        if (response.success) {
          order.shippingDetails = {
            courierName: 'Pathao',
            consignmentId: response.consignment_id?.toString(),
            trackingId: response.tracking_code?.toString(),
            trackingUrl: response.tracking_url,
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
            message: response.message || 'Pathao booking rejected',
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

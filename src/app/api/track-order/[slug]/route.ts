import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import { normalizePhoneNumber } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function maskOrder(order: any) {
  const shortId = order.shortId || (order._id ? order._id.toString().slice(-8).toUpperCase() : 'N/A');
  return {
    _id: order._id,
    shortId,
    status: order.status,
    createdAt: order.createdAt,
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    items: (Array.isArray(order.items) ? order.items : []).map((item: any) => ({
      name: item.name,
      quantity: item.quantity,
      image: item.image,
      price: item.price
    })),
    shippingDetails: {
      name: order.shippingAddress?.fullName 
        ? order.shippingAddress.fullName.split(' ')[0] + ' ***' 
        : 'N/A',
      phone: (order.shippingAddress?.phone && /^(\d{3})\d+(\d{4})$/.test(order.shippingAddress.phone)) 
        ? order.shippingAddress.phone.replace(/(\d{3})\d+(\d{4})/, '$1****$2') 
        : (order.shippingAddress?.phone ? order.shippingAddress.phone.slice(0, 3) + '****' + order.shippingAddress.phone.slice(-3) : 'N/A'),
      address: order.shippingAddress 
        ? `${order.shippingAddress.city || 'N/A'}, ${order.shippingAddress.state || 'N/A'}`
        : 'N/A',
      courierName: order.shippingDetails?.courierName,
      trackingUrl: order.shippingDetails?.trackingUrl,
      courierStatus: order.shippingDetails?.courierStatus,
    }
  };
}

/**
 * Public Order Tracking API
 * Supports:
 * 1. Mobile Phone Number (e.g. 017XXXXXXXX, +88017XXXXXXXX, Bangla digits)
 * 2. Full ObjectId
 * 3. Short ID (e.g. 8 hex characters or custom shortId)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    let { slug } = await params;
    if (!slug) {
      return NextResponse.json({ message: 'Order ID or Phone number is required' }, { status: 400 });
    }

    // Clean up slug
    slug = slug.trim().replace(/^#/, '');

    await connectToDatabase();

    const normalizedPhone = normalizePhoneNumber(slug);
    const isPhoneSearch = normalizedPhone.length >= 10 && /^\d+$/.test(normalizedPhone);

    if (isPhoneSearch) {
      const phoneSuffix = normalizedPhone.slice(-10);
      const phoneRegex = new RegExp(phoneSuffix + '$');

      const orders = await Order.find({
        deletedAt: null,
        'shippingAddress.phone': { $regex: phoneRegex }
      })
        .select('status items totalAmount shippingAddress shippingDetails createdAt shortId paymentMethod')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      if (!orders || orders.length === 0) {
        return NextResponse.json({ message: 'No orders found for this mobile number.' }, { status: 404 });
      }

      const maskedOrders = orders.map(maskOrder);
      return NextResponse.json({
        ...maskedOrders[0],
        orders: maskedOrders
      });
    }

    let query: any = { deletedAt: null };

    // 1. Check if it's a full ObjectId
    if (mongoose.isObjectIdOrHexString(slug)) {
      query._id = slug;
    } 
    // 2. Check if it's a short ID (8 hex chars or custom shortId)
    else {
      query = {
        deletedAt: null,
        $or: [
          { shortId: slug.toUpperCase() },
          { shortId: slug },
          ...(slug.length === 8 ? [{
            $expr: {
              $eq: [
                { $substrCP: [{ $toString: "$_id" }, 16, 8] },
                slug.toLowerCase()
              ]
            }
          }] : [])
        ]
      };
    }

    const order = await Order.findOne(query)
      .select('status items totalAmount shippingAddress shippingDetails createdAt shortId paymentMethod')
      .lean();

    if (!order) {
      return NextResponse.json({ message: 'Order not found. Please check your Order ID or Mobile Number.' }, { status: 404 });
    }

    const maskedOrder = maskOrder(order);
    return NextResponse.json({
      ...maskedOrder,
      orders: [maskedOrder]
    });
  } catch (error) {
    console.error('Public Tracking Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import ResellerOrder from '@/models/ResellerOrder';
import { normalizePhoneNumber } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function maskResellerOrder(order: any) {
  return {
    _id: order._id,
    shortId: order.shortId || (order._id ? order._id.toString().slice(-8).toUpperCase() : 'N/A'),
    status: order.status,
    createdAt: order.createdAt,
    totalAmount: order.totalAmount,
    subtotal: order.subtotal,
    deliveryCharge: order.deliveryCharge,
    paymentMethod: order.paymentMethod,
    items: (Array.isArray(order.items) ? order.items : []).map((item: any) => ({
      name: item.name,
      quantity: item.quantity,
      image: item.image,
      retailPrice: item.retailPrice,
      color: item.color,
      size: item.size,
    })),
    shippingDetails: {
      name: order.customer?.name 
        ? order.customer.name.split(' ')[0] + ' ***' 
        : 'N/A',
      phone: (order.customer?.phone && /^(\d{3})\d+(\d{4})$/.test(order.customer.phone)) 
        ? order.customer.phone.replace(/(\d{3})\d+(\d{4})/, '$1****$2') 
        : (order.customer?.phone ? order.customer.phone.slice(0, 3) + '****' + order.customer.phone.slice(-3) : 'N/A'),
      address: order.customer?.address?.city ? `${order.customer.address.city}, Bangladesh` : 'N/A',
      courierName: (order as any).shippingDetails?.courierName,
      trackingUrl: (order as any).shippingDetails?.trackingUrl,
      courierStatus: (order as any).shippingDetails?.courierStatus,
    }
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ subdomain: string; slug: string }> }
) {
  try {
    const { subdomain, slug } = await params;
    if (!subdomain || !slug) {
      return NextResponse.json({ message: 'Missing parameters' }, { status: 400 });
    }

    const cleanSlug = slug.trim().replace(/^#/, '');

    await dbConnect();
    const reseller = await Reseller.findOne({ subdomain, status: 'active' }).lean();
    if (!reseller) {
      return NextResponse.json({ message: 'Store not found' }, { status: 404 });
    }

    const normalizedPhone = normalizePhoneNumber(cleanSlug);
    const isPhoneSearch = normalizedPhone.length >= 10 && /^\d+$/.test(normalizedPhone);

    if (isPhoneSearch) {
      const phoneSuffix = normalizedPhone.slice(-10);
      const phoneRegex = new RegExp(phoneSuffix + '$');

      const orders = await ResellerOrder.find({
        resellerId: reseller._id,
        'customer.phone': { $regex: phoneRegex },
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      if (!orders || orders.length === 0) {
        return NextResponse.json({ message: 'এই মোবাইল নম্বরে কোনো অর্ডার পাওয়া যায়নি।' }, { status: 404 });
      }

      const maskedOrders = orders.map(maskResellerOrder);
      return NextResponse.json({
        ...maskedOrders[0],
        orders: maskedOrders
      });
    }

    const order = await ResellerOrder.findOne({
      resellerId: reseller._id,
      $or: [
        { shortId: cleanSlug.toUpperCase() },
        { shortId: cleanSlug },
        ...(cleanSlug.length === 24 ? [{ _id: cleanSlug }] : [])
      ]
    }).lean();

    if (!order) {
      return NextResponse.json({ message: 'অর্ডার পাওয়া যায়নি। সঠিক আইডি বা মোবাইল নম্বর দিন।' }, { status: 404 });
    }

    const maskedOrder = maskResellerOrder(order);
    return NextResponse.json({
      ...maskedOrder,
      orders: [maskedOrder]
    });
  } catch (error) {
    console.error('[Reseller Public Order Tracking API]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

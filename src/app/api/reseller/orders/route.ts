/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import ResellerOrder from '@/models/ResellerOrder';
import Order from '@/models/Order';
import Reseller from '@/models/Reseller';
import Product from '@/models/Product';
import User from '@/models/User';
import crypto from 'crypto';
import mongoose from 'mongoose';

async function getResellerId(userId: string) {
  await dbConnect();
  const reseller = await Reseller.findOne({ userId });
  if (!reseller) throw new Error('Reseller not found');
  return reseller._id;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resellerId = await getResellerId(session.user.id);
    const searchParams = request.nextUrl.searchParams;

    let page = parseInt(searchParams.get('page') || '1', 10);
    if (isNaN(page) || page < 1) page = 1;

    let limit = parseInt(searchParams.get('limit') || '20', 10);
    if (isNaN(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100;

    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const commissionStatus = searchParams.get('commissionStatus') || '';

    // Auto-sync any existing ResellerOrders whose mother order status was updated
    try {
      const resellerOrdersWithMother = await ResellerOrder.find({
        resellerId,
        motherOrderId: { $exists: true, $ne: null }
      }).select('_id status paymentStatus motherOrderId').lean();

      if (resellerOrdersWithMother.length > 0) {
        const motherIds = resellerOrdersWithMother.map(o => o.motherOrderId).filter(Boolean) as any[];
        const motherOrders = await Order.find({ _id: { $in: motherIds } }).select('_id status paymentStatus').lean();
        const motherMap = new Map(motherOrders.map(m => [m._id.toString(), m]));

        const updatesToRun: Promise<any>[] = [];
        for (const ro of resellerOrdersWithMother) {
          const mother = ro.motherOrderId ? motherMap.get(ro.motherOrderId.toString()) : null;
          if (mother && (ro.status !== mother.status || ro.paymentStatus !== mother.paymentStatus)) {
            const syncUpdate: any = { status: mother.status, paymentStatus: mother.paymentStatus };
            if (mother.status === 'Cancelled') {
              syncUpdate.commissionStatus = 'cancelled';
            } else if (mother.status === 'Delivered' || mother.status === 'Paid') {
              syncUpdate.commissionStatus = 'cleared';
            }
            updatesToRun.push(
              ResellerOrder.updateOne({ _id: ro._id }, { $set: syncUpdate })
            );
          }
        }
        if (updatesToRun.length > 0) {
          await Promise.all(updatesToRun);
        }
      }
    } catch (syncErr) {
      console.error('[Reseller Orders Sync Error]', syncErr);
    }

    const query: Record<string, any> = { resellerId, deletedAt: null };
    if (status) query.status = status;
    if (commissionStatus && commissionStatus !== 'All') query.commissionStatus = commissionStatus;
    if (search) {
      const sanitizedSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      query.$or = [
        { shortId: { $regex: sanitizedSearch, $options: 'i' } },
        { 'customer.phone': { $regex: sanitizedSearch, $options: 'i' } },
        { 'customer.name': { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    const [orders, total, statusAggregation] = await Promise.all([
      ResellerOrder.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({
          path: 'items.productId',
          select: 'uploadedBy'
        })
        .lean(),
      ResellerOrder.countDocuments(query),
      ResellerOrder.aggregate([
        { $match: { resellerId, deletedAt: null } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ])
    ]);

    const statusCounts = {
      all: 0, placed: 0, confirmed: 0, paid: 0, hold: 0, processing: 0, ready: 0, released: 0, delivered: 0, cancelled: 0
    };

    statusAggregation.forEach(item => {
      statusCounts.all += item.count;
      switch (item._id) {
        case 'Order Placed': statusCounts.placed = item.count; break;
        case 'Confirmed': statusCounts.confirmed = item.count; break;
        case 'Paid': statusCounts.paid = item.count; break;
        case 'Hold': statusCounts.hold = item.count; break;
        case 'Processing': statusCounts.processing = item.count; break;
        case 'Ready for Delivery': statusCounts.ready = item.count; break;
        case 'Released for Delivery': statusCounts.released = item.count; break;
        case 'Delivered': statusCounts.delivered = item.count; break;
        case 'Cancelled': statusCounts.cancelled = item.count; break;
      }
    });

    return NextResponse.json({ orders, total, page, limit, statusCounts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resellerId = await getResellerId(session.user.id);
    const { orderId, status, internalNote } = await request.json();

    if (!orderId || !/^[0-9a-fA-F]{24}$/.test(orderId)) {
      return NextResponse.json({ error: 'Missing or malformed orderId' }, { status: 400 });
    }

    const validStatuses = ['Order Placed', 'Confirmed', 'Hold', 'Cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid or unsupported status for reseller' }, { status: 400 });
    }

    const existingOrder = await ResellerOrder.findOne({ _id: orderId, resellerId });
    if (!existingOrder) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    if (status === 'Hold') {
      const finalNote = internalNote !== undefined ? internalNote : existingOrder.internalNote;
      if (!finalNote || !finalNote.trim()) {
        return NextResponse.json({ error: 'An internal note / reason is mandatory when setting order status to Hold' }, { status: 400 });
      }
    }

    const updateFields: any = { status };
    if (internalNote !== undefined) updateFields.internalNote = internalNote;

    const order = await ResellerOrder.findOneAndUpdate(
      { _id: orderId, resellerId },
      { $set: updateFields },
      { new: true }
    );

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // If motherOrderId exists, also sync status & commission
    if (order.motherOrderId) {
      await Order.findByIdAndUpdate(order.motherOrderId, { $set: { status } });
      const { syncResellerCommissionForMotherOrder } = await import('@/lib/resellerCommissionSync');
      await syncResellerCommissionForMotherOrder({
        motherOrderId: order.motherOrderId,
        newStatus: status,
      });
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let sessionConn: mongoose.ClientSession | null = null;
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resellerId = await getResellerId(session.user.id);
    const reseller = await Reseller.findById(resellerId);
    if (!reseller) {
      return NextResponse.json({ error: 'Reseller account not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      customer,
      items,
      deliveryCharge,
      couponDiscount,
      paymentMethod,
      paymentStatus,
      status,
      internalNote,
    } = body;

    if (!customer?.name || !customer?.phone || !customer?.address?.street) {
      return NextResponse.json({ error: 'Customer name, phone, and address are required' }, { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one product item is required' }, { status: 400 });
    }

    await dbConnect();
    const conn = mongoose.connection;
    sessionConn = await conn.startSession();
    sessionConn.startTransaction();

    // 1. Find or create customer User
    const customerPhone = customer.phone.trim();
    const customerEmail = customer.email?.trim() || `${customerPhone}@swapnobaz.com`;

    let customerUser = await User.findOne({
      $or: [
        { phone: customerPhone },
        { email: customerEmail.toLowerCase() }
      ]
    }).session(sessionConn);

    if (!customerUser) {
      const [newUser] = await User.create([{
        name: customer.name.trim(),
        email: customerEmail.toLowerCase(),
        phone: customerPhone,
        role: 'user',
        addresses: [{
          street: customer.address.street.trim(),
          city: customer.address.city || 'Dhaka',
          division: customer.address.division || 'Dhaka',
          country: 'Bangladesh',
          isDefault: true,
        }],
      }], { session: sessionConn });
      customerUser = newUser;
    }

    // 2. Validate Items & Stock & compute totals
    let serverComputedSubtotal = 0;
    let totalCommission = 0;
    const validatedItems: any[] = [];
    const shortId = 'ORD-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    for (const item of items) {
      const product = await Product.findById(item.productId).session(sessionConn);
      if (!product) {
        throw new Error(`Product not found: ${item.name || item.productId}`);
      }

      const hasVariant = !!(item.color || item.size);
      let updatedProduct = null;

      if (hasVariant) {
        updatedProduct = await Product.findOneAndUpdate(
          {
            _id: item.productId,
            variants: {
              $elemMatch: {
                ...(item.color && { color: item.color }),
                ...(item.size && { size: item.size }),
                stock: { $gte: item.quantity }
              }
            }
          },
          { $inc: { 'variants.$.stock': -item.quantity } },
          { session: sessionConn, new: true }
        );

        if (!updatedProduct) {
          throw new Error(`Insufficient stock for ${product.name} (${[item.color, item.size].filter(Boolean).join('/')})`);
        }
      } else {
        updatedProduct = await Product.findOneAndUpdate(
          {
            _id: item.productId,
            stock: { $gte: item.quantity }
          },
          { $inc: { stock: -item.quantity } },
          { session: sessionConn, new: true }
        );

        if (!updatedProduct) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock || 0}`);
        }
      }

      const retailPrice = Number(item.price) || product.salePrice || product.price || 0;
      const purchasePrice = Number(item.purchasePrice) || product.purchasePrice || product.price || 0;
      const itemSubtotal = retailPrice * item.quantity;
      const itemCommission = (retailPrice - purchasePrice) * item.quantity;

      serverComputedSubtotal += itemSubtotal;
      totalCommission += itemCommission;

      validatedItems.push({
        resellerProductId: product._id,
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        retailPrice,
        purchasePrice,
        image: item.image || product.images?.[0] || '',
        color: item.color || undefined,
        size: item.size || undefined,
      });
    }

    const delCharge = Number(deliveryCharge) || 0;
    const discount = Number(couponDiscount) || 0;
    const finalTotal = Math.max(0, serverComputedSubtotal + delCharge - discount);
    const netCommission = Math.max(0, totalCommission - discount);

    // 3. Create Mother Order (for fulfillment & dispatch)
    const [motherOrder] = await Order.create([{
      user: customerUser._id,
      items: validatedItems.map(i => ({
        product: i.productId,
        name: i.name,
        quantity: i.quantity,
        price: i.retailPrice,
        purchasePrice: i.purchasePrice,
        image: i.image,
        color: i.color,
        size: i.size,
      })),
      totalAmount: finalTotal,
      deliveryCharge: delCharge,
      couponDiscountAmount: discount,
      shippingAddress: {
        fullName: customer.name.trim(),
        phone: customerPhone,
        street: customer.address.street.trim(),
        city: customer.address.city || 'Dhaka',
        state: customer.address.division || 'Dhaka',
        division: customer.address.division || 'Dhaka',
        zipCode: customer.address.zipCode || '1200',
        country: 'Bangladesh',
      },
      paymentMethod: paymentMethod || 'COD',
      paymentStatus: paymentStatus || 'Pending',
      status: status || 'Order Placed',
      shortId,
      resellerId: reseller._id,
      internalNote: internalNote || undefined,
      systemNote: `Manual Order by Reseller (${reseller.storeName})`,
      resellerCommission: netCommission,
      commissionStatus: 'pending',
    }], { session: sessionConn });

    // 4. Create ResellerOrder
    const [resellerOrder] = await ResellerOrder.create([{
      resellerId: reseller._id,
      motherOrderId: motherOrder._id,
      customer: {
        name: customer.name.trim(),
        phone: customerPhone,
        email: customerEmail,
        address: {
          street: customer.address.street.trim(),
          city: customer.address.city || 'Dhaka',
          division: customer.address.division || 'Dhaka',
          zipCode: customer.address.zipCode || '1200',
        },
      },
      items: validatedItems,
      subtotal: serverComputedSubtotal,
      deliveryCharge: delCharge,
      couponDiscount: discount,
      totalAmount: finalTotal,
      paymentMethod: paymentMethod || 'COD',
      paymentStatus: paymentStatus || 'Pending',
      status: status || 'Order Placed',
      resellerCommission: netCommission,
      commissionStatus: 'pending',
      shortId,
      internalNote: internalNote || '',
      systemNote: `Manual Order created from Reseller Dashboard`,
    }], { session: sessionConn });

    // 5. Update Reseller stats
    await Reseller.findByIdAndUpdate(reseller._id, {
      $inc: { totalOrders: 1, totalRevenue: finalTotal },
    }, { session: sessionConn });

    // 6. Record Pending Commission in Reseller Wallet
    const ResellerWalletTransaction = (await import('@/models/ResellerWalletTransaction')).default;
    await ResellerWalletTransaction.create([{
      resellerId: reseller._id,
      type: 'commission_earned',
      amount: netCommission,
      orderId: resellerOrder._id,
      description: `Commission from manual order ${shortId}`,
      status: 'pending',
    }], { session: sessionConn });

    await sessionConn.commitTransaction();
    sessionConn.endSession();

    return NextResponse.json({
      success: true,
      message: 'Manual order created successfully!',
      order: resellerOrder,
    });
  } catch (error: any) {
    if (sessionConn) {
      await sessionConn.abortTransaction();
      sessionConn.endSession();
    }
    console.error('Error creating reseller manual order:', error);
    return NextResponse.json({ error: error.message || 'Failed to create manual order' }, { status: 500 });
  }
}

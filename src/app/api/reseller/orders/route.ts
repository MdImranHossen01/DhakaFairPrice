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
      const cleanSearch = search.trim();
      const sanitizedSearch = cleanSearch.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const withoutHash = cleanSearch.startsWith('#') ? cleanSearch.substring(1).trim() : cleanSearch;
      const sanitizedWithoutHash = withoutHash.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

      query.$or = [
        { shortId: { $regex: sanitizedWithoutHash, $options: 'i' } },
        { 'customer.phone': { $regex: sanitizedSearch, $options: 'i' } },
        { 'customer.name': { $regex: sanitizedSearch, $options: 'i' } },
        { 'customer.email': { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    const [orders, total, statusAggregation] = await Promise.all([
      ResellerOrder.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('resellerId', 'storeName subdomain customDomain')
        .populate({
          path: 'motherOrderId',
          select: 'storefrontResellerId resellerId orderSource shortId systemNote totalAmount deliveryCharge courierCharge isFreeDelivery systemFee resellerCommission',
          populate: [
            {
              path: 'storefrontResellerId',
              select: 'storeName subdomain customDomain'
            },
            {
              path: 'resellerId',
              select: 'storeName subdomain customDomain'
            }
          ]
        })
        .populate({
          path: 'items.productId',
          select: 'name uploadedBy isMotherProduct',
          populate: {
            path: 'uploadedBy',
            select: 'storeName subdomain customDomain'
          }
        })
        .lean(),
      ResellerOrder.countDocuments(query),
      ResellerOrder.aggregate([
        { $match: { resellerId, deletedAt: null } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ])
    ]);

    // Collect motherOrderIds to fetch sibling reseller orders for comprehensive disbursement breakdown
    const motherOrderIds = orders
      .map((o: any) => o.motherOrderId?._id || o.motherOrderId)
      .filter(Boolean);

    let siblingRos: any[] = [];
    if (motherOrderIds.length > 0) {
      siblingRos = await ResellerOrder.find({
        motherOrderId: { $in: motherOrderIds },
        deletedAt: null
      })
      .select('motherOrderId shortId resellerId resellerCommission systemFee commissionStatus')
      .populate('resellerId', 'storeName subdomain')
      .lean();
    }

    const processedOrders = orders.map((order: any) => {
      const motherOrder = order.motherOrderId;
      const mId = motherOrder?._id?.toString() || motherOrder?.toString();
      
      const relatedRos = siblingRos.filter((r: any) =>
        r.motherOrderId?.toString() === mId
      );

      // Find storefront order and fulfillment orders
      const storefrontRo = relatedRos.find((r: any) => !r.shortId?.includes('-F'))
        || (order.shortId && !order.shortId.includes('-F') ? order : null);

      const fulfillmentRos = relatedRos.filter((r: any) =>
        r.shortId?.includes('-F') || (storefrontRo && r._id.toString() !== storefrontRo._id.toString())
      );

      // Order value & delivery from mother order (or fallback to this order)
      const isFreeDelivery = Boolean(motherOrder?.isFreeDelivery || order.isFreeDelivery);
      const orderValue = Math.round(Number(motherOrder?.totalAmount) || Number(order.totalAmount) || 0);
      const deliveryCharge = Math.round(Number(motherOrder?.courierCharge || order.courierCharge || motherOrder?.deliveryCharge || order.deliveryCharge) || 0);
      const motherFee = Math.round(
        Number(motherOrder?.systemFee) ||
        Number(order.systemFee) ||
        relatedRos.reduce((sum: number, r: any) => sum + (Number(r.systemFee) || 0), 0) ||
        0
      );

      // Supplier
      let supplierPart: { name: string; amount: number; isYou?: boolean; status?: string } | null = null;
      if (fulfillmentRos.length > 0) {
        const firstF = fulfillmentRos[0];
        const supName = (firstF.resellerId as any)?.storeName || 'Supplier';
        const totalSupAmount = fulfillmentRos.reduce((sum: number, f: any) => sum + (Number(f.resellerCommission) || 0), 0);
        const isYou = firstF.resellerId?._id?.toString() === resellerId.toString() || firstF.resellerId?.toString() === resellerId.toString();
        supplierPart = {
          name: supName,
          amount: Math.round(totalSupAmount),
          isYou,
          status: firstF.commissionStatus || 'pending'
        };
      }

      // Seller (Storefront)
      let sellerPart: { name: string; amount: number; isYou?: boolean; status?: string } | null = null;
      if (storefrontRo) {
        const sellerName = (storefrontRo.resellerId as any)?.storeName || 'Storefront Reseller';
        const isYou = storefrontRo.resellerId?._id?.toString() === resellerId.toString() || storefrontRo.resellerId?.toString() === resellerId.toString();
        sellerPart = {
          name: sellerName,
          amount: Math.round(Number(storefrontRo.resellerCommission) || 0),
          isYou,
          status: storefrontRo.commissionStatus || 'pending'
        };
      } else if (!order.shortId?.includes('-F')) {
        sellerPart = {
          name: (order.resellerId as any)?.storeName || 'Storefront Reseller',
          amount: Math.round(Number(order.resellerCommission) || 0),
          isYou: true,
          status: order.commissionStatus || 'pending'
        };
      }

      const isOwnProductSale = !supplierPart && !!sellerPart && (motherFee > 0 || Number(order.systemFee) > 0);

      const disbursement = {
        orderValue,
        deliveryCharge,
        courierCharge: deliveryCharge,
        isFreeDelivery,
        supplier: supplierPart,
        seller: sellerPart,
        isOwnProductSale,
        motherFee,
        motherProfit: 0, // Never leak platform internal margins to reseller
      };

      return {
        ...order,
        disbursement,
        fullOrderValue: orderValue,
      };
    });

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

    return NextResponse.json({ orders: processedOrders, total, page, limit, statusCounts });
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
    const guestDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'guest.com';
    const customerEmail = customer.email?.trim() || `${customerPhone}@${guestDomain}`;

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

    let serverComputedSubtotal = 0;
    let totalCommission = 0;
    let totalOwnProductSystemFee = 0;
    const validatedItems: any[] = [];
    const uploaderItemsMap = new Map<string, any[]>();
    const shortId = 'ORD-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    const resellerFeeRate = reseller.systemFeePercent !== undefined 
      ? reseller.systemFeePercent 
      : (reseller.commissionRate ?? 15);

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

      const uploaderId = product.uploadedBy ? product.uploadedBy.toString() : null;
      const isOwnProduct = !!(uploaderId && uploaderId === reseller._id.toString());
      let itemCommission = 0;
      let itemSystemFee = 0;

      if (isOwnProduct) {
        // Reseller is selling their OWN uploaded product on their own storefront
        // Calculate platform system fee on the retail selling price to protect against base price manipulation
        itemSystemFee = Math.round(retailPrice * (resellerFeeRate / 100)) * item.quantity;
        totalOwnProductSystemFee += itemSystemFee;
        itemCommission = (retailPrice * item.quantity) - itemSystemFee;
      } else {
        itemCommission = (retailPrice - purchasePrice) * item.quantity;
      }

      serverComputedSubtotal += itemSubtotal;
      totalCommission += itemCommission;

      const validatedItem = {
        resellerProductId: product._id,
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        retailPrice,
        purchasePrice: isOwnProduct ? (Number(product.purchasePrice) || 0) : purchasePrice,
        image: item.image || product.images?.[0] || '',
        color: item.color || undefined,
        size: item.size || undefined,
        systemFee: itemSystemFee,
      };

      validatedItems.push(validatedItem);

      if (uploaderId && uploaderId !== reseller._id.toString()) {
        if (!uploaderItemsMap.has(uploaderId)) {
          uploaderItemsMap.set(uploaderId, []);
        }
        uploaderItemsMap.get(uploaderId)!.push({
          ...validatedItem,
          retailPrice: purchasePrice,
          purchasePrice: product.purchasePrice || 0,
        });
      }
    }

    const delCharge = Number(deliveryCharge) || 0;
    const discount = Number(couponDiscount) || 0;
    const finalTotal = Math.max(0, serverComputedSubtotal + delCharge - discount);
    const netCommission = Math.max(0, totalCommission - discount);

    // Deduct product stock immediately upon order placement
    const { deductStockForOrderItems } = await import('@/lib/stockHelper');
    await deductStockForOrderItems({
      items: validatedItems.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        name: i.name,
        color: i.color,
        size: i.size,
      })),
      session: sessionConn,
      skipResellerSync: true,
    });

    const isPaidOrValidSale = (paymentStatus === 'Paid' || ['Confirmed', 'Delivered'].includes(status || '')) && status !== 'Cancelled';

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
      systemFee: totalOwnProductSystemFee,
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
      systemFee: totalOwnProductSystemFee,
      commissionStatus: 'pending',
      shortId,
      internalNote: internalNote || '',
      systemNote: totalOwnProductSystemFee > 0
        ? `Manual Order created from Reseller Dashboard - Own Product (Earnings: ৳${netCommission}, System Fee: ৳${totalOwnProductSystemFee})`
        : `Manual Order created from Reseller Dashboard`,
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

    // 7. Create Fulfillment Orders for other resellers whose products were included
    let fIndex = 1;
    for (const [uploaderId, fItems] of uploaderItemsMap.entries()) {
      const uploaderSubtotal = fItems.reduce((sum, item) => sum + item.retailPrice * item.quantity, 0);
      // Base product payout to uploader reseller
      const uploaderCommission = fItems.reduce((sum, item) => sum + (Number(item.purchasePrice) || 0) * item.quantity, 0);

      const [uploaderRO] = (await ResellerOrder.create([{
        resellerId: uploaderId,
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
        items: fItems,
        subtotal: uploaderCommission,
        deliveryCharge: 0,
        totalAmount: uploaderCommission,
        paymentMethod: paymentMethod || 'COD',
        paymentStatus: paymentStatus || 'Pending',
        status: status || 'Order Placed',
        resellerCommission: uploaderCommission,
        commissionStatus: 'pending',
        shortId: `${shortId}-F${fIndex}`,
        internalNote: '',
        systemNote: `Fulfillment for Manual Order (${reseller.storeName} - ${shortId})`,
      }], { session: sessionConn })) as any[];

      await Reseller.findByIdAndUpdate(uploaderId, {
        $inc: {
          totalOrders: 1,
          totalRevenue: uploaderCommission,
          pendingBalance: uploaderCommission,
        },
      }, { session: sessionConn });

      if (uploaderCommission > 0) {
        await ResellerWalletTransaction.create([{
          resellerId: uploaderId,
          type: 'commission_earned',
          amount: uploaderCommission,
          orderId: uploaderRO._id,
          description: `Commission from fulfillment order ${shortId}-F${fIndex}`,
          status: 'pending',
        }], { session: sessionConn });
      }

      fIndex++;
    }

    if (isPaidOrValidSale) {
      const { countSalesForOrder } = await import('@/lib/stockHelper');
      await countSalesForOrder({ orderId: motherOrder._id, session: sessionConn });
    }

    await sessionConn.commitTransaction();
    sessionConn.endSession();

    // Clean up matching abandoned cart for this customer on this reseller store
    try {
      const cleanCustPhone = (customerPhone || '').replace(/\s+/g, '').trim();
      if (cleanCustPhone) {
        const AbandonedCart = (await import('@/models/AbandonedCart')).default;
        await AbandonedCart.deleteMany({ phone: cleanCustPhone, resellerId: reseller._id });
      }
    } catch (cartErr) {
      console.error('[AbandonedCart cleanup error in reseller manual order]', cartErr);
    }

    // Sync updated stock to all reseller stores for affected products
    try {
      const { syncProductToResellers } = await import('@/lib/syncEngine');
      const uniqueProductIds = Array.from(new Set(validatedItems.map(i => (i.productId?._id || i.productId).toString())));
      for (const pId of uniqueProductIds) {
        await syncProductToResellers(pId).catch(err => console.error('[Reseller Sync Error]', err));
      }
    } catch (syncErr) {
      console.error('[Sync Error after manual order creation]', syncErr);
    }

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

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import ResellerProduct from '@/models/ResellerProduct';
import ResellerOrder from '@/models/ResellerOrder';
import Order from '@/models/Order';
import AbandonedCart from '@/models/AbandonedCart';

function generateShortId() {
  return 'RS' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { cartId } = await req.json();
    if (!cartId) {
      return NextResponse.json({ message: 'Cart ID is required' }, { status: 400 });
    }

    await dbConnect();

    const reseller = await Reseller.findOne({ userId: session.user.id });
    if (!reseller) {
      return NextResponse.json({ message: 'Reseller not found' }, { status: 404 });
    }

    const cart = await AbandonedCart.findOne({ _id: cartId, resellerId: reseller._id });
    if (!cart) {
      return NextResponse.json({ message: 'Abandoned cart not found' }, { status: 404 });
    }

    const items = cart.items;
    if (!items || items.length === 0) {
      return NextResponse.json({ message: 'Cart is empty' }, { status: 400 });
    }

    // `item.product` stores the `ResellerProduct` ID (because the frontend storefront added it to cart).
    const resellerProductIds = items.map((i: any) => i.product).filter(Boolean);
    const rps = await ResellerProduct.find({
      _id: { $in: resellerProductIds },
      resellerId: reseller._id,
      isPublished: true,
      isAvailableOnMother: true,
    }).populate('productId');

    const rpMap = new Map(rps.map(rp => [rp._id.toString(), rp]));

    const validatedItems = [];
    let totalCommission = 0;

    for (const item of items) {
      const qty = parseInt(item.quantity as any, 10);
      if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) continue;

      const rp = rpMap.get(String(item.product));
      if (!rp) continue;

      if (rp.stock < qty) {
        return NextResponse.json({ message: `Requested quantity for "${rp.name}" exceeds available stock. Only ${rp.stock} left.` }, { status: 400 });
      }

      const commission = (rp.retailPrice - rp.purchasePrice) * qty;
      totalCommission += commission;

      const productDoc = rp.productId as any;

      validatedItems.push({
        resellerProductId: rp._id,
        productId: productDoc?._id || rp.productId,
        name: rp.name,
        quantity: qty,
        retailPrice: rp.retailPrice,
        purchasePrice: rp.purchasePrice,
        image: rp.images?.[0] || item.image,
        color: item.color || undefined,
        size: item.size || undefined,
      });
    }

    if (validatedItems.length === 0) {
      return NextResponse.json({ message: 'No valid items found' }, { status: 400 });
    }

    const calculatedSubtotal = validatedItems.reduce((sum, item) => sum + item.retailPrice * item.quantity, 0);

    const insideCharge = reseller.deliveryConfig?.insideDhaka ?? 60;
    const outsideCharge = reseller.deliveryConfig?.outsideDhaka ?? 120;
    const freeThreshold = reseller.deliveryConfig?.freeDeliveryThreshold ?? 0;

    let calculatedDeliveryCharge = cart.deliveryArea === 'inside' ? insideCharge : outsideCharge;
    if (freeThreshold > 0 && calculatedSubtotal >= freeThreshold) {
      calculatedDeliveryCharge = 0;
    }

    const calculatedTotalAmount = calculatedSubtotal + calculatedDeliveryCharge;
    const shortId = generateShortId();

    const mongoose = (await import('mongoose')).default;
    const { normalizePhoneNumber } = await import('@/lib/utils');
    const User = (await import('@/models/User')).default;

    const normalizedPhone = normalizePhoneNumber(cart.phone);
    const customerPhone = normalizedPhone || cart.phone;

    const sessionConn = await mongoose.startSession();
    sessionConn.startTransaction();

    try {
      // Find or auto-create customer user account
      let customerUser = await User.findOne({
        $or: [
          ...(customerPhone ? [{ phone: customerPhone }] : []),
          ...(cart.email ? [{ email: cart.email.toLowerCase().trim() }] : []),
          ...(customerPhone ? [{ email: `${customerPhone}@store.com` }] : []),
          ...(customerPhone ? [{ email: `${customerPhone}@swapnobaz.com` }] : [])
        ]
      }).session(sessionConn);

      if (!customerUser && customerPhone) {
        const [newUser] = await User.create([{
          name: cart.fullName || 'Customer',
          email: cart.email ? cart.email.toLowerCase().trim() : `${customerPhone}@store.com`,
          phone: customerPhone,
          role: 'user',
          addresses: [{
            street: cart.street || '',
            city: '',
            division: '',
            country: 'Bangladesh',
            isDefault: true
          }]
        }], { session: sessionConn });
        customerUser = newUser;
      }

      // Create Mother Order for Admin fulfillment & dispatch
      const [motherOrder] = await Order.create([{
        user: customerUser?._id,
        shortId,
        items: validatedItems.map(item => ({
          product: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.retailPrice,
          purchasePrice: item.purchasePrice,
          image: item.image,
          color: item.color,
          size: item.size,
        })),
        totalAmount: calculatedTotalAmount,
        deliveryCharge: calculatedDeliveryCharge,
        shippingAddress: {
          fullName: cart.fullName || 'Customer',
          phone: customerPhone,
          street: cart.street || '',
          city: '',
          state: '',
          division: '',
          zipCode: '0000',
          country: 'Bangladesh',
        },
        paymentMethod: 'COD', // Default to COD for abandoned cart confirms
        paymentStatus: 'Pending',
        status: 'Order Placed',
        resellerId: reseller._id,
        systemNote: `Recovered from Abandoned Cart by Reseller (${reseller.storeName})`,
        internalNote: '',
      }], { session: sessionConn });

      const customerDetails = {
        name: cart.fullName || 'Customer',
        phone: customerPhone,
        email: cart.email,
        address: {
          street: cart.street || '',
          city: '',
          division: '',
          zipCode: '',
        }
      };

      const [resellerOrder] = await ResellerOrder.create([{
        resellerId: reseller._id,
        motherOrderId: motherOrder._id,
        customer: customerDetails,
        items: validatedItems,
        subtotal: calculatedSubtotal,
        deliveryCharge: calculatedDeliveryCharge,
        totalAmount: calculatedTotalAmount,
        paymentMethod: 'COD',
        paymentStatus: 'Pending',
        status: 'Order Placed',
        resellerCommission: totalCommission,
        commissionStatus: 'pending',
        shortId,
        systemNote: 'Recovered from Abandoned Cart',
        internalNote: '',
      }], { session: sessionConn });

      // Delete the abandoned cart
      await AbandonedCart.findByIdAndDelete(cartId, { session: sessionConn });

      await sessionConn.commitTransaction();
      
      return NextResponse.json({ message: 'Order confirmed successfully', orderId: resellerOrder._id });
    } catch (txError) {
      await sessionConn.abortTransaction();
      throw txError;
    } finally {
      sessionConn.endSession();
    }
  } catch (error: any) {
    console.error('Error confirming abandoned cart:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import GlobalSettings from '@/models/GlobalSettings';
import { auth } from '@/auth';
import { normalizePhoneNumber } from '@/lib/utils';
import crypto from 'crypto';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await auth();
    const body = await req.json();

    const {
      productId,
      quantity = 1,
      color,
      size,
      fullName,
      phone,
      street,
      city,
      state,
      division,
      notes,
    } = body;

    // Validate essential fields
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json({ error: 'Valid Product is required' }, { status: 400 });
    }

    const cleanName = (fullName || '').trim();
    if (!cleanName || cleanName.length < 2) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone || normalizedPhone.length < 10) {
      return NextResponse.json({ error: 'Valid phone number is required' }, { status: 400 });
    }

    const cleanStreet = (street || '').trim();
    const cleanCity = (city || 'Dhaka').trim();
    if (!cleanStreet) {
      return NextResponse.json({ error: 'Delivery address is required' }, { status: 400 });
    }

    await connectToDatabase();

    // 1. Fetch Product and verify stock
    const product = await Product.findById(productId);
    if (!product || !product.isPublished) {
      return NextResponse.json({ error: 'Product is not available' }, { status: 404 });
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    let matchedVariant: any = null;

    if (product.variants && product.variants.length > 0) {
      if (color || size) {
        matchedVariant = product.variants.find((v: any) => {
          const matchColor = color ? String(v.color || '').trim().toLowerCase() === String(color).trim().toLowerCase() : true;
          const matchSize = size ? String(v.size || '').trim().toLowerCase() === String(size).trim().toLowerCase() : true;
          return matchColor && matchSize;
        });
      }
      if (!matchedVariant) {
        // Fallback to first in-stock variant
        matchedVariant = product.variants.find((v: any) => v.stock >= qty) || product.variants[0];
      }

      if (matchedVariant && matchedVariant.stock < qty) {
        return NextResponse.json({ error: `Selected variant is out of stock (Available: ${matchedVariant.stock})` }, { status: 400 });
      }
    } else {
      if (product.stock < qty) {
        return NextResponse.json({ error: `Product is out of stock (Available: ${product.stock})` }, { status: 400 });
      }
    }

    const itemPrice = matchedVariant?.price || product.salePrice || product.price;
    const itemTotal = itemPrice * qty;

    // 2. Fetch Global Settings for Delivery Charge
    const settings = await GlobalSettings.findOne().lean();
    const cityLower = cleanCity.toLowerCase();
    const isDhaka = cityLower.includes('dhaka') && !cityLower.includes('outside');
    const freeDeliveryThreshold = settings?.freeDeliveryThreshold || 0;
    const isFreeDelivery = freeDeliveryThreshold > 0 && itemTotal >= freeDeliveryThreshold;

    const chargeInsideDhaka = settings?.deliveryChargeInsideDhaka ?? 60;
    const chargeOutsideDhaka = settings?.deliveryChargeOutsideDhaka ?? 120;
    const deliveryCharge = isFreeDelivery ? 0 : (isDhaka ? chargeInsideDhaka : chargeOutsideDhaka);
    const totalAmount = itemTotal + deliveryCharge;

    // 3. User association or guest creation
    let targetUser: any = null;
    if (sessionUser?.user?.id) {
      targetUser = await User.findById(sessionUser.user.id);
    }

    if (!targetUser) {
      targetUser = await User.findOne({
        $or: [
          { phone: normalizedPhone },
          { email: `${normalizedPhone}@swapnobaz.com` },
        ]
      });

      if (!targetUser) {
        targetUser = await User.create({
          name: cleanName,
          email: `${normalizedPhone}@swapnobaz.com`,
          phone: normalizedPhone,
          role: 'user',
          addresses: [{
            street: cleanStreet,
            city: cleanCity,
            state: state || cleanCity,
            division: division || 'Dhaka',
            country: 'Bangladesh',
            isDefault: true,
          }],
        });
      }
    }

    // 4. Generate unique shortId
    const shortId = crypto.randomBytes(4).toString('hex').toUpperCase();

    // 5. Construct order items
    const orderItems = [
      {
        product: product._id,
        name: product.name,
        quantity: qty,
        price: itemPrice,
        purchasePrice: matchedVariant?.purchasePrice || product.purchasePrice || 0,
        image: product.images?.[0] || '',
        color: matchedVariant?.color || color || undefined,
        size: matchedVariant?.size || size || undefined,
      }
    ];

    // 6. Create Order in Database
    const newOrder = await Order.create({
      user: targetUser?._id,
      shortId,
      items: orderItems,
      deliveryCharge,
      totalAmount,
      paymentMethod: 'COD',
      paymentStatus: 'Pending',
      status: 'Order Placed',
      shippingAddress: {
        fullName: cleanName,
        phone: normalizedPhone,
        street: cleanStreet,
        city: cleanCity,
        state: state || cleanCity,
        division: division || state || cleanCity,
        zipCode: '0000',
        country: 'Bangladesh',
      },
      customerNote: notes || 'Direct Order placed via Swapnobaz AI Assistant',
      systemNote: 'AI Chat Assistant Order Placement',
    });

    // 7. Deduct stock safely
    try {
      if (matchedVariant?._id) {
        await Product.updateOne(
          { _id: product._id, "variants._id": matchedVariant._id },
          { $inc: { "variants.$.stock": -qty, stock: -qty } }
        );
      } else {
        await Product.updateOne(
          { _id: product._id },
          { $inc: { stock: -qty } }
        );
      }
    } catch (stockErr) {
      console.error('Failed to deduct stock for AI order:', stockErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Order placed successfully!',
      order: {
        _id: newOrder._id,
        shortId: newOrder.shortId,
        totalAmount: newOrder.totalAmount,
        deliveryCharge: newOrder.deliveryCharge,
        status: newOrder.status,
        createdAt: newOrder.createdAt,
        items: newOrder.items,
        shippingAddress: newOrder.shippingAddress,
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('AI Place Order API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to place order' }, { status: 500 });
  }
}

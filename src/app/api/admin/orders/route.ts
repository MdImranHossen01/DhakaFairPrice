import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import crypto from 'crypto';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  let session: mongoose.ClientSession | null = null;

  try {
    const sessionUser = await auth();
    const userRole = (sessionUser?.user as any)?.role;

    if (!sessionUser?.user || !(['admin', 'super_admin', 'manager', 'showroom_manager'].includes(userRole))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      shippingAddress,
      items,
      paymentMethod,
      paymentStatus,
      status,
      deliveryCharge,
      couponDiscountAmount,
      internalNote
    } = body;

    // Validate minimum required fields
    if (!shippingAddress?.fullName || !shippingAddress?.phone || !shippingAddress?.email) {
      return NextResponse.json({ message: 'Customer name, phone, and email are required.' }, { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: 'At least one product item is required.' }, { status: 400 });
    }

    const conn = await connectToDatabase();

    session = await conn.startSession();
    if (!session) {
      throw new Error('Failed to start database session');
    }
    session.startTransaction();

    // 1. Check or Create User
    let user = await User.findOne({
      $or: [
        { email: shippingAddress.email.toLowerCase() },
        { phone: shippingAddress.phone }
      ]
    }).session(session);

    if (!user) {
      const [newUser] = await User.create(
        [
          {
            name: shippingAddress.fullName,
            email: shippingAddress.email.toLowerCase(),
            phone: shippingAddress.phone,
            role: 'user',
            addresses: [
              {
                street: shippingAddress.street || 'Manual Order',
                city: shippingAddress.city || 'Unknown',
                state: shippingAddress.state || 'Unknown',
                division: shippingAddress.division || 'Unknown',
                country: shippingAddress.country || 'Bangladesh',
                isDefault: true
              }
            ]
          }
        ],
        { session }
      );
      user = newUser;
    }

    // 2. Validate Items & Stock, Calculate Total
    let serverComputedTotal = 0;
    const validatedItems = [];

    // Group items by product/variant to validate combined stock
    const groupedItems: Record<string, any> = {};
    for (const item of items) {
      const key = `${item.product}-${String(item.color || '').trim()}-${String(item.size || '').trim()}`;
      if (groupedItems[key]) {
        groupedItems[key].quantity += item.quantity;
      } else {
        groupedItems[key] = { ...item };
      }
    }

    // Pre-check stock & verify prices
    for (const key in groupedItems) {
      const item = groupedItems[key];
      const product = await Product.findOne({ _id: item.product }).session(session);
      if (!product) {
        throw new Error(`Product not found: ${item.name}`);
      }

      if (item.color || item.size) {
        const variant = product.variants?.find(
          (v: any) =>
            String(v.color || '').trim() === String(item.color || '').trim() &&
            String(v.size || '').trim() === String(item.size || '').trim()
        );
        if (!variant || (variant.stock || 0) < item.quantity) {
          const variantDesc = [item.color, item.size].filter(Boolean).join(' / ');
          throw new Error(
            `Insufficient stock for ${product.name}${variantDesc ? ` (${variantDesc})` : ''}. Available: ${variant?.stock || 0}`
          );
        }
      } else {
        if ((product.stock || 0) < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock || 0}`);
        }
      }
    }

    // Deduct stock and build validated items list
    for (const item of items) {
      const product = await Product.findOne({ _id: item.product }).session(session);
      if (!product) {
        throw new Error(`Product not found: ${item.name}`);
      }

      const hasVariant = !!(item.color || item.size);
      let updatedProduct = null;

      if (hasVariant) {
        updatedProduct = await Product.findOneAndUpdate(
          {
            _id: item.product,
            variants: {
              $elemMatch: {
                ...(item.color && { color: item.color }),
                ...(item.size && { size: item.size }),
                stock: { $gte: item.quantity }
              }
            }
          },
          { $inc: { 'variants.$.stock': -item.quantity } },
          { session, new: true }
        );

        if (!updatedProduct) {
          throw new Error(`Failed to deduct stock for ${item.name} (variant: ${item.color}/${item.size})`);
        }

      } else {
        updatedProduct = await Product.findOneAndUpdate(
          {
            _id: item.product,
            stock: { $gte: item.quantity }
          },
          { $inc: { stock: -item.quantity } },
          { session, new: true }
        );

        if (!updatedProduct) {
          throw new Error(`Failed to deduct stock for ${item.name}`);
        }
      }

      const itemPrice = item.price || product.salePrice || product.price;
      const purchasePrice = product.purchasePrice || 0;

      serverComputedTotal += itemPrice * item.quantity;

      validatedItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: itemPrice,
        purchasePrice,
        image: item.image || product.images?.[0] || '',
        color: item.color || undefined,
        size: item.size || undefined
      });
    }

    // Final total calculation
    const delCharge = Number(deliveryCharge) || 0;
    const discount = Number(couponDiscountAmount) || 0;
    const finalTotalAmount = Math.max(0, serverComputedTotal + delCharge - discount);

    // Create the Order
    const [newOrder] = await Order.create(
      [
        {
          user: user._id,
          items: validatedItems,
          totalAmount: finalTotalAmount,
          deliveryCharge: delCharge,
          couponDiscountAmount: discount,
          shippingAddress: {
            fullName: shippingAddress.fullName,
            phone: shippingAddress.phone,
            email: shippingAddress.email,
            street: shippingAddress.street || 'Manual Order',
            city: shippingAddress.city || 'Unknown',
            state: shippingAddress.state || 'Unknown',
            division: shippingAddress.division || 'Unknown',
            zipCode: shippingAddress.zipCode || '0000',
            country: shippingAddress.country || 'Bangladesh'
          },
          paymentMethod: paymentMethod || 'COD',
          paymentStatus: paymentStatus || 'Pending',
          status: status || 'Order Placed',
          shortId: crypto.randomBytes(4).toString('hex').toUpperCase(),
          internalNote: internalNote || undefined
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({
      success: true,
      message: 'Manual order created successfully!',
      order: newOrder
    });
  } catch (error: any) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

    console.error('Error creating manual order:', error);
    return NextResponse.json({ message: error.message || 'Failed to create manual order' }, { status: 500 });
  }
}

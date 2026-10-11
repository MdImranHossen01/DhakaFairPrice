import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import ResellerProduct from '@/models/ResellerProduct';
import ResellerOrder from '@/models/ResellerOrder';
import ResellerCoupon from '@/models/ResellerCoupon';
import ResellerWalletTransaction from '@/models/ResellerWalletTransaction';
import Order from '@/models/Order';
import WalletTransaction from '@/models/WalletTransaction';

function generateShortId() {
  return 'RS' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

/**
 * POST /api/store/[subdomain]/orders
 * Places an order on a reseller's storefront.
 * Calculates commissions, handles coupons, loyalty tokens, and queues the order for Mother routing.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await params;
    await dbConnect();

    const reseller = await Reseller.findOne({ subdomain, status: 'active' });
    if (!reseller) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const body = await request.json();
    const { customer, items, paymentMethod, notes, deliveryArea, couponCode, useWallet } = body;

    if (!customer?.name || !customer?.phone || !customer?.address?.street) {
      return NextResponse.json({ error: 'Customer details incomplete' }, { status: 400 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 });
    }

    // Fetch all ResellerProducts in a single query with populated productId
    const resellerProductIds = items.map((i: any) => i.resellerProductId).filter(Boolean);
    const rps = await ResellerProduct.find({
      _id: { $in: resellerProductIds },
      resellerId: reseller._id,
      isPublished: true,
      isAvailableOnMother: true,
    }).populate('productId');

    const rpMap = new Map(rps.map(rp => [rp._id.toString(), rp]));

    // Validate each item against ResellerProduct and calculate commission
    const validatedItems = [];
    let totalCommission = 0;
    const uploaderItemsMap = new Map<string, any[]>();

    for (const item of items) {
      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) continue;

      const rp = rpMap.get(String(item.resellerProductId));
      if (!rp) continue;

      if (rp.stock < qty) {
        return NextResponse.json({ error: `Requested quantity for "${rp.name}" exceeds available stock. Only ${rp.stock} left.` }, { status: 400 });
      }

      const commission = (rp.retailPrice - rp.purchasePrice) * qty;
      totalCommission += commission;

      const productDoc = rp.productId as any;
      const uploaderId = productDoc?.uploadedBy ? productDoc.uploadedBy.toString() : null;

      const validatedItem = {
        resellerProductId: rp._id,
        productId: productDoc?._id || rp.productId,
        name: rp.name,
        quantity: qty,
        retailPrice: rp.retailPrice,
        purchasePrice: rp.purchasePrice,
        image: rp.images?.[0],
        color: item.color || undefined,
        size: item.size || undefined,
      };

      validatedItems.push(validatedItem);

      if (uploaderId && uploaderId !== reseller._id.toString()) {
        if (!uploaderItemsMap.has(uploaderId)) {
          uploaderItemsMap.set(uploaderId, []);
        }
        const uploaderRp = await ResellerProduct.findOne({
          resellerId: uploaderId,
          productId: productDoc?._id || rp.productId,
        }).lean();

        uploaderItemsMap.get(uploaderId)!.push({
          ...validatedItem,
          retailPrice: rp.purchasePrice,
          purchasePrice: uploaderRp?.purchasePrice || rp.purchasePrice,
        });
      }
    }

    if (validatedItems.length === 0) {
      return NextResponse.json({ error: 'No valid items found' }, { status: 400 });
    }

    // Recompute subtotal, deliveryCharge, and base total
    const calculatedSubtotal = validatedItems.reduce((sum, item) => sum + item.retailPrice * item.quantity, 0);

    const insideCharge = reseller.deliveryConfig?.insideDhaka ?? 60;
    const outsideCharge = reseller.deliveryConfig?.outsideDhaka ?? 120;
    const freeThreshold = reseller.deliveryConfig?.freeDeliveryThreshold ?? 0;

    let calculatedDeliveryCharge = deliveryArea === 'inside' ? insideCharge : outsideCharge;
    if (freeThreshold > 0 && calculatedSubtotal >= freeThreshold) {
      calculatedDeliveryCharge = 0;
    }

    let baseTotal = calculatedSubtotal + calculatedDeliveryCharge;

    const shortId = generateShortId();

    const mongoose = (await import('mongoose')).default;
    const { normalizePhoneNumber } = await import('@/lib/utils');
    const User = (await import('@/models/User')).default;

    const normalizedPhone = normalizePhoneNumber(customer.phone);
    customer.phone = normalizedPhone || customer.phone;

    const sessionConn = await mongoose.startSession();
    sessionConn.startTransaction();

    try {
      // 1. Find or auto-create customer user account
      let customerUser = await User.findOne({
        $or: [
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
          ...(customer.email ? [{ email: customer.email.toLowerCase().trim() }] : []),
          ...(normalizedPhone ? [{ email: `${normalizedPhone}@store.com` }] : []),
          ...(normalizedPhone ? [{ email: `${normalizedPhone}@swapnobaz.com` }] : [])
        ]
      }).session(sessionConn);

      if (!customerUser && normalizedPhone) {
        const [newUser] = (await User.create([{
          name: customer.name,
          email: customer.email ? customer.email.toLowerCase().trim() : `${normalizedPhone}@store.com`,
          phone: normalizedPhone,
          role: 'user',
          registeredVia: reseller._id,
          addresses: [{
            street: customer.address?.street || '',
            city: customer.address?.city || '',
            division: customer.address?.division || '',
            country: 'Bangladesh',
            isDefault: true
          }]
        }], { session: sessionConn })) as any[];
        customerUser = newUser;
      }

      // 2. Validate Coupon if provided
      let couponDiscountAmount = 0;
      let appliedCouponCode: string | undefined = undefined;

      if (couponCode && typeof couponCode === 'string') {
        const cleanCode = couponCode.trim().toUpperCase();
        const foundCoupon = await ResellerCoupon.findOne({
          resellerId: reseller._id,
          code: cleanCode,
          isActive: true,
          expiryDate: { $gt: new Date() }
        }).session(sessionConn);

        if (foundCoupon) {
          const meetsMin = !foundCoupon.minPurchase || calculatedSubtotal >= foundCoupon.minPurchase;
          const meetsLimit = !foundCoupon.usageLimit || foundCoupon.usedCount < foundCoupon.usageLimit;

          if (meetsMin && meetsLimit) {
            if (foundCoupon.discountType === 'fixed') {
              couponDiscountAmount = foundCoupon.discountValue;
            } else {
              couponDiscountAmount = Math.floor(calculatedSubtotal * (foundCoupon.discountValue / 100));
            }
            couponDiscountAmount = Math.min(couponDiscountAmount, calculatedSubtotal);
            appliedCouponCode = cleanCode;

            // Increment usage count atomically
            foundCoupon.usedCount += 1;
            await foundCoupon.save({ session: sessionConn });
          }
        }
      }

      const totalAfterCoupon = Math.max(0, baseTotal - couponDiscountAmount);

      // 3. Handle Wallet / Loyalty Tokens deduction
      let walletAmountUsed = 0;
      let walletTxId = '';
      let earnedRewardAmount = 0;

      const loyaltyConfig = reseller.loyaltyConfig || { isEnabled: false, activationThreshold: 5000, rewardPercentage: 5 };

      if (customerUser) {
        if (useWallet && customerUser.walletBalance > 0) {
          walletAmountUsed = Math.min(customerUser.walletBalance, totalAfterCoupon);
          customerUser.walletBalance -= walletAmountUsed;
          await customerUser.save({ session: sessionConn });

          const [walletTx] = (await WalletTransaction.create([{
            userId: customerUser._id,
            amount: walletAmountUsed,
            type: 'spent',
            status: 'completed',
            description: `Used tokens for reseller order ${shortId}`,
          }], { session: sessionConn })) as any[];

          walletTxId = walletTx._id.toString();
        }

        // Calculate potential reward if reseller loyalty is enabled
        if (loyaltyConfig.isEnabled) {
          const isAlreadyActive = customerUser.isSubscriptionActive;
          const willBeActive = isAlreadyActive || (totalAfterCoupon >= (loyaltyConfig.activationThreshold || 5000));

          if (willBeActive) {
            if (!isAlreadyActive) {
              customerUser.isSubscriptionActive = true;
              await customerUser.save({ session: sessionConn });
            }
            const payableAmount = totalAfterCoupon - walletAmountUsed;
            earnedRewardAmount = Math.floor(payableAmount * ((loyaltyConfig.rewardPercentage || 5) / 100));
          }
        }
      }

      const calculatedFinalTotal = Math.max(0, totalAfterCoupon - walletAmountUsed);

      // 4. Create Mother Order for Admin fulfillment & dispatch
      const [motherOrder] = (await Order.create([{
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
        totalAmount: calculatedFinalTotal,
        deliveryCharge: calculatedDeliveryCharge,
        couponCode: appliedCouponCode,
        couponDiscountAmount: couponDiscountAmount,
        walletAmountUsed,
        earnedRewardAmount,
        shippingAddress: {
          fullName: customer.name,
          phone: customer.phone,
          street: customer.address?.street || '',
          city: customer.address?.city || '',
          state: customer.address?.city || '',
          division: customer.address?.division || '',
          zipCode: customer.address?.zipCode || '0000',
          country: 'Bangladesh',
        },
        paymentMethod: paymentMethod || 'COD',
        paymentStatus: 'Pending',
        status: 'Order Placed',
        resellerId: reseller._id,
        customerNote: notes || '',
        internalNote: '',
        systemNote: `Reseller Order (${reseller.storeName})`,
      }], { session: sessionConn })) as any[];

      // 5. Create Reseller Order
      const [order] = (await ResellerOrder.create([{
        resellerId: reseller._id,
        motherOrderId: motherOrder._id,
        customer,
        items: validatedItems,
        subtotal: calculatedSubtotal,
        deliveryCharge: calculatedDeliveryCharge,
        couponCode: appliedCouponCode,
        couponDiscount: couponDiscountAmount,
        totalAmount: calculatedFinalTotal,
        paymentMethod: paymentMethod || 'COD',
        paymentStatus: 'Pending',
        status: 'Order Placed',
        resellerCommission: totalCommission,
        commissionStatus: 'pending',
        customerNote: notes || '',
        internalNote: '',
        systemNote: `Storefront Order (${reseller.storeName})`,
        shortId,
      }], { session: sessionConn })) as any[];

      // Link wallet transaction if any
      if (walletTxId) {
        await WalletTransaction.findOneAndUpdate(
          { _id: walletTxId },
          { orderId: motherOrder._id },
          { session: sessionConn }
        );
      }

      // Update reseller stats (atomic)
      await Reseller.findByIdAndUpdate(reseller._id, {
        $inc: { totalOrders: 1, totalRevenue: calculatedFinalTotal },
      }, { session: sessionConn });

      // Create pending commission ledger entry
      await ResellerWalletTransaction.create([{
        resellerId: reseller._id,
        type: 'commission_earned',
        amount: totalCommission,
        orderId: order._id,
        description: `Commission from order ${shortId}`,
        status: 'pending',
      }], { session: sessionConn });

      // Create Fulfillment Orders for other resellers if applicable
      let fIndex = 1;
      for (const [uploaderId, fItems] of uploaderItemsMap.entries()) {
        const uploaderSubtotal = fItems.reduce((sum, item) => sum + item.retailPrice * item.quantity, 0);
        const uploaderCommission = fItems.reduce((sum, item) => sum + (item.retailPrice - item.purchasePrice) * item.quantity, 0);

        await ResellerOrder.create([{
          resellerId: uploaderId,
          motherOrderId: motherOrder._id,
          customer,
          items: fItems,
          subtotal: uploaderSubtotal,
          deliveryCharge: 0,
          totalAmount: uploaderSubtotal,
          paymentMethod: 'COD',
          paymentStatus: 'Pending',
          status: 'Order Placed',
          resellerCommission: uploaderCommission,
          commissionStatus: 'pending',
          customerNote: notes || '',
          internalNote: '',
          systemNote: `Fulfillment for Order ${shortId}`,
          shortId: `${shortId}-F${fIndex}`,
        }], { session: sessionConn });
        fIndex++;
      }

      await sessionConn.commitTransaction();
      sessionConn.endSession();

      return NextResponse.json({
        success: true,
        orderId: order._id,
        shortId: order.shortId,
        totalAmount: calculatedFinalTotal,
        couponDiscountAmount,
        walletAmountUsed,
        earnedRewardAmount
      });

    } catch (txError: any) {
      await sessionConn.abortTransaction();
      sessionConn.endSession();
      console.error('Transaction error in reseller order creation:', txError);
      return NextResponse.json({ error: txError.message || 'Failed to place order' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error placing reseller order:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

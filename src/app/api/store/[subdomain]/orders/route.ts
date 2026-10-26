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
    const { customer, items, paymentMethod, notes, deliveryArea, couponCode, useWallet, manualPaymentDetails } = body;

    if (!customer?.name || !customer?.phone || !customer?.address?.street) {
      return NextResponse.json({ error: 'Customer details incomplete' }, { status: 400 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 });
    }

    // Fetch all ResellerProducts in a single query with populated productId
    const rawIds = items.map((i: any) => i.resellerProductId || i.productId).filter(Boolean);
    const rps = await ResellerProduct.find({
      $or: [
        { _id: { $in: rawIds }, resellerId: reseller._id },
        { productId: { $in: rawIds }, resellerId: reseller._id }
      ],
      isPublished: true,
      isAvailableOnMother: true,
    }).populate('productId');

    const rpMap = new Map<string, any>();
    rps.forEach(rp => {
      rpMap.set(rp._id.toString(), rp);
      if (rp.productId) {
        const pId = (rp.productId as any)._id ? (rp.productId as any)._id.toString() : rp.productId.toString();
        rpMap.set(pId, rp);
      }
    });

    // Validate each item against ResellerProduct and calculate commission
    const validatedItems = [];
    let totalCommission = 0;
    let totalOwnProductSystemFee = 0;
    const uploaderItemsMap = new Map<string, any[]>();
    const supplierIds = new Set<string>();

    const resellerFeeRate = reseller.systemFeePercent !== undefined 
      ? reseller.systemFeePercent 
      : (reseller.commissionRate ?? 15);

    for (const item of items) {
      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) continue;

      const targetId = String(item.resellerProductId || item.productId);
      const rp = rpMap.get(targetId);
      if (!rp) continue;

      if (rp.stock < qty) {
        return NextResponse.json({ error: `Requested quantity for "${rp.name}" exceeds available stock. Only ${rp.stock} left.` }, { status: 400 });
      }

      const productDoc = rp.productId as any;
      const uploaderId = productDoc?.uploadedBy ? productDoc.uploadedBy.toString() : null;
      supplierIds.add(uploaderId || 'mother');

      if (supplierIds.size > 1) {
        return NextResponse.json({
          error: 'ভিন্ন ভিন্ন বিক্রেতার পণ্য একসাথে অর্ডার করা সম্ভব নয়। প্রতিটি শপের পণ্য আলাদা লোকেশন থেকে পাঠানো হয়, তাই অনুগ্রহ করে আলাদাভাবে অর্ডার সম্পন্ন করুন।'
        }, { status: 400 });
      }

      const isOwnProduct = !!(uploaderId && uploaderId === reseller._id.toString());
      let itemSystemFee = 0;

      if (isOwnProduct) {
        // Reseller is selling their OWN uploaded product on their own storefront
        // Calculate platform system fee on the retail selling price to protect against base price manipulation
        itemSystemFee = Math.round(rp.retailPrice * (resellerFeeRate / 100)) * qty;
        totalOwnProductSystemFee += itemSystemFee;

        // Reseller keeps retail sales revenue minus Mother platform system fee
        const ownEarnings = (rp.retailPrice * qty) - itemSystemFee;
        totalCommission += ownEarnings;
      } else if (uploaderId && uploaderId !== reseller._id.toString()) {
        // Sourced from another reseller (Supplier)
        if (!uploaderItemsMap.has(uploaderId)) {
          uploaderItemsMap.set(uploaderId, []);
        }
        const uploaderRp = await ResellerProduct.findOne({
          resellerId: uploaderId,
          productId: productDoc?._id || rp.productId,
        }).lean();

        const baseCost = (productDoc?.purchasePrice && Number(productDoc.purchasePrice) > 0)
          ? Number(productDoc.purchasePrice)
          : (uploaderRp?.purchasePrice ?? 0);

        let unitFee = Math.max(0, (Number(rp.purchasePrice) || 0) - baseCost);
        if (unitFee === 0 && baseCost > 0) {
          const uploaderReseller = await Reseller.findById(uploaderId).select('systemFeePercent').lean();
          const feePct = uploaderReseller?.systemFeePercent ?? 15;
          unitFee = Math.round(baseCost * (feePct / 100));
        }

        const effectiveWholesale = baseCost + unitFee;
        const commission = Math.max(0, (rp.retailPrice - effectiveWholesale) * qty);
        totalCommission += commission;

        itemSystemFee = unitFee * qty;

        const validatedItem = {
          resellerProductId: rp._id,
          productId: productDoc?._id || rp.productId,
          name: rp.name,
          quantity: qty,
          retailPrice: rp.retailPrice,
          purchasePrice: effectiveWholesale,
          image: rp.images?.[0],
          color: item.color || undefined,
          size: item.size || undefined,
          systemFee: itemSystemFee,
        };

        validatedItems.push(validatedItem);

        uploaderItemsMap.get(uploaderId)!.push({
          ...validatedItem,
          resellerProductId: uploaderRp?._id || rp._id,
          retailPrice: effectiveWholesale,
          purchasePrice: baseCost,
          systemFee: unitFee,
        });
        continue;
      } else {
        // Dropshipping from Mother Catalog
        const commission = Math.max(0, (rp.retailPrice - rp.purchasePrice) * qty);
        totalCommission += commission;
      }

      const validatedItem = {
        resellerProductId: rp._id,
        productId: productDoc?._id || rp.productId,
        name: rp.name,
        quantity: qty,
        retailPrice: rp.retailPrice,
        purchasePrice: isOwnProduct 
          ? ((productDoc?.purchasePrice && Number(productDoc.purchasePrice) > 0) ? Number(productDoc.purchasePrice) : rp.purchasePrice) 
          : rp.purchasePrice,
        image: rp.images?.[0],
        color: item.color || undefined,
        size: item.size || undefined,
        systemFee: itemSystemFee,
      };

      validatedItems.push(validatedItem);
    }

    if (validatedItems.length === 0) {
      return NextResponse.json({ error: 'No valid items found' }, { status: 400 });
    }

    // Recompute subtotal, deliveryCharge, and base total
    const calculatedSubtotal = validatedItems.reduce((sum, item) => sum + item.retailPrice * item.quantity, 0);

    const GlobalSettings = (await import('@/models/GlobalSettings')).default;
    const globalSettings = await GlobalSettings.findOne().sort({ updatedAt: -1 }).lean() as any;
    const insideCharge = globalSettings?.deliveryChargeInsideDhaka ?? 60;
    const outsideCharge = globalSettings?.deliveryChargeOutsideDhaka ?? 120;
    const freeThreshold = Number(reseller.deliveryConfig?.freeDeliveryThreshold) || 0;

    const standardDeliveryCharge = deliveryArea === 'inside' ? insideCharge : outsideCharge;
    const isFreeDelivery = freeThreshold > 0 && calculatedSubtotal >= freeThreshold;
    const calculatedDeliveryCharge = isFreeDelivery ? 0 : standardDeliveryCharge;

    if (isFreeDelivery) {
      // Reseller absorbs free delivery: courier charge is deducted from reseller commission so Mother Shop retains it to pay courier
      totalCommission = Math.max(0, totalCommission - standardDeliveryCharge);
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
      const { auth } = await import('@/auth');
      const authSession = await auth();
      let customerUser = null;

      // Only reuse authSession if the authenticated user is a regular customer ('user')
      if (authSession?.user?.id) {
        const loggedInUser = await User.findById(authSession.user.id).session(sessionConn);
        if (loggedInUser && loggedInUser.role === 'user') {
          customerUser = loggedInUser;
        }
      }

      if (!customerUser) {
        customerUser = await User.findOne({
          role: 'user',
          $or: [
            ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
            ...(customer.email ? [{ email: customer.email.toLowerCase().trim() }] : []),
            ...(normalizedPhone ? [{ email: `${normalizedPhone}@store.com` }] : []),
            ...(normalizedPhone ? [{ email: `${normalizedPhone}@${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'guest.com'}` }] : [])
          ]
        }).session(sessionConn);
      }

      if (!customerUser && normalizedPhone) {
        let customerEmail = customer.email ? customer.email.toLowerCase().trim() : `${normalizedPhone}@store.com`;
        const emailCollision = await User.findOne({ email: customerEmail }).session(sessionConn);
        if (emailCollision) {
          customerEmail = `${normalizedPhone}@store.com`;
          const fallbackCollision = await User.findOne({ email: customerEmail }).session(sessionConn);
          if (fallbackCollision) {
            customerEmail = `${normalizedPhone}-${Date.now()}@store.com`;
          }
        }

        const [newUser] = (await User.create([{
          name: customer.name,
          email: customerEmail,
          phone: normalizedPhone,
          role: 'user',
          registeredVia: reseller._id,
          resellerId: reseller._id,
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

      // Deduct product stock immediately upon order placement
      const { deductStockForOrderItems } = await import('@/lib/stockHelper');
      await deductStockForOrderItems({
        items: validatedItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          name: item.name,
          color: item.color,
          size: item.size,
        })),
        session: sessionConn,
        skipResellerSync: true,
      });

      // 4. Create Mother Order for Admin fulfillment & dispatch
      const [motherOrder] = (await Order.create([{
        user: customerUser?._id,
        shortId,
        orderSource: 'reseller_storefront',
        storefrontResellerId: reseller._id,
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
        courierCharge: standardDeliveryCharge,
        isFreeDelivery: Boolean(isFreeDelivery),
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
        manualPaymentDetails: manualPaymentDetails || undefined,
        status: 'Order Placed',
        resellerId: reseller._id,
        resellerCommission: totalCommission,
        commissionStatus: 'pending',
        customerNote: notes || '',
        internalNote: isFreeDelivery
          ? `Storefront Free Delivery Promo: Courier charge of ৳${standardDeliveryCharge} subsidized by reseller (${reseller.storeName}).`
          : '',
        systemNote: isFreeDelivery
          ? `Reseller Order (${reseller.storeName}) - Free Delivery Subsidized (৳${standardDeliveryCharge})`
          : `Reseller Order (${reseller.storeName})`,
      }], { session: sessionConn })) as any[];

      // 5. Create Reseller Order
      const [order] = (await ResellerOrder.create([{
        resellerId: reseller._id,
        user: customerUser?._id,
        motherOrderId: motherOrder._id,
        customer,
        items: validatedItems,
        subtotal: calculatedSubtotal,
        deliveryCharge: calculatedDeliveryCharge,
        courierCharge: standardDeliveryCharge,
        isFreeDelivery: Boolean(isFreeDelivery),
        couponCode: appliedCouponCode,
        couponDiscount: couponDiscountAmount,
        totalAmount: calculatedFinalTotal,
        paymentMethod: paymentMethod || 'COD',
        paymentStatus: 'Pending',
        manualPaymentDetails: manualPaymentDetails || undefined,
        status: 'Order Placed',
        resellerCommission: totalCommission,
        systemFee: totalOwnProductSystemFee,
        commissionStatus: 'pending',
        customerNote: notes || '',
        internalNote: isFreeDelivery
          ? `Free Delivery Offered: Standard courier charge of ৳${standardDeliveryCharge} deducted from your margin.`
          : '',
        systemNote: totalOwnProductSystemFee > 0
          ? `Storefront Order (${reseller.storeName}) - Own Product (Earnings: ৳${totalCommission}, System Fee: ৳${totalOwnProductSystemFee})`
          : (isFreeDelivery
            ? `Storefront Order (${reseller.storeName}) - Free Delivery Subsidized (৳${standardDeliveryCharge})`
            : `Storefront Order (${reseller.storeName})`),
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
        $inc: { 
          totalOrders: 1, 
          totalRevenue: calculatedFinalTotal,
          pendingBalance: totalCommission
        },
      }, { session: sessionConn });

      // Create pending commission ledger entry
      await ResellerWalletTransaction.create([{
        resellerId: reseller._id,
        type: 'commission_earned',
        amount: totalCommission,
        orderId: order._id,
        description: isFreeDelivery
          ? `Commission from order ${shortId} (Courier fee ৳${standardDeliveryCharge} subsidized)`
          : `Commission from order ${shortId}`,
        status: 'pending',
      }], { session: sessionConn });

      // Create Fulfillment Orders for other resellers if applicable
      let fIndex = 1;
      let totalMotherSystemFee = totalOwnProductSystemFee;
      for (const [uploaderId, fItems] of uploaderItemsMap.entries()) {
        const uploaderSubtotal = fItems.reduce((sum, item) => sum + item.retailPrice * item.quantity, 0);
        // Base product payout to uploader reseller
        const uploaderCommission = fItems.reduce((sum, item) => sum + (Number(item.purchasePrice) || 0) * item.quantity, 0);
        const uploaderSystemFee = fItems.reduce((sum, item) => sum + (Number((item as any).systemFee) || Math.max(0, Number(item.retailPrice) - Number(item.purchasePrice))) * item.quantity, 0);
        totalMotherSystemFee += uploaderSystemFee;

        const [uploaderRO] = (await ResellerOrder.create([{
          resellerId: uploaderId,
          motherOrderId: motherOrder._id,
          customer,
          items: fItems,
          subtotal: Math.max(0, calculatedFinalTotal - calculatedDeliveryCharge),
          deliveryCharge: calculatedDeliveryCharge,
          courierCharge: standardDeliveryCharge,
          isFreeDelivery: Boolean(isFreeDelivery),
          totalAmount: calculatedFinalTotal,
          paymentMethod: paymentMethod || 'COD',
          paymentStatus: 'Pending',
          manualPaymentDetails: manualPaymentDetails || undefined,
          status: 'Order Placed',
          resellerCommission: uploaderCommission,
          systemFee: uploaderSystemFee,
          salesProfit: 0,
          commissionStatus: 'pending',
          customerNote: notes || '',
          internalNote: '',
          systemNote: `Fulfillment for Storefront Order (${reseller.storeName} - ${shortId}) - Base Payout: ৳${uploaderCommission}, System Fee: ৳${uploaderSystemFee}`,
          shortId: `${shortId}-F${fIndex}`,
        }], { session: sessionConn })) as any[];

        // Update uploader reseller stats (atomic)
        await Reseller.findByIdAndUpdate(uploaderId, {
          $inc: {
            totalOrders: 1,
            totalRevenue: uploaderCommission,
            pendingBalance: uploaderCommission,
          },
        }, { session: sessionConn });

        // Create pending commission ledger entry for uploader
        if (uploaderCommission > 0) {
          await ResellerWalletTransaction.create([{
            resellerId: uploaderId,
            type: 'commission_earned',
            amount: uploaderCommission,
            orderId: uploaderRO._id,
            description: `Payout for supplied product in order ${shortId}-F${fIndex}`,
            status: 'pending',
          }], { session: sessionConn });
        }

        fIndex++;
      }

      if (totalMotherSystemFee > 0 || totalCommission > 0) {
        await Order.findByIdAndUpdate(motherOrder._id, {
          $set: {
            systemFee: totalMotherSystemFee,
            resellerCommission: totalCommission
          }
        }, { session: sessionConn });
      }

      await sessionConn.commitTransaction();
      sessionConn.endSession();

      // Clean up matching abandoned cart for this customer on this reseller storefront
      try {
        const cleanCustPhone = (customer.phone || '').replace(/\s+/g, '').trim();
        if (cleanCustPhone) {
          const AbandonedCart = (await import('@/models/AbandonedCart')).default;
          await AbandonedCart.deleteMany({ phone: cleanCustPhone, resellerId: reseller._id });
        }
      } catch (cartErr) {
        console.error('[AbandonedCart cleanup error in reseller storefront order]', cartErr);
      }

      // Sync updated stock to all reseller stores for affected products
      try {
        const { syncProductToResellers } = await import('@/lib/syncEngine');
        const uniqueProductIds = Array.from(new Set(validatedItems.map(i => (i.productId?._id || i.productId).toString())));
        for (const pId of uniqueProductIds) {
          await syncProductToResellers(pId).catch(err => console.error('[Reseller Sync Error]', err));
        }
      } catch (syncErr) {
        console.error('[Sync Error after storefront order creation]', syncErr);
      }

      return NextResponse.json({
        success: true,
        orderId: order._id,
        motherOrderId: motherOrder._id,
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

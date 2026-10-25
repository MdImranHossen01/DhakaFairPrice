/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order, { IOrderItem } from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import GlobalSettings from '@/models/GlobalSettings';
import WalletTransaction from '@/models/WalletTransaction';
import Coupon from '@/models/Coupon';
import Reseller from '@/models/Reseller';
import ResellerOrder from '@/models/ResellerOrder';
import { auth } from '@/auth';

import { z } from 'zod';
import mongoose from 'mongoose';
import crypto from 'crypto';

import { CACHE_TAGS } from '@/lib/data-fetching';

class StockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StockError';
  }
}


const orderItemSchema = z.object({
  product: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
  name: z.string().min(1, 'Product name is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  price: z.number().positive(), // We will re-validate this on the server
  image: z.string().nullish().or(z.literal('')),
  color: z.string().optional(),
  size: z.string().optional(),
});

const orderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  shippingAddress: z.object({
    fullName: z.string().min(2, 'Full name is required'),
    phone: z.string().min(10, 'Invalid phone number'),
    email: z.string().email('Invalid email address'),
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    division: z.string().min(1, 'Division is required'),
    zipCode: z.string().optional().default('0000'),
    country: z.string().optional().default('Bangladesh'),
  }),
  paymentMethod: z.preprocess((val) => {
    if (typeof val === 'string') {
      const normalized = val.trim().toLowerCase();
      if (normalized === 'cash on delivery' || normalized === 'cod') {
        return 'COD';
      }
    }
    return val;
  }, z.enum(['COD', 'Online', 'Manual'])),
  deliveryCharge: z.number().min(0).nullish(),
  useWallet: z.boolean().nullish().default(false),
  couponCode: z.string().nullish(),
  customerNote: z.string().nullish(),
  internalNote: z.string().nullish(),
  notes: z.string().nullish(),
  systemNote: z.string().nullish(),
  manualPaymentDetails: z.object({
    methodName: z.string().optional(),
    senderNumber: z.string().optional(),
    transactionId: z.string().optional(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  let session: mongoose.ClientSession | null = null;
  const successfulDeductions: { productId: string, quantity: number, variantId?: string }[] = [];
  try {
    const sessionUser = await auth();
    const body = await req.json();

    // 1. Validate Input Schema
    const validation = orderSchema.safeParse(body);
    if (!validation.success) {
      console.error('Order Validation Error:', validation.error.flatten().fieldErrors);
      return NextResponse.json({
        message: 'Validation failed',
        errors: validation.error.flatten().fieldErrors
      }, { status: 400 });
    }

    const { items, shippingAddress, paymentMethod, useWallet, couponCode, manualPaymentDetails } = validation.data;
    const clientProvidedDeliveryCharge = validation.data.deliveryCharge;

    await connectToDatabase();

    // Check for pending/unconfirmed orders ('Order Placed')
    const queryConditions: any[] = [];
    if (sessionUser?.user?.id) {
      queryConditions.push({ user: sessionUser.user.id });
    }
    if (shippingAddress.phone) {
      queryConditions.push({ 'shippingAddress.phone': shippingAddress.phone });
    }

    if (queryConditions.length > 0) {
      const existingPendingOrder = await Order.findOne({
        $or: queryConditions,
        status: 'Order Placed',
        deletedAt: null
      });

      if (existingPendingOrder) {
        return NextResponse.json({
          message: 'You already have a pending order. Please wait for it to be confirmed before placing another order.'
        }, { status: 400 });
      }
    }

    const conn = await connectToDatabase();

    // Fetch Settings
    const settings = await GlobalSettings.findOne();
    const subConfig = {
      activationThreshold: settings?.subscriptionConfig?.activationThreshold ?? 5000,
      rewardPercentage: settings?.subscriptionConfig?.rewardPercentage ?? 5
    };

    session = await conn.startSession();
    if (!session) {
      throw new Error('Failed to start database session');
    }
    session.startTransaction();

    let user = null;
    const { normalizePhoneNumber } = await import('@/lib/utils');
    const normalizedPhone = normalizePhoneNumber(shippingAddress.phone);
    const normalizedEmail = shippingAddress.email ? shippingAddress.email.toLowerCase().trim() : '';

    if (sessionUser?.user?.id) {
      user = await User.findOne({ _id: sessionUser.user.id }).session(session);
    } else {
      // Guest Checkout: Find or Create User by Phone or Email
      user = await User.findOne({
        $or: [
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
          ...(normalizedPhone ? [{ email: `${normalizedPhone}@store.com` }] : []),
          ...(normalizedPhone ? [{ email: `${normalizedPhone}@${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'guest.com'}` }] : [])
        ]
      }).session(session);

      if (user) {
        // If user exists but lacks phone or address, update it
        let needsUpdate = false;
        if (!user.phone && normalizedPhone) {
          user.phone = normalizedPhone;
          needsUpdate = true;
        }
        if ((!user.addresses || user.addresses.length === 0) && shippingAddress.street) {
          user.addresses = [{
            street: shippingAddress.street,
            city: shippingAddress.city,
            state: shippingAddress.state,
            division: shippingAddress.division,
            country: shippingAddress.country,
            isDefault: true
          }];
          needsUpdate = true;
        }
        if (needsUpdate) {
          await user.save({ session });
        }
      } else {
        // Create a new passwordless user for this guest order
        const userEmail = normalizedEmail || `${normalizedPhone}@store.com`;
        const [newUser] = await User.create([{
          name: shippingAddress.fullName,
          email: userEmail,
          phone: normalizedPhone,
          role: 'user',
          addresses: [{
            street: shippingAddress.street,
            city: shippingAddress.city,
            state: shippingAddress.state,
            division: shippingAddress.division,
            country: shippingAddress.country,
            isDefault: true
          }]
        }], { session });
        user = newUser;
      }
    }


    let serverComputedTotal = 0;
    const validatedItems: IOrderItem[] = [];
    const uploaderItemsMap = new Map<string, any[]>();

    try {
      // 2a. Group items by product/variant to avoid duplicate checks failing during deduction
      const groupedItems: Record<string, any> = {};
      for (const item of items) {
        const key = `${item.product}-${String(item.color || '').trim()}-${String(item.size || '').trim()}`;
        if (groupedItems[key]) {
          groupedItems[key].quantity += item.quantity;
        } else {
          groupedItems[key] = { ...item };
        }
      }

      const uniqueItems = Object.values(groupedItems);

      // 2b. Pre-check loop (ensure all items exist, belong to the same seller, and have combined stock before any deductions)
      const sellerIds = new Set<string>();
      for (const item of uniqueItems) {
        const product = await Product.findOne({ _id: item.product, isPublished: true }).session(session);
        if (!product) {
          throw new StockError(`Product not found: ${item.name}`);
        }

        const sId = product.uploadedBy ? product.uploadedBy.toString() : 'mother';
        sellerIds.add(sId);

        if (sellerIds.size > 1) {
          throw new StockError('ভিন্ন ভিন্ন বিক্রেতার পণ্য একসাথে অর্ডার করা সম্ভব নয়। প্রতিটি শপের পণ্য ভিন্ন লোকেশন থেকে পাঠানো হয়, তাই অনুগ্রহ করে আলাদাভাবে অর্ডার সম্পন্ন করুন।');
        }

        if (item.color || item.size) {
          const variant = product.variants?.find((v: any) =>
            String(v.color || '').trim() === String(item.color || '').trim() &&
            String(v.size || '').trim() === String(item.size || '').trim()
          );
          if (!variant || (variant.stock || 0) < item.quantity) {
            const variantDesc = [item.color, item.size].filter(Boolean).join(' / ');
            throw new StockError(`Insufficient stock for ${product.name}${variantDesc ? ` (${variantDesc})` : ''}. Available: ${variant?.stock || 0}`);
          }
        } else {
          if ((product.stock || 0) < item.quantity) {
            throw new StockError(`Insufficient stock for ${product.name}. Available: ${product.stock || 0}`);
          }
        }
      }

      // 2c. Atomic Stock Deduction and Price Verification
      // We process the ORIGINAL items list for order record, but use uniqueItems for stock logic
      // Actually, it's safer to deduct from uniqueItems to ensure atomicity for the group
      for (const item of uniqueItems) {
        let product;
        const hasVariant = !!(item.color || item.size);

        if (hasVariant) {
          const variantQuery: any = {
            _id: item.product,
            isPublished: true,
            variants: {
              $elemMatch: {
                ...(item.color && { color: item.color }),
                ...(item.size && { size: item.size }),
                stock: { $gte: item.quantity }
              }
            }
          };

          product = await Product.findOneAndUpdate(
            variantQuery,
            { $inc: { "variants.$.stock": -item.quantity } },
            { session, new: true }
          );

          if (product) {
            const variant = product.variants?.find((v: any) =>
              String(v.color || '').trim() === String(item.color || '').trim() &&
              String(v.size || '').trim() === String(item.size || '').trim()
            );
            successfulDeductions.push({
              productId: product._id.toString(),
              quantity: item.quantity,
              variantId: (variant as any)?._id?.toString()
            });
          }
        } else {
          product = await Product.findOneAndUpdate(
            {
              _id: item.product,
              stock: { $gte: item.quantity },
              isPublished: true
            },
            { $inc: { stock: -item.quantity } },
            { session, new: true }
          );

          if (product) {
            successfulDeductions.push({
              productId: product._id.toString(),
              quantity: item.quantity
            });
          }
        }

        if (!product) {
          throw new StockError(`Stock deduction failed unexpectedly for ${item.name}. Please try again.`);
        }
      }

      // 2d. Price Verification and Validated Items List (using ORIGINAL items for order structure)
      for (const item of items) {
        const product = await Product.findOne({ _id: item.product }).session(session);
        if (!product) throw new Error('Product not found during price verification');

        const hasVariant = !!(item.color || item.size);
        let itemPrice = product.salePrice ?? product.price;
        let itemPurchasePrice = product.purchasePrice ?? 0;

        if (hasVariant) {
          const variant = product.variants?.find((v: any) =>
            String(v.color || '').trim() === String(item.color || '').trim() &&
            String(v.size || '').trim() === String(item.size || '').trim()
          );
          if (variant) {
            itemPrice = (variant.salePrice ?? variant.price) ?? (product.salePrice ?? product.price);
            itemPurchasePrice = variant.purchasePrice ?? product.purchasePrice ?? 0;
          }
        }

        serverComputedTotal += itemPrice * item.quantity;

        validatedItems.push({
          product: product._id,
          name: product.name,
          quantity: item.quantity,
          price: itemPrice,
          purchasePrice: itemPurchasePrice,
          image: item.image || product.images?.[0] || '',
          color: item.color,
          size: item.size,
        });

        // Track items uploaded by resellers so fulfillment & commission orders can be created
        const uploaderId = product.uploadedBy ? product.uploadedBy.toString() : null;
        if (uploaderId) {
          if (!uploaderItemsMap.has(uploaderId)) {
            uploaderItemsMap.set(uploaderId, []);
          }
          uploaderItemsMap.get(uploaderId)!.push({
            productId: product._id,
            name: product.name,
            quantity: item.quantity,
            retailPrice: itemPrice,
            purchasePrice: itemPurchasePrice,
            image: item.image || product.images?.[0] || '',
            color: item.color,
            size: item.size,
          });
        }
      }
    } catch (err: any) {
      throw err;
    }

    // 3. Calculate Delivery Charge
    const city = shippingAddress.city.toLowerCase();
    const state = shippingAddress.state.toLowerCase();
    const division = shippingAddress.division.toLowerCase();

    const isDhaka =
      (city.includes('dhaka') || state.includes('dhaka') || division.includes('dhaka')) &&
      !city.includes('outside'); // Explicitly exclude "Outside Dhaka"

    const freeDeliveryThreshold = settings?.freeDeliveryThreshold || 0;
    const isFreeDelivery = freeDeliveryThreshold > 0 && serverComputedTotal >= freeDeliveryThreshold;

    const chargeInsideDhaka = settings?.deliveryChargeInsideDhaka ?? 60;
    const chargeOutsideDhaka = settings?.deliveryChargeOutsideDhaka ?? 120;

    const serverComputedDeliveryCharge = isFreeDelivery ? 0 : (isDhaka ? chargeInsideDhaka : chargeOutsideDhaka);

    // 4. Verify Delivery Charge (if provided by client)
    if (clientProvidedDeliveryCharge !== undefined && clientProvidedDeliveryCharge !== null && clientProvidedDeliveryCharge !== serverComputedDeliveryCharge) {
      console.warn('Delivery Charge Mismatch:', {
        client: clientProvidedDeliveryCharge,
        server: serverComputedDeliveryCharge,
        city: shippingAddress.city,
        state: shippingAddress.state
      });
      if (session) await session.abortTransaction();
      return NextResponse.json({
        message: 'Delivery charge mismatch. Please refresh your cart.',
        serverCharge: serverComputedDeliveryCharge
      }, { status: 400 });
    }

    // 5. Discount & Loyalty Logic
    let couponDiscountAmount = 0;
    let walletAmountUsed = 0;
    let earnedRewardAmount = 0;
    let walletTxId: string | null = null;

    const baseTotal = serverComputedTotal + serverComputedDeliveryCharge;

    // --- A. Coupon Logic ---
    if (couponCode) {
      const coupon = await Coupon.findOneAndUpdate(
        {
          code: couponCode.toUpperCase(),
          isActive: true,
          expiryDate: { $gt: new Date() },
          minPurchase: { $lte: baseTotal },
          $or: [
            { usageLimit: { $exists: false } },
            { usageLimit: { $gt: 0 }, $expr: { $lt: ["$usedCount", "$usageLimit"] } }
          ]
        },
        { $inc: { usedCount: 1 } },
        { session, returnDocument: 'after' }
      );

      if (!coupon) {
        console.warn('Invalid or Expired Coupon:', { couponCode, baseTotal });
        if (session) await session.abortTransaction();
        return NextResponse.json({
          message: 'Invalid, expired, or minimum purchase not met for this coupon code.'
        }, { status: 400 });
      }

      if (coupon.discountType === 'fixed') {
        couponDiscountAmount = coupon.discountValue;
      } else {
        couponDiscountAmount = Math.floor(serverComputedTotal * (coupon.discountValue / 100));
      }
      // Ensure discount doesn't exceed total
      couponDiscountAmount = Math.min(couponDiscountAmount, serverComputedTotal);
    }

    const totalAfterCoupon = baseTotal - couponDiscountAmount;

    // --- B. Wallet & Loyalty Logic ---
    if (user) {
      // Wallet Deduction (Apply on amount after coupon)
      if (useWallet && user.walletBalance > 0) {
        walletAmountUsed = Math.min(user.walletBalance, totalAfterCoupon);
        user.walletBalance -= walletAmountUsed;
        await user.save({ session });

        // Log Wallet Transaction (Spent)
        const [walletTx] = await WalletTransaction.create([{
          userId: user._id,
          amount: walletAmountUsed,
          type: 'spent',
          status: 'completed',
          description: `Used tokens for order payment`,
        }], { session });

        walletTxId = walletTx._id.toString();
      }

      // Calculate potential rewards (only if already active or this order hits threshold)
      const isAlreadyActive = user.isSubscriptionActive;
      const willBeActive = isAlreadyActive || (totalAfterCoupon >= subConfig.activationThreshold);

      if (willBeActive) {
        // If not already active, activate it now (atomic update)
        if (!isAlreadyActive) {
          user.isSubscriptionActive = true;
          await user.save({ session });
        }

        // Calculate reward on the remaining amount paid
        const payableAmount = totalAfterCoupon - walletAmountUsed;
        earnedRewardAmount = Math.floor(payableAmount * (subConfig.rewardPercentage / 100));
      }
    }

    // Compute reseller commission, system platform fee, and sales profit
    const defaultPlatformCommissionRate = settings?.platformCommissionRate ?? 15;
    const uploaderResellerIds = Array.from(uploaderItemsMap.keys());
    const uploaderFeeMap = new Map<string, number>();
    if (uploaderResellerIds.length > 0) {
      const ResellerModel = (await import('@/models/Reseller')).default;
      const uploaderResellers = await ResellerModel.find({ _id: { $in: uploaderResellerIds } })
        .select('_id systemFeePercent commissionRate')
        .lean();
      uploaderResellers.forEach((r: any) => {
        const fee = r.systemFeePercent !== undefined ? r.systemFeePercent : (r.commissionRate ?? defaultPlatformCommissionRate);
        uploaderFeeMap.set(r._id.toString(), fee);
      });
    }

    let orderResellerCommission = 0;
    let orderSystemFee = 0;
    let orderSalesProfit = 0;

    const resellerProductIds = new Set<string>();
    for (const [uploaderId, fItems] of uploaderItemsMap.entries()) {
      const uploaderFeeRate = uploaderFeeMap.get(uploaderId) ?? defaultPlatformCommissionRate;
      for (const it of fItems) {
        resellerProductIds.add(it.productId.toString());
        const qty = it.quantity;
        const baseCost = Number(it.purchasePrice) || 0;
        const retail = Number(it.retailPrice) || 0;

        const rComm = baseCost * qty;
        const sFee = Math.round(baseCost * (uploaderFeeRate / 100)) * qty;
        const sProfit = Math.max(0, retail - baseCost - sFee) * qty;

        orderResellerCommission += rComm;
        orderSystemFee += sFee;
        orderSalesProfit += sProfit;
      }
    }

    for (const vItem of validatedItems) {
      if (!resellerProductIds.has(vItem.product.toString())) {
        const qty = vItem.quantity;
        const baseCost = Number(vItem.purchasePrice) || 0;
        const retail = Number(vItem.price) || 0;
        orderSalesProfit += Math.max(0, retail - baseCost) * qty;
      }
    }

    // 6. Create the order
    const [newOrder] = (await Order.create(
      [
        {
          user: user?._id,
          orderSource: 'mother',
          items: validatedItems,
          deliveryCharge: serverComputedDeliveryCharge,
          totalAmount: baseTotal,
          walletAmountUsed,
          couponCode: couponDiscountAmount > 0 ? couponCode?.toUpperCase() : undefined,
          couponDiscountAmount,
          earnedRewardAmount,
          shippingAddress,
          paymentMethod,
          paymentStatus: 'Pending',
          status: 'Order Placed',
          transactionId: paymentMethod === 'Online' ? `ORDER-${crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 16)}` : undefined,
          shortId: crypto.randomBytes(4).toString('hex').toUpperCase(),
          customerNote: (validation.data as any).customerNote || (validation.data as any).notes || undefined,
          internalNote: (validation.data as any).internalNote || undefined,
          systemNote: (validation.data as any).systemNote || undefined,
          manualPaymentDetails,
          resellerId: uploaderItemsMap.size === 1 ? Array.from(uploaderItemsMap.keys())[0] : undefined,
          resellerCommission: orderResellerCommission,
          systemFee: orderSystemFee,
          salesProfit: orderSalesProfit,
        },
      ],
      { session }
    )) as any;

    // Link transaction to order ID if we had one
    if (walletTxId) {
      await WalletTransaction.findOneAndUpdate(
        { _id: walletTxId },
        { orderId: newOrder._id },
        { session }
      );
    }

    // If any items were uploaded by resellers, create corresponding ResellerOrders for fulfillment & tracking
    if (uploaderItemsMap.size > 0) {
      const ResellerOrder = (await import('@/models/ResellerOrder')).default;
      const ResellerProduct = (await import('@/models/ResellerProduct')).default;
      const Reseller = (await import('@/models/Reseller')).default;
      const ResellerWalletTransaction = (await import('@/models/ResellerWalletTransaction')).default;

      let fIndex = 1;
      for (const [uploaderId, fItems] of uploaderItemsMap.entries()) {
        const uploaderFeeRate = uploaderFeeMap.get(uploaderId) ?? defaultPlatformCommissionRate;
        const uploaderSubtotal = fItems.reduce((sum: number, it: any) => sum + it.retailPrice * it.quantity, 0);
        // Base product cost payable to reseller supplier:
        const uploaderCommission = fItems.reduce(
          (sum: number, it: any) => sum + (Number(it.purchasePrice) || 0) * it.quantity,
          0
        );
        // System platform fee:
        const uploaderSystemFee = fItems.reduce(
          (sum: number, it: any) => sum + Math.round((Number(it.purchasePrice) || 0) * (uploaderFeeRate / 100)) * it.quantity,
          0
        );
        // Mother Shop sales profit:
        const uploaderSalesProfit = fItems.reduce(
          (sum: number, it: any) => {
            const base = Number(it.purchasePrice) || 0;
            const fee = Math.round(base * (uploaderFeeRate / 100));
            return sum + Math.max(0, it.retailPrice - base - fee) * it.quantity;
          },
          0
        );

        // Resolve or create ResellerProduct for each item
        const orderItemsWithRP = await Promise.all(
          fItems.map(async (it: any) => {
            let rp = await ResellerProduct.findOne({
              resellerId: uploaderId,
              productId: it.productId,
            }).session(session);

            if (!rp) {
              const [newRP] = await ResellerProduct.create(
                [
                  {
                    resellerId: uploaderId,
                    productId: it.productId,
                    retailPrice: it.retailPrice,
                    name: it.name,
                    slug: `product-${it.productId}`,
                    images: it.image ? [it.image] : [],
                    stock: 0,
                    purchasePrice: it.purchasePrice || 0,
                    motherPrice: it.retailPrice,
                    isAvailableOnMother: true,
                    isPublished: true,
                    syncedAt: new Date(),
                  },
                ],
                { session }
              );
              rp = newRP;
            }

            return {
              resellerProductId: rp._id,
              productId: it.productId,
              name: it.name,
              quantity: it.quantity,
              retailPrice: it.retailPrice,
              purchasePrice: it.purchasePrice || 0,
              image: it.image,
              color: it.color,
              size: it.size,
            };
          })
        );

        const resellerShortId =
          uploaderItemsMap.size === 1 ? newOrder.shortId : `${newOrder.shortId}-M${fIndex}`;

        const [createdRO] = await ResellerOrder.create(
          [
            {
              resellerId: uploaderId,
              motherOrderId: newOrder._id,
              customer: {
                name: shippingAddress.fullName,
                phone: shippingAddress.phone,
                email: user?.email,
                address: {
                  street: shippingAddress.street,
                  city: shippingAddress.city,
                  division: shippingAddress.division,
                  zipCode: shippingAddress.zipCode,
                },
              },
              items: orderItemsWithRP,
              subtotal: Math.max(0, baseTotal - serverComputedDeliveryCharge),
              deliveryCharge: serverComputedDeliveryCharge,
              totalAmount: baseTotal,
              paymentMethod: paymentMethod || 'COD',
              paymentStatus: newOrder.paymentStatus || 'Pending',
              status: newOrder.status || 'Order Placed',
              resellerCommission: uploaderCommission,
              systemFee: uploaderSystemFee,
              salesProfit: uploaderSalesProfit,
              commissionStatus: 'pending',
              customerNote: (validation.data as any).customerNote || (validation.data as any).notes || '',
              internalNote: '',
              systemNote: `Mother Shop Order (${newOrder.shortId}) - Base Payout: ৳${uploaderCommission}, System Fee: ৳${uploaderSystemFee}, Sales Profit: ৳${uploaderSalesProfit}`,
              shortId: resellerShortId,
            },
          ],
          { session }
        );

        // Update reseller stats atomically (reseller's revenue from mother shop sale is their base payout)
        const isAlreadyPaidOrDelivered = newOrder.status === 'Delivered' || newOrder.paymentStatus === 'Paid';
        await Reseller.findByIdAndUpdate(
          uploaderId,
          {
            $inc: {
              totalOrders: 1,
              totalRevenue: uploaderCommission,
              pendingBalance: isAlreadyPaidOrDelivered ? 0 : uploaderCommission,
            },
          },
          { session }
        );

        // Record pending commission in reseller wallet
        await ResellerWalletTransaction.create(
          [
            {
              resellerId: uploaderId,
              type: 'commission_earned',
              amount: uploaderCommission,
              orderId: createdRO._id,
              description: `Payout for supplied product from Mother Shop order ${newOrder.shortId}`,
              status: 'pending',
            },
          ],
          { session }
        );

        fIndex++;
      }
    }

    await session.commitTransaction();

    // Sync updated stock to all reseller storefronts
    try {
      const { syncProductToResellers } = await import('@/lib/syncEngine');
      const uniqueProductIds = Array.from(new Set(successfulDeductions.map(d => d.productId)));
      for (const pId of uniqueProductIds) {
        await syncProductToResellers(pId).catch(err => console.error('[Reseller Sync Error]', err));
      }
    } catch (syncErr) {
      console.error('[Sync Error after mother order creation]', syncErr);
    }

    // Delete matching mother shop abandoned cart on successful purchase
    try {
      const cleanPhone = shippingAddress.phone.replace(/\s+/g, '').trim();
      const AbandonedCart = (await import('@/models/AbandonedCart')).default;
      await AbandonedCart.deleteMany({
        phone: cleanPhone,
        $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
      });
    } catch (e) {
      console.error('Failed to delete matching abandoned cart:', e);
    }

    // Revalidate products cache to reflect new stock levels across the site
    try {
      const { revalidateTag } = await import('next/cache');
      revalidateTag(CACHE_TAGS.products, 'max');
    } catch (e) {
      console.error('Failed to revalidate products cache:', e);
    }

    return NextResponse.json(newOrder, { status: 201 });

  } catch (error: any) {
    if (session) {
      await session.abortTransaction();
    }

    // Manual Rollback Fallback (Crucial for non-replica set MongoDB)
    if (successfulDeductions.length > 0) {
      console.log('Attempting manual stock restoration for failed order...');
      for (const ded of successfulDeductions) {
        try {
          if (ded.variantId) {
            await Product.updateOne(
              { _id: ded.productId, "variants._id": ded.variantId },
              { $inc: { "variants.$.stock": ded.quantity } }
            );
          } else {
            await Product.updateOne(
              { _id: ded.productId },
              { $inc: { stock: ded.quantity } }
            );
          }
        } catch (rollbackErr) {
          console.error('Critical: Manual rollback failed for product:', ded.productId, rollbackErr);
        }
      }
    }

    console.error('Error creating order (Combo Discount):', error);
    const isClientError = error instanceof StockError;
    return NextResponse.json({
      message: isClientError ? error.message : 'Internal Server Error'
    }, { status: isClientError ? 400 : 500 });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

// GET orders
// If current user is Admin and ?all=true, returns ALL orders
// Otherwise returns only orders for the current user
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fetchAll = searchParams.get('all') === 'true';
    const isAdmin = ['admin', 'super_admin', 'manager', 'moderator'].includes((session.user as any)?.role);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '20'));
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const fromDate = searchParams.get('from') || '';
    const toDate = searchParams.get('to') || '';
    const resellerId = searchParams.get('resellerId') || '';
    const commissionStatus = searchParams.get('commissionStatus') || '';

    await connectToDatabase();

    // Ensure any unlinked ResellerOrders are synced to Mother Order table
    if (fetchAll && isAdmin) {
      try {
        const ResellerOrder = (await import('@/models/ResellerOrder')).default;
        const unlinked = await ResellerOrder.find({
          $or: [{ motherOrderId: { $exists: false } }, { motherOrderId: null }]
        }).limit(20).lean();

        for (const ro of unlinked) {
          const existingOrder = await Order.findOne({ shortId: ro.shortId });
          if (!existingOrder) {
            const created = await Order.create({
              shortId: ro.shortId,
              items: (ro.items || []).map((item: any) => ({
                product: item.productId,
                name: item.name,
                quantity: item.quantity,
                price: item.retailPrice,
                purchasePrice: item.purchasePrice,
                image: item.image,
                color: item.color,
                size: item.size,
              })),
              totalAmount: ro.totalAmount,
              deliveryCharge: ro.deliveryCharge || 0,
              shippingAddress: {
                fullName: ro.customer?.name || 'Customer',
                phone: ro.customer?.phone || '',
                street: ro.customer?.address?.street || '',
                city: ro.customer?.address?.city || '',
                state: ro.customer?.address?.city || '',
                division: ro.customer?.address?.division || '',
                zipCode: ro.customer?.address?.zipCode || '0000',
                country: 'Bangladesh',
              },
              paymentMethod: ro.paymentMethod || 'COD',
              paymentStatus: ro.paymentStatus || 'Pending',
              status: (ro.status as any) || 'Order Placed',
              resellerId: ro.resellerId,
              customerNote: ro.customerNote || '',
              internalNote: ro.internalNote || '',
              systemNote: ro.systemNote || 'Reseller Store Order',
              createdAt: ro.createdAt,
            });
            await ResellerOrder.findByIdAndUpdate(ro._id, { motherOrderId: created._id });
          } else {
            await ResellerOrder.findByIdAndUpdate(ro._id, { motherOrderId: existingOrder._id });
          }
        }
      } catch (syncErr) {
        console.error('[Orders Backfill Error]', syncErr);
      }
    }

    let query: any = { deletedAt: null };
    if (fetchAll && isAdmin) {
      if (status && status !== 'All') {
        query.status = status;
      }
      if (resellerId && resellerId !== 'all') {
        const ResellerOrder = (await import('@/models/ResellerOrder')).default;
        if (resellerId === 'main') {
          const resellerMotherIds = await ResellerOrder.find({ deletedAt: null }).distinct('motherOrderId');
          query.$and = query.$and || [];
          query.$and.push({
            $or: [
              { resellerId: null },
              { resellerId: { $exists: false } }
            ],
            _id: { $nin: resellerMotherIds }
          });
        } else {
          const matchingMotherIds = await ResellerOrder.find({ resellerId: resellerId, deletedAt: null }).distinct('motherOrderId');
          query.$and = query.$and || [];
          query.$and.push({
            $or: [
              { resellerId: resellerId },
              { _id: { $in: matchingMotherIds } }
            ]
          });
        }
      }
      if (commissionStatus && commissionStatus !== 'All') {
        const ResellerOrder = (await import('@/models/ResellerOrder')).default;
        const matchingMotherIds = await ResellerOrder.find({ commissionStatus: commissionStatus as any, deletedAt: null }).distinct('motherOrderId');
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { _id: { $in: matchingMotherIds } },
            { commissionStatus: commissionStatus }
          ]
        });
      }
      if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) query.createdAt.$gte = new Date(fromDate);
        if (toDate) {
          const end = new Date(toDate);
          end.setHours(23, 59, 59, 999);
          query.createdAt.$lte = end;
        }
      }
      if (search) {
        const userIds = await User.find({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }).select('_id');
        
        const searchConditions: any[] = [
          { "shippingAddress.fullName": { $regex: search, $options: 'i' } },
          { "shippingAddress.phone": { $regex: search, $options: 'i' } }
        ];

        if (mongoose.Types.ObjectId.isValid(search)) {
          searchConditions.push({ _id: search });
        } else if (search.length >= 8) {
          searchConditions.push({ shortId: { $regex: search, $options: 'i' } });
        }

        if (userIds.length > 0) {
          searchConditions.push({ user: { $in: userIds.map(u => u._id) } });
        }

        query.$and = query.$and || [];
        query.$and.push({ $or: searchConditions });
      }
    } else {
      const userId = (session.user as any).id;
      if (!userId) {
        return NextResponse.json({ message: 'User ID missing from session' }, { status: 400 });
      }

      const { getStorefrontReseller } = await import('@/lib/resellerStore');
      const storefrontReseller = await getStorefrontReseller(req);

      if (storefrontReseller) {
        // Reseller Storefront: ONLY show orders placed for this reseller's store
        query = {
          user: userId,
          deletedAt: null,
          storefrontResellerId: storefrontReseller._id,
        };
      } else {
        // Mother Shop: ONLY show mother shop orders (exclude reseller storefront orders)
        query = {
          user: userId,
          deletedAt: null,
          $or: [
            { storefrontResellerId: { $exists: false } },
            { storefrontResellerId: null },
          ],
          orderSource: { $ne: 'reseller_storefront' },
        };
      }
    }

    const totalCount = await Order.countDocuments(query);
    
    // Get counts for each status to display in tabs
    let counts = {
      all: 0,
      placed: 0,
      confirmed: 0,
      paid: 0,
      hold: 0,
      ready: 0,
      released: 0,
      delivered: 0,
      cancelled: 0
    };

    if (fetchAll && isAdmin) {
      const countQuery = { ...query };
      delete countQuery.status; // Remove status filter to count all

      const statusCounts = await Order.aggregate([
        { $match: countQuery },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]);

      const totalAll = await Order.countDocuments(countQuery);
      counts.all = totalAll;

      statusCounts.forEach((sc: any) => {
        if (sc._id === 'Order Placed') counts.placed = sc.count;
        else if (sc._id === 'Confirmed') counts.confirmed = sc.count;
        else if (sc._id === 'Paid') counts.paid = sc.count;
        else if (sc._id === 'Hold') counts.hold = sc.count;
        else if (sc._id === 'Ready for Delivery') counts.ready = sc.count;
        else if (sc._id === 'Released for Delivery') counts.released = sc.count;
        else if (sc._id === 'Delivered') counts.delivered = sc.count;
        else if (sc._id === 'Cancelled') counts.cancelled = sc.count;
      });
    }
    
    let ordersQuery = Order.find(query).sort({ createdAt: -1 });

    if (fetchAll && isAdmin) {
      ordersQuery = ordersQuery.skip((page - 1) * limit).limit(limit);
    }

    const orders = await ordersQuery
      .populate('user', 'name email')
      .populate('resellerId', 'storeName subdomain customDomain')
      .populate('storefrontResellerId', 'storeName subdomain customDomain')
      .populate({
        path: 'items.product',
        select: 'name uploadedBy',
        populate: {
          path: 'uploadedBy',
          select: 'storeName subdomain customDomain',
        },
      });

    let processedOrders = orders;
    if (fetchAll && isAdmin) {
      const orderIds = orders.map((o: any) => o._id);
      const shortIds = orders.map((o: any) => o.shortId).filter(Boolean);

      const resellerOrders = await ResellerOrder.find({
        $or: [
          { motherOrderId: { $in: orderIds } },
          { shortId: { $in: shortIds } }
        ],
        deletedAt: null
      })
      .select('motherOrderId shortId resellerCommission commissionStatus resellerId internalNote systemFee salesProfit')
      .populate('resellerId', 'storeName subdomain customDomain')
      .lean();

      processedOrders = await Promise.all(orders.map(async (order: any) => {
        const orderObj = order.toObject ? order.toObject() : order;
        
        // Find matching reseller orders for this mother order
        const matchingRos = resellerOrders.filter((r: any) =>
          (r.motherOrderId && r.motherOrderId.toString() === order._id.toString()) ||
          (order.shortId && r.shortId && (r.shortId === order.shortId || r.shortId.startsWith(order.shortId)))
        );

        // Storefront order has exact shortId or does NOT contain '-F' (fulfillment)
        const ro = matchingRos.find((r: any) => order.shortId && r.shortId === order.shortId)
          || matchingRos.find((r: any) => !r.shortId?.includes('-F'))
          || matchingRos[0]
          || null;

        // Sum system fee from mother order or any fulfillment reseller orders:
        const totalSystemFee = (orderObj.systemFee && orderObj.systemFee > 0)
          ? orderObj.systemFee
          : (matchingRos.reduce((sum: number, r: any) => sum + (Number(r.systemFee) || 0), 0) || (ro?.systemFee ?? 0));

        const totalSalesProfit = (orderObj.salesProfit && orderObj.salesProfit > 0)
          ? orderObj.salesProfit
          : (ro?.salesProfit || 0);

        let finalReseller = orderObj.storefrontResellerId || ro?.resellerId || orderObj.resellerId;

        // If finalReseller is an unpopulated string/ObjectId, populate it
        if (typeof finalReseller === 'string' || (finalReseller && !finalReseller.storeName && mongoose.Types.ObjectId.isValid(finalReseller))) {
          try {
            const found = await Reseller.findById(finalReseller).select('storeName subdomain customDomain').lean();
            if (found) {
              finalReseller = found;
            }
          } catch (e) {}
        }

        // Attach product uploader reseller to items if available
        const itemsWithUploader = (orderObj.items || []).map((item: any) => {
          const uploader = item.product?.uploadedBy || item.uploadedBy;
          return {
            ...item,
            uploadedBy: uploader
          };
        });

        // If no order-level reseller, but items have an uploader reseller
        if (!finalReseller) {
          const itemReseller = itemsWithUploader.find((i: any) => i.uploadedBy && typeof i.uploadedBy === 'object' && i.uploadedBy.storeName)?.uploadedBy;
          if (itemReseller) {
            finalReseller = itemReseller;
          }
        }

        if (!orderObj.resellerId && finalReseller) {
          const setFields: any = {
            resellerId: typeof finalReseller === 'object' && (finalReseller as any)._id ? (finalReseller as any)._id : finalReseller
          };
          if (ro?.internalNote && !orderObj.internalNote) {
            setFields.internalNote = ro.internalNote;
          }
          Order.findByIdAndUpdate(order._id, { $set: setFields }).exec().catch(() => {});
        }

        const finalInternalNote = orderObj.internalNote || ro?.internalNote || '';
        if (!orderObj.internalNote && ro?.internalNote) {
          Order.findByIdAndUpdate(order._id, { $set: { internalNote: ro.internalNote } }).exec().catch(() => {});
        }

        const finalCommission = ro?.resellerCommission ?? (orderObj.resellerCommission || 0);
        const finalSystemFee = totalSystemFee;
        const finalSalesProfit = totalSalesProfit;
        const finalCommStatus = ro?.commissionStatus ?? (orderObj.commissionStatus || (finalReseller ? 'pending' : undefined));

        // Fulfillment orders for supplied products:
        const fulfillmentRos = matchingRos.filter((r: any) =>
          r.shortId?.includes('-F') || (ro && r._id.toString() !== ro._id.toString())
        );

        const orderValue = Math.round(Number(orderObj.totalAmount) || 0);
        const deliveryCharge = Math.round(Number(orderObj.deliveryCharge) || 0);
        const motherFee = Math.round(Number(totalSystemFee) || 0);

        let supplierPart: { name: string; amount: number; status?: string } | null = null;
        if (fulfillmentRos.length > 0) {
          const firstF = fulfillmentRos[0];
          const supName = (firstF.resellerId as any)?.storeName || 'Supplier';
          const totalSupAmount = fulfillmentRos.reduce((sum: number, f: any) => sum + (Number(f.resellerCommission) || 0), 0);
          supplierPart = {
            name: supName,
            amount: Math.round(totalSupAmount),
            status: firstF.commissionStatus || 'pending'
          };
        }

        let sellerPart: { name: string; amount: number; status?: string } | null = null;
        if (ro && (ro.shortId === orderObj.shortId || !ro.shortId?.includes('-F'))) {
          const sellerName = (ro.resellerId as any)?.storeName || (finalReseller as any)?.storeName || 'Storefront Reseller';
          const sellerAmount = Math.round(Number(ro.resellerCommission) || 0);
          sellerPart = {
            name: sellerName,
            amount: sellerAmount,
            status: ro.commissionStatus || 'pending'
          };
        } else if (finalReseller) {
          const sellerName = (finalReseller as any)?.storeName || 'Storefront Reseller';
          const sellerAmount = Math.round(Number(finalCommission) || (orderObj.resellerCommission ? Number(orderObj.resellerCommission) : 0));
          if (sellerAmount > 0) {
            sellerPart = {
              name: sellerName,
              amount: sellerAmount,
              status: finalCommStatus || 'pending'
            };
          }
        }

        const isOwnProductSale = !supplierPart && !!sellerPart && (Number(finalSystemFee) > 0 || Number(orderObj.systemFee) > 0 || (ro && Number(ro.systemFee) > 0));

        const distributedSoFar = deliveryCharge + motherFee + (supplierPart?.amount || 0) + (sellerPart?.amount || 0);
        const motherProfit = Math.max(0, orderValue - distributedSoFar);

        const disbursement = {
          orderValue,
          deliveryCharge,
          supplier: supplierPart,
          seller: sellerPart,
          isOwnProductSale,
          motherFee,
          motherProfit,
        };

        const phone = order.shippingAddress?.phone;
        const baseResult = {
          ...orderObj,
          items: itemsWithUploader,
          resellerId: finalReseller,
          internalNote: finalInternalNote,
          resellerCommission: finalCommission,
          systemFee: finalSystemFee,
          salesProfit: finalSalesProfit,
          commissionStatus: finalCommStatus,
          disbursement,
        };

        if (!phone) {
          return {
            ...baseResult,
            isRepeat: false,
            isDuplicate: false
          };
        }

        const otherOrders = await Order.find({
          "shippingAddress.phone": phone,
          _id: { $ne: order._id },
          deletedAt: null
        }).select('items');

        if (otherOrders.length === 0) {
          return {
            ...baseResult,
            isRepeat: false,
            isDuplicate: false
          };
        }

        const isDuplicate = otherOrders.some(other => {
          if (other.items.length !== order.items.length) return false;
          return order.items.every((item: any) => {
            return other.items.some((otherItem: any) => {
              return String(otherItem.product) === String(item.product) &&
                     String(otherItem.color || '') === String(item.color || '') &&
                     String(otherItem.size || '') === String(item.size || '') &&
                     otherItem.quantity === item.quantity;
            });
          });
        });

        return {
          ...baseResult,
          isRepeat: true,
          isDuplicate
        };
      })) as any[];
    }

    if (fetchAll && isAdmin) {
      return NextResponse.json({
        orders: processedOrders,
        totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit),
        counts
      });
    }

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}


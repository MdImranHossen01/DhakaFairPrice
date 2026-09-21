import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import ResellerCoupon from '@/models/ResellerCoupon';

interface Params {
  params: Promise<{ subdomain: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { subdomain } = await params;
    await dbConnect();

    const reseller = await Reseller.findOne({ subdomain, status: 'active' });
    if (!reseller) {
      return NextResponse.json({ message: 'Store not found' }, { status: 404 });
    }

    const { code, totalAmount } = await request.json();
    const validatedTotal = Number(totalAmount);

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ message: 'কুপন কোড আবশ্যক' }, { status: 400 });
    }

    if (!totalAmount || isNaN(validatedTotal) || validatedTotal < 0) {
      return NextResponse.json({ message: 'কার্ট মোট মূল্য সঠিক নয়' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    const coupon = await ResellerCoupon.findOne({
      resellerId: reseller._id,
      code: cleanCode,
      isActive: true,
      expiryDate: { $gt: new Date() }
    });

    if (!coupon) {
      return NextResponse.json({ message: 'ভুল অথবা মেয়াদোত্তীর্ণ কুপন কোড' }, { status: 404 });
    }

    if (coupon.minPurchase && validatedTotal < coupon.minPurchase) {
      return NextResponse.json({
        message: `এই কুপনটি ব্যবহারের জন্য সর্বনিম্ন ৳${coupon.minPurchase} টাকার কেনাকাটা প্রয়োজন`
      }, { status: 400 });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ message: 'কুপনটির ব্যবহারের সর্বোচ্চ সীমা শেষ হয়েছে' }, { status: 400 });
    }

    let discountAmount = 0;
    if (coupon.discountType === 'fixed') {
      discountAmount = coupon.discountValue;
    } else {
      discountAmount = Math.floor(validatedTotal * (coupon.discountValue / 100));
    }

    // Ensure discount does not exceed total
    discountAmount = Math.min(discountAmount, validatedTotal);

    return NextResponse.json({
      success: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount
    });

  } catch (error: any) {
    console.error('Error validating reseller coupon:', error);
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}

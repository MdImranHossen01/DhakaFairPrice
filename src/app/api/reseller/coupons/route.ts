import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import ResellerCoupon from '@/models/ResellerCoupon';
import Reseller from '@/models/Reseller';

async function getResellerId(userId: string) {
  await dbConnect();
  const reseller = await Reseller.findOne({ userId });
  return reseller?._id;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== 'reseller') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resellerId = await getResellerId((session.user as any).id);
    if (!resellerId) return NextResponse.json({ error: 'Reseller account not found' }, { status: 404 });

    const coupons = await ResellerCoupon.find({ resellerId }).sort({ createdAt: -1 });
    return NextResponse.json({ coupons });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== 'reseller') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resellerId = await getResellerId((session.user as any).id);
    if (!resellerId) return NextResponse.json({ error: 'Reseller account not found' }, { status: 404 });

    const body = await request.json();
    const { code, discountType, discountValue, minPurchase, expiryDate, usageLimit, isActive } = body;

    if (!code || !discountType || discountValue === undefined || !expiryDate) {
      return NextResponse.json({ error: 'Code, type, value and expiry date are required' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    // Check duplicate for this reseller
    const existing = await ResellerCoupon.findOne({ resellerId, code: cleanCode });
    if (existing) {
      return NextResponse.json({ error: 'এই কুপন কোডটি ইতিমধ্যে আপনার লিস্টে রয়েছে' }, { status: 400 });
    }

    const coupon = await ResellerCoupon.create({
      resellerId,
      code: cleanCode,
      discountType,
      discountValue: Number(discountValue),
      minPurchase: Number(minPurchase || 0),
      expiryDate: new Date(expiryDate),
      usageLimit: usageLimit ? Number(usageLimit) : undefined,
      isActive: isActive ?? true,
    });

    return NextResponse.json({ success: true, coupon }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== 'reseller') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resellerId = await getResellerId((session.user as any).id);
    if (!resellerId) return NextResponse.json({ error: 'Reseller account not found' }, { status: 404 });

    const body = await request.json();
    const { id, code, discountType, discountValue, minPurchase, expiryDate, usageLimit, isActive } = body;

    if (!id) return NextResponse.json({ error: 'Coupon ID required' }, { status: 400 });

    const updateData: any = {};
    if (code) updateData.code = code.trim().toUpperCase();
    if (discountType) updateData.discountType = discountType;
    if (discountValue !== undefined) updateData.discountValue = Number(discountValue);
    if (minPurchase !== undefined) updateData.minPurchase = Number(minPurchase);
    if (expiryDate) updateData.expiryDate = new Date(expiryDate);
    if (usageLimit !== undefined) updateData.usageLimit = usageLimit ? Number(usageLimit) : undefined;
    if (isActive !== undefined) updateData.isActive = isActive;

    const coupon = await ResellerCoupon.findOneAndUpdate(
      { _id: id, resellerId },
      { $set: updateData },
      { new: true }
    );

    if (!coupon) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });

    return NextResponse.json({ success: true, coupon });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== 'reseller') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resellerId = await getResellerId((session.user as any).id);
    if (!resellerId) return NextResponse.json({ error: 'Reseller account not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Coupon ID required' }, { status: 400 });

    const coupon = await ResellerCoupon.findOneAndDelete({ _id: id, resellerId });
    if (!coupon) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

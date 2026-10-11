import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import User from '@/models/User';
import { normalizePhoneNumber } from '@/lib/utils';
import { auth } from '@/auth';

interface Params {
  params: Promise<{ subdomain: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { subdomain } = await params;
    await dbConnect();

    const reseller = await Reseller.findOne({ subdomain, status: 'active' }).lean() as any;
    if (!reseller) {
      return NextResponse.json({ message: 'Store not found' }, { status: 404 });
    }

    const loyaltyConfig = reseller.loyaltyConfig || {
      isEnabled: false,
      activationThreshold: 5000,
      rewardPercentage: 5,
    };

    const searchParams = request.nextUrl.searchParams;
    const rawPhone = searchParams.get('phone');
    const normalizedPhone = rawPhone ? normalizePhoneNumber(rawPhone) || rawPhone.trim() : null;

    const session = await auth();
    const sessionUserId = session?.user?.id;

    let customerUser = null;

    if (sessionUserId) {
      customerUser = await User.findById(sessionUserId).lean();
    } else if (normalizedPhone) {
      customerUser = await User.findOne({
        $or: [
          { phone: normalizedPhone },
          { email: `${normalizedPhone}@store.com` },
          { email: `${normalizedPhone}@swapnobaz.com` }
        ]
      }).lean();
    }

    return NextResponse.json({
      loyaltyConfig,
      customer: customerUser ? {
        name: customerUser.name,
        phone: customerUser.phone,
        email: customerUser.email,
        walletBalance: customerUser.walletBalance || 0,
        isLoyaltyActive: customerUser.isSubscriptionActive || false,
      } : null
    });

  } catch (error: any) {
    console.error('Error fetching reseller customer loyalty:', error);
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}

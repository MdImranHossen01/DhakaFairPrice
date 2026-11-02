import { NextRequest, NextResponse } from 'next/server';
import { sendWebPushNotification } from '@/lib/webpush';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
  try {
    const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'Dhaka Fair Price';
    const session = await auth();
    const role = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (role === 'reseller' && userId) {
      const result = await sendWebPushNotification(
        {
          title: `🔔 টেস্ট নোটিফিকেশন (${storeName})`,
          body: 'অভিনন্দন! আপনার ডিভাইসে রিসেলার অর্ডার সাউন্ড অ্যালার্ট সক্রিয় আছে।',
          url: '/reseller/orders',
        },
        { targetUserId: userId }
      );
      return NextResponse.json({
        success: true,
        message: 'Test push notification sent to your reseller device',
        result,
      });
    }

    const result = await sendWebPushNotification(
      {
        title: `🔔 টেস্ট নোটিফিকেশন (${storeName})`,
        body: 'অভিনন্দন! আপনার ব্রাউজারে নোটিফিকেশন সফলভাবে চালু হয়েছে।',
        url: '/admin/orders',
      },
      userId ? { targetUserId: userId } : { isMotherOrder: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Test push notification sent',
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

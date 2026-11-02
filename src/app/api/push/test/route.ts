import { NextRequest, NextResponse } from 'next/server';
import { sendWebPushNotification } from '@/lib/webpush';

export async function POST(req: NextRequest) {
  try {
    const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'Swapnobaz';
    const result = await sendWebPushNotification({
      title: `🔔 টেস্ট পুশ নোটিফিকেশন (${storeName})`,
      body: 'অভিনন্দন! আপনার মোবাইল ও ল্যাপটপে পুশ নোটিফিকেশন সফলভাবে কাজ করছে।',
      url: '/admin/orders',
    });

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

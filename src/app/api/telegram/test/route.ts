import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramOrderNotification } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  try {
    const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'Swapnobaz';
    const success = await sendTelegramOrderNotification({
      shortId: 'TEST-1234',
      name: 'টেস্ট কাস্টমার',
      phone: '01700000000',
      address: 'ধানমন্ডি, ঢাকা',
      totalAmount: 1850,
      deliveryCharge: 120,
      paymentMethod: 'COD',
      paymentStatus: 'Pending',
      source: `${storeName} (Test Ping)`,
      customerNote: 'টেলিগ্রাম ইনস্ট্যান্ট নোটিফিকেশন ভেরিফিকেশন টেস্ট।',
      items: [
        {
          name: 'China Stitch Formal Shirt',
          quantity: 2,
          price: 730,
          size: 'L',
          color: 'Black',
        },
      ],
    });

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'টেলিগ্রামে টেস্ট নোটিফিকেশন সফলভাবে পাঠানো হয়েছে!',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message:
            'টেলিগ্রাম নোটিফিকেশন পাঠানো যায়নি। অনুগ্রহ করে .env.local ফাইলে TELEGRAM_BOT_TOKEN এবং TELEGRAM_CHAT_ID চেক করুন।',
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

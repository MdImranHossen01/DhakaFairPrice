/**
 * Telegram Instant Order Notification Helper
 */

export interface OrderNotificationData {
  orderId?: string;
  shortId?: string;
  name: string;
  phone: string;
  address?: string;
  totalAmount: number;
  deliveryCharge?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
    size?: string;
    color?: string;
  }>;
  source?: string;
  resellerStoreName?: string;
  customerNote?: string;
}

export async function sendTelegramOrderNotification(data: OrderNotificationData): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('[Telegram] Skipping notification: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing in .env');
    return false;
  }

  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'Swapnobaz';
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'swapnobaz.com';

  const nowFormatted = new Date().toLocaleString('bn-BD', {
    timeZone: 'Asia/Dhaka',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Format Items
  let itemsSummary = '';
  if (Array.isArray(data.items) && data.items.length > 0) {
    itemsSummary = data.items
      .map((item, idx) => {
        const variantInfo = [item.size, item.color].filter(Boolean).join('/');
        const variantStr = variantInfo ? ` (${variantInfo})` : '';
        return `   ${idx + 1}. ${item.name}${variantStr} × ${item.quantity} = ৳${item.price * item.quantity}`;
      })
      .join('\n');
  }

  const message = `🛒 *নতুন অর্ডার এসেছে! (${storeName})*
━━━━━━━━━━━━━━━━━━━━
🆔 *অর্ডার আইডি:* #${data.shortId || data.orderId || 'N/A'}
👤 *কাস্টমার:* ${data.name}
📞 *ফোন নম্বর:* ${data.phone}
📍 *ঠিকানা:* ${data.address || 'N/A'}
💰 *মোট বিল:* ৳${(data.totalAmount || 0).toLocaleString('en-BD')} ${data.deliveryCharge ? `(ডেলিভারি: ৳${data.deliveryCharge})` : ''}
💳 *পেমেন্ট:* ${data.paymentMethod || 'COD'} (${data.paymentStatus || 'Pending'})
🌐 *স্টোর সোর্স:* ${data.resellerStoreName ? `রিসেলার (${data.resellerStoreName})` : data.source || 'মাদার শপ'}
${itemsSummary ? `\n📦 *আইটেমসমূহ:*\n${itemsSummary}\n` : ''}${data.customerNote ? `\n📝 *কাস্টমার নোট:* ${data.customerNote}\n` : ''}⏰ *অর্ডার টাইম:* ${nowFormatted}
━━━━━━━━━━━━━━━━━━━━
🔗 [ড্যাশবোর্ডে অর্ডার দেখুন](https://www.${rootDomain}/admin/orders)`;

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    const resJson = await response.json();
    if (!response.ok || !resJson.ok) {
      console.error('[Telegram] API error:', resJson);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Telegram] Request failed:', error);
    return false;
  }
}

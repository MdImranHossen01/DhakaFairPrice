/**
 * Telegram Instant Notification Helper
 * Handles Orders, Reseller Registrations, Payout Requests, and Low Stock Alerts.
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

export interface ResellerRegistrationNotificationData {
  storeName: string;
  subdomain: string;
  name: string;
  phone: string;
  email?: string;
  hubName?: string;
  district?: string;
  division?: string;
  address?: string;
}

export interface PayoutNotificationData {
  resellerStoreName: string;
  resellerName?: string;
  amount: number;
  payoutMethod: string;
  accountNumber: string;
  balanceAfter?: number;
}

export interface LowStockNotificationData {
  productId: string;
  productName: string;
  remainingStock: number;
  variantName?: string;
}

export interface ProductSubmissionNotificationData {
  resellerStoreName: string;
  productName: string;
  price: number;
  stock?: number;
  category?: string;
}

async function sendTelegramMessage(message: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('[Telegram] Skipping notification: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing in .env');
    return false;
  }

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

export async function sendTelegramOrderNotification(data: OrderNotificationData): Promise<boolean> {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'Dhaka Fair Price';
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dhakafairprice.com';

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

  return sendTelegramMessage(message);
}

export async function sendTelegramResellerNotification(data: ResellerRegistrationNotificationData): Promise<boolean> {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'Dhaka Fair Price';
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dhakafairprice.com';

  const nowFormatted = new Date().toLocaleString('bn-BD', {
    timeZone: 'Asia/Dhaka',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const locationParts = [data.hubName, data.address, data.district, data.division].filter(Boolean).join(', ');

  const message = `👥 *নতুন রিসেলার আবেদন! (${storeName})*
━━━━━━━━━━━━━━━━━━━━
🏬 *দোকানের নাম:* ${data.storeName}
🌐 *সাবডোমেন:* https://${data.subdomain}.${rootDomain}
👤 *আবেদনকারী:* ${data.name}
📞 *ফোন নম্বর:* ${data.phone}
✉️ *ইমেইল:* ${data.email || 'N/A'}
📍 *ঠিকানা / হাব:* ${locationParts || 'N/A'}
⏰ *আবেদনের সময়:* ${nowFormatted}
━━━━━━━━━━━━━━━━━━━━
🔗 [রিসেলার অ্যাপ্লিকেশন রিভিউ করুন](https://www.${rootDomain}/admin/resellers)`;

  return sendTelegramMessage(message);
}

export async function sendTelegramPayoutNotification(data: PayoutNotificationData): Promise<boolean> {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'Dhaka Fair Price';
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dhakafairprice.com';

  const nowFormatted = new Date().toLocaleString('bn-BD', {
    timeZone: 'Asia/Dhaka',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const message = `💸 *নতুন পেআউট/উইথড্র রিকোয়েস্ট! (${storeName})*
━━━━━━━━━━━━━━━━━━━━
🏬 *রিসেলার স্টোর:* ${data.resellerStoreName}
👤 *রিসেলার নাম:* ${data.resellerName || 'N/A'}
💰 *উইথড্র পরিমাণ:* ৳${(data.amount || 0).toLocaleString('en-BD')}
💳 *পেমেন্ট মেথড:* ${(data.payoutMethod || 'Mobile Banking').toUpperCase()}
🔢 *অ্যাকাউন্ট নম্বর:* ${data.accountNumber}
💼 *অবশিষ্ট ব্যালেন্স:* ৳${(data.balanceAfter || 0).toLocaleString('en-BD')}
⏰ *রিকোয়েস্ট টাইম:* ${nowFormatted}
━━━━━━━━━━━━━━━━━━━━
🔗 [পেআউট রিভিউ ও অনুমোদন করুন](https://www.${rootDomain}/admin/payouts)`;

  return sendTelegramMessage(message);
}

export async function sendTelegramLowStockNotification(data: LowStockNotificationData): Promise<boolean> {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'Dhaka Fair Price';
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dhakafairprice.com';

  const nowFormatted = new Date().toLocaleString('bn-BD', {
    timeZone: 'Asia/Dhaka',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const stockStatus = data.remainingStock <= 0
    ? '❌ স্টক আউট (0)'
    : `⚠️ মাত্র ${data.remainingStock} টি বাকি!`;

  const message = `⚠️ *লো স্টক অ্যালার্ট! (${storeName})*
━━━━━━━━━━━━━━━━━━━━
📦 *প্রোডাক্ট:* ${data.productName}${data.variantName ? ` (${data.variantName})` : ''}
🔢 *অবশিষ্ট স্টক:* ${stockStatus}
⏰ *অ্যালার্ট টাইম:* ${nowFormatted}
━━━━━━━━━━━━━━━━━━━━
🔗 [ইনভেন্টরি চেক ও রিস্টক করুন](https://www.${rootDomain}/admin/products)`;

  return sendTelegramMessage(message);
}

export async function sendTelegramProductNotification(data: ProductSubmissionNotificationData): Promise<boolean> {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'Dhaka Fair Price';
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dhakafairprice.com';

  const nowFormatted = new Date().toLocaleString('bn-BD', {
    timeZone: 'Asia/Dhaka',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const message = `📦 *নতুন প্রডাক্ট অ্যাপ্রুভাল রিকোয়েস্ট! (${storeName})*
━━━━━━━━━━━━━━━━━━━━
🏬 *রিসেলার স্টোর:* ${data.resellerStoreName}
🛍️ *প্রডাক্টের নাম:* ${data.productName}
💰 *মূল্য:* ৳${(data.price || 0).toLocaleString('en-BD')}
${data.stock !== undefined ? `🔢 *স্টক:* ${data.stock} টি\n` : ''}${data.category ? `🏷️ *ক্যাটাগরি:* ${data.category}\n` : ''}⏰ *সাবমিটের সময়:* ${nowFormatted}
━━━━━━━━━━━━━━━━━━━━
🔗 [প্রডাক্ট রিভিউ ও অনুমোদন করুন](https://www.${rootDomain}/admin/products)`;

  return sendTelegramMessage(message);
}

export async function checkAndNotifyLowStock(productIds: string[]): Promise<void> {
  if (!productIds || productIds.length === 0) return;
  try {
    const Product = (await import('@/models/Product')).default;
    const cleanIds = Array.from(new Set(productIds.filter(Boolean)));
    const products = await Product.find({ _id: { $in: cleanIds } }).select('name stock variants');
    for (const prod of products) {
      if (Array.isArray(prod.variants) && prod.variants.length > 0) {
        for (const v of prod.variants) {
          const vStock = Number(v.stock) || 0;
          if (vStock <= 5) {
            const variantDesc = [v.size, v.color].filter(Boolean).join('/');
            await sendTelegramLowStockNotification({
              productId: prod._id.toString(),
              productName: prod.name,
              remainingStock: vStock,
              variantName: variantDesc || undefined,
            });
          }
        }
      } else {
        const pStock = Number(prod.stock) || 0;
        if (pStock <= 5) {
          await sendTelegramLowStockNotification({
            productId: prod._id.toString(),
            productName: prod.name,
            remainingStock: pStock,
          });
        }
      }
    }
  } catch (err) {
    console.error('[Telegram Low Stock Check Error]', err);
  }
}

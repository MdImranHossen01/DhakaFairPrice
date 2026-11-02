import webpush from 'web-push';
import connectToDatabase from '@/lib/db';
import PushSubscription from '@/models/PushSubscription';

const vapidPublicKey =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BKc8CDjOGVJXcupFb2GIDVaMJ7QstKD-Wb7YlTKt53GcE803xq5f57zboWjBymnLx5TsY9dgE4eETMrcDUpdJiY';

const vapidPrivateKey =
  process.env.VAPID_PRIVATE_KEY ||
  'GCP1PwN937Ec6JoHh1UwMZpIsAqmnkEV_-Styo4pxWQ';

const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:imranshuvo101@gmail.com';

// Configure web-push with VAPID details
try {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} catch (err) {
  console.error('[WebPush] Configuration error:', err);
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
}

export async function sendWebPushNotification(payload: PushNotificationPayload) {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'Swapnobaz';

  try {
    await connectToDatabase();
    const subscriptions = await PushSubscription.find({}).lean();

    if (!subscriptions || subscriptions.length === 0) {
      return { total: 0, sent: 0, failed: 0 };
    }

    const payloadString = JSON.stringify({
      title: payload.title || `🛒 নতুন অর্ডার এসেছে! (${storeName})`,
      body: payload.body || 'একজন কাস্টমার নতুন অর্ডার প্লেস করেছেন।',
      icon: payload.icon || '/favicon.ico',
      badge: payload.badge || '/favicon.ico',
      url: payload.url || '/admin/orders',
    });

    let sent = 0;
    let failed = 0;
    const expiredIds: any[] = [];

    await Promise.all(
      subscriptions.map(async (sub: any) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            payloadString
          );
          sent++;
        } catch (error: any) {
          failed++;
          // 404 or 410 means the subscription has expired or user revoked permission
          if (error.statusCode === 404 || error.statusCode === 410) {
            expiredIds.push(sub._id);
          }
        }
      })
    );

    // Clean up expired subscriptions
    if (expiredIds.length > 0) {
      await PushSubscription.deleteMany({ _id: { $in: expiredIds } });
    }

    return { total: subscriptions.length, sent, failed };
  } catch (err) {
    console.error('[WebPush] Error sending push notification:', err);
    return { total: 0, sent: 0, failed: 0, error: err };
  }
}

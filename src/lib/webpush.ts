import webpush from 'web-push';
import connectToDatabase from '@/lib/db';
import PushSubscription from '@/models/PushSubscription';
import mongoose from 'mongoose';

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

export interface PushTargetScope {
  isMotherOrder?: boolean;
  onlyAdmin?: boolean;
  onlyTarget?: boolean;
  resellerId?: string | mongoose.Types.ObjectId;
  targetUserId?: string;
}

export async function sendWebPushNotification(
  payload: PushNotificationPayload,
  scope?: PushTargetScope
) {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'Swapnobaz';

  try {
    await connectToDatabase();

    let query: any = {};

    if (scope?.onlyTarget) {
      // Strictly notify ONLY the specific Reseller or User (never Admins or other resellers)
      const orConditions: any[] = [];
      if (scope.targetUserId && mongoose.Types.ObjectId.isValid(scope.targetUserId)) {
        orConditions.push({ userId: new mongoose.Types.ObjectId(scope.targetUserId) });
      }
      if (scope.resellerId && mongoose.Types.ObjectId.isValid(scope.resellerId.toString())) {
        const rObjId = new mongoose.Types.ObjectId(scope.resellerId.toString());
        orConditions.push({ role: 'reseller', resellerId: rObjId });
      }
      if (orConditions.length === 0) {
        return { total: 0, sent: 0, failed: 0 };
      }
      query = { $or: orConditions };
    } else if (scope?.targetUserId) {
      if (!mongoose.Types.ObjectId.isValid(scope.targetUserId)) {
        return { total: 0, sent: 0, failed: 0 };
      }
      query = { userId: new mongoose.Types.ObjectId(scope.targetUserId) };
    } else if (scope?.isMotherOrder || scope?.onlyAdmin) {
      // Mother shop order or Admin-only alert: ONLY notify verified Admins
      query = {
        role: { $in: ['admin', 'super_admin', 'manager', 'moderator'] },
      };
    } else if (scope?.resellerId) {
      // Reseller store order: notify verified Admins AND the specific reseller who owns that store
      const rObjId = mongoose.Types.ObjectId.isValid(scope.resellerId.toString())
        ? new mongoose.Types.ObjectId(scope.resellerId.toString())
        : scope.resellerId;
      query = {
        $or: [
          { role: { $in: ['admin', 'super_admin', 'manager', 'moderator'] } },
          {
            role: 'reseller',
            $or: [
              { resellerId: rObjId },
              { userId: rObjId },
            ],
          },
        ],
      };
    } else {
      // Default: Strictly verified Admin devices only
      query = {
        role: { $in: ['admin', 'super_admin', 'manager', 'moderator'] },
      };
    }

    const subscriptions = await PushSubscription.find(query).lean();

    if (!subscriptions || subscriptions.length === 0) {
      return { total: 0, sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;
    const expiredIds: any[] = [];

    await Promise.all(
      subscriptions.map(async (sub: any) => {
        try {
          const isReseller = sub.role === 'reseller';
          let targetUrl = payload.url || (isReseller ? '/reseller/orders' : '/admin/orders');
          // If this is a dual-targeted reseller store order push (where payload.url is '/admin/orders'),
          // route the reseller's click to '/reseller/orders' instead of '/admin/orders'
          if (isReseller && targetUrl.startsWith('/admin')) {
            targetUrl = '/reseller/orders';
          }

          const payloadString = JSON.stringify({
            title: payload.title || `নতুন অর্ডার এসেছে! (${storeName})`,
            body: payload.body || 'একটি নতুন অর্ডার প্লেস করা হয়েছে।',
            icon: payload.icon || '/favicon.ico',
            badge: payload.badge || '/favicon.ico',
            url: targetUrl,
          });

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

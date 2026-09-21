import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import GlobalSettings from '@/models/GlobalSettings';
import { headers } from 'next/headers';

/**
 * POST /api/admin/marketing/server-tracking
 * 
 * Allows admins to fire a test server-side tracking event directly
 * to Facebook CAPI and/or TikTok Events API from the admin dashboard.
 * Useful for validating that pixel IDs and access tokens are correctly configured.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !['admin', 'super_admin'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const headersList = await headers();
    const hostname = headersList.get('host') || 'localhost';
    const baseUrl = `https://${hostname}`;

    await connectToDatabase();
    const settings = await GlobalSettings.findOne().sort({ updatedAt: -1 }).lean();

    const body = await request.json();
    const { platform = 'both', eventName = 'PageView' } = body;

    const results: Record<string, unknown> = {};

    // ── Facebook CAPI Test ────────────────────────────────────────────────────
    if (platform === 'facebook' || platform === 'both') {
      const pixelId = settings?.metaPixelId;
      const accessToken = settings?.facebookAccessToken;

      if (!pixelId || !accessToken) {
        results.facebook = { success: false, error: 'Meta Pixel ID or Access Token not configured' };
      } else {
        const eventId = crypto.randomUUID();
        const payload: any = {
          data: [
            {
              event_name: eventName,
              event_time: Math.floor(Date.now() / 1000),
              event_id: eventId,
              event_source_url: baseUrl,
              action_source: 'website',
              user_data: {
                client_ip_address: '127.0.0.1',
                client_user_agent: 'Swapnobaz Admin Test',
              },
              custom_data: { test: true },
            },
          ],
        };

        if (settings?.facebookTestEventCode) {
          payload.test_event_code = settings.facebookTestEventCode;
        }

        try {
          const fbRes = await fetch(
            `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }
          );
          const fbData = await fbRes.json();
          results.facebook = {
            success: fbRes.ok,
            eventId,
            response: fbData,
            pixelId: pixelId.slice(0, 4) + '****',
          };
        } catch (err: any) {
          results.facebook = { success: false, error: err.message };
        }
      }
    }

    // ── TikTok Events API Test ───────────────────────────────────────────────
    if (platform === 'tiktok' || platform === 'both') {
      const pixelId = settings?.tiktokPixelId;
      const accessToken = settings?.tiktokAccessToken;

      if (!pixelId || !accessToken) {
        results.tiktok = { success: false, error: 'TikTok Pixel ID or Access Token not configured' };
      } else {
        const eventId = crypto.randomUUID();
        const payload = {
          pixel_code: pixelId,
          event: eventName === 'Purchase' ? 'CompletePayment' : eventName,
          event_id: eventId,
          timestamp: new Date().toISOString(),
          context: {
            user: {},
            page: { url: baseUrl },
            user_agent: 'Swapnobaz Admin Test',
            ip: '127.0.0.1',
          },
          properties: {
            currency: 'BDT',
            test: true,
          },
        };

        try {
          const ttRes = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
            method: 'POST',
            headers: { 'Access-Token': accessToken, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const ttData = await ttRes.json();
          results.tiktok = {
            success: ttRes.ok && ttData.code === 0,
            eventId,
            response: ttData,
            pixelId: pixelId.slice(0, 4) + '****',
          };
        } catch (err: any) {
          results.tiktok = { success: false, error: err.message };
        }
      }
    }

    return NextResponse.json({ results, testedAt: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/admin/marketing/server-tracking
 * Returns current tracking configuration status (masked credentials).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || !['admin', 'super_admin'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();
  const settings = await GlobalSettings.findOne().sort({ updatedAt: -1 }).lean();

  return NextResponse.json({
    facebook: {
      configured: !!(settings?.metaPixelId && settings?.facebookAccessToken),
      pixelId: settings?.metaPixelId
        ? settings.metaPixelId.slice(0, 4) + '****'
        : null,
      testEventCode: settings?.facebookTestEventCode || null,
      hasAccessToken: !!settings?.facebookAccessToken,
    },
    tiktok: {
      configured: !!(settings?.tiktokPixelId && settings?.tiktokAccessToken),
      pixelId: settings?.tiktokPixelId
        ? settings.tiktokPixelId.slice(0, 4) + '****'
        : null,
      hasAccessToken: !!settings?.tiktokAccessToken,
    },
    gtm: {
      configured: !!settings?.googleTagManagerId,
      gtmId: settings?.googleTagManagerId || null,
    },
    ga: {
      configured: !!settings?.googleAnalyticsId,
      gaId: settings?.googleAnalyticsId || null,
    },
  });
}

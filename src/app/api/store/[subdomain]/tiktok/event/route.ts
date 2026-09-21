import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Reseller from '@/models/Reseller';

async function hashData(data: string): Promise<string> {
    if (!data) return '';
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data.trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const EVENT_MAP: Record<string, string> = {
    'PageView': 'PageView',
    'AddToCart': 'AddToCart',
    'AddToWishlist': 'AddToWishlist',
    'InitiateCheckout': 'InitiateCheckout',
    'Purchase': 'CompletePayment',
    'ViewContent': 'ViewContent',
    'Contact': 'Contact',
    'Search': 'Search',
};

interface Params {
  params: Promise<{ subdomain: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
    try {
        const { subdomain } = await params;

        await connectToDatabase();
        const reseller = await Reseller.findOne({ subdomain, status: 'active' }).lean() as any;

        const pixelId = reseller?.seoConfig?.tiktokPixelId;
        const accessToken = reseller?.seoConfig?.tiktokAccessToken;

        if (!pixelId || !accessToken) {
            return NextResponse.json({ skipped: true, reason: 'Reseller TikTok pixel not configured' }, { status: 200 });
        }

        const body = await request.json();
        const {
            eventName = 'PageView',
            eventUrl,
            userAgent,
            customData = {},
            userData = {}
        } = body;

        const ipAddress =
            request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            request.headers.get('x-real-ip') ||
            '0.0.0.0';

        const eventId = body.eventId || crypto.randomUUID();

        const hashedEmail = userData.em ? await hashData(userData.em) : undefined;
        let phone = userData.ph ? userData.ph.replace(/\D/g, '') : '';
        if (phone && !phone.startsWith('88')) phone = '88' + phone;
        const hashedPhone = phone ? await hashData(phone) : undefined;

        const ttUserData: any = {
            ...(hashedEmail && { email: hashedEmail }),
            ...(hashedPhone && { phone_number: hashedPhone }),
        };

        const mappedEvent = EVENT_MAP[eventName] || eventName;

        const rawContents = Array.isArray(customData.contents) ? customData.contents : [];
        const contents = rawContents.map((i: any) => ({
            content_id: String(i.id || i.product || ''),
            price: Number(i.item_price || i.price || 0),
            quantity: Number(i.quantity || 1),
            content_name: i.name || undefined,
        }));

        const payload: any = {
            pixel_code: pixelId,
            event: mappedEvent,
            event_id: eventId,
            timestamp: new Date().toISOString(),
            context: {
                user: ttUserData,
                page: { url: eventUrl },
                user_agent: userAgent,
                ip: ipAddress,
            },
            properties: {
                currency: customData.currency || 'BDT',
                value: customData.value ? Number(customData.value) : undefined,
                content_type: customData.content_type || 'product',
                ...(contents.length > 0 && { contents }),
            },
        };

        const response = await fetch(
            `https://business-api.tiktok.com/open_api/v1.3/event/track/`,
            {
                method: 'POST',
                headers: {
                    'Access-Token': accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
            }
        );

        const result = await response.json();

        if (!response.ok || result.code !== 0) {
            console.error(`[Reseller TikTok API] ${subdomain} Error:`, result);
            return NextResponse.json({ error: 'Failed to send TikTok event', details: result }, { status: 500 });
        }

        return NextResponse.json({ success: true, eventId });
    } catch (error) {
        console.error('[Reseller TikTok API] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

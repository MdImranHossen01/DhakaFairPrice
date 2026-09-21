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

interface Params {
  params: Promise<{ subdomain: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
    try {
        const { subdomain } = await params;

        await connectToDatabase();
        const reseller = await Reseller.findOne({ subdomain, status: 'active' }).lean() as any;

        const pixelId = reseller?.seoConfig?.metaPixelId;
        const accessToken = reseller?.seoConfig?.facebookAccessToken;
        const testEventCode = reseller?.seoConfig?.facebookTestEventCode;

        if (!pixelId || !accessToken) {
            // Silently skip — reseller may not have pixel configured yet
            return NextResponse.json({ skipped: true, reason: 'Reseller FB pixel not configured' }, { status: 200 });
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

        const fbp = request.cookies.get('_fbp')?.value;
        const fbc = request.cookies.get('_fbc')?.value;

        const hashedEmail = userData.em ? await hashData(userData.em) : undefined;
        let phone = userData.ph ? userData.ph.replace(/\D/g, '') : '';
        if (phone && !phone.startsWith('88')) phone = '88' + phone;
        const hashedPhone = phone ? await hashData(phone) : undefined;
        const hashedFirstName = userData.fn ? await hashData(userData.fn) : undefined;
        const hashedLastName = userData.ln ? await hashData(userData.ln) : undefined;
        const hashedCity = userData.ct ? await hashData(userData.ct) : undefined;
        const hashedState = userData.st ? await hashData(userData.st) : undefined;
        const hashedZip = userData.zp ? await hashData(userData.zp) : undefined;
        const hashedCountry = userData.country ? await hashData(userData.country) : undefined;

        const fbUserData: any = {
            client_ip_address: ipAddress,
            client_user_agent: userAgent,
            fbp,
            fbc,
            ...(hashedEmail && { em: [hashedEmail] }),
            ...(hashedPhone && { ph: [hashedPhone] }),
            ...(hashedFirstName && { fn: [hashedFirstName] }),
            ...(hashedLastName && { ln: [hashedLastName] }),
            ...(hashedCity && { ct: [hashedCity] }),
            ...(hashedState && { st: [hashedState] }),
            ...(hashedZip && { zp: [hashedZip] }),
            ...(hashedCountry && { country: [hashedCountry] }),
        };

        const payload: any = {
            data: [{
                event_name: eventName,
                event_time: Math.floor(Date.now() / 1000),
                event_id: eventId,
                event_source_url: eventUrl,
                action_source: 'website',
                user_data: fbUserData,
                custom_data: {
                    ...customData,
                    currency: customData.currency || 'BDT',
                    value: customData.value !== undefined ? Number(customData.value) : undefined,
                    content_type: customData.content_type || 'product',
                    ...(customData.contents && Array.isArray(customData.contents) ? {
                        contents: (customData.contents as any[]).map((item: any) => ({
                            id: String(item.id || item.productId || item.resellerProductId || ''),
                            quantity: Number(item.quantity || 1),
                            item_price: Number(item.item_price || item.price || 0),
                        }))
                    } : {})
                },
            }],
        };

        if (testEventCode) {
            payload.test_event_code = testEventCode;
        }

        const fbResponse = await fetch(
            `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }
        );

        const result = await fbResponse.json();

        if (!fbResponse.ok) {
            console.error(`[Reseller FB CAPI] ${subdomain} Error:`, result);
            return NextResponse.json({ error: 'Failed to send event', details: result }, { status: fbResponse.status });
        }

        return NextResponse.json({ success: true, eventId });
    } catch (error) {
        console.error('[Reseller FB CAPI] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

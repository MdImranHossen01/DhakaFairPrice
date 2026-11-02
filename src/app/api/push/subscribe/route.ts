import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import PushSubscription from '@/models/PushSubscription';
import Reseller from '@/models/Reseller';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { subscription, userAgent } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { message: 'Invalid push subscription object' },
        { status: 400 }
      );
    }

    const session = await auth();
    let userId: any = undefined;
    let role = 'guest';
    let resellerId: any = undefined;
    let subdomain: any = undefined;

    if (session?.user) {
      userId = (session.user as any).id;
      role = (session.user as any)?.role || 'user';
      if (role === 'reseller') {
        const resellerDoc = await Reseller.findOne({ userId }).select('_id subdomain').lean();
        if (resellerDoc) {
          resellerId = resellerDoc._id;
          subdomain = resellerDoc.subdomain;
        }
      }
    }

    // Upsert subscription based on unique endpoint with tenant details
    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userId: userId || undefined,
        role,
        resellerId: resellerId || undefined,
        subdomain: subdomain || undefined,
        userAgent: userAgent || req.headers.get('user-agent') || '',
        createdAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Push subscription registered successfully',
    });
  } catch (error: any) {
    console.error('Push subscribe error:', error);
    return NextResponse.json(
      { message: 'Failed to register subscription', error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    const { endpoint } = await req.json();

    if (!endpoint) {
      return NextResponse.json(
        { message: 'Endpoint is required' },
        { status: 400 }
      );
    }

    await PushSubscription.deleteOne({ endpoint });
    return NextResponse.json({ success: true, message: 'Subscription removed' });
  } catch (error: any) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json(
      { message: 'Failed to unsubscribe', error: error.message },
      { status: 500 }
    );
  }
}

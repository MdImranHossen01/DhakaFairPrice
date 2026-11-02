import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import PushSubscription from '@/models/PushSubscription';

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

    // Upsert subscription based on unique endpoint
    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
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

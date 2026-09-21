import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';

async function getResellerId(userId: string) {
  await dbConnect();
  const reseller = await Reseller.findOne({ userId });
  if (!reseller) throw new Error('Reseller not found');
  return reseller._id;
}

// Dashboard stats API
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const reseller = await Reseller.findOne({ userId: session.user.id }).lean();
    if (!reseller) return NextResponse.json({ error: 'Reseller not found' }, { status: 404 });

    // Recent orders
    let recentOrders: any[] = [];
    let recentTransactions: any[] = [];
    try {
      const ResellerOrder = (await import('@/models/ResellerOrder')).default;
      recentOrders = await ResellerOrder.find({ resellerId: (reseller as any)._id }).sort({ createdAt: -1 }).limit(5).lean();
    } catch {}
    try {
      const ResellerWalletTransaction = (await import('@/models/ResellerWalletTransaction')).default;
      recentTransactions = await ResellerWalletTransaction.find({ resellerId: (reseller as any)._id }).sort({ createdAt: -1 }).limit(5).lean();
    } catch {}

    return NextResponse.json({ reseller, recentOrders, recentTransactions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

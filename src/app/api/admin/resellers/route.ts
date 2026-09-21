import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !['admin', 'super_admin'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const resellers = await Reseller.find().populate('userId', 'name email').sort({ createdAt: -1 }).lean();

  return NextResponse.json({ resellers });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !['admin', 'super_admin'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { resellerId, status, commissionRate, suspendReason } = body;

    if (!resellerId) {
      return NextResponse.json({ error: 'resellerId is required' }, { status: 400 });
    }

    await dbConnect();

    const updatePayload: any = {};
    if (status) {
      updatePayload.status = status;
      if (status === 'active') {
        updatePayload.approvedAt = new Date();
      } else if (status === 'suspended') {
        updatePayload.suspendedAt = new Date();
        updatePayload.suspendReason = suspendReason || '';
      }
    }
    if (commissionRate !== undefined) {
      const rate = Number(commissionRate);
      if (isNaN(rate) || !isFinite(rate) || rate < 0 || rate > 100) {
        return NextResponse.json({ error: 'Commission rate must be a valid number between 0 and 100.' }, { status: 400 });
      }
      updatePayload.commissionRate = rate;
    }

    const updated = await Reseller.findByIdAndUpdate(
      resellerId,
      { $set: updatePayload },
      { new: true }
    );

    // If suspended, optionally demote role, but usually keep it reseller to allow logging into dashboard to view history.
    if (status === 'active' && updated) {
      await User.findByIdAndUpdate(updated.userId, { role: 'reseller' });
    }

    return NextResponse.json({ success: true, reseller: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

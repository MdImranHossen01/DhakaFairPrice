import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import ActivityLog from '@/models/ActivityLog';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !['admin', 'super_admin'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const userEmail = searchParams.get('userEmail');

  let page = parseInt(searchParams.get('page') || '1', 10);
  if (isNaN(page) || page < 1) page = 1;

  let limit = parseInt(searchParams.get('limit') || '50', 10);
  if (isNaN(limit) || limit < 1) {
    limit = 50;
  } else {
    limit = Math.min(100, limit);
  }

  const skip = (page - 1) * limit;

  await dbConnect();

  const query: any = {};
  if (action) query.action = action;
  if (userEmail) {
    const escapedEmail = userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.userEmail = { $regex: escapedEmail, $options: 'i' };
  }

  const [logs, total] = await Promise.all([
    ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ActivityLog.countDocuments(query),
  ]);

  return NextResponse.json({
    logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

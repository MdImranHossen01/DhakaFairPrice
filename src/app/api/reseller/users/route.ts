import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import User from '@/models/User';

/**
 * GET /api/reseller/users
 * 
 * Returns users (customers) who have placed orders in this reseller's store,
 * or who registered via this reseller's subdomain/domain.
 * 
 * Multi-tenant isolation: All users are filtered by resellerId.
 * A user can be a customer of multiple resellers (separate tenant contexts).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const reseller = await Reseller.findOne({ userId: session.user.id });
    if (!reseller) return NextResponse.json({ error: 'Reseller not found' }, { status: 404 });

    const searchParams = request.nextUrl.searchParams;
    let page = parseInt(searchParams.get('page') || '1', 10);
    if (isNaN(page) || page < 1) page = 1;

    let limit = parseInt(searchParams.get('limit') || '20', 10);
    if (isNaN(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100;

    const search = searchParams.get('search') || '';

    // Users are associated with a reseller via their registeredVia field (subdomain/resellerId)
    const query: Record<string, any> = {
      $or: [
        { registeredVia: reseller._id },
        { registeredVia: reseller.subdomain },
        { resellerId: reseller._id },
      ],
    };

    if (search) {
      const sanitizedSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      query.$and = [
        {
          $or: [
            { name: { $regex: sanitizedSearch, $options: 'i' } },
            { email: { $regex: sanitizedSearch, $options: 'i' } },
            { phone: { $regex: sanitizedSearch, $options: 'i' } },
          ],
        },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -hashedPassword')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return NextResponse.json({ users, total, page, limit });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

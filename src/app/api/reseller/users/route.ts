import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import User from '@/models/User';

/**
 * GET /api/reseller/users
 * 
 * Returns users (customers) who have placed orders in this reseller's store,
 * or who registered via this reseller's context.
 * 
 * Multi-tenant isolation: All users are filtered by resellerId.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // 1. Locate the reseller profile
    let reseller = await Reseller.findOne({ userId: session.user.id });

    if (!reseller && (session.user as any).resellerId) {
      reseller = await Reseller.findById((session.user as any).resellerId);
    }

    // Fallback: If admin/owner is inspecting their storefront on a domain
    if (!reseller) {
      const host = request.headers.get('host') || '';
      const cleanHost = host.split(':')[0].toLowerCase().replace(/^www\./, '');
      reseller = await Reseller.findOne({
        $or: [
          { customDomain: cleanHost },
          { subdomain: cleanHost.split('.')[0] },
        ],
      });
    }

    if (!reseller) {
      return NextResponse.json({ error: 'Reseller not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    let page = parseInt(searchParams.get('page') || '1', 10);
    if (isNaN(page) || page < 1) page = 1;

    let limit = parseInt(searchParams.get('limit') || '20', 10);
    if (isNaN(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100;

    const search = searchParams.get('search') || '';

    // 2. Find any customer user IDs that placed orders with this reseller
    const ResellerOrder = mongoose.models.ResellerOrder || mongoose.model('ResellerOrder');
    const customerUserIds = await ResellerOrder.distinct('user', { resellerId: reseller._id });
    const validOrderedUserIds = customerUserIds.filter((uid: any) => uid && mongoose.Types.ObjectId.isValid(uid));

    // 3. Construct safe query matching reseller's customers
    // NOTE: registeredVia is an ObjectId in User schema, so only pass valid ObjectIds (never raw subdomain string)
    const orConditions: any[] = [
      { registeredVia: reseller._id },
      { resellerId: reseller._id },
    ];

    if (validOrderedUserIds.length > 0) {
      orConditions.push({ _id: { $in: validOrderedUserIds } });
    }

    const query: Record<string, any> = {
      $or: orConditions,
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

    const [rawUsers, total] = await Promise.all([
      User.find(query)
        .select('-password -hashedPassword')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    // 4. Enrich with totalOrders count and formatted address
    const users = await Promise.all(
      rawUsers.map(async (u: any) => {
        const orderCount = await ResellerOrder.countDocuments({
          resellerId: reseller._id,
          user: u._id,
        });
        const defaultAddress = u.addresses?.find((a: any) => a.isDefault) || u.addresses?.[0];
        const formattedAddress = defaultAddress
          ? [defaultAddress.street, defaultAddress.city, defaultAddress.division].filter(Boolean).join(', ')
          : '';

        return {
          ...u,
          totalOrders: orderCount,
          address: formattedAddress || u.address || '',
        };
      })
    );

    return NextResponse.json({ users, total, page, limit });
  } catch (error: any) {
    console.error('Error fetching reseller users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

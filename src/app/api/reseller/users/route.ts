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

    // 2. Find any customer user IDs, phones, and emails that placed orders with this reseller
    const ResellerOrder = mongoose.models.ResellerOrder || (await import('@/models/ResellerOrder')).default;
    const Order = mongoose.models.Order || (await import('@/models/Order')).default;

    const [
      resellerOrderUserIds,
      motherOrderUserIds,
      resellerOrderPhones,
      motherOrderPhones,
      resellerOrderEmails,
    ] = await Promise.all([
      ResellerOrder.distinct('user', { resellerId: reseller._id }),
      Order.distinct('user', { storefrontResellerId: reseller._id }),
      ResellerOrder.distinct('customer.phone', { resellerId: reseller._id }),
      Order.distinct('shippingAddress.phone', { storefrontResellerId: reseller._id }),
      ResellerOrder.distinct('customer.email', { resellerId: reseller._id }),
    ]);

    const allUserIds = [...resellerOrderUserIds, ...motherOrderUserIds].filter(
      (uid: any) => uid && mongoose.Types.ObjectId.isValid(uid)
    );
    const validOrderedUserIds = Array.from(new Set(allUserIds.map((id: any) => id.toString()))).map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const rawPhones = [...resellerOrderPhones, ...motherOrderPhones].filter(Boolean) as string[];
    const cleanPhones = Array.from(new Set(rawPhones.map((p) => p.trim())));

    const rawEmails = resellerOrderEmails.filter(
      (em: any) => em && typeof em === 'string' && !em.endsWith('@store.com')
    ) as string[];
    const cleanEmails = Array.from(new Set(rawEmails.map((e) => e.toLowerCase().trim())));

    // 3. Construct safe query matching reseller's customers
    const orConditions: any[] = [
      { registeredVia: reseller._id },
      { resellerId: reseller._id },
    ];

    if (validOrderedUserIds.length > 0) {
      orConditions.push({ _id: { $in: validOrderedUserIds } });
    }
    if (cleanPhones.length > 0) {
      orConditions.push({ phone: { $in: cleanPhones } });
    }
    if (cleanEmails.length > 0) {
      orConditions.push({ email: { $in: cleanEmails } });
    }

    const query: Record<string, any> = {
      role: 'user',
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
        const phoneVariants = u.phone ? [
          u.phone,
          u.phone.replace(/^\+88/, ''),
          `+88${u.phone.replace(/^\+88/, '')}`,
          `88${u.phone.replace(/^\+88/, '')}`,
        ] : [];

        const orderMatch: any = {
          resellerId: reseller._id,
          $or: [
            { user: u._id },
            ...(phoneVariants.length > 0 ? [{ 'customer.phone': { $in: phoneVariants } }] : []),
            ...(u.email && !u.email.endsWith('@store.com') ? [{ 'customer.email': u.email.toLowerCase().trim() }] : []),
          ],
        };

        let orderCount = await ResellerOrder.countDocuments(orderMatch);

        // Backup check from mother Order collection if ResellerOrder count is 0
        if (orderCount === 0) {
          orderCount = await Order.countDocuments({
            storefrontResellerId: reseller._id,
            $or: [
              { user: u._id },
              ...(phoneVariants.length > 0 ? [{ 'shippingAddress.phone': { $in: phoneVariants } }] : []),
              ...(u.email && !u.email.endsWith('@store.com') ? [{ 'shippingAddress.email': u.email.toLowerCase().trim() }] : []),
            ],
          });
        }

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

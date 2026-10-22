import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import AbandonedCart from '@/models/AbandonedCart';
import Reseller from '@/models/Reseller';
import ResellerOrder from '@/models/ResellerOrder';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    const reseller = await Reseller.findOne({ userId: session.user.id });
    if (!reseller) {
      return NextResponse.json({ message: 'Reseller not found' }, { status: 404 });
    }

    // Auto-clean any abandoned carts that already have a placed order for this reseller
    try {
      const placedOrders = await ResellerOrder.find(
        { resellerId: reseller._id },
        { 'customer.phone': 1 }
      ).lean();

      const placedPhones = new Set<string>();
      placedOrders.forEach(o => {
        const p = (o.customer?.phone || '').replace(/\s+/g, '');
        if (p) {
          placedPhones.add(p);
          const digitsOnly = p.replace(/[^0-9]/g, '');
          if (digitsOnly) placedPhones.add(digitsOnly);
        }
      });

      if (placedPhones.size > 0) {
        await AbandonedCart.deleteMany({
          resellerId: reseller._id,
          phone: { $in: Array.from(placedPhones) }
        });
      }
    } catch (cleanErr) {
      console.error('Error auto-cleaning placed reseller abandoned carts:', cleanErr);
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limitParam = searchParams.get('limit') || '20';
    const limit = limitParam === 'all' ? 100000 : Math.max(1, parseInt(limitParam));
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';

    const query: any = { resellerId: reseller._id };
    
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (from || to) {
      query.createdAt = {};
      if (from) {
        query.createdAt.$gte = new Date(from);
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    const totalCount = await AbandonedCart.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    const carts = await AbandonedCart.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name email');

    return NextResponse.json({
      carts,
      totalPages,
      totalCount,
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching reseller abandoned carts:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE an abandoned cart (Reseller only for their own store carts)
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Missing cart ID' }, { status: 400 });
    }

    await connectToDatabase();
    const reseller = await Reseller.findOne({ userId: session.user.id });
    if (!reseller) {
      return NextResponse.json({ message: 'Reseller not found' }, { status: 404 });
    }

    await AbandonedCart.findOneAndDelete({ _id: id, resellerId: reseller._id });

    return NextResponse.json({ message: 'Abandoned cart deleted successfully' });
  } catch (error) {
    console.error('Error deleting reseller abandoned cart:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

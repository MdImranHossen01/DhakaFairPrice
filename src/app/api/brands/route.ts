import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Brand from '@/models/Brand';
import { auth } from '@/auth';

// GET all brands
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const searchParams = req.nextUrl.searchParams;
    const all = searchParams.get('all') === 'true';

    const filter: any = {};
    if (!all) {
      filter.isActive = true;
    }

    const brands = await Brand.find(filter).sort({ name: 1 }).lean();
    return NextResponse.json(brands);
  } catch (error: any) {
    console.error('Error fetching brands:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST create a brand (Admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;

    if (!session || !session.user || !['admin', 'super_admin', 'manager', 'moderator'].includes(role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, image, isActive } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ message: 'Brand name is required (min 2 characters)' }, { status: 400 });
    }

    await connectToDatabase();

    const slug = body.slug?.trim() || name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');

    const existing = await Brand.findOne({ slug });
    if (existing) {
      return NextResponse.json({ message: 'A brand with this slug/name already exists' }, { status: 400 });
    }

    const brand = await Brand.create({
      name: name.trim(),
      slug,
      image: image || '',
      isActive: isActive !== undefined ? isActive : true,
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error: any) {
    console.error('Error creating brand:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

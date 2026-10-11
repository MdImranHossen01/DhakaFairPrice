import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import connectToDatabase from '@/lib/db';
import Banner from '@/models/Banner';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager', 'moderator'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    // Only fetch mother shop / admin global banners (resellerId is null or not exists)
    const banners = await Banner.find({
      $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
    }).sort({ order: 1, createdAt: -1 });
    return NextResponse.json(banners);
  } catch (error) {
    console.error('Fetch Banners Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager', 'moderator'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    await connectToDatabase();
    
    // Whitelist allowed fields and explicitly ensure resellerId is null for mother shop
    const whitelistedBanner = {
      title: body.title,
      image: body.image,
      link: body.link,
      primaryBtnText: body.primaryBtnText,
      primaryBtnLink: body.primaryBtnLink,
      secondaryBtnText: body.secondaryBtnText,
      secondaryBtnLink: body.secondaryBtnLink,
      order: body.order ?? 0,
      isActive: body.isActive !== undefined ? body.isActive : true,
      resellerId: null as any,
    };

    const banner = await Banner.create(whitelistedBanner);

    revalidateTag('banners', 'max');
    revalidatePath('/');

    return NextResponse.json(banner, { status: 201 });
  } catch (error) {
    console.error('Create Banner Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

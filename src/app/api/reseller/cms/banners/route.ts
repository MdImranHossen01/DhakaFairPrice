import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Banner from '@/models/Banner';
import Reseller from '@/models/Reseller';

async function getResellerId(userId: string) {
  await dbConnect();
  const reseller = await Reseller.findOne({ userId });
  return reseller?._id;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== 'reseller') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resellerId = await getResellerId((session.user as any).id);
    if (!resellerId) return NextResponse.json({ error: 'Reseller account not found' }, { status: 404 });

    const banners = await Banner.find({ resellerId }).sort({ order: 1, createdAt: -1 });
    return NextResponse.json({ banners });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== 'reseller') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resellerId = await getResellerId((session.user as any).id);
    if (!resellerId) return NextResponse.json({ error: 'Reseller account not found' }, { status: 404 });

    const body = await request.json();
    const { title, image, link, primaryBtnText, primaryBtnLink, secondaryBtnText, secondaryBtnLink, order, isActive } = body;

    if (!image) {
      return NextResponse.json({ error: 'Banner image is required' }, { status: 400 });
    }

    const banner = await Banner.create({
      resellerId,
      title: title || 'Promotional Banner',
      image,
      link: link || primaryBtnLink || '',
      primaryBtnText: primaryBtnText || '',
      primaryBtnLink: link || primaryBtnLink || '',
      secondaryBtnText: secondaryBtnText || '',
      secondaryBtnLink: secondaryBtnLink || '',
      order: order ?? 0,
      isActive: isActive ?? true,
    });

    return NextResponse.json({ success: true, banner }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== 'reseller') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resellerId = await getResellerId((session.user as any).id);
    if (!resellerId) return NextResponse.json({ error: 'Reseller account not found' }, { status: 404 });

    const body = await request.json();
    const { id } = body;

    if (!id) return NextResponse.json({ error: 'Banner ID required' }, { status: 400 });

    const updateData: any = {};
    const allowedFields = ['title', 'image', 'link', 'primaryBtnText', 'primaryBtnLink', 'secondaryBtnText', 'secondaryBtnLink', 'order', 'isActive'];
    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    const banner = await Banner.findOneAndUpdate(
      { _id: id, resellerId },
      { $set: updateData },
      { new: true }
    );

    if (!banner) return NextResponse.json({ error: 'Banner not found' }, { status: 404 });

    return NextResponse.json({ success: true, banner });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== 'reseller') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resellerId = await getResellerId((session.user as any).id);
    if (!resellerId) return NextResponse.json({ error: 'Reseller account not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Banner ID required' }, { status: 400 });

    const banner = await Banner.findOneAndDelete({ _id: id, resellerId });
    if (!banner) return NextResponse.json({ error: 'Banner not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

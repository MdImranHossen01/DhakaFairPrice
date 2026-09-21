import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import ResellerTestimonial from '@/models/ResellerTestimonial';
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

    const testimonials = await ResellerTestimonial.find({ resellerId }).sort({ order: 1, createdAt: -1 });
    return NextResponse.json({ testimonials });
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
    const { name, role, content, image, rating, order, isActive } = body;

    if (!name || !content) {
      return NextResponse.json({ error: 'Name and review content are required' }, { status: 400 });
    }

    const testimonial = await ResellerTestimonial.create({
      resellerId,
      name,
      role: role || 'Customer',
      content,
      image: image || '',
      rating: rating ?? 5,
      order: order ?? 0,
      isActive: isActive ?? true,
    });

    return NextResponse.json({ success: true, testimonial }, { status: 201 });
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

    if (!id) return NextResponse.json({ error: 'Testimonial ID required' }, { status: 400 });

    const updateData: any = {};
    const allowedFields = ['name', 'role', 'content', 'image', 'rating', 'order', 'isActive'];
    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    const testimonial = await ResellerTestimonial.findOneAndUpdate(
      { _id: id, resellerId },
      { $set: updateData },
      { new: true }
    );

    if (!testimonial) return NextResponse.json({ error: 'Testimonial not found' }, { status: 404 });

    return NextResponse.json({ success: true, testimonial });
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
    if (!id) return NextResponse.json({ error: 'Testimonial ID required' }, { status: 400 });

    const testimonial = await ResellerTestimonial.findOneAndDelete({ _id: id, resellerId });
    if (!testimonial) return NextResponse.json({ error: 'Testimonial not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

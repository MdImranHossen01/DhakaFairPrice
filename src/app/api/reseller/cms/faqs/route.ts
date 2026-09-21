import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import FAQ from '@/models/FAQ';
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

    const faqs = await FAQ.find({ resellerId }).sort({ order: 1, createdAt: -1 });
    return NextResponse.json({ faqs });
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
    const { question, answer, order, isActive } = body;

    if (!question || !answer) {
      return NextResponse.json({ error: 'Question and answer are required' }, { status: 400 });
    }

    const faq = await FAQ.create({
      resellerId,
      question,
      answer,
      order: order ?? 0,
      isActive: isActive ?? true,
    });

    return NextResponse.json({ success: true, faq }, { status: 201 });
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

    if (!id) return NextResponse.json({ error: 'FAQ ID required' }, { status: 400 });

    const updateData: any = {};
    const allowedFields = ['question', 'answer', 'order', 'isActive'];
    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    const faq = await FAQ.findOneAndUpdate(
      { _id: id, resellerId },
      { $set: updateData },
      { new: true }
    );

    if (!faq) return NextResponse.json({ error: 'FAQ not found' }, { status: 404 });

    return NextResponse.json({ success: true, faq });
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
    if (!id) return NextResponse.json({ error: 'FAQ ID required' }, { status: 400 });

    const faq = await FAQ.findOneAndDelete({ _id: id, resellerId });
    if (!faq) return NextResponse.json({ error: 'FAQ not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

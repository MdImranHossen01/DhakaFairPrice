import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import connectDB from '@/lib/db';
import Subscriber from '@/models/Subscriber';

export async function GET() {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const subscribers = await Subscriber.find().sort({ createdAt: -1 });

    return NextResponse.json(subscribers);
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let id = req.nextUrl.searchParams.get('id');
    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {}
    }

    if (!id) return NextResponse.json({ message: 'ID required' }, { status: 400 });

    await connectDB();
    
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { email: id }] }
      : { email: id };

    const result = await Subscriber.findOneAndDelete(query);

    if (!result) {
      return NextResponse.json({ message: 'Subscriber not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Subscriber deleted' });
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

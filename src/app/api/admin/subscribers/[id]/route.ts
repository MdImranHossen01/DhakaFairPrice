import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import connectDB from '@/lib/db';
import Subscriber from '@/models/Subscriber';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ message: 'Subscriber ID is required' }, { status: 400 });
    }

    await connectDB();

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { email: id }] }
      : { email: id };

    const result = await Subscriber.findOneAndDelete(query);

    if (!result) {
      return NextResponse.json({ message: 'Subscriber not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Subscriber removed successfully' });
  } catch (error: any) {
    console.error('Delete subscriber error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

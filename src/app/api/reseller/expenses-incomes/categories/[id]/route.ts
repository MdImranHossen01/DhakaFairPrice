import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Reseller from '@/models/Reseller';
import TransactionCategory from '@/models/TransactionCategory';

async function getReseller(userId: string) {
  await connectToDatabase();
  return await Reseller.findOne({ userId });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const reseller = await getReseller(session.user.id);
    if (!reseller) {
      return NextResponse.json({ message: 'Reseller profile not found' }, { status: 404 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
    }

    await connectToDatabase();

    const category = await TransactionCategory.findOne({ _id: id, resellerId: reseller._id });
    if (!category) {
      return NextResponse.json({ message: 'Category not found in your store' }, { status: 404 });
    }

    if (category.isDefault) {
      return NextResponse.json({ message: 'Default system category cannot be deleted' }, { status: 400 });
    }

    await TransactionCategory.deleteOne({ _id: id, resellerId: reseller._id });

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    console.error('Delete Reseller Category Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

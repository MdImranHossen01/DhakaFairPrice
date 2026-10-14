import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Reseller from '@/models/Reseller';
import LedgerAccount from '@/models/LedgerAccount';
import LedgerTransaction from '@/models/LedgerTransaction';

async function getReseller(userId: string) {
  await connectToDatabase();
  return await Reseller.findOne({ userId });
}

export async function PUT(
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

    const body = await req.json();
    const { name, openingBalance, description } = body;

    await connectToDatabase();

    const account = await LedgerAccount.findOne({ _id: id, resellerId: reseller._id });
    if (!account) {
      return NextResponse.json({ message: 'Account not found in your store' }, { status: 404 });
    }

    if (name !== undefined) account.name = name.trim();
    if (description !== undefined) account.description = description?.trim();

    if (openingBalance !== undefined) {
      const newOpening = Number(openingBalance) || 0;
      const oldOpening = account.openingBalance || 0;
      const diff = newOpening - oldOpening;
      account.openingBalance = newOpening;
      account.currentBalance = (account.currentBalance || 0) + diff;
    }

    await account.save();

    return NextResponse.json({ message: 'Account updated successfully', account });
  } catch (error: any) {
    console.error('Update Reseller Account Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
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

    const account = await LedgerAccount.findOne({ _id: id, resellerId: reseller._id });
    if (!account) {
      return NextResponse.json({ message: 'Account not found in your store' }, { status: 404 });
    }

    if (account.code === 'CASH' || account.category === 'Cash') {
      return NextResponse.json({ message: 'Default cash account cannot be deleted' }, { status: 400 });
    }

    // Check if account has transactions
    const txCount = await LedgerTransaction.countDocuments({ account: id, resellerId: reseller._id });
    if (txCount > 0) {
      return NextResponse.json({ message: 'Cannot delete an account with existing transactions' }, { status: 400 });
    }

    await LedgerAccount.deleteOne({ _id: id, resellerId: reseller._id });

    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error: any) {
    console.error('Delete Reseller Account Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

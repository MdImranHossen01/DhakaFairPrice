import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Reseller from '@/models/Reseller';
import Expense from '@/models/Expense';
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
    const { title, amount, category, date, description, type } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (amount !== undefined) updateData.amount = Number(amount);
    if (category !== undefined) updateData.category = category;
    if (date !== undefined) updateData.date = new Date(date);
    if (description !== undefined) updateData.description = description?.trim();
    if (type !== undefined) updateData.type = type;

    await connectToDatabase();

    const expense = await Expense.findOneAndUpdate(
      { _id: id, resellerId: reseller._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!expense) {
      return NextResponse.json({ message: 'Record not found in your store' }, { status: 404 });
    }

    return NextResponse.json(expense);
  } catch (error: any) {
    console.error('Error updating reseller transaction:', error);
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

    const expense = await Expense.findOne({ _id: id, resellerId: reseller._id });
    if (!expense) {
      return NextResponse.json({ message: 'Record not found in your store' }, { status: 404 });
    }

    // Revert account balance if linked
    if (expense.paymentAccountId) {
      const incAmount = expense.type === 'expense' ? expense.amount : -expense.amount;
      await LedgerAccount.findOneAndUpdate(
        { _id: expense.paymentAccountId, resellerId: reseller._id },
        { $inc: { currentBalance: incAmount } }
      );
      // Clean associated ledger transaction
      await LedgerTransaction.deleteMany({ reference: id, resellerId: reseller._id });
    }

    await Expense.deleteOne({ _id: id, resellerId: reseller._id });

    return NextResponse.json({ message: 'Transaction deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting reseller transaction:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

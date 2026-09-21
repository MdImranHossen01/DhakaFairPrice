import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import SupplierBill from '@/models/SupplierBill';
import Supplier from '@/models/Supplier';
import mongoose from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager', 'moderator'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid bill ID' }, { status: 400 });
    }

    await connectToDatabase();

    const bill = await SupplierBill.findById(id)
      .populate('supplier', 'name companyName phone email address')
      .populate('paymentAccountId', 'accountName accountType')
      .lean();

    if (!bill) {
      return NextResponse.json({ message: 'Bill not found' }, { status: 404 });
    }

    return NextResponse.json(bill);
  } catch (error: any) {
    console.error('Error fetching supplier bill:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager', 'moderator'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid bill ID' }, { status: 400 });
    }

    const body = await req.json();
    const { items, discount, paidAmount, paymentMethod, expectedPaymentDate, date } = body;

    await connectToDatabase();

    const existingBill = await SupplierBill.findById(id);
    if (!existingBill) {
      return NextResponse.json({ message: 'Bill not found' }, { status: 404 });
    }

    const oldDueAmount = existingBill.dueAmount || 0;

    if (items && Array.isArray(items)) {
      existingBill.items = items.map((it: any) => ({
        name: it.name.trim(),
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || 0
      }));
      existingBill.subtotal = existingBill.items.reduce((sum: number, it: any) => sum + (it.quantity * it.price), 0);
    }

    if (discount !== undefined) {
      existingBill.discount = Number(discount) || 0;
    }

    existingBill.total = Math.max(0, existingBill.subtotal - (existingBill.discount || 0));

    if (paidAmount !== undefined) {
      existingBill.paidAmount = Math.min(existingBill.total, Number(paidAmount) || 0);
    }

    existingBill.dueAmount = Math.max(0, existingBill.total - (existingBill.paidAmount || 0));
    existingBill.status = existingBill.dueAmount === 0 ? 'Paid' : 'Due';

    if (paymentMethod !== undefined) existingBill.paymentMethod = paymentMethod;
    if (expectedPaymentDate !== undefined) existingBill.expectedPaymentDate = expectedPaymentDate ? new Date(expectedPaymentDate) : undefined;
    if (date !== undefined) existingBill.date = date ? new Date(date) : existingBill.date;

    await existingBill.save();

    // Adjust supplier balance for the difference
    const dueDifference = existingBill.dueAmount - oldDueAmount;
    if (dueDifference !== 0) {
      await Supplier.findByIdAndUpdate(existingBill.supplier, {
        $inc: { currentBalance: dueDifference }
      });
    }

    const updated = await SupplierBill.findById(id)
      .populate('supplier', 'name companyName phone email address')
      .populate('paymentAccountId', 'accountName accountType');

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating supplier bill:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager', 'moderator'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid bill ID' }, { status: 400 });
    }

    await connectToDatabase();

    const bill = await SupplierBill.findById(id);
    if (!bill) {
      return NextResponse.json({ message: 'Bill not found' }, { status: 404 });
    }

    // Deduct due amount from supplier balance
    if (bill.dueAmount > 0) {
      await Supplier.findByIdAndUpdate(bill.supplier, {
        $inc: { currentBalance: -bill.dueAmount }
      });
    }

    await SupplierBill.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Supplier bill deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting supplier bill:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

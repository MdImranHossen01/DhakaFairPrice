import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Supplier from '@/models/Supplier';
import SupplierBill from '@/models/SupplierBill';
import LedgerTransaction from '@/models/LedgerTransaction';
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
      return NextResponse.json({ message: 'Invalid supplier ID' }, { status: 400 });
    }

    await connectToDatabase();

    const supplier = await Supplier.findById(id).lean();
    if (!supplier) {
      return NextResponse.json({ message: 'Supplier not found' }, { status: 404 });
    }

    const bills = await SupplierBill.find({ supplier: id }).sort({ date: -1 }).lean();

    // Payments recorded for this supplier
    const payments = await LedgerTransaction.find({
      reference: `Supplier:${id}`
    }).sort({ date: -1 }).lean();

    return NextResponse.json({
      supplier,
      bills,
      payments
    });
  } catch (error: any) {
    console.error('Error fetching supplier details:', error);
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
      return NextResponse.json({ message: 'Invalid supplier ID' }, { status: 400 });
    }

    const body = await req.json();
    const { name, phone, email, address, companyName } = body;

    await connectToDatabase();

    const updated = await Supplier.findByIdAndUpdate(
      id,
      {
        $set: {
          name: name ? name.trim() : undefined,
          phone: phone ? phone.trim() : undefined,
          email: email !== undefined ? (email ? email.trim().toLowerCase() : '') : undefined,
          address: address ? address.trim() : undefined,
          companyName: companyName !== undefined ? companyName.trim() : undefined
        }
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ message: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating supplier:', error);
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
      return NextResponse.json({ message: 'Invalid supplier ID' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if supplier has bills
    const billCount = await SupplierBill.countDocuments({ supplier: id });
    if (billCount > 0) {
      return NextResponse.json({
        message: `Cannot delete supplier with ${billCount} existing purchase bill(s). Please delete the bills first.`
      }, { status: 400 });
    }

    const deleted = await Supplier.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Supplier deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

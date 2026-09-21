import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Supplier from '@/models/Supplier';
import SupplierBill from '@/models/SupplierBill';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager', 'moderator'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const suppliers = await Supplier.find().sort({ createdAt: -1 }).lean();

    // Optionally calculate dynamic due balance from SupplierBill if needed
    const billsAgg = await SupplierBill.aggregate([
      {
        $group: {
          _id: '$supplier',
          totalDue: { $sum: '$dueAmount' }
        }
      }
    ]);

    const dueMap = new Map(billsAgg.map(b => [String(b._id), b.totalDue]));

    const result = suppliers.map(s => ({
      ...s,
      currentBalance: dueMap.has(String(s._id)) ? dueMap.get(String(s._id)) : (s.currentBalance || 0)
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager', 'moderator'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, email, address, companyName } = body;

    if (!name || !phone || !address) {
      return NextResponse.json({ message: 'Name, phone, and address are required' }, { status: 400 });
    }

    await connectToDatabase();

    const supplier = await Supplier.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim().toLowerCase() : undefined,
      address: address.trim(),
      companyName: companyName ? companyName.trim() : undefined,
      currentBalance: 0
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error: any) {
    console.error('Error creating supplier:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

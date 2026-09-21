import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import SupplierBill from '@/models/SupplierBill';
import Supplier from '@/models/Supplier';
import LedgerAccount from '@/models/LedgerAccount';
import LedgerTransaction from '@/models/LedgerTransaction';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager', 'moderator'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter'); // 'all', 'paid', 'due'
    const supplierId = searchParams.get('supplierId');

    await connectToDatabase();

    const query: any = {};
    if (filter === 'paid') {
      query.status = 'Paid';
    } else if (filter === 'due') {
      query.status = 'Due';
    }

    if (supplierId) {
      query.supplier = supplierId;
    }

    const bills = await SupplierBill.find(query)
      .populate('supplier', 'name companyName phone email address')
      .populate('paymentAccountId', 'accountName accountType')
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return NextResponse.json(bills);
  } catch (error: any) {
    console.error('Error fetching supplier bills:', error);
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
    const {
      supplier,
      date,
      items,
      discount = 0,
      subtotal,
      total,
      paidAmount = 0,
      paymentMethod = 'Cash',
      expectedPaymentDate,
      paymentAccountId
    } = body;

    if (!supplier || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: 'Supplier and bill items are required' }, { status: 400 });
    }

    await connectToDatabase();

    const supplierDoc = await Supplier.findById(supplier);
    if (!supplierDoc) {
      return NextResponse.json({ message: 'Supplier not found' }, { status: 404 });
    }

    // Auto-generate Bill Number
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const billNo = `PB-${datePrefix}-${randomSuffix}`;

    const calculatedSubtotal = items.reduce((sum: number, it: any) => sum + (Number(it.quantity) * Number(it.price)), 0);
    const calculatedTotal = Math.max(0, calculatedSubtotal - (Number(discount) || 0));
    const finalPaid = Math.min(calculatedTotal, Number(paidAmount) || 0);
    const dueAmount = Math.max(0, calculatedTotal - finalPaid);
    const status = dueAmount === 0 ? 'Paid' : 'Due';

    const newBill = await SupplierBill.create({
      billNo,
      supplier,
      date: date ? new Date(date) : new Date(),
      items: items.map((it: any) => ({
        name: it.name.trim(),
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || 0
      })),
      subtotal: calculatedSubtotal,
      discount: Number(discount) || 0,
      total: calculatedTotal,
      paidAmount: finalPaid,
      dueAmount,
      paymentMethod,
      expectedPaymentDate: expectedPaymentDate ? new Date(expectedPaymentDate) : undefined,
      paymentAccountId: paymentAccountId || undefined,
      status
    });

    // Update supplier current balance with due amount
    supplierDoc.currentBalance = (supplierDoc.currentBalance || 0) + dueAmount;
    await supplierDoc.save();

    // If initial paidAmount > 0, log expense/cash-out to ledger
    if (finalPaid > 0) {
      try {
        const account = paymentAccountId 
          ? await LedgerAccount.findById(paymentAccountId)
          : (await LedgerAccount.findOne({ isDefault: true }) || await LedgerAccount.findOne());

        if (account) {
          const balanceAfter = (account.currentBalance || 0) - finalPaid;
          account.currentBalance = balanceAfter;
          await account.save();

          await LedgerTransaction.create({
            account: account._id,
            date: date ? new Date(date) : new Date(),
            description: `Purchase Bill ${billNo} Payment to ${supplierDoc.name} (${paymentMethod})`,
            type: 'debit',
            amount: finalPaid,
            reference: `SupplierBill:${newBill._id}`,
            balanceAfter
          });
        }
      } catch (ledgerErr) {
        console.error('[Ledger SupplierBill Log Error]', ledgerErr);
      }
    }

    const populated = await SupplierBill.findById(newBill._id)
      .populate('supplier', 'name companyName phone email address')
      .populate('paymentAccountId', 'accountName accountType');

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    console.error('Error creating supplier bill:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

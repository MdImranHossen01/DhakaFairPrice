import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Supplier from '@/models/Supplier';
import SupplierBill from '@/models/SupplierBill';
import LedgerAccount from '@/models/LedgerAccount';
import LedgerTransaction from '@/models/LedgerTransaction';
import mongoose from 'mongoose';

export async function POST(
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
    const { amount, paymentMethod = 'Cash', paymentAccountId, description, date } = body;

    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return NextResponse.json({ message: 'Valid payment amount is required' }, { status: 400 });
    }

    await connectToDatabase();

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return NextResponse.json({ message: 'Supplier not found' }, { status: 404 });
    }

    // Allocate payment against oldest unpaid/due supplier bills
    let remainingPayment = paymentAmount;
    const dueBills = await SupplierBill.find({
      supplier: id,
      dueAmount: { $gt: 0 }
    }).sort({ date: 1 });

    for (const bill of dueBills) {
      if (remainingPayment <= 0) break;
      const payToBill = Math.min(bill.dueAmount, remainingPayment);
      bill.paidAmount = (bill.paidAmount || 0) + payToBill;
      bill.dueAmount = Math.max(0, bill.total - bill.paidAmount);
      bill.status = bill.dueAmount === 0 ? 'Paid' : 'Due';
      if (!bill.paymentAccountId && paymentAccountId) {
        bill.paymentAccountId = paymentAccountId;
      }
      await bill.save();
      remainingPayment -= payToBill;
    }

    // Update supplier current balance
    supplier.currentBalance = Math.max(0, (supplier.currentBalance || 0) - paymentAmount);
    await supplier.save();

    // Log to Ledger if account exists
    try {
      const payAccount = paymentAccountId
        ? await LedgerAccount.findById(paymentAccountId)
        : (await LedgerAccount.findOne({ isDefault: true }) || await LedgerAccount.findOne());

      if (payAccount) {
        const balanceAfter = (payAccount.currentBalance || 0) - paymentAmount;
        payAccount.currentBalance = balanceAfter;
        await payAccount.save();

        await LedgerTransaction.create({
          account: payAccount._id,
          date: date ? new Date(date) : new Date(),
          description: description || `Payment to Supplier: ${supplier.name} (${payAccount.name || paymentMethod})`,
          type: 'debit',
          amount: paymentAmount,
          reference: `Supplier:${supplier._id}`,
          balanceAfter,
        });

        // Log expense into Expense collection for /admin/expenses-incomes and financial reports
        try {
          const Expense = (await import('@/models/Expense')).default;
          await Expense.create({
            title: `Supplier Payment - ${supplier.name}`,
            amount: paymentAmount,
            category: 'Others Expense',
            type: 'expense',
            paymentAccountId: payAccount._id,
            date: date ? new Date(date) : new Date(),
            reference: `Supplier:${supplier._id}`,
            description: description || `Direct payment to Supplier: ${supplier.name}`
          });
        } catch (expErr) {
          console.error('[Expense Supplier Payment Error]', expErr);
        }
      }
    } catch (ledgerErr) {
      console.error('[Ledger Payment Logging Error]', ledgerErr);
    }

    return NextResponse.json({
      message: 'Payment recorded successfully',
      supplier
    });
  } catch (error: any) {
    console.error('Error recording supplier payment:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

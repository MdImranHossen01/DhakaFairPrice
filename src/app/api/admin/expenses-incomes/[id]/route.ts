import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Expense from '@/models/Expense';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || !(['admin', 'super_admin'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
    }

    const body = await req.json();
    const { title, amount, category, date, description, type } = body;
    
    // Sanitize update data (whitelist)
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (amount !== undefined) updateData.amount = amount;
    if (category !== undefined) updateData.category = category;
    if (date !== undefined) updateData.date = date;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;

    await connectToDatabase();
    
    const expense = await Expense.findOneAndUpdate(
      { _id: id, $or: [{ resellerId: null }, { resellerId: { $exists: false } }] }, 
      updateData, 
      { new: true, runValidators: true }
    );

    if (!expense) {
      return NextResponse.json({ message: 'Record not found' }, { status: 404 });
    }

    // Update ledger entry if amount, title or type changed
    try {
      const LedgerTransaction = (await import('@/models/LedgerTransaction')).default;
      const { recalculateLedgerBalance, logLedgerTransaction } = await import('@/lib/ledgerHelper');
      
      // Delete old ledger entries for this reference
      await LedgerTransaction.deleteMany({ reference: id });

      // Log the updated expense/income
      if (expense.type === 'expense') {
        await logLedgerTransaction(
          'CASH',
          'credit',
          expense.amount,
          `Expense Paid: ${expense.title}`,
          expense._id.toString()
        );
      } else {
        await logLedgerTransaction(
          'CASH',
          'debit',
          expense.amount,
          `Income Received: ${expense.title}`,
          expense._id.toString()
        );
      }
      // Recalculate Cash balance
      await recalculateLedgerBalance('CASH');
    } catch (err) {
      console.error('Error updating ledger on transaction update:', err);
    }
    
    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || !(['admin', 'super_admin'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
    }

    await connectToDatabase();
    
    const expense = await Expense.findOne({ _id: id, $or: [{ resellerId: null }, { resellerId: { $exists: false } }] });
    if (!expense) {
      return NextResponse.json({ message: 'Record not found' }, { status: 404 });
    }

    // If this was a client bill collection, revert the bill's paid amount & due
    const expAny = expense as any;
    if (expAny.category === 'Receive Client Bill' || expAny.bill || expAny.invoiceNo) {
      try {
        const Bill = (await import('@/models/Bill')).default;
        let bill = null;
        if (expAny.bill) bill = await Bill.findById(expAny.bill);
        else if (expAny.invoiceNo) bill = await Bill.findOne({ invoiceNo: expAny.invoiceNo });

        if (bill) {
          const grandTotal = Math.round(bill.gTotal || bill.total || 0);
          bill.cashIn = Math.max(0, (bill.cashIn || 0) - expense.amount);
          bill.currentBillDue = Math.max(0, grandTotal - bill.cashIn);
          bill.status = bill.currentBillDue <= 0 ? 'Paid' : 'Due';
          await bill.save();
        }

        // Delete associated ledger entries
        const LedgerTransaction = (await import('@/models/LedgerTransaction')).default;
        const { recalculateLedgerBalance } = await import('@/lib/ledgerHelper');
        const ref = expAny.invoiceNo || expAny.reference || id;
        await LedgerTransaction.deleteMany({ reference: ref });
        await recalculateLedgerBalance('AR');
        await recalculateLedgerBalance('CASH');
        await recalculateLedgerBalance('BANK');
      } catch (err) {
        console.error('Error reverting bill on income delete:', err);
      }
    } else {
      // General expense/income delete
      try {
        const LedgerTransaction = (await import('@/models/LedgerTransaction')).default;
        const { recalculateLedgerBalance } = await import('@/lib/ledgerHelper');
        await LedgerTransaction.deleteMany({ reference: id });
        const acc = expAny.accountCode || 'CASH';
        await recalculateLedgerBalance(acc);
      } catch (err) {
        console.error('Error removing ledger entries on expense delete:', err);
      }
    }

    await Expense.findByIdAndDelete(id);
    
    return NextResponse.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import SupplierBill from '@/models/SupplierBill';
import LedgerTransaction from '@/models/LedgerTransaction';
import LedgerAccount from '@/models/LedgerAccount';
import Supplier from '@/models/Supplier';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager', 'moderator'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();
    void LedgerAccount;
    void Supplier;

    const bill = await SupplierBill.findById(id)
      .populate('supplier', 'name companyName phone email address')
      .populate('paymentAccountId', 'accountName accountType code')
      .lean();

    if (!bill) {
      return NextResponse.json({ message: 'Supplier purchase bill not found' }, { status: 404 });
    }

    // Find all ledger transactions matching this supplier bill's billNo or ID
    const refQueries: any[] = [
      { reference: bill.billNo },
      { reference: `SupplierBill:${bill._id}` },
      { reference: bill._id.toString() },
      { reference: `SB-${bill.billNo}` }
    ];
    if (bill.billNo) {
      refQueries.push({ description: { $regex: bill.billNo, $options: 'i' } });
    }

    const transactions = await LedgerTransaction.find({
      $or: refQueries
    })
      .populate('account')
      .sort({ date: 1, _id: 1 })
      .lean();

    // In accounting for purchases/supplier bills:
    // Disbursement/payment to supplier is logged as:
    // 1) Debit on CASH or BANK or other liquid account (cash disbursed)
    // 2) Or Debit on AP (Accounts Payable liability reduced)
    let paymentTxs = transactions.filter((tx: any) => {
      const code = tx.account?.code;
      const cat = tx.account?.category;
      const isLiquid = code === 'CASH' || code === 'BANK' || cat === 'Cash' || cat === 'Bank' || cat === 'MFS';
      return isLiquid && tx.type === 'debit';
    });

    // Fallback if no liquid debits found, check AP debits (liability reductions)
    if (paymentTxs.length === 0) {
      paymentTxs = transactions.filter((tx: any) => tx.account?.code === 'AP' && tx.type === 'debit');
    }

    // Secondary fallback
    if (paymentTxs.length === 0) {
      paymentTxs = transactions.filter((tx: any) => tx.type === 'debit');
    }

    let runningPaid = 0;
    const installments = paymentTxs.map((tx: any, idx: number) => {
      runningPaid += tx.amount;
      const remainingDue = Math.max(0, (bill.total || 0) - runningPaid);
      return {
        installmentNo: idx + 1,
        txId: tx._id,
        date: tx.date,
        amount: tx.amount,
        description: tx.description,
        method: tx.account?.name || (bill.paymentMethod || 'Cash'),
        accountCode: tx.account?.code || 'CASH',
        cumulativePaid: runningPaid,
        remainingDueAfter: remainingDue
      };
    });

    // If bill has paidAmount recorded but no ledger transactions exist (e.g. legacy bill)
    if (installments.length === 0 && (bill.paidAmount || 0) > 0) {
      installments.push({
        installmentNo: 1,
        txId: bill._id,
        date: bill.date || bill.createdAt,
        amount: bill.paidAmount,
        description: 'Initial Payment for Purchase Bill',
        method: bill.paymentMethod || 'Cash',
        accountCode: 'CASH',
        cumulativePaid: bill.paidAmount,
        remainingDueAfter: bill.dueAmount || 0
      });
    }

    // Sort with latest installment on top
    installments.reverse();

    return NextResponse.json({
      bill,
      installments,
      rawTransactions: transactions
    });
  } catch (error: any) {
    console.error('Error fetching supplier bill transaction history:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

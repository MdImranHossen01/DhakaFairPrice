import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import BusinessLoan from '@/models/BusinessLoan';
import LedgerTransaction from '@/models/LedgerTransaction';
import { recalculateLedgerBalanceByAccountId } from '@/lib/ledgerHelper';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const loan = await BusinessLoan.findOne({
      $or: [
        ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : []),
        { loanId: id }
      ]
    });

    if (!loan) {
      return NextResponse.json({ message: 'Business loan not found' }, { status: 404 });
    }

    // 1. Gather all affected account IDs (receiving account + repayment accounts)
    const affectedAccountIds = new Set<string>();
    if (loan.receivingAccountId) {
      affectedAccountIds.add(loan.receivingAccountId.toString());
    }
    if (Array.isArray(loan.repayments)) {
      for (const rep of loan.repayments) {
        if (rep.paymentAccountId) {
          affectedAccountIds.add(rep.paymentAccountId.toString());
        }
      }
    }

    // 2. Cascade delete all linked ledger transactions (inflows, repayments)
    const escapedLoanId = loan.loanId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await LedgerTransaction.deleteMany({
      $or: [
        { reference: loan.loanId },
        { description: new RegExp(escapedLoanId, 'i') }
      ]
    });

    // 3. Recalculate running balance and current balance for all affected accounts
    for (const accId of Array.from(affectedAccountIds)) {
      try {
        await recalculateLedgerBalanceByAccountId(accId);
      } catch (recErr) {
        console.error(`Error recalculating account ${accId}:`, recErr);
      }
    }

    // 4. Delete the loan document
    await BusinessLoan.deleteOne({ _id: loan._id });

    return NextResponse.json({
      message: `Loan ${loan.loanId} and all associated ledger transactions and repayment entries were deleted and account balances synced successfully.`
    });
  } catch (error: any) {
    console.error('Delete Business Loan Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

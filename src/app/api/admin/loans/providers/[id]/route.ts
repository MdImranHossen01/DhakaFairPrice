import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import LoanProvider from '@/models/LoanProvider';
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid Provider ID' }, { status: 400 });
    }

    await connectToDatabase();

    const provider = await LoanProvider.findById(id);
    if (!provider) {
      return NextResponse.json({ message: 'Loan provider not found' }, { status: 404 });
    }

    // 1. Find all loans belonging to this provider
    const loans = await BusinessLoan.find({ lenderId: provider._id });

    // 2. Gather all loan IDs and all affected account IDs
    const affectedAccountIds = new Set<string>();
    const loanIds: string[] = [];

    for (const loan of loans) {
      if (loan.loanId) loanIds.push(loan.loanId);
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
    }

    // 3. Delete all ledger transactions associated with these loans or provider
    if (loanIds.length > 0) {
      const escapedProviderName = provider.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      await LedgerTransaction.deleteMany({
        $or: [
          { reference: { $in: loanIds } },
          ...loanIds.map(lid => ({ description: new RegExp(lid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })),
          { description: new RegExp(`from ${escapedProviderName}`, 'i') },
          { description: new RegExp(`to ${escapedProviderName}`, 'i') }
        ]
      });
    }

    // 4. Recalculate running balance and current balance for all affected accounts
    for (const accId of Array.from(affectedAccountIds)) {
      try {
        await recalculateLedgerBalanceByAccountId(accId);
      } catch (recErr) {
        console.error(`Error recalculating account ${accId}:`, recErr);
      }
    }

    // 5. Delete all loans under this provider
    await BusinessLoan.deleteMany({ lenderId: provider._id });

    // 6. Delete the loan provider document
    await LoanProvider.deleteOne({ _id: provider._id });

    return NextResponse.json({
      message: `Loan provider "${provider.name}", all ${loans.length} associated loans, and linked ledger entries were deleted and account balances synced successfully.`
    });
  } catch (error: any) {
    console.error('Delete Loan Provider Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

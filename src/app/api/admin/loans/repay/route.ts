import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import BusinessLoan from '@/models/BusinessLoan';
import LedgerAccount from '@/models/LedgerAccount';
import LedgerTransaction from '@/models/LedgerTransaction';
import { isTransferableAccount } from '@/lib/utils';
import { recalculateLedgerBalanceByAccountId } from '@/lib/ledgerHelper';

export async function POST(req: NextRequest) {
  let dbSession: mongoose.ClientSession | null = null;
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { loanId, amount, paymentAccountId, date, note } = body;

    const numAmount = Number(amount);
    if (!loanId || !numAmount || numAmount <= 0) {
      return NextResponse.json({ message: 'Loan ID and a valid payment amount (> 0) are required' }, { status: 400 });
    }

    if (!paymentAccountId || !mongoose.Types.ObjectId.isValid(paymentAccountId)) {
      return NextResponse.json({ message: 'A valid payment account is required' }, { status: 400 });
    }

    await connectToDatabase();

    dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    const loan = await BusinessLoan.findOne({
      $or: [
        ...(mongoose.Types.ObjectId.isValid(loanId) ? [{ _id: loanId }] : []),
        { loanId: loanId }
      ]
    }).session(dbSession);

    if (!loan) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      dbSession = null;
      return NextResponse.json({ message: 'Business loan record not found' }, { status: 404 });
    }

    if (loan.status === 'Paid' || (loan.dueAmount || 0) <= 0) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      dbSession = null;
      return NextResponse.json({ message: 'This loan has already been fully paid' }, { status: 400 });
    }

    if (numAmount > loan.dueAmount) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      dbSession = null;
      return NextResponse.json({
        message: `Repayment amount (৳${numAmount.toLocaleString()}) cannot exceed outstanding due (৳${loan.dueAmount.toLocaleString()})`
      }, { status: 400 });
    }

    const paymentAccount = await LedgerAccount.findById(paymentAccountId).session(dbSession);
    if (!paymentAccount) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      dbSession = null;
      return NextResponse.json({ message: 'Payment account not found' }, { status: 404 });
    }

    if (!isTransferableAccount(paymentAccount)) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      dbSession = null;
      return NextResponse.json({
        message: 'Accounts Payable and Accounts Receivable cannot be used for loan repayment. Only liquid accounts (Cash, Bank, MFS) are permitted.'
      }, { status: 400 });
    }

    const availableBal = paymentAccount.currentBalance || 0;
    if (availableBal <= 0) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      dbSession = null;
      return NextResponse.json({
        message: `Cannot pay loan: ${paymentAccount.name} has zero or negative balance (Available: ৳${Math.round(availableBal).toLocaleString()}).`
      }, { status: 400 });
    }

    if (numAmount > availableBal) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      dbSession = null;
      return NextResponse.json({
        message: `Insufficient balance in ${paymentAccount.name}. Available: ৳${Math.round(availableBal).toLocaleString()}, required: ৳${Math.round(numAmount).toLocaleString()}`
      }, { status: 400 });
    }

    // Atomic decrement with balance sufficiency check
    const updatedAccount = await LedgerAccount.findOneAndUpdate(
      { _id: paymentAccountId, currentBalance: { $gte: numAmount } },
      { $inc: { currentBalance: -numAmount } },
      { new: true, session: dbSession }
    );

    if (!updatedAccount) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      dbSession = null;
      return NextResponse.json({
        message: `Insufficient balance in ${paymentAccount.name}. Could not process repayment.`
      }, { status: 400 });
    }

    // Update loan document
    loan.paidAmount = (loan.paidAmount || 0) + numAmount;
    loan.dueAmount = Math.max(0, loan.totalRepaymentAmount - loan.paidAmount);
    loan.status = loan.dueAmount === 0 ? 'Paid' : 'Active';

    const txDate = date ? new Date(date) : new Date();

    if (!loan.repayments) {
      loan.repayments = [];
    }
    loan.repayments.push({
      amount: numAmount,
      paymentAccountId: paymentAccount._id,
      paymentAccountName: paymentAccount.name,
      date: txDate,
      note: note ? note.trim() : undefined,
      createdAt: new Date()
    } as any);

    await loan.save({ session: dbSession });

    // Record LedgerTransaction so it hits the dashboard ledger
    const memo = note?.trim() ? ` - ${note.trim()}` : '';
    const description = `Loan Repayment: ${loan.loanId} to ${loan.lenderName}${memo}`;

    const [ledgerTx] = await LedgerTransaction.create(
      [
        {
          account: paymentAccount._id,
          date: txDate,
          description,
          reference: loan.loanId,
          type: 'credit', // Credit reduces liquid asset balance
          amount: numAmount,
          balanceAfter: updatedAccount.currentBalance,
        }
      ],
      { session: dbSession }
    );

    await dbSession.commitTransaction();
    dbSession.endSession();
    dbSession = null;

    // Recalculate ledger running balance for this account
    try {
      await recalculateLedgerBalanceByAccountId(paymentAccount._id);
    } catch (recErr) {
      console.error('Ledger recalculation warning:', recErr);
    }

    return NextResponse.json({
      message: `Repayment of ৳${numAmount.toLocaleString()} recorded successfully for ${loan.loanId}.`,
      loan,
      ledgerTx
    }, { status: 200 });

  } catch (error: any) {
    if (dbSession) {
      await dbSession.abortTransaction();
      dbSession.endSession();
    }
    console.error('Loan Repayment Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

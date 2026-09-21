import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import BusinessLoan from '@/models/BusinessLoan';
import LoanProvider from '@/models/LoanProvider';
import LedgerAccount from '@/models/LedgerAccount';
import LedgerTransaction from '@/models/LedgerTransaction';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    await connectToDatabase();

    const query: any = {};
    if (status && status !== 'all') query.status = status;

    const loans = await BusinessLoan.find(query)
      .populate('lenderId', 'name phone email')
      .populate('receivingAccountId', 'name code category')
      .sort({ date: -1 })
      .lean();

    const totalPrincipal = loans.reduce((acc, l) => acc + (l.amount || 0), 0);
    const totalPaid = loans.reduce((acc, l) => acc + (l.paidAmount || 0), 0);
    const totalDue = loans.reduce((acc, l) => acc + (l.dueAmount || 0), 0);

    return NextResponse.json({
      loans,
      summary: {
        totalPrincipal,
        totalPaid,
        totalDue,
        activeLoansCount: loans.filter(l => l.status === 'Active').length
      }
    });
  } catch (error) {
    console.error('Fetch Business Loans Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { lenderId, lenderName, amount, interestAmount, receivingAccountId, expectedRepaymentDate, date } = body;

    const principal = Number(amount);
    if (!principal || principal <= 0 || !receivingAccountId || !expectedRepaymentDate) {
      return NextResponse.json({ message: 'Principal amount, receiving account and repayment date are required' }, { status: 400 });
    }

    await connectToDatabase();

    const account = await LedgerAccount.findById(receivingAccountId);
    if (!account) {
      return NextResponse.json({ message: 'Selected receiving account not found' }, { status: 404 });
    }

    let finalLenderName = lenderName;
    if (lenderId) {
      const provider = await LoanProvider.findById(lenderId);
      if (provider) finalLenderName = provider.name;
    }

    const uniqueSuffix = `${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const loanId = `LOAN-${new Date().getFullYear()}-${uniqueSuffix}`;
    const interest = Number(interestAmount) || 0;
    const totalRepay = principal + interest;
    const txDate = date ? new Date(date) : new Date();

    const loan = await BusinessLoan.create({
      loanId,
      lenderName: finalLenderName || 'Loan Provider',
      lenderId: lenderId || undefined,
      amount: principal,
      interestAmount: interest,
      totalRepaymentAmount: totalRepay,
      paidAmount: 0,
      dueAmount: totalRepay,
      receivingAccountId,
      date: txDate,
      expectedRepaymentDate: new Date(expectedRepaymentDate),
      status: 'Active'
    });

    // Credit the receiving account balance
    account.currentBalance += principal;
    await account.save();

    await LedgerTransaction.create({
      account: account._id,
      date: txDate,
      description: `Business Loan Inflow: ${loanId} from ${finalLenderName}`,
      type: 'credit',
      amount: principal,
      balanceAfter: account.currentBalance
    });

    return NextResponse.json({ message: 'Business loan recorded successfully', loan });
  } catch (error: any) {
    console.error('Create Business Loan Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

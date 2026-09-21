import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import LoanProvider from '@/models/LoanProvider';
import BusinessLoan from '@/models/BusinessLoan';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const providers = await LoanProvider.find({}).sort({ name: 1 }).lean();

    // Aggregate loans per provider
    const providersWithLoans = await Promise.all(
      providers.map(async (p: any) => {
        const loans = await BusinessLoan.find({ lenderId: p._id }).lean();
        const totalLoanAmount = loans.reduce((acc, l) => acc + (l.amount || 0), 0);
        const totalPaidAmount = loans.reduce((acc, l) => acc + (l.paidAmount || 0), 0);
        const totalDueAmount = loans.reduce((acc, l) => acc + (l.dueAmount || 0), 0);
        return {
          ...p,
          totalLoansCount: loans.length,
          totalLoanAmount,
          totalPaidAmount,
          totalDueAmount
        };
      })
    );

    return NextResponse.json({ providers: providersWithLoans });
  } catch (error) {
    console.error('Fetch Loan Providers Error:', error);
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
    const { name, phone, email, address, description } = body;

    if (!name?.trim()) {
      return NextResponse.json({ message: 'Provider Name is required' }, { status: 400 });
    }

    await connectToDatabase();

    const provider = await LoanProvider.create({
      name: name.trim(),
      phone: phone?.trim(),
      email: email?.trim(),
      address: address?.trim(),
      description: description?.trim()
    });

    return NextResponse.json({ message: 'Loan provider created successfully', provider });
  } catch (error: any) {
    console.error('Create Loan Provider Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

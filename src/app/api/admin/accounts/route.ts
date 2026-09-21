import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import LedgerAccount from '@/models/LedgerAccount';
import LedgerTransaction from '@/models/LedgerTransaction';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin', 'manager', 'moderator'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Ensure the default primary Cash in Hand account exists
    const cashAccount = await LedgerAccount.findOne({ $or: [{ category: 'Cash' }, { code: 'CASH' }] });
    if (!cashAccount) {
      await LedgerAccount.create({
        name: 'Cash in Hand (হাতে নগদ)',
        code: 'CASH',
        category: 'Cash',
        type: 'asset',
        openingBalance: 0,
        currentBalance: 0,
        description: 'Default System Primary Cash Account'
      });
    }

    const accounts = await LedgerAccount.find({}).sort({ category: 1, name: 1 }).lean();

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Fetch Accounts Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let dbSession: mongoose.ClientSession | null = null;
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, code, category, accountNumber, bankName, branchName, bankAccountType, mfsProvider, mfsType, openingBalance, description } = body;

    if (!name || typeof name !== 'string' || !name.trim() || !code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ message: 'Name and unique account code are required' }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();

    await connectToDatabase();

    // Cash account rule: Only one default Cash in Hand account is permitted in the system
    if (category === 'Cash' || normalizedCode === 'CASH') {
      const existingCash = await LedgerAccount.findOne({ $or: [{ category: 'Cash' }, { code: 'CASH' }] });
      if (existingCash) {
        return NextResponse.json({ 
          message: 'ডিফল্ট ক্যাশ অ্যাকাউন্ট ইতিমধ্যে বিদ্যমান। নতুন ক্যাশ অ্যাকাউন্ট তৈরি করা যাবে না।' 
        }, { status: 400 });
      }
    }

    const existing = await LedgerAccount.findOne({ code: normalizedCode });
    if (existing) {
      return NextResponse.json({ message: 'Account code already exists' }, { status: 400 });
    }

    const initialBalance = Number(openingBalance) || 0;

    dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    const [account] = await LedgerAccount.create(
      [
        {
          name: name.trim(),
          code: normalizedCode,
          category: category || 'Bank',
          accountNumber,
          bankName,
          branchName,
          bankAccountType,
          mfsProvider,
          mfsType,
          openingBalance: initialBalance,
          currentBalance: initialBalance,
          type: 'asset',
          description
        }
      ],
      { session: dbSession }
    );

    // If opening balance > 0, create an initial ledger transaction within the transaction
    if (initialBalance > 0) {
      await LedgerTransaction.create(
        [
          {
            account: account._id,
            date: new Date(),
            description: 'Opening Balance',
            type: 'credit',
            amount: initialBalance,
            balanceAfter: initialBalance
          }
        ],
        { session: dbSession }
      );
    }

    await dbSession.commitTransaction();
    dbSession.endSession();
    dbSession = null;

    return NextResponse.json({ message: 'Account created successfully', account });
  } catch (error: any) {
    if (dbSession) {
      try {
        await dbSession.abortTransaction();
        dbSession.endSession();
      } catch (abortErr) {
        console.error('Error aborting session:', abortErr);
      }
    }
    console.error('Create Account Error:', error);

    if (error?.code === 11000) {
      return NextResponse.json({ message: 'Account code already exists' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

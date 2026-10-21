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

    // Ensure Bengali names in existing accounts are updated to English
    await LedgerAccount.updateMany(
      { name: /হাতে নগদ/ },
      { $set: { name: 'Cash in Hand' } }
    );

    // Ensure the default primary Cash in Hand account exists for admin
    const cashAccount = await LedgerAccount.findOne({
      $and: [
        { $or: [{ category: 'Cash' }, { code: 'CASH' }] },
        { $or: [{ resellerId: null }, { resellerId: { $exists: false } }] }
      ]
    });
    if (!cashAccount) {
      await LedgerAccount.create({
        name: 'Cash in Hand',
        code: 'CASH',
        category: 'Cash',
        type: 'asset',
        openingBalance: 0,
        currentBalance: 0,
        resellerId: null,
        description: 'Default System Primary Cash Account'
      });
    }

    // Ensure active bills, orders, and payables are synced so AR and AP balances are up to date
    try {
      const { syncBillsToLedger, syncOrdersToLedger, syncPayablesToLedger } = await import('@/lib/ledgerHelper');
      await syncBillsToLedger();
      await syncOrdersToLedger();
      await syncPayablesToLedger();
    } catch (syncErr) {
      console.error('Error syncing ledger for accounts:', syncErr);
    }

    const accounts = await LedgerAccount.find({
      $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
    }).sort({ category: 1, name: 1 }).lean();

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

    // Cash account rule: Only one default Cash in Hand account is permitted in the admin system
    if (category === 'Cash' || normalizedCode === 'CASH') {
      const existingCash = await LedgerAccount.findOne({
        $and: [
          { $or: [{ category: 'Cash' }, { code: 'CASH' }] },
          { $or: [{ resellerId: null }, { resellerId: { $exists: false } }] }
        ]
      });
      if (existingCash) {
        return NextResponse.json({ 
          message: 'Default cash account already exists. Multiple primary cash accounts cannot be created.' 
        }, { status: 400 });
      }
    }

    const existing = await LedgerAccount.findOne({
      code: normalizedCode,
      $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
    });
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
          resellerId: null,
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
            balanceAfter: initialBalance,
            resellerId: null
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

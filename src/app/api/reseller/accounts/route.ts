import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Reseller from '@/models/Reseller';
import LedgerAccount from '@/models/LedgerAccount';
import LedgerTransaction from '@/models/LedgerTransaction';

async function getReseller(userId: string) {
  await connectToDatabase();
  return await Reseller.findOne({ userId });
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const reseller = await getReseller(session.user.id);
    if (!reseller) {
      return NextResponse.json({ message: 'Reseller profile not found' }, { status: 404 });
    }

    await connectToDatabase();

    // Ensure Bengali names in existing accounts are updated to English
    await LedgerAccount.updateMany(
      { resellerId: reseller._id, name: /হাতে নগদ/ },
      { $set: { name: 'Cash in Hand' } }
    );

    // Ensure the default primary Cash in Hand account exists for this reseller
    const cashAccount = await LedgerAccount.findOne({
      resellerId: reseller._id,
      $or: [{ category: 'Cash' }, { code: 'CASH' }]
    });

    if (!cashAccount) {
      await LedgerAccount.create({
        name: 'Cash in Hand',
        code: 'CASH',
        category: 'Cash',
        type: 'asset',
        openingBalance: 0,
        currentBalance: 0,
        resellerId: reseller._id,
        description: 'Default Store Primary Cash Account'
      });
    }

    const accounts = await LedgerAccount.find({
      resellerId: reseller._id
    }).sort({ category: 1, name: 1 }).lean();

    return NextResponse.json({ accounts });
  } catch (error: any) {
    console.error('Fetch Reseller Accounts Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let dbSession: mongoose.ClientSession | null = null;
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const reseller = await getReseller(session.user.id);
    if (!reseller) {
      return NextResponse.json({ message: 'Reseller profile not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      code,
      category,
      accountNumber,
      bankName,
      branchName,
      bankAccountType,
      mfsProvider,
      mfsType,
      openingBalance,
      description
    } = body;

    if (!name || typeof name !== 'string' || !name.trim() || !code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ message: 'Name and unique account code are required' }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();

    await connectToDatabase();

    // Cash account rule: Only one default Cash in Hand account is permitted per store
    if (category === 'Cash' || normalizedCode === 'CASH') {
      const existingCash = await LedgerAccount.findOne({
        resellerId: reseller._id,
        $or: [{ category: 'Cash' }, { code: 'CASH' }]
      });
      if (existingCash) {
        return NextResponse.json({
          message: 'Default cash account already exists. You cannot create a second cash account.'
        }, { status: 400 });
      }
    }

    const existing = await LedgerAccount.findOne({
      code: normalizedCode,
      resellerId: reseller._id
    });
    if (existing) {
      return NextResponse.json({ message: 'Account code already exists in your store' }, { status: 400 });
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
          resellerId: reseller._id,
          description: description?.trim() || undefined
        }
      ],
      { session: dbSession }
    );

    if (initialBalance > 0) {
      await LedgerTransaction.create(
        [
          {
            account: account._id,
            resellerId: reseller._id,
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

    return NextResponse.json({ message: 'Account created successfully', account }, { status: 201 });
  } catch (error: any) {
    if (dbSession) {
      try {
        await dbSession.abortTransaction();
        dbSession.endSession();
      } catch (abortErr) {
        console.error('Abort session error:', abortErr);
      }
    }
    console.error('Create Reseller Account Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

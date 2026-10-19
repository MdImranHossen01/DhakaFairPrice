import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Reseller from '@/models/Reseller';
import LedgerAccount from '@/models/LedgerAccount';
import LedgerTransaction from '@/models/LedgerTransaction';

import Expense from '@/models/Expense';
import { recalculateLedgerBalanceByAccountId } from '@/lib/ledgerHelper';

async function getReseller(userId: string) {
  await connectToDatabase();
  return await Reseller.findOne({ userId });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const reseller = await getReseller(session.user.id);
    if (!reseller) {
      return NextResponse.json({ message: 'Reseller profile not found' }, { status: 404 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
    }

    const body = await req.json();
    const { name, openingBalance, description } = body;

    await connectToDatabase();

    const account = await LedgerAccount.findOne({ _id: id, resellerId: reseller._id });
    if (!account) {
      return NextResponse.json({ message: 'Account not found in your store' }, { status: 404 });
    }

    if (name !== undefined) account.name = name.trim();
    if (description !== undefined) account.description = description?.trim();

    if (openingBalance !== undefined) {
      const newOpening = Number(openingBalance) || 0;
      const oldOpening = account.openingBalance || 0;
      const diff = newOpening - oldOpening;
      account.openingBalance = newOpening;
      account.currentBalance = (account.currentBalance || 0) + diff;
    }

    await account.save();

    return NextResponse.json({ message: 'Account updated successfully', account });
  } catch (error: any) {
    console.error('Update Reseller Account Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const reseller = await getReseller(session.user.id);
    if (!reseller) {
      return NextResponse.json({ message: 'Reseller profile not found' }, { status: 404 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
    }

    await connectToDatabase();

    const account = await LedgerAccount.findOne({ _id: id, resellerId: reseller._id });
    if (!account) {
      return NextResponse.json({ message: 'Account not found in your store' }, { status: 404 });
    }

    if (['CASH', 'BANK', 'AP', 'AR'].includes(account.code) || account.category === 'Cash') {
      return NextResponse.json({ message: 'Default system accounts cannot be deleted' }, { status: 400 });
    }

    // 1. Cascade delete all linked expenses/incomes recorded under this account
    await Expense.deleteMany({ paymentAccountId: account._id, resellerId: reseller._id });

    // 2. Find companion transfer transactions in other accounts
    const escapedName = account.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const companionTxList = await LedgerTransaction.find({
      resellerId: reseller._id,
      account: { $ne: account._id },
      $or: [
        { description: new RegExp(`Transfer to ${escapedName}`, 'i') },
        { description: new RegExp(`Transfer from ${escapedName}`, 'i') }
      ]
    }).lean();

    const affectedAccountIds = Array.from(new Set(companionTxList.map((tx: any) => tx.account.toString())));

    // 3. Delete companion transfer transactions from other accounts
    if (companionTxList.length > 0) {
      await LedgerTransaction.deleteMany({
        _id: { $in: companionTxList.map((tx: any) => tx._id) }
      });
    }

    // 4. Delete all ledger transactions directly belonging to this account
    await LedgerTransaction.deleteMany({
      account: account._id,
      resellerId: reseller._id
    });

    // 5. Recalculate balances for all affected companion accounts
    for (const accId of affectedAccountIds) {
      await recalculateLedgerBalanceByAccountId(accId);
    }

    // 6. Delete the account itself
    await LedgerAccount.deleteOne({ _id: id, resellerId: reseller._id });

    return NextResponse.json({
      message: `Account "${account.name}" and all related transactions, entries, and reports synced and deleted successfully.`
    });
  } catch (error: any) {
    console.error('Delete Reseller Account Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

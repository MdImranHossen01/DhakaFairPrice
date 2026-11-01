import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import LedgerAccount from '@/models/LedgerAccount';
import LedgerTransaction from '@/models/LedgerTransaction';
import Expense from '@/models/Expense';
import BusinessLoan from '@/models/BusinessLoan';
import SupplierBill from '@/models/SupplierBill';
import ResellerWalletTransaction from '@/models/ResellerWalletTransaction';
import { recalculateLedgerBalanceByAccountId } from '@/lib/ledgerHelper';

export async function PUT(
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
      return NextResponse.json({ message: 'Invalid Account ID' }, { status: 400 });
    }

    const body = await req.json();
    const {
      name,
      openingBalance,
      description,
      accountNumber,
      bankName,
      branchName,
      bankAccountType,
      mfsProvider,
      mfsType
    } = body;

    await connectToDatabase();

    const account = await LedgerAccount.findOne({
      _id: id,
      $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
    });

    if (!account) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 });
    }

    if (name !== undefined && typeof name === 'string' && name.trim()) {
      account.name = name.trim();
    }
    if (description !== undefined) account.description = description?.trim();
    if (accountNumber !== undefined) account.accountNumber = accountNumber?.trim();
    if (bankName !== undefined) account.bankName = bankName?.trim();
    if (branchName !== undefined) account.branchName = branchName?.trim();
    if (bankAccountType !== undefined) account.bankAccountType = bankAccountType;
    if (mfsProvider !== undefined) account.mfsProvider = mfsProvider?.trim();
    if (mfsType !== undefined) account.mfsType = mfsType;

    if (openingBalance !== undefined) {
      const newOpening = Math.max(0, Number(openingBalance) || 0);
      const oldOpening = account.openingBalance || 0;
      const diff = newOpening - oldOpening;
      account.openingBalance = newOpening;
      account.currentBalance = (account.currentBalance || 0) + diff;

      // Update or create Opening Balance ledger transaction
      const openingTx = await LedgerTransaction.findOne({
        account: account._id,
        description: 'Opening Balance'
      });
      if (openingTx) {
        openingTx.amount = newOpening;
        await openingTx.save();
      } else if (newOpening > 0) {
        await LedgerTransaction.create({
          account: account._id,
          date: account.createdAt || new Date(),
          description: 'Opening Balance',
          type: 'credit',
          amount: newOpening,
          balanceAfter: newOpening,
          resellerId: null
        });
      }
    }

    await account.save();
    await recalculateLedgerBalanceByAccountId(account._id);

    return NextResponse.json({ message: 'Account updated successfully', account });
  } catch (error: any) {
    console.error('Update Admin Account Error:', error);
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
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid Account ID' }, { status: 400 });
    }

    await connectToDatabase();

    const account = await LedgerAccount.findOne({
      _id: id,
      $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
    });

    if (!account) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 });
    }

    // Protect default core system accounts (AR, AP, BANK, CASH)
    const isProtected =
      ['CASH', 'BANK', 'AP', 'AR'].includes(account.code?.toUpperCase()?.trim()) ||
      ['cash', 'cash in hand', 'bank', 'bank account', 'accounts payable', 'accounts receivable'].includes(account.name?.toLowerCase()?.trim());
    if (isProtected) {
      return NextResponse.json(
        { message: `Core system account (${account.name}) cannot be deleted as it is required for store operations.` },
        { status: 400 }
      );
    }

    // 1. Delete all transactions belonging to this account
    await LedgerTransaction.deleteMany({ account: id });

    // 2. Cascade cleanup from other entities that reference this payment account
    await Expense.deleteMany({ paymentAccount: id });
    await BusinessLoan.deleteMany({ bankAccountId: id });
    await SupplierBill.deleteMany({ paymentAccountId: id });
    await ResellerWalletTransaction.deleteMany({ paymentAccountId: id });

    // 3. Delete the account itself
    await LedgerAccount.deleteOne({ _id: id });

    return NextResponse.json({
      message: `Account "${account.name}" and all related transactions, entries, and reports synced and deleted successfully.`
    });
  } catch (error: any) {
    console.error('Delete Admin Account Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

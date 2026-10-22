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
    const { name, openingBalance, description } = body;

    await connectToDatabase();

    const account = await LedgerAccount.findOne({
      _id: id,
      $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
    });

    if (!account) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 });
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

    // 1. Delete associated expenses and incomes recorded with this payment account
    await Expense.deleteMany({ paymentAccountId: account._id });

    // 2. Clean up references in BusinessLoan, SupplierBill, ResellerWalletTransaction
    await BusinessLoan.updateMany(
      { receivingAccountId: account._id },
      { $unset: { receivingAccountId: 1 } }
    );
    await BusinessLoan.updateMany(
      { 'repayments.paymentAccountId': account._id },
      { $pull: { repayments: { paymentAccountId: account._id } } }
    );
    await SupplierBill.updateMany(
      { paymentAccountId: account._id },
      { $unset: { paymentAccountId: 1 } }
    );
    await ResellerWalletTransaction.updateMany(
      { $or: [{ adminAccountId: account._id }, { destinationAccountId: account._id }] },
      { $unset: { adminAccountId: 1, destinationAccountId: 1 } }
    );

    // 3. Find companion transfer transactions in other accounts
    const escapedName = account.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const companionTxList = await LedgerTransaction.find({
      account: { $ne: account._id },
      $and: [
        { $or: [{ resellerId: null }, { resellerId: { $exists: false } }] },
        {
          $or: [
            { description: new RegExp(`Transfer to ${escapedName}`, 'i') },
            { description: new RegExp(`Transfer from ${escapedName}`, 'i') }
          ]
        }
      ]
    }).lean();

    const affectedAccountIds = Array.from(new Set(companionTxList.map((tx: any) => tx.account.toString())));

    // 4. Delete companion transfer transactions from other accounts
    if (companionTxList.length > 0) {
      await LedgerTransaction.deleteMany({
        _id: { $in: companionTxList.map((tx: any) => tx._id) }
      });
    }

    // 5. Delete all transactions belonging directly to this account
    await LedgerTransaction.deleteMany({ account: account._id });

    // 6. Recalculate balances for all affected companion accounts
    for (const accId of affectedAccountIds) {
      await recalculateLedgerBalanceByAccountId(accId);
    }

    // 7. Delete the account itself
    await LedgerAccount.deleteOne({ _id: account._id });

    return NextResponse.json({
      message: `Account "${account.name}" and all related transactions, entries, and reports synced and deleted successfully.`
    });
  } catch (error: any) {
    console.error('Delete Admin Account Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

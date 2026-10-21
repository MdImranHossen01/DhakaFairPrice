import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import LedgerTransaction from '@/models/LedgerTransaction';
import { logLedgerTransaction, seedLedgerAccounts } from '@/lib/ledgerHelper';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    await seedLedgerAccounts();

    // Auto-clean any orphan ledger transactions & sync payouts, bills, and orders to ledger
    const { backfillPayoutsToLedger, cleanOrphanLedgerTransactions, syncBillsToLedger, syncOrdersToLedger } = await import('@/lib/ledgerHelper');
    await cleanOrphanLedgerTransactions();
    await backfillPayoutsToLedger();
    await syncBillsToLedger();
    await syncOrdersToLedger();

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');

    const queryFilter: any = {
      $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
    };
    if (accountId) {
      queryFilter.account = accountId;
    }

    const transactions = await LedgerTransaction.find(queryFilter)
      .populate('account')
      .sort({ date: -1, createdAt: -1 });

    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      entryType, // 'deposit' | 'withdrawal' | 'transfer'
      accountCode, // 'CASH' | 'BANK'
      fromAccountCode, // used for transfer
      toAccountCode, // used for transfer
      amount,
      description,
      date,
    } = body;

    if (!entryType || !amount || amount <= 0 || !description) {
      return NextResponse.json({ message: 'Invalid or missing fields' }, { status: 400 });
    }

    await connectToDatabase();
    await seedLedgerAccounts();

    let txDate = new Date();
    if (date) {
      const parsed = new Date(date);
      const now = new Date();
      if (parsed.toDateString() === now.toDateString()) {
        txDate = now;
      } else {
        txDate = parsed;
      }
    }

    if (entryType === 'transfer') {
      if (!fromAccountCode || !toAccountCode) {
        return NextResponse.json({ message: 'From and To accounts are required for transfers' }, { status: 400 });
      }

      if (['AR', 'AP'].includes(fromAccountCode) || ['AR', 'AP'].includes(toAccountCode)) {
        return NextResponse.json({ message: 'Accounts Payable and Accounts Receivable cannot be used for fund transfers' }, { status: 400 });
      }

      const LedgerAccount = (await import('@/models/LedgerAccount')).default;
      const sourceAccount = await LedgerAccount.findOne({ code: fromAccountCode });
      if (!sourceAccount || (sourceAccount.currentBalance || 0) <= 0) {
        return NextResponse.json({ 
          message: `Cannot transfer from ${fromAccountCode} because its balance is zero or negative (৳${Math.round(sourceAccount?.currentBalance || 0).toLocaleString()}).` 
        }, { status: 400 });
      }
      if (amount > (sourceAccount.currentBalance || 0)) {
        return NextResponse.json({ 
          message: `Insufficient balance in ${fromAccountCode}. Available: ৳${Math.round(sourceAccount.currentBalance || 0).toLocaleString()}` 
        }, { status: 400 });
      }

      // Credit the source account
      await logLedgerTransaction(
        fromAccountCode,
        'credit',
        amount,
        `Transfer to ${toAccountCode}: ${description}`,
        'manual-transfer',
        txDate
      );

      // Debit the destination account
      await logLedgerTransaction(
        toAccountCode,
        'debit',
        amount,
        `Transfer from ${fromAccountCode}: ${description}`,
        'manual-transfer',
        txDate
      );
    } else if (entryType === 'deposit') {
      if (!accountCode) {
        return NextResponse.json({ message: 'Account code is required' }, { status: 400 });
      }
      await logLedgerTransaction(
        accountCode,
        'debit',
        amount,
        `Manual Deposit: ${description}`,
        'manual-deposit',
        txDate
      );
    } else if (entryType === 'withdrawal') {
      if (!accountCode) {
        return NextResponse.json({ message: 'Account code is required' }, { status: 400 });
      }

      const LedgerAccount = (await import('@/models/LedgerAccount')).default;
      const targetAccount = await LedgerAccount.findOne({ code: accountCode });
      if (!targetAccount || (targetAccount.currentBalance || 0) <= 0) {
        return NextResponse.json({ 
          message: `Cannot withdraw from ${accountCode} because its balance is zero or negative (৳${Math.round(targetAccount?.currentBalance || 0).toLocaleString()}).` 
        }, { status: 400 });
      }
      if (amount > (targetAccount.currentBalance || 0)) {
        return NextResponse.json({ 
          message: `Insufficient balance in ${accountCode}. Available: ৳${Math.round(targetAccount.currentBalance || 0).toLocaleString()}` 
        }, { status: 400 });
      }

      await logLedgerTransaction(
        accountCode,
        'credit',
        amount,
        `Manual Withdrawal: ${description}`,
        'manual-withdrawal',
        txDate
      );
    } else {
      return NextResponse.json({ message: 'Invalid entry type' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Ledger transaction logged successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Error logging ledger transaction:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

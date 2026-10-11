import connectToDatabase from '@/lib/db';
import LedgerAccount from '@/models/LedgerAccount';
import LedgerTransaction from '@/models/LedgerTransaction';

/**
 * Seed primary ledger accounts if they do not exist
 */
export async function seedLedgerAccounts() {
  await connectToDatabase();

  const accounts: { name: string; code: 'CASH' | 'BANK' | 'AR' | 'AP'; type: 'asset' | 'liability' }[] = [
    { name: 'Cash', code: 'CASH', type: 'asset' },
    { name: 'Bank', code: 'BANK', type: 'asset' },
    { name: 'Accounts Receivable', code: 'AR', type: 'asset' },
    { name: 'Accounts Payable', code: 'AP', type: 'liability' },
  ];

  for (const acc of accounts) {
    const exists = await LedgerAccount.findOne({ code: acc.code });
    if (!exists) {
      await LedgerAccount.create({
        name: acc.name,
        code: acc.code,
        type: acc.type,
        openingBalance: 0,
        currentBalance: 0,
      });
    }
  }
}

/**
 * Log a transaction to the ledger
 */
export async function logLedgerTransaction(
  accountCode: 'CASH' | 'BANK' | 'AR' | 'AP',
  type: 'debit' | 'credit',
  amount: number,
  description: string,
  reference?: string,
  date: Date = new Date()
) {
  await connectToDatabase();
  await seedLedgerAccounts();

  // Find account
  const account = await LedgerAccount.findOne({ code: accountCode });
  if (!account) {
    throw new Error(`Ledger account not found with code: ${accountCode}`);
  }

  // Calculate balanceAfter
  // For assets: debit increases, credit decreases
  // For liabilities: credit increases, debit decreases
  const change = account.type === 'liability'
    ? (type === 'credit' ? amount : -amount)
    : (type === 'debit' ? amount : -amount);
  const balanceAfter = account.currentBalance + change;

  // Create transaction
  const transaction = new LedgerTransaction({
    account: account._id,
    date,
    description,
    type,
    amount,
    reference,
    balanceAfter,
  });

  await transaction.save();

  // Update current account balance
  account.currentBalance = balanceAfter;
  await account.save();

  // Recalculate to keep chronological order correct in the DB running balances
  await recalculateLedgerBalance(accountCode);

  return transaction;
}

/**
 * Recalculate ledger balance for an account
 */
export async function recalculateLedgerBalance(accountCode: 'CASH' | 'BANK' | 'AR' | 'AP') {
  await connectToDatabase();
  const account = await LedgerAccount.findOne({ code: accountCode });
  if (!account) return;

  const transactions = await LedgerTransaction.find({ account: account._id }).sort({ date: 1, createdAt: 1 });

  let runningBalance = account.openingBalance || 0;

  for (const tx of transactions) {
    const change = account.type === 'liability'
      ? (tx.type === 'credit' ? tx.amount : -tx.amount)
      : (tx.type === 'debit' ? tx.amount : -tx.amount);
    runningBalance += change;
    tx.balanceAfter = runningBalance;
    await tx.save();
  }

  account.currentBalance = runningBalance;
  await account.save();
}

/**
 * Log order payment to the ledger
 */
export async function logOrderPaymentToLedger(order: any) {
  try {
    await connectToDatabase();
    
    // Determine account code based on paymentMethod
    // Online -> BANK, others (COD, Manual) -> CASH
    const accountCode = order.paymentMethod === 'Online' ? 'BANK' : 'CASH';
    
    const amount = order.totalAmount || 0;
    const orderIdStr = order._id.toString();
    const shortId = orderIdStr.slice(-8).toUpperCase();
    
    const description = `Customer payment received for Order #${shortId}`;
    const reference = `ORDER-${shortId}`;
    
    // Ensure idempotency: check if transaction with this reference already exists
    const exists = await LedgerTransaction.findOne({ reference });
    if (exists) {
      console.log(`[Ledger] Entry already exists for order reference: ${reference}`);
      return;
    }
    
    await logLedgerTransaction(
      accountCode,
      'debit', // Debit increases Cash or Bank
      amount,
      description,
      reference,
      order.createdAt ? new Date(order.createdAt) : new Date()
    );
    console.log(`[Ledger] Logged payment for Order #${shortId} to ${accountCode} successfully.`);
  } catch (error) {
    console.error('[Ledger] Error logging order payment to ledger:', error);
  }
}

/**
 * Log reseller commission payout to the ledger
 */
export async function logPayoutToLedger(payoutTx: any, reseller?: any) {
  try {
    await connectToDatabase();
    
    // bKash, Nagad, Bank -> BANK, Cash -> CASH
    const methodStr = (payoutTx.payoutMethod || '').toLowerCase();
    const accountCode = methodStr === 'cash' ? 'CASH' : 'BANK';
    const amount = Math.abs(payoutTx.amount || 0);
    const txIdStr = payoutTx._id.toString();
    const shortId = txIdStr.slice(-8).toUpperCase();
    const reference = `PAYOUT-${shortId}`;

    const exists = await LedgerTransaction.findOne({ reference });
    if (exists) {
      console.log(`[Ledger] Entry already exists for payout reference: ${reference}`);
      return;
    }

    const storeName = reseller?.storeName || payoutTx.resellerId?.storeName || 'Reseller';
    const method = payoutTx.payoutMethod || 'Mobile Banking';
    const refNote = payoutTx.payoutReference ? ` (Ref: ${payoutTx.payoutReference})` : '';
    const description = `Reseller Commission Payout to ${storeName} via ${method}${refNote}`;

    await logLedgerTransaction(
      accountCode,
      'credit', // Credit decreases Cash or Bank asset account
      amount,
      description,
      reference,
      payoutTx.updatedAt ? new Date(payoutTx.updatedAt) : new Date()
    );
    console.log(`[Ledger] Logged payout for ${storeName} (৳${amount}) to ${accountCode} successfully.`);
  } catch (error) {
    console.error('[Ledger] Error logging payout to ledger:', error);
  }
}

/**
 * Backfill any cleared payouts that haven't been logged to the ledger yet
 */
export async function backfillPayoutsToLedger() {
  try {
    await connectToDatabase();
    const ResellerWalletTransaction = (await import('@/models/ResellerWalletTransaction')).default;
    const clearedPayouts = await ResellerWalletTransaction.find({
      type: 'payout_released',
      status: 'cleared',
    }).populate('resellerId', 'storeName');

    for (const payout of clearedPayouts) {
      await logPayoutToLedger(payout, payout.resellerId);
    }
  } catch (error) {
    console.error('[Ledger] Error backfilling payouts to ledger:', error);
  }
}

/**
 * Clean up orphan ledger transactions for deleted orders, payouts, and loans
 * and recalculate balances automatically.
 */
export async function cleanOrphanLedgerTransactions() {
  try {
    await connectToDatabase();
    
    // Dynamically import models to prevent circular dependency issues
    const Order = (await import('@/models/Order')).default;
    const ResellerWalletTransaction = (await import('@/models/ResellerWalletTransaction')).default;
    const BusinessLoan = (await import('@/models/BusinessLoan')).default;
    const mongoose = (await import('mongoose')).default;

    const transactions = await LedgerTransaction.find();
    let deletedCount = 0;

    for (const tx of transactions) {
      if (!tx.reference) continue;

      // 1. Check Order references (e.g. ORDER-XXXX)
      if (tx.reference.startsWith('ORDER-')) {
        const shortId = tx.reference.replace('ORDER-', '');
        const orderExists = await Order.findOne({ shortId });
        if (!orderExists) {
          await LedgerTransaction.findByIdAndDelete(tx._id);
          deletedCount++;
          continue;
        }
      }

      // 2. Check Payout references (e.g. PAYOUT-XXXX)
      if (tx.reference.startsWith('PAYOUT-')) {
        const shortId = tx.reference.replace('PAYOUT-', '');
        // The shortId is the last 8 chars of the _id for Wallet Transactions.
        // We'll search by checking if any ID ends with shortId, or just let it be loose.
        // But MongoDB cannot easily query by suffix of _id. We can find all and check.
        // But since this is a clean job, let's use the description or just a regex if needed.
        // To be safe, let's fetch payouts that could match or just query by string representation.
        // Since we created it by `payoutTx._id.toString().slice(-8).toUpperCase()`, it's not simple.
        // But actually, we don't often delete payouts.
        // Wait, how do we query it?
        // Let's use aggregate or a regex on the reference, but we only have `reference`.
        // If we really need to find if the payout exists, we can use $where or just find all and filter in JS if it's not too large.
        // Or we just find transactions with type: payout_released and compare.
      }

      // 3. Check Loan references (e.g. LOAN-2026-XXXX-XXXX)
      if (tx.reference.startsWith('LOAN-')) {
        const loanExists = await BusinessLoan.findOne({ loanId: tx.reference });
        if (!loanExists) {
          await LedgerTransaction.findByIdAndDelete(tx._id);
          deletedCount++;
          continue;
        }
      }
    }
    
    // Also clean PAYOUT orphans (Find all cleared payouts, and if we have a payout ledger without matching payout)
    // To handle payout orphans accurately, we get all valid payout references first:
    const payouts = await ResellerWalletTransaction.find({ type: 'payout_released' });
    const validPayoutRefs = new Set(payouts.map(p => `PAYOUT-${p._id.toString().slice(-8).toUpperCase()}`));
    
    for (const tx of transactions) {
      if (tx.reference && tx.reference.startsWith('PAYOUT-')) {
        if (!validPayoutRefs.has(tx.reference)) {
          await LedgerTransaction.findByIdAndDelete(tx._id);
          deletedCount++;
        }
      }
    }

    if (deletedCount > 0) {
      // Recalculate all accounts if any orphans were deleted
      const accounts = await LedgerAccount.find({});
      for (const acc of accounts) {
        if (acc.code) {
          await recalculateLedgerBalance(acc.code as any);
        }
      }
    }

    return deletedCount;
  } catch (err) {
    console.error('[Ledger] Error auto-cleaning orphan transactions:', err);
    return 0;
  }
}


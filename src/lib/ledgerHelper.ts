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

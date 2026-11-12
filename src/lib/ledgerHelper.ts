import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import LedgerAccount from '@/models/LedgerAccount';
import LedgerTransaction from '@/models/LedgerTransaction';
import TransactionCategory from '@/models/TransactionCategory';

/**
 * Standard default categories for operating expenses and incomes
 */
export const DEFAULT_TRANSACTION_CATEGORIES = [
  { name: 'Ads & Marketing', type: 'expense' as const },
  { name: 'Courier & Shipping', type: 'expense' as const },
  { name: 'Office Rent', type: 'expense' as const },
  { name: 'Others Expense', type: 'expense' as const },
  { name: 'Packaging & Supplies', type: 'expense' as const },
  { name: 'Salary & Wages', type: 'expense' as const },
  { name: 'Software & Tools', type: 'expense' as const },
  { name: 'Utility & Bills', type: 'expense' as const },
  { name: 'Investment / Capital', type: 'income' as const },
  { name: 'Commission', type: 'income' as const },
  { name: 'Other Income', type: 'income' as const },
  { name: 'Sales Revenue', type: 'income' as const },
  { name: 'Service Income', type: 'income' as const },
];

/**
 * Seed default transaction categories for mother admin or a reseller.
 * Automatically cleans up legacy unique indexes (name_1_type_1) that blocked multi-tenancy.
 */
export async function seedDefaultTransactionCategories(resellerId?: any) {
  await connectToDatabase();

  // One-time migration: drop stale collection-wide unique index that blocks multi-tenancy
  try {
    await TransactionCategory.collection.dropIndex('name_1_type_1');
  } catch {
    // Index doesn't exist or already dropped — safe to ignore
  }
  try {
    await TransactionCategory.collection.dropIndex('name_1');
  } catch {
    // Index doesn't exist or already dropped — safe to ignore
  }

  const targetResellerId = resellerId ? (typeof resellerId === 'string' ? new mongoose.Types.ObjectId(resellerId) : resellerId) : null;

  for (const cat of DEFAULT_TRANSACTION_CATEGORIES) {
    await TransactionCategory.updateOne(
      {
        resellerId: targetResellerId,
        name: cat.name,
        type: cat.type,
      },
      {
        $setOnInsert: {
          name: cat.name,
          type: cat.type,
          resellerId: targetResellerId,
          isDefault: true,
        },
      },
      { upsert: true }
    );
  }
}

const SYNC_TTL_MS = 15000;
const lastSyncTimestamps: Record<string, number> = {};
const inFlightSyncPromises: Record<string, Promise<any> | null> = {};
let legacyCodeIndexDropped = false;

export function invalidateLedgerSyncCache() {
  for (const key of Object.keys(lastSyncTimestamps)) {
    delete lastSyncTimestamps[key];
  }
}

async function runDeduplicatedSync(key: string, force: boolean, fn: () => Promise<void>) {
  if (!force && lastSyncTimestamps[key] && Date.now() - lastSyncTimestamps[key] < SYNC_TTL_MS) {
    return;
  }
  if (inFlightSyncPromises[key]) {
    await inFlightSyncPromises[key];
    return;
  }
  const promise = (async () => {
    try {
      await fn();
      lastSyncTimestamps[key] = Date.now();
    } finally {
      inFlightSyncPromises[key] = null;
    }
  })();
  inFlightSyncPromises[key] = promise;
  await promise;
}

/**
 * Seed primary ledger accounts if they do not exist
 */
export async function seedLedgerAccounts() {
  await connectToDatabase();

  // One-time migration: drop stale single-field unique index on 'code'
  if (!legacyCodeIndexDropped) {
    legacyCodeIndexDropped = true;
    try {
      await LedgerAccount.collection.dropIndex('code_1');
    } catch {
      // Index doesn't exist or already dropped — safe to ignore
    }
  }

  const accounts: { name: string; code: 'CASH' | 'BANK' | 'AR' | 'AP'; type: 'asset' | 'liability'; category: 'Cash' | 'Bank' | 'Other' }[] = [
    { name: 'Cash', code: 'CASH', type: 'asset', category: 'Cash' },
    { name: 'Bank', code: 'BANK', type: 'asset', category: 'Bank' },
    { name: 'Accounts Receivable', code: 'AR', type: 'asset', category: 'Other' },
    { name: 'Accounts Payable', code: 'AP', type: 'liability', category: 'Other' },
  ];

  await LedgerAccount.bulkWrite(
    accounts.map((acc) => ({
      updateOne: {
        filter: { code: acc.code, resellerId: null },
        update: {
          $setOnInsert: {
            name: acc.name,
            code: acc.code,
            type: acc.type,
            category: acc.category,
            openingBalance: 0,
            currentBalance: 0,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );
}

/**
 * Seed primary default 4 ledger accounts for a reseller:
 * Bank, Cash in Hand, Accounts Payable, Accounts Receivable
 */
export async function seedResellerLedgerAccounts(resellerId: any) {
  if (!resellerId) return;
  await connectToDatabase();

  // One-time migration: drop stale single-field unique index on 'code'
  // that conflicts with the correct compound {resellerId, code} index.
  try {
    await LedgerAccount.collection.dropIndex('code_1');
  } catch {
    // Index doesn't exist or already dropped — safe to ignore
  }

  const accounts: { name: string; code: 'CASH' | 'BANK' | 'AR' | 'AP'; type: 'asset' | 'liability'; category: 'Cash' | 'Bank' | 'Other'; description: string }[] = [
    { name: 'Bank', code: 'BANK', type: 'asset', category: 'Bank', description: 'Direct account' },
    { name: 'Cash in Hand', code: 'CASH', type: 'asset', category: 'Cash', description: 'Default Store Primary Cash Account' },
    { name: 'Accounts Payable', code: 'AP', type: 'liability', category: 'Other', description: 'Direct account' },
    { name: 'Accounts Receivable', code: 'AR', type: 'asset', category: 'Other', description: 'Direct account' },
  ];

  for (const acc of accounts) {
    await LedgerAccount.updateOne(
      { resellerId, code: acc.code },
      {
        $setOnInsert: {
          name: acc.name,
          code: acc.code,
          type: acc.type,
          category: acc.category,
          description: acc.description,
          openingBalance: 0,
          currentBalance: 0,
          resellerId,
        },
      },
      { upsert: true }
    );
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
  date: Date = new Date(),
  skipRecalculate: boolean = false
) {
  await connectToDatabase();
  if (!skipRecalculate) {
    await seedLedgerAccounts();
    invalidateLedgerSyncCache();
  }

  // Find account
  const account = await LedgerAccount.findOne({
    code: accountCode,
    $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
  });
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

  if (!skipRecalculate) {
    // Update current account balance
    account.currentBalance = balanceAfter;
    await account.save();

    // Recalculate to keep chronological order correct in the DB running balances
    await recalculateLedgerBalance(accountCode);
  }

  return transaction;
}

/**
 * Determine the net balance change of a transaction for an account based on its semantic action
 */
export function calculateTransactionChange(tx: any, account: any): number {
  const desc = (tx.description || '').toLowerCase();
  const amount = Math.abs(Number(tx.amount) || 0);

  // If it's an Opening Balance journal entry, the opening balance is already accounted for in account.openingBalance
  if (desc === 'opening balance' || desc.startsWith('opening balance')) {
    return 0;
  }

  // Outflow / Deductions: expenses, repayments, transfers out, payouts, payments
  const isDeduction =
    desc.startsWith('expense') ||
    desc.startsWith('manual withdrawal') ||
    desc.startsWith('transfer to') ||
    desc.startsWith('payment credit for bill') ||
    desc.startsWith('upfront payment credit') ||
    desc.includes('payout to') ||
    desc.includes('commission payout') ||
    desc.includes('loan repayment') ||
    desc.startsWith('reseller commission payout') ||
    desc.startsWith('supplier payment') ||
    desc.includes('paid to') ||
    desc.includes('settled for order') ||
    desc.includes('cleared for order') ||
    desc.includes('payout settled');

  // Inflow / Additions: income, deposits, loans received, upfront cash, payments received
  const isAddition =
    desc.startsWith('income') ||
    desc.startsWith('manual deposit') ||
    desc.startsWith('transfer from') ||
    desc.startsWith('business loan inflow') ||
    desc.startsWith('payment received') ||
    desc.startsWith('payout received') ||
    desc.includes('payout received') ||
    desc.startsWith('cash paid upfront') ||
    desc.startsWith('bill generated') ||
    desc.includes('receivable for order') ||
    desc.includes('payable for order') ||
    desc.includes('supplier bill payable');

  if (account.type === 'liability' || account.code === 'AP') {
    if (isDeduction) return -amount;
    if (isAddition) return amount;
    return tx.type === 'credit' ? amount : -amount;
  }

  // Asset accounts (Bank, Cash, MFS, AR)
  if (isAddition) return amount;
  if (isDeduction) return -amount;

  return tx.type === 'debit' ? amount : -amount;
}

/**
 * Sort transactions chronologically:
 * - Primary: calendar date (day)
 * - Secondary: on same day for AR account, 'debit' (bill/order generation) ALWAYS executes before 'credit' (payment deduction)
 *   so the receivable running balance never dips into a negative figure.
 * - Tertiary: exact timestamp / createdAt / _id
 */
function sortTransactionsChronologically(transactions: any[], account: any) {
  transactions.sort((a: any, b: any) => {
    const dayA = a.date ? new Date(a.date).toISOString().slice(0, 10) : '';
    const dayB = b.date ? new Date(b.date).toISOString().slice(0, 10) : '';
    if (dayA !== dayB) return dayA.localeCompare(dayB);

    if (account?.code === 'AR') {
      const isAddA = a.type === 'debit';
      const isAddB = b.type === 'debit';
      if (isAddA !== isAddB) return isAddA ? -1 : 1;
    }

    if (account?.code === 'AP') {
      const isAddA = a.type === 'credit';
      const isAddB = b.type === 'credit';
      if (isAddA !== isAddB) return isAddA ? -1 : 1;
    }

    const timeA = a.date ? new Date(a.date).getTime() : 0;
    const timeB = b.date ? new Date(b.date).getTime() : 0;
    if (timeA !== timeB) return timeA - timeB;

    const createA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const createB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return createA - createB;
  });
}

/**
 * Recalculate ledger balance for an account
 */
export async function recalculateLedgerBalance(accountCode: 'CASH' | 'BANK' | 'AR' | 'AP') {
  await connectToDatabase();
  const account = await LedgerAccount.findOne({
    code: accountCode,
    $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
  });
  if (!account) return;

  const transactions = await LedgerTransaction.find({ account: account._id }).lean();
  sortTransactionsChronologically(transactions, account);

  let runningBalance = account.openingBalance || 0;
  const bulkOps: any[] = [];

  for (const tx of transactions) {
    const change = calculateTransactionChange(tx, account);
    runningBalance += change;
    if (Math.abs((tx.balanceAfter ?? 0) - runningBalance) > 0.001) {
      bulkOps.push({
        updateOne: {
          filter: { _id: tx._id },
          update: { $set: { balanceAfter: runningBalance } }
        }
      });
    }
  }

  if (bulkOps.length > 0) {
    await LedgerTransaction.bulkWrite(bulkOps, { ordered: false });
  }

  if (Math.abs((account.currentBalance ?? 0) - runningBalance) > 0.001) {
    await LedgerAccount.updateOne({ _id: account._id }, { $set: { currentBalance: runningBalance } });
  }
}

/**
 * Recalculate ledger balance for any account by its ObjectId
 */
export async function recalculateLedgerBalanceByAccountId(accountId: any) {
  if (!accountId) return;
  await connectToDatabase();
  const account = await LedgerAccount.findById(accountId);
  if (!account) return;

  const transactions = await LedgerTransaction.find({ account: account._id }).lean();
  sortTransactionsChronologically(transactions, account);

  let runningBalance = account.openingBalance || 0;
  const bulkOps: any[] = [];

  for (const tx of transactions) {
    const change = calculateTransactionChange(tx, account);
    runningBalance += change;
    if (Math.abs((tx.balanceAfter ?? 0) - runningBalance) > 0.001) {
      bulkOps.push({
        updateOne: {
          filter: { _id: tx._id },
          update: { $set: { balanceAfter: runningBalance } }
        }
      });
    }
  }

  if (bulkOps.length > 0) {
    await LedgerTransaction.bulkWrite(bulkOps, { ordered: false });
  }

  if (Math.abs((account.currentBalance ?? 0) - runningBalance) > 0.001) {
    await LedgerAccount.updateOne({ _id: account._id }, { $set: { currentBalance: runningBalance } });
  }
}

/**
 * Log order payment and courier delivery fee to the ledger and expense journal.
 * All automated courier settlements and online gateway collections flow through the default BANK account.
 */
export async function logOrderPaymentToLedger(order: any) {
  try {
    await connectToDatabase();
    
    const amount = Number(order.totalAmount) || 0;
    if (amount <= 0) return;

    const shortId = order.shortId || order._id.toString().slice(-8).toUpperCase();
    const reference = `ORDER-${shortId}`;
    const shippingRef = `SHIPPING-${shortId}`;
    const deliveryCharge = Number(order.deliveryCharge) || 0;
    const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();

    const LedgerAccount = (await import('@/models/LedgerAccount')).default;
    const Expense = (await import('@/models/Expense')).default;

    const bankAccount = await LedgerAccount.findOne({
      $and: [
        { $or: [{ category: 'Bank' }, { code: 'BANK' }] },
        { $or: [{ resellerId: null }, { resellerId: { $exists: false } }] }
      ]
    });

    if (!bankAccount) return;

    // 1. Order payment deposited into default BANK account
    const exists = await LedgerTransaction.findOne({ reference });
    if (!exists) {
      const description = `Customer payment received for Order #${shortId} (${order.paymentMethod || 'Courier COD'})`;

      await logLedgerTransaction(
        'BANK',
        'debit', // Debit increases Bank
        amount,
        description,
        reference,
        orderDate
      );
      console.log(`[Ledger] Logged payment for Order #${shortId} to BANK successfully.`);
    }

    // 2. Courier delivery charge deducted from BANK account
    if (deliveryCharge > 0) {
      const shippingTxExists = await LedgerTransaction.findOne({ reference: shippingRef });
      if (!shippingTxExists) {
        await logLedgerTransaction(
          'BANK',
          'credit', // Credit decreases Bank for courier shipping cost
          deliveryCharge,
          `Courier delivery charge deducted for Order #${shortId}`,
          shippingRef,
          orderDate
        );
      }
    }

    // 3. Clear AR receivable
    const arRef = `ORD-${shortId}`;
    const arCreditExists = await LedgerTransaction.findOne({ reference: arRef, type: 'credit' });
    if (!arCreditExists) {
      await logLedgerTransaction(
        'AR',
        'credit',
        amount,
        `Payment settled for Order #${shortId}`,
        arRef,
        order.updatedAt ? new Date(order.updatedAt) : new Date()
      );
    }

    // 4. Auto-log Revenue and Shipping Expense into Expense collection for /admin/expenses-incomes
    const incomeExpenseExists = await Expense.findOne({ reference });
    if (!incomeExpenseExists) {
      await Expense.create({
        title: `Order Revenue #${shortId}`,
        amount,
        category: 'Sales Revenue',
        type: 'income',
        paymentAccountId: bankAccount._id,
        date: orderDate,
        description: `Customer payment received for Order #${shortId} (${order.paymentMethod || 'Courier COD'})`,
        reference,
        resellerId: null
      });
    }

    if (deliveryCharge > 0) {
      const shippingExpenseExists = await Expense.findOne({ reference: shippingRef });
      if (!shippingExpenseExists) {
        await Expense.create({
          title: `Courier Delivery Charge #${shortId}`,
          amount: deliveryCharge,
          category: 'Courier & Shipping',
          type: 'expense',
          paymentAccountId: bankAccount._id,
          date: orderDate,
          description: `Courier shipping fee deducted for Order #${shortId}`,
          reference: shippingRef,
          resellerId: null
        });
      }
    }

    await recalculateLedgerBalance('BANK');
    await recalculateLedgerBalance('AR');
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

    // Clear AP liability
    const apRef = `PAYOUT-AP-${shortId}`;
    const apDebitExists = await LedgerTransaction.findOne({ reference: apRef, type: 'debit' });
    if (!apDebitExists) {
      await logLedgerTransaction(
        'AP',
        'debit', // Debit decreases liability account (AP)
        amount,
        `Commission Payout Settled to ${storeName}`,
        apRef,
        payoutTx.updatedAt ? new Date(payoutTx.updatedAt) : new Date()
      );
    }
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
 * Sync active bills to ledger: ensures Bill Generated AR debit entry and upfront cash entries exist.
 */
export async function syncBillsToLedger(force: boolean = false) {
  return runDeduplicatedSync('bills', force, async () => {
    try {
      await connectToDatabase();
      const Bill = (await import('@/models/Bill')).default;
      const LedgerAccount = (await import('@/models/LedgerAccount')).default;

      const [arAccount, cashAccount, bankAccount, bills] = await Promise.all([
        LedgerAccount.findOne({
          code: 'AR',
          $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
        }),
        LedgerAccount.findOne({
          code: 'CASH',
          $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
        }),
        LedgerAccount.findOne({
          code: 'BANK',
          $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
        }),
        Bill.find({
          $or: [{ documentType: 'bill' }, { documentType: { $exists: false } }]
        }).lean()
      ]);

      if (!arAccount || !cashAccount) return;

      const invoiceNos = bills.map((b: any) => b.invoiceNo).filter(Boolean);
      const existingBillTxs = invoiceNos.length > 0
        ? await LedgerTransaction.find({ reference: { $in: invoiceNos } })
        : [];

      const arIdStr = arAccount._id.toString();
      const paymentAccSet = new Set<string>();
      if (cashAccount?._id) paymentAccSet.add(cashAccount._id.toString());
      if (bankAccount?._id) paymentAccSet.add(bankAccount._id.toString());

      for (const bill of bills as any[]) {
        if (!bill.invoiceNo) continue;

        const billDate = bill.date ? new Date(bill.date) : (bill.createdAt ? new Date(bill.createdAt) : new Date());

        // 1. Check AR Debit entry for Bill Generated
        const billDebitExists = existingBillTxs.find(
          (tx: any) => tx.account?.toString() === arIdStr && tx.reference === bill.invoiceNo && tx.type === 'debit'
        );

        if (!billDebitExists && bill.gTotal > 0) {
          await logLedgerTransaction(
            'AR',
            'debit',
            bill.gTotal,
            `Bill Generated for ${bill.clientName || 'Client'}`,
            bill.invoiceNo,
            billDate,
            true
          );
        } else if (billDebitExists && bill.gTotal > 0) {
          // If debit exists but date is later than bill date, sync date
          if (new Date(billDebitExists.date).getTime() > billDate.getTime()) {
            billDebitExists.date = billDate;
            await billDebitExists.save();
          }
        }

        // 2. Check Upfront payment if cashIn > 0
        if (bill.cashIn > 0) {
          const existingPaymentTxs = existingBillTxs.filter(
            (tx: any) =>
              paymentAccSet.has(tx.account?.toString()) &&
              tx.reference === bill.invoiceNo &&
              tx.type === 'debit' &&
              !/Bill Generated/i.test(tx.description || '')
          );

          const totalAlreadyLogged = existingPaymentTxs.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);
          const unloggedCash = (bill.cashIn || 0) - totalAlreadyLogged;

          if (unloggedCash > 0) {
            await logLedgerTransaction(
              'CASH',
              'debit',
              unloggedCash,
              `Cash Paid Upfront for Bill ${bill.invoiceNo}`,
              bill.invoiceNo,
              billDate,
              true
            );

            await logLedgerTransaction(
              'AR',
              'credit',
              unloggedCash,
              `Upfront payment credit for Bill ${bill.invoiceNo}`,
              bill.invoiceNo,
              billDate,
              true
            );
          }
        }
      }

      await Promise.all([
        recalculateLedgerBalance('AR'),
        recalculateLedgerBalance('CASH'),
        bankAccount ? recalculateLedgerBalance('BANK') : Promise.resolve()
      ]);
    } catch (err) {
      console.error('[Ledger] Error syncing bills to ledger:', err);
    }
  });
}

/**
 * Sync active orders to ledger: ensures Order Receivable AR debit entries exist,
 * settled orders have their AR cleared, and collected payments & shipping deductions
 * are recorded in the default BANK account and Expenses/Incomes journal.
 */
export async function syncOrdersToLedger(force: boolean = false) {
  return runDeduplicatedSync('orders', force, async () => {
    try {
      await connectToDatabase();
      const Order = (await import('@/models/Order')).default;
      const LedgerAccount = (await import('@/models/LedgerAccount')).default;
      const Expense = (await import('@/models/Expense')).default;
      const ResellerOrder = (await import('@/models/ResellerOrder')).default;

      const [arAccount, bankAccount, cashAccount] = await Promise.all([
        LedgerAccount.findOne({
          code: 'AR',
          $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
        }),
        LedgerAccount.findOne({
          $and: [
            { $or: [{ category: 'Bank' }, { code: 'BANK' }] },
            { $or: [{ resellerId: null }, { resellerId: { $exists: false } }] }
          ]
        }),
        LedgerAccount.findOne({
          $and: [
            { $or: [{ category: 'Cash' }, { code: 'CASH' }] },
            { $or: [{ resellerId: null }, { resellerId: { $exists: false } }] }
          ]
        })
      ]);

      if (!arAccount || !bankAccount) return;

      // Clean any old order transactions mistakenly placed into CASH so Cash account stays 0 for auto orders
      if (cashAccount) {
        const cashDel = await LedgerTransaction.deleteMany({
          account: cashAccount._id,
          reference: { $regex: /^(ORDER|SHIPPING|DELIVERY)-/i }
        });
        if (cashDel.deletedCount > 0) {
          await recalculateLedgerBalance('CASH');
        }
      }

      // 0 & 0b. Auto-reconcile COD delivered orders & sync resellerCommission
      const [, , resellerOrdersWithComm] = await Promise.all([
        Order.updateMany(
          { status: 'Delivered', paymentStatus: { $ne: 'Paid' }, deletedAt: null },
          { $set: { paymentStatus: 'Paid' } }
        ),
        Order.updateMany(
          {
            orderSource: { $ne: 'reseller_storefront' },
            resellerCommission: { $gt: 0 }
          },
          { $set: { resellerCommission: 0 } }
        ),
        ResellerOrder.find({
          resellerCommission: { $gt: 0 },
          deletedAt: null
        }).select('shortId resellerCommission commissionStatus').lean()
      ]);

      const commBulkOps: any[] = resellerOrdersWithComm
        .filter((ro: any) => ro.shortId)
        .map((ro: any) => ({
          updateOne: {
            filter: { shortId: ro.shortId, orderSource: 'reseller_storefront' as const },
            update: {
              $set: {
                resellerCommission: ro.resellerCommission,
                ...(ro.commissionStatus ? { commissionStatus: ro.commissionStatus } : {})
              }
            }
          }
        }));

      if (commBulkOps.length > 0) {
        await Order.bulkWrite(commBulkOps, { ordered: false });
      }

      // Fetch orders, returnLossOrders, invalidOrders, and existing Mother Shop LedgerTransactions & Expenses in parallel
      const [orders, returnLossOrders, invalidOrders, motherTxs, motherExpenses] = await Promise.all([
        Order.find({
          $or: [
            {
              status: { $in: ['Order Placed', 'Confirmed', 'Processing', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] },
              deletedAt: null
            },
            { paymentStatus: 'Paid' },
            { status: 'Delivered' }
          ]
        }).lean(),
        Order.find({
          courierReturnLossDeducted: true,
          deletedAt: null
        }).lean(),
        Order.find({
          $or: [{ status: 'Cancelled' }, { paymentStatus: 'Failed' }, { deletedAt: { $ne: null } }],
          paymentStatus: { $ne: 'Paid' },
          status: { $ne: 'Delivered' },
          courierReturnLossDeducted: { $ne: true }
        } as any).select('shortId').lean(),
        LedgerTransaction.find({
          $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
        }),
        Expense.find({
          $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
        })
      ]);

      const arIdStr = arAccount._id.toString();
      const bankIdStr = bankAccount._id.toString();

      // Index existing transactions & expenses in memory for O(1) lookup
      const arDebitMap = new Map<string, any>();
      const arCreditMap = new Map<string, any>();
      const txByRefMap = new Map<string, any>();
      const allRefSet = new Set<string>();

      for (const tx of motherTxs) {
        if (!tx.reference) continue;
        allRefSet.add(tx.reference);
        const accStr = tx.account?.toString();
        if (accStr === arIdStr) {
          if (tx.type === 'debit') arDebitMap.set(tx.reference, tx);
          else if (tx.type === 'credit') arCreditMap.set(tx.reference, tx);
        }
        if (/^(ORDER|SHIPPING|REC-SHIPPING)-/i.test(tx.reference)) {
          txByRefMap.set(tx.reference, tx);
        }
      }

      const expByRefMap = new Map<string, any>();
      for (const exp of motherExpenses) {
        if (exp.reference) {
          expByRefMap.set(exp.reference, exp);
        }
      }

      const staleArCreditRefsToDelete: string[] = [];
      const staleTxRefsToDelete: string[] = [];
      const staleExpRefsToDelete: string[] = [];

      for (const order of orders) {
        if (!order.shortId) continue;

        const totalAmount = Number(order.totalAmount) || 0;
        if (totalAmount <= 0) continue;

        const deliveryCharge = Number(order.deliveryCharge) || 0;
        const orderRef = `ORD-${order.shortId}`;
        const payRef = `ORDER-${order.shortId}`;
        const shippingRef = `SHIPPING-${order.shortId}`;
        const baseTime = (order.createdAt ? new Date(order.createdAt) : new Date()).getTime();
        const orderDate = new Date(baseTime);
        const customerName = order.shippingAddress?.fullName || 'Customer';
        const desc = `Customer Receivable for Order #${order.shortId} (${customerName})`;

        // 1. Ensure AR Debit entry exists (represents customer/courier receivable) - FIRST EVENT
        const arDebit = arDebitMap.get(orderRef);

        if (!arDebit) {
          await logLedgerTransaction('AR', 'debit', totalAmount, desc, orderRef, orderDate, true);
        } else {
          let changed = false;
          if (Math.abs(arDebit.amount - totalAmount) > 0.01) {
            arDebit.amount = totalAmount;
            changed = true;
          }
          if (arDebit.description !== desc) {
            arDebit.description = desc;
            changed = true;
          }
          if (new Date(arDebit.date).getTime() !== baseTime) {
            arDebit.date = new Date(baseTime);
            changed = true;
          }
          if (changed) {
            await arDebit.save();
          }
        }

        // 2. Determine payment details (All courier COD & online collections settle into default Bank account)
        const isPaid = order.paymentStatus === 'Paid' || order.status === 'Delivered';

        if (isPaid) {
          // 2a. Record collection into default BANK account - SECOND EVENT
          const payDate = new Date(baseTime + 1000);
          const payTx = txByRefMap.get(payRef);
          const payDesc = `Customer payment received for Order #${order.shortId} (${order.paymentMethod || 'Courier COD'})`;

          if (!payTx) {
            await logLedgerTransaction('BANK', 'debit', totalAmount, payDesc, payRef, payDate, true);
          } else {
            let changed = false;
            if (payTx.account.toString() !== bankIdStr) {
              payTx.account = bankAccount._id;
              changed = true;
            }
            if (Math.abs(payTx.amount - totalAmount) > 0.01) {
              payTx.amount = totalAmount;
              changed = true;
            }
            if (payTx.type !== 'debit') {
              payTx.type = 'debit';
              changed = true;
            }
            if (payTx.description !== payDesc) {
              payTx.description = payDesc;
              changed = true;
            }
            if (new Date(payTx.date).getTime() !== payDate.getTime()) {
              payTx.date = payDate;
              changed = true;
            }
            if (changed) {
              await payTx.save();
            }
          }

          // 2b. Settle AR: ensure AR credit exists - THIRD EVENT
          const settleDate = new Date(baseTime + 2000);
          const arCredit = arCreditMap.get(orderRef);

          if (!arCredit) {
            const clearDesc = `Payment settled for Order #${order.shortId}`;
            await logLedgerTransaction('AR', 'credit', totalAmount, clearDesc, orderRef, settleDate, true);
          } else {
            let changed = false;
            if (Math.abs(arCredit.amount - totalAmount) > 0.01) {
              arCredit.amount = totalAmount;
              changed = true;
            }
            if (new Date(arCredit.date).getTime() !== settleDate.getTime()) {
              arCredit.date = settleDate;
              changed = true;
            }
            if (changed) {
              await arCredit.save();
            }
          }

          // 2c. Record courier delivery charge deduction from default BANK account - FOURTH EVENT
          if (deliveryCharge > 0) {
            const shipDate = new Date(baseTime + 3000);
            const shipTx = txByRefMap.get(shippingRef);
            const shipDesc = `Courier delivery charge deducted for Order #${order.shortId}`;

            if (!shipTx) {
              await logLedgerTransaction('BANK', 'credit', deliveryCharge, shipDesc, shippingRef, shipDate, true);
            } else {
              let changed = false;
              if (shipTx.account.toString() !== bankIdStr) {
                shipTx.account = bankAccount._id;
                changed = true;
              }
              if (Math.abs(shipTx.amount - deliveryCharge) > 0.01) {
                shipTx.amount = deliveryCharge;
                changed = true;
              }
              if (shipTx.type !== 'credit') {
                shipTx.type = 'credit';
                changed = true;
              }
              if (shipTx.description !== shipDesc) {
                shipTx.description = shipDesc;
                changed = true;
              }
              if (new Date(shipTx.date).getTime() !== shipDate.getTime()) {
                shipTx.date = shipDate;
                changed = true;
              }
              if (changed) {
                await shipTx.save();
              }
            }
          } else if (txByRefMap.has(shippingRef)) {
            staleTxRefsToDelete.push(shippingRef);
          }

          // 2d. Auto-sync to Expense & Income records for /admin/expenses-incomes
          const incomeExp = expByRefMap.get(payRef);
          if (!incomeExp) {
            await Expense.create({
              title: `Order Revenue #${order.shortId}`,
              amount: totalAmount,
              category: 'Sales Revenue',
              type: 'income',
              paymentAccountId: bankAccount._id,
              date: orderDate,
              description: `Customer payment received for Order #${order.shortId} (${order.paymentMethod || 'Courier COD'})`,
              reference: payRef,
              resellerId: null
            });
          } else {
            let expChanged = false;
            if (Math.abs(incomeExp.amount - totalAmount) > 0.01) {
              incomeExp.amount = totalAmount;
              expChanged = true;
            }
            if (incomeExp.paymentAccountId?.toString() !== bankIdStr) {
              incomeExp.paymentAccountId = bankAccount._id;
              expChanged = true;
            }
            if (expChanged) await incomeExp.save();
          }

          if (deliveryCharge > 0) {
            const shipExp = expByRefMap.get(shippingRef);
            if (!shipExp) {
              await Expense.create({
                title: `Courier Delivery Charge #${order.shortId}`,
                amount: deliveryCharge,
                category: 'Courier & Shipping',
                type: 'expense',
                paymentAccountId: bankAccount._id,
                date: orderDate,
                description: `Courier shipping fee deducted for Order #${order.shortId}`,
                reference: shippingRef,
                resellerId: null
              });
            } else {
              let shipExpChanged = false;
              if (Math.abs(shipExp.amount - deliveryCharge) > 0.01) {
                shipExp.amount = deliveryCharge;
                shipExpChanged = true;
              }
              if (shipExp.paymentAccountId?.toString() !== bankIdStr) {
                shipExp.paymentAccountId = bankAccount._id;
                shipExpChanged = true;
              }
              if (shipExpChanged) await shipExp.save();
            }
          } else if (expByRefMap.has(shippingRef)) {
            staleExpRefsToDelete.push(shippingRef);
          }
        } else {
          // If order is not paid, queue any stale AR credit, payment entries, and expense records for batch removal
          if (arCreditMap.has(orderRef)) staleArCreditRefsToDelete.push(orderRef);
          if (txByRefMap.has(payRef)) staleTxRefsToDelete.push(payRef);
          if (txByRefMap.has(shippingRef)) staleTxRefsToDelete.push(shippingRef);
          if (expByRefMap.has(payRef)) staleExpRefsToDelete.push(payRef);
          if (expByRefMap.has(shippingRef)) staleExpRefsToDelete.push(shippingRef);
        }
      }

      if (staleArCreditRefsToDelete.length > 0) {
        await LedgerTransaction.deleteMany({
          account: arAccount._id,
          reference: { $in: staleArCreditRefsToDelete },
          type: 'credit'
        });
      }
      if (staleTxRefsToDelete.length > 0) {
        await LedgerTransaction.deleteMany({ reference: { $in: staleTxRefsToDelete } });
      }
      if (staleExpRefsToDelete.length > 0) {
        await Expense.deleteMany({ reference: { $in: staleExpRefsToDelete } });
      }

      // 2.5 Handle Cancelled Orders with Courier Return Losses (Mother Shop pays courier, recovered from Reseller)
      for (const ro of returnLossOrders) {
        if (!ro.shortId) continue;
        const shipFee = Number(ro.courierReturnLossAmount) || Number(ro.courierCharge) || Number(ro.deliveryCharge) || 120;
        if (shipFee <= 0) continue;

        const shippingRef = `SHIPPING-${ro.shortId}`;
        const recRef = `REC-SHIPPING-${ro.shortId}`;
        const txDate = ro.updatedAt ? new Date(ro.updatedAt) : (ro.createdAt ? new Date(ro.createdAt) : new Date());

        // 1. Mother Shop Courier Delivery Charge (Expense: Paid to Courier)
        const shipTx = txByRefMap.get(shippingRef);
        const shipDesc = `Courier delivery charge deducted for Order #${ro.shortId}`;
        if (!shipTx) {
          await logLedgerTransaction('BANK', 'credit', shipFee, shipDesc, shippingRef, txDate, true);
        }

        const shipExp = expByRefMap.get(shippingRef);
        if (!shipExp) {
          await Expense.create({
            title: `Courier Delivery Charge #${ro.shortId}`,
            amount: shipFee,
            category: 'Courier & Shipping',
            type: 'expense',
            paymentAccountId: bankAccount._id,
            date: txDate,
            description: `Courier shipping fee deducted for Order #${ro.shortId}`,
            reference: shippingRef,
            resellerId: null
          });
        }

        // 2. Mother Shop Recovery from Reseller (Income: Recovered from Reseller Wallet)
        const recTx = txByRefMap.get(recRef);
        const recDesc = `Courier return loss recovered from Reseller for Order #${ro.shortId}`;
        if (!recTx) {
          await logLedgerTransaction('BANK', 'debit', shipFee, recDesc, recRef, new Date(txDate.getTime() + 1000), true);
        }

        const recExp = expByRefMap.get(recRef);
        if (!recExp) {
          await Expense.create({
            title: `Courier Return Loss Recovered from Reseller #${ro.shortId}`,
            amount: shipFee,
            category: 'Other Income',
            type: 'income',
            paymentAccountId: bankAccount._id,
            date: new Date(txDate.getTime() + 1000),
            description: `Courier return loss recovered from Reseller for Cancelled Order #${ro.shortId}`,
            reference: recRef,
            resellerId: null
          });
        }
      }

      // 3. Clean AR, Payment, and Expense transactions ONLY for cancelled/deleted orders that were NEVER Paid, NEVER Delivered, and NO courier return loss
      const invalidRefs = invalidOrders.map((o: any) => `ORD-${o.shortId}`).filter((r: string) => allRefSet.has(r));
      const invalidPayRefs = invalidOrders.map((o: any) => `ORDER-${o.shortId}`).filter(Boolean);
      const invalidShipRefs = invalidOrders.map((o: any) => `SHIPPING-${o.shortId}`).filter(Boolean);
      const allInvalidRefs = [...invalidPayRefs, ...invalidShipRefs].filter((r: string) => allRefSet.has(r) || expByRefMap.has(r));

      if (invalidRefs.length > 0) {
        await LedgerTransaction.deleteMany({
          account: arAccount._id,
          reference: { $in: invalidRefs }
        });
      }
      if (allInvalidRefs.length > 0) {
        await Promise.all([
          LedgerTransaction.deleteMany({ reference: { $in: allInvalidRefs } }),
          Expense.deleteMany({ reference: { $in: allInvalidRefs } })
        ]);
      }

      await Promise.all([
        recalculateLedgerBalance('CASH'),
        recalculateLedgerBalance('BANK'),
        recalculateLedgerBalance('AR')
      ]);
    } catch (err) {
      console.error('[Ledger] Error syncing orders to ledger:', err);
    }
  });
}

/**
 * Sync active supplier bills and reseller payables (commissions & product payouts) to AP in ledger.
 */
export async function syncPayablesToLedger(force: boolean = false) {
  return runDeduplicatedSync('payables', force, async () => {
    try {
      await connectToDatabase();
      await import('@/models/Reseller');
      const ResellerOrder = (await import('@/models/ResellerOrder')).default;
      const SupplierBill = (await import('@/models/SupplierBill')).default;
      const LedgerAccount = (await import('@/models/LedgerAccount')).default;

      const apAccount = await LedgerAccount.findOne({
        code: 'AP',
        $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
      });
      if (!apAccount) return;

      const [activeResellerOrders, dueSupplierBills, paidOrZeroSupplierBills, cancelledOrders, apTransactions] = await Promise.all([
        ResellerOrder.find({
          $or: [
            { status: { $nin: ['Cancelled', 'Failed'] }, deletedAt: null },
            { commissionStatus: 'cleared' },
            { status: 'Delivered' }
          ]
        } as any).populate('resellerId', 'storeName').lean(),
        SupplierBill.find({
          status: 'Due'
        }).populate('supplier', 'name companyName').lean(),
        SupplierBill.find({
          $or: [{ status: 'Paid' }, { dueAmount: { $lte: 0 } }]
        }).select('billNo').lean(),
        ResellerOrder.find({
          $or: [{ status: 'Cancelled' }, { status: 'Failed' }, { deletedAt: { $ne: null } }],
          status: { $ne: 'Delivered' },
          commissionStatus: { $ne: 'cleared' }
        } as any).select('shortId').lean(),
        LedgerTransaction.find({ account: apAccount._id })
      ]);

      const apCreditMap = new Map<string, any>();
      const allApRefSet = new Set<string>();
      for (const tx of apTransactions) {
        if (tx.reference) {
          allApRefSet.add(tx.reference);
          if (tx.type === 'credit') {
            apCreditMap.set(tx.reference, tx);
          }
        }
      }

      // 1. Sync active reseller order liabilities OR cleared/delivered liabilities
      for (const ro of activeResellerOrders) {
        if (!ro.shortId) continue;
        const commissionAmount = Number(ro.resellerCommission) || 0;
        if (commissionAmount <= 0) continue;

        const apRef = `AP-RO-${ro.shortId}`;
        const storeName = (ro.resellerId as any)?.storeName || 'Reseller';
        const isFulfillment = ro.shortId.includes('-F');
        const baseTime = (ro.createdAt ? new Date(ro.createdAt) : new Date()).getTime();
        const orderDate = new Date(baseTime + (isFulfillment ? 5000 : 4000));

        const desc = isFulfillment
          ? `Product Payout Payable for Order #${ro.shortId} (${storeName})`
          : `Reseller Commission Payable for Order #${ro.shortId} (${storeName})`;

        const apCredit = apCreditMap.get(apRef);

        if (!apCredit) {
          await logLedgerTransaction('AP', 'credit', commissionAmount, desc, apRef, orderDate, true);
        } else {
          let changed = false;
          if (Math.abs(apCredit.amount - commissionAmount) > 0.01) {
            apCredit.amount = commissionAmount;
            changed = true;
          }
          if (apCredit.description !== desc) {
            apCredit.description = desc;
            changed = true;
          }
          if (new Date(apCredit.date).getTime() !== orderDate.getTime()) {
            apCredit.date = orderDate;
            changed = true;
          }
          if (changed) {
            await apCredit.save();
          }
        }
      }

      // 2. Sync active due supplier bills
      for (const sb of dueSupplierBills) {
        const billNo = (sb as any).billNo || sb._id.toString();
        const apRef = `AP-SB-${billNo}`;
        const dueAmount = Number((sb as any).dueAmount || (sb as any).totalAmount) || 0;
        if (dueAmount <= 0) continue;

        const supplierName = (sb as any).supplier?.companyName || (sb as any).supplier?.name || 'Supplier';
        let billDate = (sb as any).createdAt ? new Date((sb as any).createdAt) : ((sb as any).date ? new Date((sb as any).date) : new Date());
        if ((sb as any).date) {
          const d = new Date((sb as any).date);
          if ((sb as any).createdAt && d.toISOString().slice(0, 10) === new Date((sb as any).createdAt).toISOString().slice(0, 10)) {
            billDate = new Date((sb as any).createdAt);
          } else {
            billDate = d;
          }
        }
        const desc = `Supplier Bill Payable for ${supplierName} (${billNo})`;

        const apCredit = apCreditMap.get(apRef);

        if (!apCredit) {
          await logLedgerTransaction('AP', 'credit', dueAmount, desc, apRef, billDate, true);
        } else {
          let changed = false;
          if (Math.abs(apCredit.amount - dueAmount) > 0.01) {
            apCredit.amount = dueAmount;
            changed = true;
          }
          if (apCredit.description !== desc) {
            apCredit.description = desc;
            changed = true;
          }
          if (new Date(apCredit.date).getTime() !== billDate.getTime()) {
            apCredit.date = billDate;
            changed = true;
          }
          if (changed) {
            await apCredit.save();
          }
        }
      }

      // Clean up AP entries for supplier bills that are now Paid or no longer Due
      const paidSbRefs = paidOrZeroSupplierBills.map((s: any) => `AP-SB-${s.billNo}`).filter((r: string) => allApRefSet.has(r));
      if (paidSbRefs.length > 0) {
        await LedgerTransaction.deleteMany({
          account: apAccount._id,
          reference: { $in: paidSbRefs }
        });
      }

      // 3. Remove AP liabilities ONLY for cancelled/deleted orders that were NEVER Delivered and NEVER cleared
      const cancelledRefs = cancelledOrders.map((o: any) => `AP-RO-${o.shortId}`).filter((r: string) => allApRefSet.has(r));
      if (cancelledRefs.length > 0) {
        await LedgerTransaction.deleteMany({
          account: apAccount._id,
          reference: { $in: cancelledRefs }
        });
      }

      await recalculateLedgerBalance('AP');
    } catch (err) {
      console.error('[Ledger] Error syncing payables to ledger:', err);
    }
  });
}

/**
 * Clean up orphan ledger transactions for deleted bills, orders, payouts, loans, supplier bills, expenses
 * and recalculate balances automatically.
 */
export async function cleanOrphanLedgerTransactions() {
  try {
    await connectToDatabase();
    
    // Dynamically import models to prevent circular dependency issues
    const Bill = (await import('@/models/Bill')).default;
    const Expense = (await import('@/models/Expense')).default;
    const Order = (await import('@/models/Order')).default;
    const ResellerOrder = (await import('@/models/ResellerOrder')).default;
    const ResellerWalletTransaction = (await import('@/models/ResellerWalletTransaction')).default;
    const BusinessLoan = (await import('@/models/BusinessLoan')).default;
    const SupplierBill = (await import('@/models/SupplierBill')).default;
    const mongoose = (await import('mongoose')).default;

    // Only clean Mother Shop orphan transactions; NEVER delete reseller tenant ledger records
    const transactions = await LedgerTransaction.find({
      $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
    });
    let deletedCount = 0;

    // Fetch reference sets in parallel for high performance
    const [bills, activeOrders, loans, supplierBills, payouts, activeRos] = await Promise.all([
      Bill.find({}, { invoiceNo: 1 }).lean(),
      Order.find({
        $or: [
          { deletedAt: null },
          { paymentStatus: 'Paid' },
          { status: 'Delivered' }
        ]
      }, { _id: 1, shortId: 1 }).lean(),
      BusinessLoan.find({}, { loanId: 1 }).lean(),
      SupplierBill.find({}, { billNo: 1 }).lean(),
      ResellerWalletTransaction.find({ type: 'payout_released' }, { _id: 1 }).lean(),
      ResellerOrder.find({
        $or: [
          { status: { $nin: ['Cancelled', 'Failed'] }, deletedAt: null },
          { commissionStatus: 'cleared' },
          { status: 'Delivered' }
        ]
      } as any, { shortId: 1 }).lean(),
    ]);

    const validBillInvoices = new Set(bills.map((b: any) => (b.invoiceNo || '').toUpperCase()));
    const validOrderShortIds = new Set([
      ...activeOrders.map((o: any) => o._id.toString().slice(-8).toUpperCase()),
      ...activeOrders.map((o: any) => (o.shortId || '').toUpperCase()).filter(Boolean)
    ]);
    const validRoShortIds = new Set(activeRos.map((r: any) => (r.shortId || '').toUpperCase()));
    const validLoanIds = new Set(loans.map((l: any) => l.loanId));
    const validSupplierBillInvoices = new Set(supplierBills.map((s: any) => ((s.billNo || s.invoiceNo || '') as string).toUpperCase()));
    const validPayoutRefs = new Set([
      ...payouts.map((p: any) => `PAYOUT-${p._id.toString().slice(-8).toUpperCase()}`),
      ...payouts.map((p: any) => `PAYOUT-REC-${p._id.toString().slice(-8).toUpperCase()}`),
      ...payouts.map((p: any) => `PAYOUT-AP-${p._id.toString().slice(-8).toUpperCase()}`)
    ]);

    for (const tx of transactions) {
      // 1. Check Client Bill references: INV-xxxxxxx
      if (tx.reference && tx.reference.startsWith('INV-')) {
        if (!validBillInvoices.has(tx.reference.toUpperCase())) {
          await LedgerTransaction.findByIdAndDelete(tx._id);
          deletedCount++;
          continue;
        }
      }

      // 2. Check description containing INV- or Bill numbers
      if (tx.description && (/INV-\d+/i.test(tx.description) || /Bill\s+(\w+)/i.test(tx.description))) {
        const match = tx.description.match(/INV-\d+/i) || tx.description.match(/Bill\s+(\w+)/i);
        if (match) {
          const invNo = match[0].replace(/^Bill\s+/i, '').toUpperCase();
          const cleanInvNo = invNo.startsWith('INV-') ? invNo : `INV-${invNo}`;
          if (!validBillInvoices.has(cleanInvNo) && !validBillInvoices.has(invNo)) {
            await LedgerTransaction.findByIdAndDelete(tx._id);
            deletedCount++;
            continue;
          }
        }
      }

      // 3. Check Order references (e.g. ORDER-XXXX, ORD-XXXX, SHIPPING-XXXX, DELIVERY-XXXX, REC-SHIPPING-XXXX)
      if (tx.reference && (tx.reference.startsWith('ORDER-') || tx.reference.startsWith('ORD-') || tx.reference.startsWith('SHIPPING-') || tx.reference.startsWith('DELIVERY-') || tx.reference.startsWith('REC-SHIPPING-'))) {
        const shortId = tx.reference.replace(/^(ORD(ER)?|SHIPPING|DELIVERY|REC-SHIPPING)-/i, '').trim().toUpperCase();
        if (!validOrderShortIds.has(shortId)) {
          await LedgerTransaction.findByIdAndDelete(tx._id);
          deletedCount++;
          continue;
        }
      }

      // 4. Check Loan references (e.g. LOAN-2026-XXXX-XXXX)
      if (tx.reference && tx.reference.startsWith('LOAN-')) {
        if (!validLoanIds.has(tx.reference)) {
          await LedgerTransaction.findByIdAndDelete(tx._id);
          deletedCount++;
          continue;
        }
      }

      // 5. Check Supplier Bill references: SB- or PB- or AP-SB-
      if (tx.reference && (tx.reference.startsWith('SB-') || tx.reference.startsWith('PB-') || tx.reference.startsWith('AP-SB-'))) {
        const cleanSbRef = tx.reference.replace(/^AP-SB-/i, '').toUpperCase();
        if (!validSupplierBillInvoices.has(cleanSbRef) && !validSupplierBillInvoices.has(tx.reference.toUpperCase())) {
          await LedgerTransaction.findByIdAndDelete(tx._id);
          deletedCount++;
          continue;
        }
      }

      // 5b. Check Reseller Order AP references: AP-RO-
      if (tx.reference && tx.reference.startsWith('AP-RO-')) {
        const roShortId = tx.reference.replace(/^AP-RO-/i, '').trim().toUpperCase();
        if (!validRoShortIds.has(roShortId)) {
          await LedgerTransaction.findByIdAndDelete(tx._id);
          deletedCount++;
          continue;
        }
      }

      // 6. Check PAYOUT references
      if (tx.reference && tx.reference.startsWith('PAYOUT-')) {
        if (!validPayoutRefs.has(tx.reference)) {
          await LedgerTransaction.findByIdAndDelete(tx._id);
          deletedCount++;
          continue;
        }
      }

      // 7. Check 24-character ObjectId references (e.g. manual Expense/Income)
      if (tx.reference && mongoose.Types.ObjectId.isValid(tx.reference) && tx.reference.length === 24) {
        const [expenseExists, billExists, orderExists, supplierBillExists, loanExists] = await Promise.all([
          Expense.findById(tx.reference).select('_id').lean(),
          Bill.findById(tx.reference).select('_id').lean(),
          Order.findById(tx.reference).select('_id').lean(),
          SupplierBill.findById(tx.reference).select('_id').lean(),
          BusinessLoan.findById(tx.reference).select('_id').lean(),
        ]);

        if (!expenseExists && !billExists && !orderExists && !supplierBillExists && !loanExists) {
          await LedgerTransaction.findByIdAndDelete(tx._id);
          deletedCount++;
          continue;
        }
      }
    }

    // 8. Clean orphan Expense/Income records linked to non-existent bills or supplier bills
    const allLinkedExpenses = await Expense.find({
      $or: [
        { bill: { $exists: true, $ne: null } },
        { invoiceNo: { $exists: true, $ne: null } },
        { supplierBill: { $exists: true, $ne: null } },
        { reference: { $regex: /^INV-|^SB-|^PB-/i } },
        { title: { $regex: /INV-\d+|SB-\d+|PB-\d+/i } }
      ]
    });

    for (const expDoc of allLinkedExpenses) {
      const exp = expDoc as any;
      let isOrphan = false;

      // Check client bill links
      if (exp.bill) {
        const bill = await Bill.findById(exp.bill);
        if (!bill) isOrphan = true;
      } else if (exp.invoiceNo && exp.invoiceNo.startsWith('INV-')) {
        const bill = await Bill.findOne({ invoiceNo: exp.invoiceNo });
        if (!bill) isOrphan = true;
      } else if (exp.reference && exp.reference.startsWith('INV-')) {
        const bill = await Bill.findOne({ invoiceNo: exp.reference });
        if (!bill) isOrphan = true;
      } else if (exp.title && /INV-\d+/i.test(exp.title)) {
        const match = exp.title.match(/INV-\d+/i);
        if (match) {
          const bill = await Bill.findOne({ invoiceNo: match[0].toUpperCase() });
          if (!bill) isOrphan = true;
        }
      }

      // Check supplier bill links
      if (exp.supplierBill) {
        const sb = await SupplierBill.findById(exp.supplierBill);
        if (!sb) isOrphan = true;
      }

      // Check Order links
      if (exp.reference && (exp.reference.startsWith('ORDER-') || exp.reference.startsWith('SHIPPING-') || exp.reference.startsWith('DELIVERY-'))) {
        const shortId = exp.reference.replace(/^(ORD(ER)?|SHIPPING|DELIVERY)-/i, '').trim().toUpperCase();
        if (!validOrderShortIds.has(shortId)) isOrphan = true;
      }

      if (isOrphan) {
        await Expense.findByIdAndDelete(exp._id);
        deletedCount++;
      }
    }

    // 9. Sync active bills, orders, and payables so all current AR & AP are in ledger
    await syncBillsToLedger();
    await syncOrdersToLedger();
    await syncPayablesToLedger();

    // 10. Recalculate all 4 ledger accounts
    await recalculateLedgerBalance('CASH');
    await recalculateLedgerBalance('BANK');
    await recalculateLedgerBalance('AR');
    await recalculateLedgerBalance('AP');

    return deletedCount;
  } catch (err) {
    console.error('[Ledger] Error auto-cleaning orphan transactions:', err);
    return 0;
  }
}

/**
 * Log payout received into the reseller's selected LedgerAccount and update its balance
 */
export async function logResellerPayoutDepositToAccount(payoutTx: any) {
  try {
    await connectToDatabase();
    const LedgerAccount = (await import('@/models/LedgerAccount')).default;
    const LedgerTransaction = (await import('@/models/LedgerTransaction')).default;

    let targetAccount = null;
    if (payoutTx.destinationAccountId) {
      targetAccount = await LedgerAccount.findOne({
        _id: payoutTx.destinationAccountId,
        resellerId: payoutTx.resellerId,
      });
    }

    if (!targetAccount && payoutTx.payoutReference) {
      // Fallback matching by account number or code
      targetAccount = await LedgerAccount.findOne({
        resellerId: payoutTx.resellerId,
        $or: [
          { accountNumber: payoutTx.payoutReference },
          { code: payoutTx.payoutReference },
          { mfsProvider: payoutTx.payoutMethod }
        ]
      });
    }

    if (!targetAccount) {
      // Fallback to reseller's Bank or CASH account
      targetAccount = await LedgerAccount.findOne({
        resellerId: payoutTx.resellerId,
        code: { $in: ['BANK', 'CASH'] }
      });
    }

    if (!targetAccount) {
      console.warn(`[Ledger] No ledger account found for reseller ${payoutTx.resellerId} to deposit payout.`);
      return;
    }

    const amount = Math.abs(payoutTx.amount || 0);
    const txIdStr = payoutTx._id.toString();
    const shortId = txIdStr.slice(-8).toUpperCase();
    const reference = `PAYOUT-REC-${shortId}`;

    // 1. Record LedgerTransaction and update connected account balance if not already present
    const exists = await LedgerTransaction.findOne({ reference, account: targetAccount._id });
    if (!exists) {
      // For asset accounts, debit increases balance
      const change = targetAccount.type === 'liability' ? -amount : amount;
      const balanceAfter = (targetAccount.currentBalance || 0) + change;

      const tx = new LedgerTransaction({
        account: targetAccount._id,
        resellerId: targetAccount.resellerId || payoutTx.resellerId,
        date: payoutTx.updatedAt ? new Date(payoutTx.updatedAt) : (payoutTx.createdAt ? new Date(payoutTx.createdAt) : new Date()),
        description: `Payout received from Mother Shop via ${payoutTx.payoutMethod || 'Mobile Banking'}${payoutTx.payoutReference ? ` (${payoutTx.payoutReference})` : ''}`,
        type: 'debit',
        amount,
        reference,
        balanceAfter,
      });

      await tx.save();

      targetAccount.currentBalance = balanceAfter;
      await targetAccount.save();

      // Recalculate running balances for this account
      await recalculateLedgerBalanceByAccountId(targetAccount._id);
      console.log(`[Ledger] Deposited ৳${amount} into reseller account ${targetAccount.name} (${targetAccount.code}). New balance: ৳${targetAccount.currentBalance}`);
    }

    // Settle Accounts Receivable (AR Credit) for this payout withdrawal
    const arAccount = await LedgerAccount.findOne({
      resellerId: targetAccount.resellerId || payoutTx.resellerId,
      code: 'AR'
    });
    if (arAccount) {
      const arRef = `PAYOUT-AR-${shortId}`;
      const arExists = await LedgerTransaction.findOne({ reference: arRef, account: arAccount._id });
      if (!arExists) {
        const arBalanceAfter = (arAccount.currentBalance || 0) - amount;
        const arTx = new LedgerTransaction({
          account: arAccount._id,
          resellerId: arAccount.resellerId,
          date: payoutTx.updatedAt ? new Date(payoutTx.updatedAt) : (payoutTx.createdAt ? new Date(payoutTx.createdAt) : new Date()),
          description: `Accounts receivable settled via Payout (${payoutTx.payoutMethod || 'Disbursed'}${payoutTx.payoutReference ? ` - ${payoutTx.payoutReference}` : ''})`,
          type: 'credit',
          amount,
          reference: arRef,
          balanceAfter: arBalanceAfter,
        });
        await arTx.save();
        arAccount.currentBalance = arBalanceAfter;
        await arAccount.save();
        await recalculateLedgerBalanceByAccountId(arAccount._id);
        console.log(`[Ledger] Settled ৳${amount} from AR for payout. New AR balance: ৳${arAccount.currentBalance}`);
      }
    }

    // 2. Automatically record/sync to Expense collection as Income for /reseller-dashboard/expenses-incomes
    const Expense = (await import('@/models/Expense')).default;
    const existingExpense = await Expense.findOne({ reference });
    const payoutDate = payoutTx.updatedAt ? new Date(payoutTx.updatedAt) : (payoutTx.createdAt ? new Date(payoutTx.createdAt) : new Date());
    const methodStr = payoutTx.payoutMethod || 'Payout';
    const expenseTitle = `Commission Withdrawal (${methodStr})`;
    const expenseDesc = `Reseller commission payout received via ${methodStr}${payoutTx.payoutReference ? ` (${payoutTx.payoutReference})` : ''}`;

    if (!existingExpense) {
      await Expense.create({
        title: expenseTitle,
        amount,
        category: 'Commission',
        type: 'income',
        paymentAccountId: targetAccount._id,
        resellerId: targetAccount.resellerId || payoutTx.resellerId,
        date: payoutDate,
        description: expenseDesc,
        reference,
      });
      console.log(`[Ledger] Recorded ৳${amount} payout income into reseller Expenses & Incomes.`);
    } else {
      let expChanged = false;
      if (Math.abs(existingExpense.amount - amount) > 0.01) {
        existingExpense.amount = amount;
        expChanged = true;
      }
      if (existingExpense.paymentAccountId?.toString() !== targetAccount._id.toString()) {
        existingExpense.paymentAccountId = targetAccount._id;
        expChanged = true;
      }
      if (existingExpense.type !== 'income') {
        existingExpense.type = 'income';
        expChanged = true;
      }
      if (expChanged) await existingExpense.save();
    }
  } catch (err) {
    console.error('[Ledger] Error depositing payout to reseller account:', err);
  }
}

/**
 * Synchronize all cleared reseller commission payouts to their connected accounts and Expenses & Incomes
 */
export async function syncResellerPayoutsToExpenses(resellerId?: any) {
  try {
    await connectToDatabase();
    const ResellerWalletTransaction = (await import('@/models/ResellerWalletTransaction')).default;
    const query: any = { type: 'payout_released', status: 'cleared' };
    if (resellerId) query.resellerId = resellerId;

    const clearedPayouts = await ResellerWalletTransaction.find(query).lean();
    for (const p of clearedPayouts) {
      await logResellerPayoutDepositToAccount(p);
    }
  } catch (err) {
    console.error('[Ledger] Error syncing reseller payouts to expenses:', err);
  }
}

/**
 * Sync reseller storefront and fulfillment orders to the reseller's individual ledger.
 * - When order is placed/confirmed: Creates Accounts Receivable (AR Debit) for commission or product payout.
 * - Order earnings remain in Accounts Receivable until the reseller submits a payout request and Mother Shop admin approves/disburses it.
 * - Payout release (logResellerPayoutDepositToAccount) handles moving funds from AR into the reseller's designated Bank/MFS account.
 */
export async function syncResellerOrdersToLedger(resellerId?: any) {
  try {
    await connectToDatabase();
    const ResellerOrder = (await import('@/models/ResellerOrder')).default;
    const LedgerAccount = (await import('@/models/LedgerAccount')).default;
    const LedgerTransaction = (await import('@/models/LedgerTransaction')).default;
    const Reseller = (await import('@/models/Reseller')).default;

    const resellerQuery: any = {};
    if (resellerId) resellerQuery._id = resellerId;

    const resellers = await Reseller.find(resellerQuery).select('_id storeName').lean();

    for (const r of resellers) {
      const rId = r._id;
      await seedResellerLedgerAccounts(rId);

      const [arAccount, bankAccount, cashAccount] = await Promise.all([
        LedgerAccount.findOne({ resellerId: rId, code: 'AR' }),
        LedgerAccount.findOne({ resellerId: rId, code: 'BANK' }),
        LedgerAccount.findOne({ resellerId: rId, code: 'CASH' }),
      ]);

      if (!arAccount) continue;

      // Ensure any legacy fake PAY-RO- and premature AR-RO- credit transactions are completely purged
      await LedgerTransaction.deleteMany({
        resellerId: rId,
        $or: [
          { reference: { $regex: '^PAY-RO-' } },
          { reference: { $regex: '^AR-RO-' }, type: 'credit' }
        ]
      });

      const ros = await ResellerOrder.find({
        resellerId: rId,
        status: { $ne: 'Cancelled' as any },
        deletedAt: null
      }).lean();

      for (const ro of ros) {
        if (!ro.shortId) continue;
        const amount = Number(ro.resellerCommission) || 0;
        if (amount <= 0) continue;

        const isFulfillment = ro.shortId.includes('-F');
        const orderRef = `AR-RO-${ro.shortId}`;
        const baseTime = (ro.createdAt ? new Date(ro.createdAt) : new Date()).getTime();
        const itemName = ro.items?.map((i: any) => i.name).join(', ') || 'Product';
        const receivableDesc = isFulfillment
          ? `Product Sales Receivable for Order #${ro.shortId} (${itemName})`
          : `Sales Commission Receivable for Order #${ro.shortId}`;

        // AR Debit entry (Receivable from platform)
        const arDebit = await LedgerTransaction.findOne({
          account: arAccount._id,
          resellerId: rId,
          reference: orderRef,
          type: 'debit'
        });

        if (!arDebit) {
          await LedgerTransaction.create({
            account: arAccount._id,
            resellerId: rId,
            date: new Date(baseTime),
            description: receivableDesc,
            type: 'debit',
            amount,
            reference: orderRef,
            balanceAfter: 0,
          });
        } else {
          let changed = false;
          if (Math.abs(arDebit.amount - amount) > 0.01) {
            arDebit.amount = amount;
            changed = true;
          }
          if (arDebit.description !== receivableDesc) {
            arDebit.description = receivableDesc;
            changed = true;
          }
          if (new Date(arDebit.date).getTime() !== baseTime) {
            arDebit.date = new Date(baseTime);
            changed = true;
          }
          if (changed) await arDebit.save();
        }
      }

      // Clean invalid / cancelled orders for this reseller
      const invalidRos = await ResellerOrder.find({
        resellerId: rId,
        $or: [{ status: 'Cancelled' as any }, { deletedAt: { $ne: null } }]
      }).select('shortId').lean();

      const invalidRefs = invalidRos.map(r => `AR-RO-${r.shortId}`);
      if (invalidRefs.length > 0) {
        await LedgerTransaction.deleteMany({
          resellerId: rId,
          reference: { $in: invalidRefs }
        });
      }

      // Sync courier return losses (Expenses & Accounts Payable) for this reseller
      await syncResellerCourierReturnLosses(rId);

      // Recalculate running balances for this reseller's accounts
      await recalculateLedgerBalanceByAccountId(arAccount._id);
      if (bankAccount) await recalculateLedgerBalanceByAccountId(bankAccount._id);
      if (cashAccount) await recalculateLedgerBalanceByAccountId(cashAccount._id);
    }
  } catch (err) {
    console.error('Error syncing reseller orders to ledger:', err);
  }
}

/**
 * Synchronize courier return delivery losses to reseller Expenses and Accounts Payable ledger
 */
export async function syncResellerCourierReturnLosses(resellerId?: any) {
  try {
    await connectToDatabase();
    const ResellerOrder = (await import('@/models/ResellerOrder')).default;
    const Reseller = (await import('@/models/Reseller')).default;
    const Expense = (await import('@/models/Expense')).default;
    const LedgerAccount = (await import('@/models/LedgerAccount')).default;
    const LedgerTransaction = (await import('@/models/LedgerTransaction')).default;

    const resellerQuery: any = {};
    if (resellerId) resellerQuery._id = resellerId;

    const resellers = await Reseller.find(resellerQuery).select('_id').lean();

    for (const r of resellers) {
      const rId = r._id;
      await seedResellerLedgerAccounts(rId);

      const apAccount = await LedgerAccount.findOne({ resellerId: rId, code: 'AP' });
      if (!apAccount) continue;

      // Find all ResellerOrders where courierReturnLossDeducted is true
      const lossOrders = await ResellerOrder.find({
        resellerId: rId,
        courierReturnLossDeducted: true,
        deletedAt: null,
      }).lean();

      const validOrderRefs = new Set<string>();

      for (const ro of lossOrders) {
        if (!ro.shortId) continue;
        const lossAmount = Number(ro.courierReturnLossAmount) || Number(ro.courierCharge) || Number(ro.deliveryCharge) || 120;
        if (lossAmount <= 0) continue;

        const ref = `RET-LOSS-${ro.shortId}`;
        const apRef = `AP-RET-LOSS-${ro.shortId}`;
        validOrderRefs.add(ro.shortId);

        const txDate = ro.updatedAt ? new Date(ro.updatedAt) : (ro.createdAt ? new Date(ro.createdAt) : new Date());

        // 1. Sync to Expense (for Expenses & Incomes page)
        const existingExp = await Expense.findOne({ resellerId: rId, reference: ref });
        if (!existingExp) {
          await Expense.create({
            title: `Courier Return Delivery Loss #${ro.shortId}`,
            amount: lossAmount,
            category: 'Courier & Shipping',
            type: 'expense',
            paymentAccountId: apAccount._id,
            resellerId: rId,
            date: txDate,
            description: `Courier return delivery loss for Cancelled Order #${ro.shortId}`,
            reference: ref,
          });
        } else {
          let expChanged = false;
          if (Math.abs(existingExp.amount - lossAmount) > 0.01) {
            existingExp.amount = lossAmount;
            expChanged = true;
          }
          if (existingExp.paymentAccountId?.toString() !== apAccount._id.toString()) {
            existingExp.paymentAccountId = apAccount._id;
            expChanged = true;
          }
          if (expChanged) await existingExp.save();
        }

        // 2. Sync to LedgerTransaction in Accounts Payable (for Ledger & Accounts pages)
        const apTx = await LedgerTransaction.findOne({
          account: apAccount._id,
          resellerId: rId,
          reference: apRef,
        });

        const apDesc = `Courier Return Delivery Loss Payable for Order #${ro.shortId}`;

        if (!apTx) {
          await LedgerTransaction.create({
            account: apAccount._id,
            resellerId: rId,
            date: txDate,
            description: apDesc,
            type: 'credit',
            amount: lossAmount,
            reference: apRef,
            balanceAfter: 0,
          });
        } else {
          let apChanged = false;
          if (Math.abs(apTx.amount - lossAmount) > 0.01) {
            apTx.amount = lossAmount;
            apChanged = true;
          }
          if (apTx.description !== apDesc) {
            apTx.description = apDesc;
            apChanged = true;
          }
          if (apChanged) await apTx.save();
        }
      }

      // Clean up any stale return loss entries that are no longer valid
      const staleExpenses = await Expense.find({
        resellerId: rId,
        reference: { $regex: '^RET-LOSS-' }
      }).lean();

      for (const se of staleExpenses) {
        const orderShortId = (se.reference || '').replace(/^RET-LOSS-/, '');
        if (!validOrderRefs.has(orderShortId)) {
          await Expense.findByIdAndDelete(se._id);
        }
      }

      const staleApTxs = await LedgerTransaction.find({
        resellerId: rId,
        reference: { $regex: '^AP-RET-LOSS-' }
      }).lean();

      for (const st of staleApTxs) {
        const orderShortId = (st.reference || '').replace(/^AP-RET-LOSS-/, '');
        if (!validOrderRefs.has(orderShortId)) {
          await LedgerTransaction.findByIdAndDelete(st._id);
        }
      }

      await recalculateLedgerBalanceByAccountId(apAccount._id);
    }
  } catch (err) {
    console.error('[Ledger] Error syncing reseller courier return losses:', err);
  }
}



import connectToDatabase from '@/lib/db';
import LedgerAccount from '@/models/LedgerAccount';
import LedgerTransaction from '@/models/LedgerTransaction';

/**
 * Seed primary ledger accounts if they do not exist
 */
export async function seedLedgerAccounts() {
  await connectToDatabase();

  // One-time migration: drop stale single-field unique index on 'code'
  try {
    await LedgerAccount.collection.dropIndex('code_1');
  } catch {
    // Index doesn't exist or already dropped — safe to ignore
  }

  const accounts: { name: string; code: 'CASH' | 'BANK' | 'AR' | 'AP'; type: 'asset' | 'liability'; category: 'Cash' | 'Bank' | 'Other' }[] = [
    { name: 'Cash', code: 'CASH', type: 'asset', category: 'Cash' },
    { name: 'Bank', code: 'BANK', type: 'asset', category: 'Bank' },
    { name: 'Accounts Receivable', code: 'AR', type: 'asset', category: 'Other' },
    { name: 'Accounts Payable', code: 'AP', type: 'liability', category: 'Other' },
  ];

  for (const acc of accounts) {
    await LedgerAccount.updateOne(
      { code: acc.code, resellerId: null },
      {
        $setOnInsert: {
          name: acc.name,
          code: acc.code,
          type: acc.type,
          category: acc.category,
          openingBalance: 0,
          currentBalance: 0,
        },
      },
      { upsert: true }
    );
  }
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
 * Recalculate ledger balance for an account
 */
export async function recalculateLedgerBalance(accountCode: 'CASH' | 'BANK' | 'AR' | 'AP') {
  await connectToDatabase();
  const account = await LedgerAccount.findOne({ code: accountCode });
  if (!account) return;

  const transactions = await LedgerTransaction.find({ account: account._id }).sort({ date: 1, createdAt: 1 });

  let runningBalance = account.openingBalance || 0;

  for (const tx of transactions) {
    const change = calculateTransactionChange(tx, account);
    runningBalance += change;
    tx.balanceAfter = runningBalance;
    await tx.save();
  }

  account.currentBalance = runningBalance;
  await account.save();
}

/**
 * Recalculate ledger balance for any account by its ObjectId
 */
export async function recalculateLedgerBalanceByAccountId(accountId: any) {
  if (!accountId) return;
  await connectToDatabase();
  const account = await LedgerAccount.findById(accountId);
  if (!account) return;

  const transactions = await LedgerTransaction.find({ account: account._id }).sort({ date: 1, createdAt: 1 });

  let runningBalance = account.openingBalance || 0;

  for (const tx of transactions) {
    const change = calculateTransactionChange(tx, account);
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
    
    const amount = Number(order.totalAmount) || 0;
    if (amount <= 0) return;

    const shortId = order.shortId || order._id.toString().slice(-8).toUpperCase();
    const method = (order.paymentMethod || '').toLowerCase().trim();
    const isOnline = ['online', 'sslcommerz', 'bkash', 'nagad', 'rocket', 'upay', 'stripe', 'card', 'bank', 'bank_transfer'].some(m => method.includes(m));
    const accountCode: 'BANK' | 'CASH' = isOnline ? 'BANK' : 'CASH';
    const reference = `ORDER-${shortId}`;
    
    // Ensure idempotency: check if transaction with this reference already exists
    const exists = await LedgerTransaction.findOne({ reference });
    if (!exists) {
      const description = `Customer payment received for Order #${shortId} (${order.paymentMethod || (isOnline ? 'Online' : 'COD')})`;

      await logLedgerTransaction(
        accountCode,
        'debit', // Debit increases Cash or Bank
        amount,
        description,
        reference,
        order.createdAt ? new Date(order.createdAt) : new Date()
      );
      console.log(`[Ledger] Logged payment for Order #${shortId} to ${accountCode} successfully.`);
    }

    // Clear AR receivable
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

    await recalculateLedgerBalance(accountCode);
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
export async function syncBillsToLedger() {
  try {
    await connectToDatabase();
    const Bill = (await import('@/models/Bill')).default;
    const LedgerAccount = (await import('@/models/LedgerAccount')).default;
    const arAccount = await LedgerAccount.findOne({ code: 'AR' });
    const cashAccount = await LedgerAccount.findOne({ code: 'CASH' });

    if (!arAccount || !cashAccount) return;

    const bills = await Bill.find({
      $or: [{ documentType: 'bill' }, { documentType: { $exists: false } }]
    });

    for (const bill of bills) {
      if (!bill.invoiceNo) continue;

      const billDate = bill.date ? new Date(bill.date) : (bill.createdAt ? new Date(bill.createdAt) : new Date());

      // 1. Check AR Debit entry for Bill Generated
      const billDebitExists = await LedgerTransaction.findOne({
        account: arAccount._id,
        reference: bill.invoiceNo,
        type: 'debit'
      });

      if (!billDebitExists && bill.gTotal > 0) {
        await logLedgerTransaction(
          'AR',
          'debit',
          bill.gTotal,
          `Bill Generated for ${bill.clientName || 'Client'}`,
          bill.invoiceNo,
          billDate
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
        const cashDebitExists = await LedgerTransaction.findOne({
          account: cashAccount._id,
          reference: bill.invoiceNo,
          type: 'debit'
        });

        if (!cashDebitExists) {
          await logLedgerTransaction(
            'CASH',
            'debit',
            bill.cashIn,
            `Cash Paid Upfront for Bill ${bill.invoiceNo}`,
            bill.invoiceNo,
            billDate
          );
        }

        const arCreditExists = await LedgerTransaction.findOne({
          account: arAccount._id,
          reference: bill.invoiceNo,
          type: 'credit'
        });

        if (!arCreditExists) {
          await logLedgerTransaction(
            'AR',
            'credit',
            bill.cashIn,
            `Upfront payment credit for Bill ${bill.invoiceNo}`,
            bill.invoiceNo,
            billDate
          );
        }
      }
    }

    await recalculateLedgerBalance('AR');
    await recalculateLedgerBalance('CASH');
  } catch (err) {
    console.error('[Ledger] Error syncing bills to ledger:', err);
  }
}

/**
/**
 * Sync active orders to ledger: ensures Order Receivable AR debit entries exist,
 * settled orders have their AR cleared, and collected payments are recorded in CASH or BANK.
 */
export async function syncOrdersToLedger() {
  try {
    await connectToDatabase();
    const Order = (await import('@/models/Order')).default;
    const LedgerAccount = (await import('@/models/LedgerAccount')).default;

    const [arAccount, cashAccount, bankAccount] = await Promise.all([
      LedgerAccount.findOne({
        code: 'AR',
        $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
      }),
      LedgerAccount.findOne({
        $and: [
          { $or: [{ category: 'Cash' }, { code: 'CASH' }] },
          { $or: [{ resellerId: null }, { resellerId: { $exists: false } }] }
        ]
      }),
      LedgerAccount.findOne({
        $and: [
          { $or: [{ category: 'Bank' }, { code: 'BANK' }] },
          { $or: [{ resellerId: null }, { resellerId: { $exists: false } }] }
        ]
      })
    ]);

    if (!arAccount) return;

    // 0. Auto-reconcile COD delivered orders: in COD e-commerce, Delivered means cash has been collected
    await Order.updateMany(
      { status: 'Delivered', paymentStatus: { $ne: 'Paid' }, deletedAt: null },
      { $set: { paymentStatus: 'Paid' } }
    );

    // Fetch active/valid orders
    const orders = await Order.find({
      status: { $in: ['Order Placed', 'Confirmed', 'Processing', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] },
      deletedAt: null
    }).lean();

    for (const order of orders) {
      if (!order.shortId) continue;

      const totalAmount = Number(order.totalAmount) || 0;
      if (totalAmount <= 0) continue;

      const orderRef = `ORD-${order.shortId}`;
      const payRef = `ORDER-${order.shortId}`;
      const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
      const customerName = order.shippingAddress?.fullName || 'Customer';
      const desc = `Customer Receivable for Order #${order.shortId} (${customerName})`;

      // 1. Ensure AR Debit entry exists (represents customer/courier receivable)
      const arDebit = await LedgerTransaction.findOne({
        account: arAccount._id,
        reference: orderRef,
        type: 'debit'
      });

      if (!arDebit) {
        await logLedgerTransaction('AR', 'debit', totalAmount, desc, orderRef, orderDate);
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
        if (new Date(arDebit.date).getTime() !== orderDate.getTime()) {
          arDebit.date = orderDate;
          changed = true;
        }
        if (changed) {
          await arDebit.save();
        }
      }

      // 2. Determine payment details
      const isPaid = order.paymentStatus === 'Paid' || order.status === 'Delivered';
      const method = (order.paymentMethod || '').toLowerCase().trim();
      const isOnline = ['online', 'sslcommerz', 'bkash', 'nagad', 'rocket', 'upay', 'stripe', 'card', 'bank', 'bank_transfer'].some(m => method.includes(m));
      const targetAccountCode: 'BANK' | 'CASH' = isOnline ? 'BANK' : 'CASH';
      const targetAccount = targetAccountCode === 'BANK' ? bankAccount : cashAccount;

      if (isPaid) {
        // 2a. Settle AR: ensure AR credit exists
        const arCredit = await LedgerTransaction.findOne({
          account: arAccount._id,
          reference: orderRef,
          type: 'credit'
        });

        if (!arCredit) {
          const clearDesc = `Customer Payment Received for Order #${order.shortId}`;
          await logLedgerTransaction('AR', 'credit', totalAmount, clearDesc, orderRef, order.updatedAt ? new Date(order.updatedAt) : new Date());
        } else if (Math.abs(arCredit.amount - totalAmount) > 0.01) {
          arCredit.amount = totalAmount;
          await arCredit.save();
        }

        // 2b. Record collection into CASH or BANK
        if (targetAccount) {
          const payTx = await LedgerTransaction.findOne({ reference: payRef });
          const payDesc = `Customer payment received for Order #${order.shortId} (${order.paymentMethod || (isOnline ? 'Online' : 'COD')})`;

          if (!payTx) {
            await logLedgerTransaction(targetAccountCode, 'debit', totalAmount, payDesc, payRef, order.createdAt ? new Date(order.createdAt) : new Date());
          } else {
            let changed = false;
            if (payTx.account.toString() !== targetAccount._id.toString()) {
              payTx.account = targetAccount._id;
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
            if (changed) {
              await payTx.save();
            }
          }
        }
      } else {
        // If order is not paid, remove any stale AR credit and payment entries
        await LedgerTransaction.deleteMany({
          account: arAccount._id,
          reference: orderRef,
          type: 'credit'
        });
        await LedgerTransaction.deleteMany({ reference: payRef });
      }
    }

    // 3. Clean AR & Payment transactions for cancelled/deleted orders
    const invalidOrders = await Order.find({
      $or: [{ status: 'Cancelled' }, { paymentStatus: 'Failed' }, { deletedAt: { $ne: null } }]
    } as any).select('shortId').lean();

    const invalidRefs = invalidOrders.map((o: any) => `ORD-${o.shortId}`).filter(Boolean);
    const invalidPayRefs = invalidOrders.map((o: any) => `ORDER-${o.shortId}`).filter(Boolean);
    if (invalidRefs.length > 0) {
      await LedgerTransaction.deleteMany({
        account: arAccount._id,
        reference: { $in: invalidRefs }
      });
    }
    if (invalidPayRefs.length > 0) {
      await LedgerTransaction.deleteMany({
        reference: { $in: invalidPayRefs }
      });
    }

    await recalculateLedgerBalance('CASH');
    await recalculateLedgerBalance('BANK');
    await recalculateLedgerBalance('AR');
  } catch (err) {
    console.error('[Ledger] Error syncing orders to ledger:', err);
  }
}

/**
 * Sync active supplier bills and reseller payables (commissions & product payouts) to AP in ledger.
 */
export async function syncPayablesToLedger() {
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

    // 1. Sync active reseller order liabilities
    const activeResellerOrders = await ResellerOrder.find({
      status: { $nin: ['Cancelled', 'Failed'] },
      deletedAt: null
    } as any).populate('resellerId', 'storeName').lean();

    for (const ro of activeResellerOrders) {
      if (!ro.shortId) continue;
      const commissionAmount = Number(ro.resellerCommission) || 0;
      if (commissionAmount <= 0) continue;

      const apRef = `AP-RO-${ro.shortId}`;
      const storeName = (ro.resellerId as any)?.storeName || 'Reseller';
      const orderDate = ro.createdAt ? new Date(ro.createdAt) : new Date();

      const isFulfillment = ro.shortId.includes('-F');
      const desc = isFulfillment
        ? `Product Payout Payable for Order #${ro.shortId} (${storeName})`
        : `Reseller Commission Payable for Order #${ro.shortId} (${storeName})`;

      const apCredit = await LedgerTransaction.findOne({
        account: apAccount._id,
        reference: apRef,
        type: 'credit'
      });

      if (!apCredit) {
        await logLedgerTransaction('AP', 'credit', commissionAmount, desc, apRef, orderDate);
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
    const dueSupplierBills = await SupplierBill.find({
      status: 'Due'
    }).populate('supplier', 'name companyName').lean();

    for (const sb of dueSupplierBills) {
      const billNo = (sb as any).billNo || sb._id.toString();
      const apRef = `AP-SB-${billNo}`;
      const dueAmount = Number((sb as any).dueAmount || (sb as any).totalAmount) || 0;
      if (dueAmount <= 0) continue;

      const supplierName = (sb as any).supplier?.companyName || (sb as any).supplier?.name || 'Supplier';
      const billDate = (sb as any).date ? new Date((sb as any).date) : new Date();
      const desc = `Supplier Bill Payable for ${supplierName} (${billNo})`;

      const apCredit = await LedgerTransaction.findOne({
        account: apAccount._id,
        reference: apRef,
        type: 'credit'
      });

      if (!apCredit) {
        await logLedgerTransaction('AP', 'credit', dueAmount, desc, apRef, billDate);
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

    // 3. Remove AP liabilities for cancelled orders
    const cancelledOrders = await ResellerOrder.find({
      $or: [{ status: 'Cancelled' }, { status: 'Failed' }, { deletedAt: { $ne: null } }]
    } as any).select('shortId').lean();

    const cancelledRefs = cancelledOrders.map((o: any) => `AP-RO-${o.shortId}`).filter(Boolean);
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
      Order.find({ deletedAt: null }, { _id: 1, shortId: 1 }).lean(),
      BusinessLoan.find({}, { loanId: 1 }).lean(),
      SupplierBill.find({}, { billNo: 1 }).lean(),
      ResellerWalletTransaction.find({ type: 'payout_released' }, { _id: 1 }).lean(),
      ResellerOrder.find({ status: { $nin: ['Cancelled', 'Failed'] }, deletedAt: null } as any, { shortId: 1 }).lean(),
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

      // 3. Check Order references (e.g. ORDER-XXXX or ORD-XXXX)
      if (tx.reference && (tx.reference.startsWith('ORDER-') || tx.reference.startsWith('ORD-'))) {
        const shortId = tx.reference.replace(/^ORD(ER)?-/i, '').trim().toUpperCase();
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

    const exists = await LedgerTransaction.findOne({ reference, account: targetAccount._id });
    if (exists) {
      console.log(`[Ledger] Reseller ledger entry already exists for reference: ${reference}`);
      return;
    }

    // For asset accounts, debit increases balance
    const change = targetAccount.type === 'liability' ? -amount : amount;
    const balanceAfter = (targetAccount.currentBalance || 0) + change;

    const tx = new LedgerTransaction({
      account: targetAccount._id,
      resellerId: targetAccount.resellerId || payoutTx.resellerId,
      date: payoutTx.updatedAt ? new Date(payoutTx.updatedAt) : new Date(),
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
  } catch (err) {
    console.error('[Ledger] Error depositing payout to reseller account:', err);
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import LedgerAccount from '@/models/LedgerAccount';
import LedgerTransaction from '@/models/LedgerTransaction';
import { seedLedgerAccounts, syncBillsToLedger, syncOrdersToLedger } from '@/lib/ledgerHelper';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Auto-sync bills and orders to ledger so receivables stay 100% reconciled
    try {
      await syncBillsToLedger();
      await syncOrdersToLedger();
    } catch (syncErr) {
      console.error('[Ledger Receivable API] Sync Error:', syncErr);
    }

    // Find Mother Shop AR Account
    let arAccount = await LedgerAccount.findOne({
      code: 'AR',
      $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
    }).lean();

    if (!arAccount) {
      await seedLedgerAccounts();
      arAccount = await LedgerAccount.findOne({
        code: 'AR',
        $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
      }).lean();
    }

    if (!arAccount) {
      return NextResponse.json({
        account: null,
        transactions: []
      });
    }

    // Fetch all AR ledger transactions matching the accounts transaction history modal
    const transactions = await LedgerTransaction.find({
      account: arAccount._id,
      $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
    })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      account: arAccount,
      transactions: transactions || []
    });
  } catch (error: any) {
    console.error('Error in /api/admin/ledger/receivable:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

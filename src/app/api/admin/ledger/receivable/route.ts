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
    const forceSync = req.nextUrl.searchParams.get('sync') === 'true';

    // Auto-sync bills and orders to ledger so receivables stay 100% reconciled
    try {
      await syncBillsToLedger(forceSync);
      await syncOrdersToLedger(forceSync);
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

    transactions.sort((a: any, b: any) => {
      const dateA = a.date ? new Date(a.date).toISOString().slice(0, 10) : '';
      const dateB = b.date ? new Date(b.date).toISOString().slice(0, 10) : '';
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : (a._id ? parseInt(a._id.toString().substring(0, 8), 16) * 1000 : 0);
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : (b._id ? parseInt(b._id.toString().substring(0, 8), 16) * 1000 : 0);
      return createdB - createdA;
    });

    return NextResponse.json({
      account: arAccount,
      transactions: transactions || []
    });
  } catch (error: any) {
    console.error('Error in /api/admin/ledger/receivable:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

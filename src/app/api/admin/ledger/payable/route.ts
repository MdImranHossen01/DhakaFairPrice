import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import LedgerAccount from '@/models/LedgerAccount';
import LedgerTransaction from '@/models/LedgerTransaction';
import { seedLedgerAccounts, syncPayablesToLedger } from '@/lib/ledgerHelper';

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

    // Auto-sync payables to ledger so payable transactions stay 100% reconciled
    try {
      await syncPayablesToLedger(forceSync);
    } catch (syncErr) {
      console.error('[Ledger Payable API] Sync Error:', syncErr);
    }

    // Find Mother Shop AP Account
    let apAccount = await LedgerAccount.findOne({
      code: 'AP',
      $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
    }).lean();

    if (!apAccount) {
      await seedLedgerAccounts();
      apAccount = await LedgerAccount.findOne({
        code: 'AP',
        $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
      }).lean();
    }

    if (!apAccount) {
      return NextResponse.json({
        account: null,
        transactions: []
      });
    }

    // Fetch all AP ledger transactions
    const transactions = await LedgerTransaction.find({
      account: apAccount._id,
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
      account: apAccount,
      transactions: transactions || []
    });
  } catch (error: any) {
    console.error('Error in /api/admin/ledger/payable:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

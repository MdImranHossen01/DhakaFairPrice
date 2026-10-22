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

    // Auto-sync payables to ledger so payable transactions stay 100% reconciled
    try {
      await syncPayablesToLedger();
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

    return NextResponse.json({
      account: apAccount,
      transactions: transactions || []
    });
  } catch (error: any) {
    console.error('Error in /api/admin/ledger/payable:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

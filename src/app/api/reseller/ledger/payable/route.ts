import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Reseller from '@/models/Reseller';
import LedgerAccount from '@/models/LedgerAccount';
import LedgerTransaction from '@/models/LedgerTransaction';
import { seedResellerLedgerAccounts, syncResellerOrdersToLedger } from '@/lib/ledgerHelper';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const reseller = await Reseller.findOne({ userId: session.user.id });
    if (!reseller) {
      return NextResponse.json({ message: 'Reseller profile not found' }, { status: 404 });
    }

    // Auto-sync orders and payouts to this reseller's ledger
    try {
      await seedResellerLedgerAccounts(reseller._id);
      await syncResellerOrdersToLedger(reseller._id);
      const { syncResellerPayoutsToExpenses } = await import('@/lib/ledgerHelper');
      await syncResellerPayoutsToExpenses(reseller._id);
    } catch (syncErr) {
      console.error('[Reseller Ledger Payable API] Sync Error:', syncErr);
    }

    // Find Reseller AP Account
    let apAccount = await LedgerAccount.findOne({
      resellerId: reseller._id,
      code: 'AP'
    }).lean();

    if (!apAccount) {
      await seedResellerLedgerAccounts(reseller._id);
      apAccount = await LedgerAccount.findOne({
        resellerId: reseller._id,
        code: 'AP'
      }).lean();
    }

    if (!apAccount) {
      return NextResponse.json({
        account: null,
        transactions: []
      });
    }

    // Fetch all AP ledger transactions for this reseller
    const transactions = await LedgerTransaction.find({
      account: apAccount._id,
      resellerId: reseller._id
    })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      account: apAccount,
      transactions: transactions || []
    });
  } catch (error: any) {
    console.error('Error in /api/reseller/ledger/payable:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

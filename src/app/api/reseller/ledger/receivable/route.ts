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

    // Auto-sync orders and payouts to this reseller's ledger so receivables stay 100% reconciled
    try {
      await seedResellerLedgerAccounts(reseller._id);
      await syncResellerOrdersToLedger(reseller._id);
      const { syncResellerPayoutsToExpenses } = await import('@/lib/ledgerHelper');
      await syncResellerPayoutsToExpenses(reseller._id);
    } catch (syncErr) {
      console.error('[Reseller Ledger Receivable API] Sync Error:', syncErr);
    }

    // Find Reseller AR Account
    let arAccount = await LedgerAccount.findOne({
      resellerId: reseller._id,
      code: 'AR'
    }).lean();

    if (!arAccount) {
      await seedResellerLedgerAccounts(reseller._id);
      arAccount = await LedgerAccount.findOne({
        resellerId: reseller._id,
        code: 'AR'
      }).lean();
    }

    if (!arAccount) {
      return NextResponse.json({
        account: null,
        transactions: []
      });
    }

    // Fetch all AR ledger transactions for this reseller matching the transaction history modal
    const transactions = await LedgerTransaction.find({
      account: arAccount._id,
      resellerId: reseller._id
    })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      account: arAccount,
      transactions: transactions || []
    });
  } catch (error: any) {
    console.error('Error in /api/reseller/ledger/receivable:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

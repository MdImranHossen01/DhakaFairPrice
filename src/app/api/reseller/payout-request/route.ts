import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import ResellerWalletTransaction from '@/models/ResellerWalletTransaction';

import LedgerAccount from '@/models/LedgerAccount';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { resellerId, accountId, method: legacyMethod, number: legacyNumber, amount } = body;

    if (!resellerId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    await dbConnect();

    // Verify reseller belongs to current user
    const reseller = await Reseller.findOne({ _id: resellerId, userId: (session.user as any).id });
    if (!reseller) {
      return NextResponse.json({ error: 'Reseller profile not found or forbidden' }, { status: 403 });
    }

    if (reseller.walletBalance < amount) {
      return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 });
    }

    let destinationAccountId: any = undefined;
    let method = legacyMethod;
    let number = legacyNumber;
    let accountDisplayName = '';

    if (accountId) {
      const selectedAccount = await LedgerAccount.findOne({
        _id: accountId,
        resellerId: reseller._id,
      });

      if (!selectedAccount) {
        return NextResponse.json({ error: 'Selected account not found in your connected accounts' }, { status: 400 });
      }

      if (selectedAccount.code === 'CASH' || selectedAccount.category === 'Cash') {
        return NextResponse.json({
          error: 'Cash in Hand অ্যাকাউন্টে পে-আউট পাঠানো সম্ভব নয়। অনুগ্রহ করে বিকাশ, নগদ বা ব্যাংক অ্যাকাউন্ট নির্বাচন করুন।'
        }, { status: 400 });
      }

      if (!selectedAccount.accountNumber || !selectedAccount.accountNumber.trim()) {
        return NextResponse.json({
          error: 'সিলেক্ট করা অ্যাকাউন্টের কোনো অ্যাকাউন্ট নম্বর নেই। অনুগ্রহ করে অ্যাকাউন্ট নম্বর সহ বিকাশ, নগদ বা ব্যাংক অ্যাকাউন্ট নির্বাচন করুন।'
        }, { status: 400 });
      }

      destinationAccountId = selectedAccount._id;
      method = selectedAccount.category === 'MFS'
        ? (selectedAccount.mfsProvider || selectedAccount.name)
        : (selectedAccount.category === 'Bank' ? (selectedAccount.bankName || selectedAccount.name) : selectedAccount.name);
      number = selectedAccount.accountNumber.trim();
      accountDisplayName = `${selectedAccount.name}${selectedAccount.accountNumber ? ` (${selectedAccount.accountNumber.trim()})` : ''}`;
    }

    if (!method || !number) {
      return NextResponse.json({
        error: 'Please select a valid connected account (bKash, Nagad, Rocket or Bank with account number) from your Accounts page.'
      }, { status: 400 });
    }

    const mongoose = (await import('mongoose')).default;
    const sessionConn = await mongoose.startSession();
    sessionConn.startTransaction();

    try {
      // Deduct from walletBalance immediately to prevent double spending / race condition
      const updatedReseller = await Reseller.findOneAndUpdate(
        { _id: resellerId, walletBalance: { $gte: amount } },
        { $inc: { walletBalance: -amount } },
        { new: true, session: sessionConn }
      );

      if (!updatedReseller) {
        await sessionConn.abortTransaction();
        sessionConn.endSession();
        return NextResponse.json({ error: 'Wallet balance mismatch or concurrency issue' }, { status: 400 });
      }

      // Record transaction
      const [transaction] = await ResellerWalletTransaction.create([{
        resellerId: reseller._id,
        type: 'payout_released', // Represents money going out of wallet (pending release approval)
        amount: -amount, // Debit
        description: `Payout request to ${accountDisplayName || `${method} (${number})`}`,
        status: 'pending',
        payoutMethod: method,
        payoutReference: number, // account number
        destinationAccountId,
        balanceAfter: updatedReseller.walletBalance,
      }], { session: sessionConn });

      await sessionConn.commitTransaction();
      sessionConn.endSession();

      // Dispatch Notifications to Admin & Reseller
      try {
        const { createAdminNotification, createNotification } = await import('@/lib/notifications');
        createAdminNotification({
          title: '💸 New Payout Request',
          message: `${reseller.storeName || 'Reseller'} requested a withdrawal of ৳${amount}.`,
          type: 'payout',
          link: '/admin/payouts',
          sendPush: true,
        }).catch(err => console.error('[Payout Admin Notif Error]', err));

        createNotification({
          userId: reseller.userId,
          resellerId: reseller._id,
          title: '💸 Payout Request Submitted',
          message: `Your withdrawal request of ৳${amount} has been submitted and is pending admin approval.`,
          type: 'payout',
          link: '/reseller/wallet',
          sendPush: false,
        }).catch(err => console.error('[Payout Reseller Log Error]', err));

        // Instant Telegram Alert for Reseller Payout Request
        try {
          const { sendTelegramPayoutNotification } = await import('@/lib/telegram');
          sendTelegramPayoutNotification({
            resellerStoreName: reseller.storeName || 'Reseller Store',
            resellerName: reseller.pickupAddress?.contactPerson || session.user.name || reseller.storeName,
            amount,
            payoutMethod: method,
            accountNumber: number,
            balanceAfter: updatedReseller.walletBalance,
          }).catch(err => console.error('[Payout Telegram Alert Error]', err));
        } catch (tgErr) {
          console.error('[Payout Telegram Alert Import Error]', tgErr);
        }

        // Send Reseller Payout Request Confirmation Email (non-blocking)
        try {
          const resellerEmail = reseller.contact?.email || session.user.email;
          if (resellerEmail) {
            const { sendResellerPayoutStatusEmail } = await import('@/lib/mail');
            sendResellerPayoutStatusEmail({
              email: resellerEmail,
              resellerName: reseller.pickupAddress?.contactPerson || session.user.name || reseller.storeName || 'Reseller',
              storeName: reseller.storeName || 'Reseller Store',
              amount,
              payoutMethod: method,
              accountNumber: number,
              status: 'requested',
              balanceAfter: updatedReseller.walletBalance,
            }).catch(err => console.error('[Payout Request Email Error]', err));
          }
        } catch (emailErr) {
          console.error('[Payout Request Email Import Error]', emailErr);
        }
      } catch (notifErr) {
        console.error('[Payout Notification Dispatch Error]', notifErr);
      }

      return NextResponse.json({
        success: true,
        message: 'Payout request submitted successfully',
        transactionId: transaction._id,
      });
    } catch (txnError) {
      await sessionConn.abortTransaction();
      sessionConn.endSession();
      throw txnError;
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

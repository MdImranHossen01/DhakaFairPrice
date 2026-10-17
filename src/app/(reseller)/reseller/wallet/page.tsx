'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Wallet, Loader2, ArrowDownCircle, Clock, TrendingUp, RefreshCcw, AlertCircle, Building2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ResellerWalletPage() {
  const [reseller, setReseller] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [rRes, tRes, aRes] = await Promise.all([
      fetch('/api/reseller/settings'),
      fetch('/api/reseller/wallet/transactions'),
      fetch('/api/reseller/accounts'),
    ]);

    if (rRes.ok) {
      const d = await rRes.json();
      setReseller(d.reseller);
      setPayoutAmount(d.reseller?.walletBalance || 0);
    }
    if (tRes.ok) {
      setTransactions((await tRes.json()).transactions || []);
    }
    if (aRes.ok) {
      const d = await aRes.json();
      // Filter only to valid payout receiving accounts (MFS, or Bank with an actual account number)
      // Exclude Cash in Hand, AP, AR, and placeholder Bank accounts without an account number
      const validAccounts = (d.accounts || []).filter((a: any) =>
        a.type !== 'liability' &&
        a.category !== 'Other' &&
        a.code !== 'AP' &&
        a.code !== 'AR' &&
        a.code !== 'CASH' &&
        a.category !== 'Cash' &&
        Boolean(a.accountNumber && a.accountNumber.trim())
      );
      setAccounts(validAccounts);
      if (validAccounts.length > 0) {
        setSelectedAccountId(prev => {
          if (prev && validAccounts.some((a: any) => a._id === prev)) return prev;
          const preferred = validAccounts.find((a: any) => a.category === 'MFS' || a.category === 'Bank') || validAccounts[0];
          return preferred._id;
        });
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const selectedAccount = accounts.find((a: any) => a._id === selectedAccountId);

  const submitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) {
      toast.error('Please select an account to receive your payout');
      return;
    }
    if (payoutAmount <= 0) {
      toast.error('Please enter a valid payout amount');
      return;
    }
    if (payoutAmount > (reseller?.walletBalance ?? 0)) {
      toast.error('Insufficient wallet balance');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/reseller/payout-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resellerId: reseller._id,
          accountId: selectedAccountId,
          amount: payoutAmount,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Payout request submitted successfully!');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to submit payout request');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit payout request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Wallet & Payouts</h2>
          <p className="text-xs md:text-sm text-muted-foreground">Track your earnings and request withdrawals</p>
        </div>
        <Button variant="outline" size="sm" className="h-9 self-start sm:self-auto" onClick={fetchData}><RefreshCcw className="h-4 w-4" /></Button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 md:gap-4">
        <Card className="border-green-500/20 bg-green-500/5 shadow-sm">
          <CardContent className="p-3.5 md:pt-6">
            <div className="flex items-center gap-3">
              <Wallet className="h-7 w-7 md:h-8 md:w-8 text-green-600 shrink-0" />
              <div>
                <p className="text-[11px] md:text-xs text-muted-foreground">Available Balance</p>
                <p className="text-xl md:text-2xl font-black text-green-600">৳{(reseller?.walletBalance ?? 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20 bg-yellow-500/5 shadow-sm">
          <CardContent className="p-3.5 md:pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-7 w-7 md:h-8 md:w-8 text-yellow-600 shrink-0" />
              <div>
                <p className="text-[11px] md:text-xs text-muted-foreground">Pending Commission</p>
                <p className="text-xl md:text-2xl font-black text-yellow-600">৳{(reseller?.pendingBalance ?? 0).toLocaleString()}</p>
                <p className="text-[10px] md:text-[11px] text-muted-foreground">Cleared after delivery</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3.5 md:pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-7 w-7 md:h-8 md:w-8 text-primary shrink-0" />
              <div>
                <p className="text-[11px] md:text-xs text-muted-foreground">Total Earnings</p>
                <p className="text-xl md:text-2xl font-black">৳{(reseller?.totalEarnings ?? 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Tabs defaultValue="transactions">
          <TabsList className="h-9">
            <TabsTrigger value="transactions" className="text-xs">Transaction History</TabsTrigger>
            <TabsTrigger value="payout" className="text-xs">Request Payout</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-3">
            <Card>
              <CardHeader className="p-3.5 md:p-6 pb-2 md:pb-2">
                <CardTitle className="text-xs md:text-sm">Transaction History</CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 md:p-6 pt-0 md:pt-0">
                {transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-xs md:text-sm">No transactions found</p>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((t: any) => (
                      <div key={t._id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b last:border-0 gap-2">
                        <div className="space-y-1">
                          <p className="text-xs md:text-sm font-medium">{t.description}</p>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] md:text-xs text-muted-foreground">
                            <span>{format(new Date(t.createdAt), 'dd MMM yyyy, hh:mm a')}</span>
                            {/* Admin Payment Details (Trx ID & Paid From Account) */}
                            {t.status === 'cleared' && (t.adminTrxId || t.payoutReference) && (
                              <span className="inline-flex items-center gap-1 font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-semibold border border-primary/20">
                                TrxID: {t.adminTrxId || t.payoutReference}
                              </span>
                            )}
                            {t.status === 'cleared' && t.adminAccountDetails && (
                              <span className="inline-flex items-center gap-1 bg-muted text-foreground px-1.5 py-0.5 rounded text-[10px] font-medium border border-border">
                                Paid From: {t.adminAccountDetails}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 sm:ml-2 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                          <p className={`font-bold text-xs md:text-sm ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {t.amount > 0 ? '+' : '-'}৳{Math.abs(t.amount).toLocaleString()}
                          </p>
                          <Badge 
                            variant={t.status === 'cleared' ? 'default' : t.status === 'failed' ? 'destructive' : 'outline'} 
                            className="text-[9px] md:text-[10px] px-1.5 py-0 capitalize"
                          >
                            {t.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payout" className="mt-3">
            <Card className="max-w-md">
              <CardHeader className="p-3.5 md:p-6">
                <CardTitle className="text-xs md:text-sm flex items-center gap-2">
                  <ArrowDownCircle className="h-4 w-4 text-primary" /> Payout Request
                </CardTitle>
                <CardDescription className="text-xs">Withdraw your available balance to your connected accounts</CardDescription>
              </CardHeader>
              <CardContent className="p-3.5 md:p-6 pt-0 md:pt-0">
                {(reseller?.walletBalance ?? 0) <= 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-xs md:text-sm">No withdrawable balance available</p>
                ) : accounts.length === 0 ? (
                  <div className="p-4 border rounded-lg bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs md:text-sm space-y-2.5">
                    <p className="font-semibold flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-amber-600" /> কোনো Payout রিসিভিং অ্যাকাউন্ট যুক্ত নেই
                    </p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Payout রিকোয়েস্ট করার জন্য অনুগ্রহ করে আপনার <strong>Ledger & Accounting → All Accounts</strong> পেজ থেকে আপনার বিকাশ (bKash), নগদ (Nagad), রকেট (Rocket) অথবা ব্যাংক অ্যাকাউন্ট (সঠিক অ্যাকাউন্ট নম্বর সহ) যুক্ত করুন। Cash in Hand অ্যাকাউন্টে Payout নেওয়া সম্ভব নয়।
                    </p>
                    <Button asChild size="sm" className="w-full text-xs mt-1">
                      <Link href="/reseller-dashboard/accounts">অ্যাকাউন্ট যুক্ত করতে যান</Link>
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={submitPayout} className="space-y-3.5 md:space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Select Receiving Account</Label>
                        <Link href="/reseller-dashboard/accounts" className="text-[11px] text-primary hover:underline flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> Manage Accounts
                        </Link>
                      </div>
                      <select
                        value={selectedAccountId}
                        onChange={e => setSelectedAccountId(e.target.value)}
                        className="w-full h-10 border rounded-lg px-3 text-xs md:text-sm bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                        required
                      >
                        {accounts.map((acc: any) => {
                          const details = acc.accountNumber
                            ? `${acc.accountNumber}${acc.mfsType ? ` (${acc.mfsType})` : ''}`
                            : (acc.bankAccountType ? `${acc.bankAccountType} Account` : acc.code);
                          return (
                            <option key={acc._id} value={acc._id}>
                              {acc.name} — {details} (Balance: ৳{(acc.currentBalance || 0).toLocaleString()})
                            </option>
                          );
                        })}
                      </select>

                      {selectedAccount && (
                        <div className="p-2.5 rounded-lg border bg-muted/40 text-[11px] flex items-center justify-between mt-1">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{selectedAccount.name}</span>
                            <span className="text-muted-foreground font-mono">
                              {selectedAccount.accountNumber ? `A/C: ${selectedAccount.accountNumber}` : selectedAccount.code}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-muted-foreground block">Account Balance</span>
                            <span className="font-bold text-emerald-600 font-mono">
                              ৳{(selectedAccount.currentBalance || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs">Payout Amount</Label>
                        <span className="text-[11px] text-muted-foreground">
                          Max: ৳{(reseller?.walletBalance ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <Input
                        className="h-9 text-xs md:text-sm font-mono"
                        type="number"
                        min="1"
                        max={reseller?.walletBalance}
                        value={payoutAmount || ''}
                        onChange={e => setPayoutAmount(Number(e.target.value))}
                        placeholder="Amount in ৳"
                        required
                      />
                    </div>

                    <Button type="submit" disabled={submitting || !selectedAccountId} className="w-full h-9 text-xs">
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Request Payout
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Printer, RefreshCw, ArrowLeft, Wallet, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { fmt, fmtDate } from '@/components/admin/reports/utils';

export default function ResellerPayoutsReportPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        type: typeFilter,
        status: statusFilter,
        ...(dateRange.from && { from: dateRange.from }),
        ...(dateRange.to && { to: dateRange.to }),
      });
      const res = await fetch(`/api/reseller/reports/payouts?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTransactions(json.transactions || []);
        setWalletInfo(json.walletInfo || null);
        setTotalPages(json.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch payouts report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [typeFilter, statusFilter, dateRange.from, dateRange.to]);

  useEffect(() => {
    fetchPayouts();
  }, [page, typeFilter, statusFilter, dateRange]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 space-y-4 md:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/reseller/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">Payout & Earnings Report</h1>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Track your wallet ledger statement, commission credits, payout requests and withdrawal transactions.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/reseller/expenses-incomes">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
              Expenses & Incomes
            </Button>
          </Link>
          <Link href="/reseller/ledger">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
              Ledger
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={fetchPayouts} disabled={loading} className="h-9 px-2.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>

          <Button variant="default" size="sm" onClick={handlePrint} className="h-9 gap-1 font-semibold px-3">
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </Button>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h2 className="text-2xl font-bold uppercase tracking-wider">Store Reseller Portal</h2>
        <h3 className="text-lg font-semibold text-slate-700">Wallet & Payout Statement</h3>
        <p className="text-xs text-slate-500">Generated on {new Date().toLocaleDateString('en-GB')}</p>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={typeFilter} onValueChange={(val) => val && setTypeFilter(val)}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="Transaction Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Types</SelectItem>
              <SelectItem value="commission_earned" className="text-xs">Commission Earned</SelectItem>
              <SelectItem value="payout_released" className="text-xs">Payout Released</SelectItem>
              <SelectItem value="adjustment" className="text-xs">Adjustment</SelectItem>
              <SelectItem value="order_cancelled" className="text-xs">Cancelled Reversal</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="cleared" className="text-xs">Cleared</SelectItem>
              <SelectItem value="pending" className="text-xs">Pending</SelectItem>
              <SelectItem value="failed" className="text-xs">Failed</SelectItem>
              <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            className="w-[130px] h-9 text-xs"
            placeholder="From Date"
          />
          <span className="text-xs text-muted-foreground">-</span>
          <Input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className="w-[130px] h-9 text-xs"
            placeholder="To Date"
          />
        </div>
      </div>

      {/* Table Card */}
      <Card className="shadow-xs overflow-hidden print:border-none print:shadow-none">
        <CardHeader className="bg-muted/40 py-2.5 px-3 sm:px-4 border-b flex flex-row items-center justify-between print:hidden">
          <CardTitle className="text-xs sm:text-sm md:text-base font-bold flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" /> Wallet Ledger Entries
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {transactions.length} Records
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Related Order</th>
                  <th className="py-2.5 px-3">Payout Details</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right font-bold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading wallet ledger...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      No wallet transactions recorded.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => {
                    const isCredit = t.type === 'commission_earned' || t.amount > 0;
                    return (
                      <tr key={t._id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                          {fmtDate(t.createdAt)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 font-semibold">
                            {isCredit ? (
                              <ArrowDownRight className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <ArrowUpRight className="h-3.5 w-3.5 text-rose-500" />
                            )}
                            {t.type === 'commission_earned'
                              ? 'Commission'
                              : t.type === 'payout_released'
                              ? 'Payout'
                              : t.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 max-w-[240px] truncate" title={t.description}>
                          {t.description}
                        </td>
                        <td className="py-2.5 px-3">
                          {t.orderId?.shortId ? (
                            <span className="font-semibold text-primary">{t.orderId.shortId}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          <div className="space-y-0.5">
                            {t.payoutMethod ? <span className="font-medium text-foreground">{t.payoutMethod}</span> : '-'}
                            {t.status === 'cleared' && (t.adminTrxId || t.payoutReference) && (
                              <div className="text-[10px] font-mono text-primary font-semibold">
                                TrxID: {t.adminTrxId || t.payoutReference}
                              </div>
                            )}
                            {t.status === 'cleared' && t.adminAccountDetails && (
                              <div className="text-[10px] text-muted-foreground">
                                From: {t.adminAccountDetails}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge
                            variant={t.status === 'cleared' ? 'default' : 'secondary'}
                            className="text-[10px] font-semibold capitalize"
                          >
                            {t.status}
                          </Badge>
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold ${
                            isCredit ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isCredit ? `+${fmt(t.amount)}` : `-${fmt(Math.abs(t.amount))}`}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-3 print:hidden">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="h-8 text-xs"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="h-8 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

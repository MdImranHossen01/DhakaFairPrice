'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Printer, RefreshCw, ArrowLeft, ArrowUpRight, ArrowDownLeft, Search, CheckCircle2, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ReportCard, ReportRow } from '@/components/admin/reports/ReportCard';
import { fmt, fmtDate } from '@/components/admin/reports/utils';

export default function ResellerCommissionReportPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [resellers, setResellers] = useState<any[]>([]);
  const [selectedReseller, setSelectedReseller] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(selectedReseller !== 'all' && { resellerId: selectedReseller }),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(dateRange.from && { from: dateRange.from }),
        ...(dateRange.to && { to: dateRange.to })
      });
      const res = await fetch(`/api/admin/reports/reseller-commission?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTransactions(json.transactions || []);
        if (json.resellers) {
          setResellers(json.resellers);
        }
      }
    } catch (error) {
      console.error('Failed to fetch reseller commission report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [selectedReseller, debouncedSearch, dateRange]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 space-y-4 md:space-y-6 px-0 py-2 md:p-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">Reseller Commission Statement</h1>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Detailed ledger of reseller commissions credited, payouts/withdrawals and wallet status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTransactions} disabled={loading} className="h-9 px-2.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>

          <Button variant="default" size="sm" onClick={handlePrint} className="h-9 gap-1 font-semibold px-3">
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between print:hidden">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search description, trx id, note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <Select value={selectedReseller} onValueChange={(val) => setSelectedReseller(val || 'all')}>
            <SelectTrigger className="w-full sm:w-48 h-9 text-xs">
              <SelectValue placeholder="All Reseller Stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Reseller Stores</SelectItem>
              {resellers.map((r: any) => (
                <SelectItem key={r._id} value={r._id} className="text-xs">
                  {r.storeName} ({r.subdomain})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            className="h-9 text-xs w-36"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            className="h-9 text-xs w-36"
          />
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block text-center border-b pb-4 mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-wider">Swapnobaz E-Commerce</h2>
        <h3 className="text-lg font-semibold text-slate-700">Reseller Commission & Payout Statement</h3>
      </div>

      {/* Report Table Card */}
      <Card className="shadow-xs overflow-hidden print:border-none print:shadow-none">
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs md:text-sm text-center border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b text-muted-foreground font-semibold">
                  <th className="p-2.5 text-left font-bold text-foreground">Date</th>
                  <th className="p-2.5 text-left font-bold text-foreground">Reseller Store</th>
                  <th className="p-2.5 text-left font-bold text-foreground">Description</th>
                  <th className="p-2.5 font-bold text-foreground">Status</th>
                  <th className="p-2.5 font-bold text-emerald-600">Credit (+Commission)</th>
                  <th className="p-2.5 font-bold text-rose-600">Debit (-Withdrawal)</th>
                  <th className="p-2.5 font-bold text-primary text-right">Wallet Balance</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading commission records...</span>
                      </div>
                    </td>
                  </tr>
                ) : transactions.length > 0 ? (
                  transactions.map((tx: any) => (
                    <tr key={tx._id} className="border-b border-muted/30 hover:bg-muted/30 transition-colors">
                      <td className="p-2.5 text-left text-muted-foreground font-mono text-xs">
                        {fmtDate(tx.date)}
                      </td>
                      <td className="p-2.5 text-left">
                        <div className="font-bold text-foreground">{tx.storeName}</div>
                        <div className="text-[11px] text-muted-foreground">{tx.resellerName}</div>
                      </td>
                      <td className="p-2.5 text-left text-foreground">
                        <div className="font-medium text-xs">{tx.description}</div>
                        {tx.payoutReference && (
                          <div className="text-[11px] text-muted-foreground font-mono">Ref: {tx.payoutReference}</div>
                        )}
                      </td>
                      <td className="p-2.5">
                        {tx.status === 'cleared' ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                            <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> Cleared
                          </Badge>
                        ) : tx.status === 'pending' ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold">
                            <Clock className="h-3 w-3 mr-1 text-amber-600" /> Pending
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-semibold">
                            <XCircle className="h-3 w-3 mr-1 text-rose-600" /> {tx.status}
                          </Badge>
                        )}
                      </td>
                      <td className="p-2.5 font-bold text-emerald-600">
                        {tx.type === 'credit' ? `+${fmt(tx.amount)}` : '-'}
                      </td>
                      <td className="p-2.5 font-bold text-rose-600">
                        {tx.type === 'debit' ? `-${fmt(tx.amount)}` : '-'}
                      </td>
                      <td className="p-2.5 font-bold text-right text-primary">
                        {fmt(tx.currentWallet || 0)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">No commission transactions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="block md:hidden p-2 space-y-2.5">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                <span>Loading commission records...</span>
              </div>
            ) : transactions.length > 0 ? (
              transactions.map((tx: any) => (
                <ReportCard
                  key={tx._id}
                  title={tx.storeName || tx.resellerName || 'Reseller'}
                  badge={
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                      tx.type === 'credit' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {tx.type === 'credit' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                      {tx.type === 'credit' ? 'Commission' : 'Payout'}
                    </span>
                  }
                  footer={
                    <div className="flex items-center justify-between w-full font-bold text-xs">
                      <span className="text-muted-foreground">Reseller Wallet:</span>
                      <span className="text-primary text-sm">{fmt(tx.currentWallet || 0)}</span>
                    </div>
                  }
                >
                  <ReportRow label="Date" value={fmtDate(tx.date)} />
                  <ReportRow label="Reseller" value={`${tx.storeName} (${tx.resellerName})`} />
                  {tx.description && <ReportRow label="Description" value={<span className="text-xs text-muted-foreground">{tx.description}</span>} />}
                  <ReportRow 
                    label="Status" 
                    value={
                      <span className={`font-semibold text-xs ${tx.status === 'cleared' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {tx.status}
                      </span>
                    } 
                  />
                  <ReportRow 
                    label="Transaction Amount" 
                    value={
                      <span className={`font-bold ${tx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'credit' ? `+${fmt(tx.amount)}` : `-${fmt(tx.amount)}`}
                      </span>
                    } 
                  />
                </ReportCard>
              ))
            ) : (
              <div className="p-6 text-center text-muted-foreground text-xs">
                No commission transactions found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

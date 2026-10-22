'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Loader2, 
  RefreshCw, 
  Search,
  FileText,
  History,
  TrendingDown,
  X
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ResellerPayablePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const fetchPayables = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reseller/ledger/payable');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast.error('Failed to load accounts payable transactions');
      }
    } catch (error) {
      console.error('Failed to fetch reseller payable transactions:', error);
      toast.error('Failed to load accounts payable transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayables();
  }, []);

  const account = data?.account;
  const transactions: any[] = data?.transactions || [];

  const filteredTransactions = useMemo(() => {
    if (!searchTerm.trim()) return transactions;
    const term = searchTerm.toLowerCase().trim();
    return transactions.filter((tx) => {
      const desc = (tx.description || '').toLowerCase();
      const ref = (tx.reference || '').toLowerCase();
      const dateStr = tx.date ? format(new Date(tx.date), 'dd MMM yyyy').toLowerCase() : '';
      return desc.includes(term) || ref.includes(term) || dateStr.includes(term);
    });
  }, [transactions, searchTerm]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const liveBalance = account?.currentBalance ?? 0;

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Link href="/reseller/ledger">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
              <History className="h-6 w-6 text-rose-600" />
              <span>Accounts Payable — Transaction History</span>
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Account Code: <span className="font-mono font-bold text-foreground">AP</span> • Type: <span className="font-medium text-foreground">Liability</span> • Category: <span className="font-medium text-foreground">{account?.category || 'Payable'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl px-4 py-2 text-right shadow-xs">
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1 justify-end">
              <TrendingDown className="h-3 w-3 text-rose-600" />
              <span>Live Balance</span>
            </div>
            <div className="text-xl md:text-2xl font-black text-rose-600 dark:text-rose-400">
              ৳{Math.round(liveBalance).toLocaleString()}
            </div>
          </div>

          <Button variant="outline" size="icon" onClick={fetchPayables} disabled={loading} className="h-10 w-10 shrink-0">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search this account's transactions / ref / date..."
            className="pl-9 pr-9 h-10 text-xs bg-card"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {account?._id && (
          <Button asChild variant="outline" size="sm" className="h-10 text-xs gap-1.5 shrink-0 font-medium">
            <Link href={`/reseller/ledger?accountId=${account._id}&accountName=${encodeURIComponent(account.name || 'Accounts Payable')}`}>
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>Open in Full Ledger</span>
            </Link>
          </Button>
        )}
      </div>

      {/* Transactions Table Card */}
      <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Debit</th>
                <th className="py-3 px-4 text-right">Credit</th>
                <th className="py-3 px-4 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={5} className="h-48 text-center">
                    <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground mt-2 font-medium">Loading transactions...</p>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="h-40 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-40 stroke-1" />
                    <p className="font-medium text-xs">No transaction records found for Accounts Payable.</p>
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx: any) => (
                  <tr key={tx._id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-muted-foreground font-medium">
                      {tx.date ? format(new Date(tx.date), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground text-xs leading-snug">{tx.description}</div>
                      {tx.reference && (
                        <span className="text-[10px] text-muted-foreground bg-muted/80 px-2 py-0.5 rounded font-mono inline-block mt-1 border">
                          Ref: {tx.reference}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-primary whitespace-nowrap font-mono text-sm">
                      {tx.type === 'debit' ? `৳${Math.round(tx.amount || 0).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-foreground whitespace-nowrap font-mono text-sm">
                      {tx.type === 'credit' ? `৳${Math.round(tx.amount || 0).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-foreground whitespace-nowrap font-mono text-sm">
                      ৳{Math.round(tx.balanceAfter || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            Total <strong className="text-foreground">{filteredTransactions.length}</strong> transaction{filteredTransactions.length === 1 ? '' : 's'} recorded
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                Previous
              </Button>
              <span className="px-2 text-xs font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

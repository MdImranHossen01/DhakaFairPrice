'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2,
  Search,
  Wallet,
  RefreshCw,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/pagination';
import { cleanAccountName } from '@/lib/utils';
import { MobileDataCard, MobileDataRow } from '@/components/common/MobileDataCard';

function getTransactionTypeInfo(tx: any) {
  const desc = (tx.description || '').toLowerCase();

  // Deductions: expense, withdrawal, transfer to another account, bill payment credit from receivable, payout to reseller, loan repayment, supplier payment
  const isDeduction =
    desc.startsWith('expense') ||
    desc.startsWith('manual withdrawal') ||
    desc.startsWith('transfer to') ||
    desc.startsWith('payment credit for bill') ||
    desc.startsWith('upfront payment credit') ||
    desc.includes('payout to') ||
    desc.includes('commission payout') ||
    desc.includes('loan repayment') ||
    desc.startsWith('reseller commission payout') ||
    desc.startsWith('supplier payment') ||
    desc.includes('paid to');

  // Additions: income, opening balance, deposit, loan inflow, transfer from another account, bill payment received into cash/bank, payout received
  const isAddition =
    desc.startsWith('income') ||
    desc.startsWith('opening balance') ||
    desc.startsWith('manual deposit') ||
    desc.startsWith('transfer from') ||
    desc.startsWith('business loan inflow') ||
    desc.startsWith('payment received') ||
    desc.startsWith('payout received') ||
    desc.includes('payout received') ||
    desc.startsWith('cash paid upfront') ||
    desc.startsWith('bill generated');

  if (isAddition) {
    return {
      label: 'Credit (+)',
      sign: '+',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
      textColor: 'text-emerald-600 dark:text-emerald-400',
    };
  }

  if (isDeduction) {
    return {
      label: 'Debit (-)',
      sign: '-',
      color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
      textColor: 'text-rose-600 dark:text-rose-400',
    };
  }

  // Fallback: for asset accounts (Cash, Bank, MFS), credit decreases balance (outflow/debit)
  const isAccountLiability = tx.account?.type === 'liability' || tx.account?.code === 'AP' || tx.account?.code === 'AR';
  const isOutflow = isAccountLiability ? tx.type === 'debit' : tx.type === 'credit';

  if (isOutflow) {
    return {
      label: 'Debit (-)',
      sign: '-',
      color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
      textColor: 'text-rose-600 dark:text-rose-400',
    };
  }

  return {
    label: 'Credit (+)',
    sign: '+',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  };
}

function ResellerLedgerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const initialSearch = searchParams.get('search') || searchParams.get('accountName') || '';
  const initialAccountId = searchParams.get('accountId') || 'all';

  const [journalSearchTerm, setJournalSearchTerm] = useState(initialSearch);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(initialAccountId);
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });

  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const [currentPage, setCurrentPage] = useState(initialPage);

  const fetchLedgerData = async () => {
    setLoading(true);
    try {
      const [accRes, txRes] = await Promise.all([
        fetch('/api/reseller/accounts'),
        fetch('/api/reseller/ledger/transactions')
      ]);

      if (accRes.ok) {
        const accData = await accRes.json();
        setAccounts(accData.accounts || []);
      }

      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData || []);
      }
    } catch (error) {
      console.error('Failed to fetch ledger:', error);
      toast.error('Failed to load ledger records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgerData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    } else {
      params.delete('page');
    }
    if (journalSearchTerm) {
      params.set('search', journalSearchTerm);
    } else {
      params.delete('search');
    }
    if (selectedAccountId && selectedAccountId !== 'all') {
      params.set('accountId', selectedAccountId);
    } else {
      params.delete('accountId');
    }
    router.push(`/reseller/ledger?${params.toString()}`);
  }, [currentPage, journalSearchTerm, selectedAccountId, dateFilter.from, dateFilter.to]);

  useEffect(() => {
    setCurrentPage(1);
  }, [journalSearchTerm, dateFilter.from, dateFilter.to, selectedAccountId]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Account filter
      if (selectedAccountId !== 'all') {
        const accId = tx.account?._id?.toString() || tx.account?.toString();
        if (accId !== selectedAccountId) return false;
      }

      // Date filter
      if (dateFilter.from) {
        if (new Date(tx.date) < new Date(dateFilter.from + 'T00:00:00')) return false;
      }
      if (dateFilter.to) {
        if (new Date(tx.date) > new Date(dateFilter.to + 'T23:59:59')) return false;
      }

      // Search term
      if (journalSearchTerm.trim()) {
        const term = journalSearchTerm.toLowerCase();
        const desc = tx.description?.toLowerCase() || '';
        const accName = tx.account?.name?.toLowerCase() || '';
        const ref = tx.reference?.toLowerCase() || '';
        return desc.includes(term) || accName.includes(term) || ref.includes(term);
      }

      return true;
    });
  }, [transactions, selectedAccountId, dateFilter, journalSearchTerm]);

  const totalBalance = accounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);

  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3">
        <div>
          <h2 className="text-xl md:text-3xl font-bold tracking-tight">Accounts Ledger</h2>
          <p className="text-muted-foreground text-xs md:text-sm mt-0.5">
            Track and review transaction journal entries across all accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={fetchLedgerData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Account Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-primary/20 bg-primary/5 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <p className="text-xs text-muted-foreground font-medium">All Accounts Balance</p>
            </div>
            <p className="text-2xl font-black text-foreground mt-1">৳{totalBalance.toLocaleString()}</p>
          </CardContent>
        </Card>

        {accounts.map((acc) => (
          <Card key={acc._id} className="shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium truncate">{cleanAccountName(acc.name)}</p>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0">{acc.code}</Badge>
              </div>
              <p className="text-xl font-black text-foreground mt-1">৳{(acc.currentBalance || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transactions Journal */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="p-3 md:p-4 bg-muted/20 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <CardTitle className="text-sm md:text-base font-bold">Transaction Journal</CardTitle>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 sm:w-60 md:w-72">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search description / ref..."
                  className="pl-8 h-8 text-xs"
                  value={journalSearchTerm}
                  onChange={(e) => { setJournalSearchTerm(e.target.value); setCurrentPage(1); }}
                />
              </div>

              <Select
                value={selectedAccountId}
                onValueChange={(val) => { if (val) setSelectedAccountId(val); setCurrentPage(1); }}
              >
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Accounts</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a._id} value={a._id} className="text-xs">
                      {cleanAccountName(a.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-md border text-xs">
                <Input
                  type="date"
                  className="h-7 w-28 border-none bg-transparent focus-visible:ring-0 text-xs px-1"
                  value={dateFilter.from}
                  onChange={(e) => { setDateFilter(prev => ({ ...prev, from: e.target.value })); setCurrentPage(1); }}
                />
                <span className="text-muted-foreground text-[10px]">to</span>
                <Input
                  type="date"
                  className="h-7 w-28 border-none bg-transparent focus-visible:ring-0 text-xs px-1"
                  value={dateFilter.to}
                  onChange={(e) => { setDateFilter(prev => ({ ...prev, to: e.target.value })); setCurrentPage(1); }}
                />
              </div>

              {(dateFilter.from || dateFilter.to || journalSearchTerm || selectedAccountId !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateFilter({ from: '', to: '' });
                    setJournalSearchTerm('');
                    setSelectedAccountId('all');
                    setCurrentPage(1);
                  }}
                  className="text-xs text-muted-foreground hover:text-primary h-7 px-2"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-muted-foreground text-xs">
              <Plus className="h-8 w-8 mb-2 stroke-1" />
              <p>No journal entries found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[110px] whitespace-nowrap">Date</TableHead>
                      <TableHead className="w-[150px] whitespace-nowrap">Account</TableHead>
                      <TableHead className="max-w-[300px]">Description</TableHead>
                      <TableHead className="text-right w-[120px] whitespace-nowrap text-rose-600 font-bold">Debit (-)</TableHead>
                      <TableHead className="text-right w-[120px] whitespace-nowrap text-emerald-600 font-bold">Credit (+)</TableHead>
                      <TableHead className="text-right w-[150px] whitespace-nowrap">Running Balance (৳)</TableHead>
                      <TableHead className="text-right w-[80px] whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.map((tx) => {
                      const txInfo = getTransactionTypeInfo(tx);
                      return (
                        <TableRow key={tx._id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                            {tx.date ? format(new Date(tx.date), 'dd MMM yyyy') : '-'}
                          </TableCell>
                          <TableCell className="font-semibold whitespace-nowrap text-xs">
                            <Badge variant="outline" className="text-[10px]">
                              {cleanAccountName(tx.account?.name) || 'Account'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[280px] md:max-w-[340px] whitespace-normal break-words py-2.5">
                            <div className="space-y-1">
                              <p className="leading-snug text-xs md:text-sm text-foreground">{tx.description}</p>
                              {tx.reference && (
                                <span className="inline-block text-[10px] text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded font-mono">
                                  Ref: {tx.reference}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold whitespace-nowrap text-xs md:text-sm text-rose-600">
                            {txInfo.sign === '-' ? `-৳${Math.round(tx.amount || 0).toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-bold whitespace-nowrap text-xs md:text-sm text-emerald-600">
                            {txInfo.sign === '+' ? `+৳${Math.round(tx.amount || 0).toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-bold whitespace-nowrap text-xs md:text-sm">
                            ৳{Math.round(tx.balanceAfter || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <span className="text-xs text-muted-foreground">—</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List */}
              <div className="block md:hidden p-2 space-y-2.5">
                {paginatedTransactions.map((tx) => {
                  const txInfo = getTransactionTypeInfo(tx);
                  return (
                    <MobileDataCard
                      key={tx._id}
                      title={tx.description || 'Transaction'}
                      badge={
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${txInfo.color}`}
                        >
                          {txInfo.label}
                        </Badge>
                      }
                      footer={
                        <div className="flex items-center justify-between w-full font-bold text-xs">
                          <span className="text-muted-foreground">Running Balance:</span>
                          <span className="text-foreground text-sm">৳{Math.round(tx.balanceAfter || 0).toLocaleString()}</span>
                        </div>
                      }
                    >
                      <MobileDataRow label="Date" value={tx.date ? format(new Date(tx.date), 'dd MMM yyyy') : '-'} />
                      <MobileDataRow label="Account" value={<span className="font-semibold">{cleanAccountName(tx.account?.name)}</span>} />
                      <MobileDataRow
                        label="Debit (-)"
                        value={
                          txInfo.sign === '-' ? (
                            <span className="font-bold text-rose-600">-৳{Math.round(tx.amount || 0).toLocaleString()}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )
                        }
                      />
                      <MobileDataRow
                        label="Credit (+)"
                        value={
                          txInfo.sign === '+' ? (
                            <span className="font-bold text-emerald-600">+৳{Math.round(tx.amount || 0).toLocaleString()}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )
                        }
                      />
                      {tx.reference && (
                        <MobileDataRow
                          label="Reference"
                          value={<span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{tx.reference}</span>}
                        />
                      )}
                    </MobileDataCard>
                  );
                })}
              </div>
            </>
          )}

          {totalPages > 1 && (
            <div className="py-3 border-t bg-background px-3">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResellerLedgerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ResellerLedgerContent />
    </Suspense>
  );
}

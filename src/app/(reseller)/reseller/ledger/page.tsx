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
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2,
  Plus,
  Search,
  ArrowRightLeft,
  Wallet,
  Landmark,
  RefreshCw,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/pagination';
import { TransactionForm } from '@/components/admin/TransactionForm';

function ResellerLedgerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });

  const [currentPage, setCurrentPage] = useState(1);
  const [isTxOpen, setIsTxOpen] = useState(false);

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

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Account filter
      if (selectedAccountId !== 'all') {
        const accId = tx.account?._id || tx.account;
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
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const desc = tx.description?.toLowerCase() || '';
        const accName = tx.account?.name?.toLowerCase() || '';
        const ref = tx.reference?.toLowerCase() || '';
        return desc.includes(term) || accName.includes(term) || ref.includes(term);
      }

      return true;
    });
  }, [transactions, selectedAccountId, dateFilter, searchTerm]);

  const totalBalance = accounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);

  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  return (
    <div className="flex-1 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Accounts Ledger</h2>
          <p className="text-xs md:text-sm text-muted-foreground">General ledger and transaction history of your store accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsTxOpen(true)}
            className="h-9 gap-1.5 text-xs font-bold"
          >
            <Plus className="h-4 w-4" />
            New Entry / Transfer
          </Button>

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
        <Card className="border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <p className="text-xs text-muted-foreground font-medium">All Accounts Balance</p>
            </div>
            <p className="text-2xl font-black text-foreground mt-1">৳{totalBalance.toLocaleString()}</p>
          </CardContent>
        </Card>

        {accounts.slice(0, 3).map((acc) => (
          <Card key={acc._id} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium truncate">{acc.name}</p>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0">{acc.code}</Badge>
              </div>
              <p className="text-xl font-black text-foreground mt-1">৳{(acc.currentBalance || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search descriptions or ref..."
            className="pl-8 h-9 text-xs md:text-sm"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectedAccountId}
            onValueChange={(val) => { setSelectedAccountId(val); setCurrentPage(1); }}
          >
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a._id} value={a._id} className="text-xs">
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            placeholder="From"
            value={dateFilter.from}
            onChange={(e) => { setDateFilter((prev) => ({ ...prev, from: e.target.value })); setCurrentPage(1); }}
            className="w-[130px] h-9 text-xs"
          />
          <span className="text-xs text-muted-foreground">-</span>
          <Input
            type="date"
            placeholder="To"
            value={dateFilter.to}
            onChange={(e) => { setDateFilter((prev) => ({ ...prev, to: e.target.value })); setCurrentPage(1); }}
            className="w-[130px] h-9 text-xs"
          />

          {(selectedAccountId !== 'all' || dateFilter.from || dateFilter.to || searchTerm) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedAccountId('all');
                setDateFilter({ from: '', to: '' });
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="h-9 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold text-xs">Date</TableHead>
                <TableHead className="font-bold text-xs">Account</TableHead>
                <TableHead className="font-bold text-xs">Description</TableHead>
                <TableHead className="font-bold text-xs text-right text-rose-600">Debit (-)</TableHead>
                <TableHead className="font-bold text-xs text-right text-emerald-600">Credit (+)</TableHead>
                <TableHead className="font-bold text-xs text-right">Balance After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-44 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground mt-2 font-medium">Loading ledger transactions...</p>
                  </TableCell>
                </TableRow>
              ) : paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-44 text-center text-muted-foreground text-xs">
                    {searchTerm ? 'No matching transactions found' : 'No ledger transactions recorded yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((tx) => {
                  const isDebit = tx.type === 'debit';
                  return (
                    <TableRow key={tx._id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs whitespace-nowrap">
                        {tx.date ? format(new Date(tx.date), 'dd MMM yyyy') : '-'}
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        <Badge variant="outline" className="text-[10px]">
                          {tx.account?.name || 'Account'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <p className="font-medium text-foreground">{tx.description}</p>
                        {tx.reference && (
                          <p className="text-[10px] text-muted-foreground">Ref: {tx.reference}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold text-rose-600">
                        {isDebit ? `৳${tx.amount?.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold text-emerald-600">
                        {!isDebit ? `৳${tx.amount?.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className="text-right text-xs font-black">
                        ৳{(tx.balanceAfter || 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between p-3.5 border-t">
            <p className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of{' '}
              {filteredTransactions.length} entries
            </p>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Quick Journal / Transfer Dialog */}
      <Dialog open={isTxOpen} onOpenChange={setIsTxOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Record Journal Entry / Transfer</DialogTitle>
          </DialogHeader>
          <TransactionForm
            apiPrefix="/api/reseller"
            onSuccess={() => {
              setIsTxOpen(false);
              fetchLedgerData();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ResellerLedgerPage() {
  return (
    <Suspense fallback={
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ResellerLedgerContent />
    </Suspense>
  );
}

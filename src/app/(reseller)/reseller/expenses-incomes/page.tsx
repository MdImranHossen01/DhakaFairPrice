'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Trash, Edit, Search, MoreHorizontal, Loader2, RefreshCcw, TrendingUp, TrendingDown, BookOpen, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TransactionForm } from '@/components/admin/TransactionForm';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { Pagination } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';

function ResellerExpensesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpenses: 0, netProfit: 0 });
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const initialType = (searchParams.get('type') as 'all' | 'expense' | 'income') || 'all';
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>(initialType);
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });

  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const [currentPage, setCurrentPage] = useState(initialPage);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setEditingTransaction(null);
      setIsDialogOpen(true);
    }
  }, [searchParams]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (dateFilter.from) params.set('from', dateFilter.from);
      if (dateFilter.to) params.set('to', dateFilter.to);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const res = await fetch(`/api/reseller/expenses-incomes?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch store transactions');
      const data = await res.json();
      setTransactions(data.entries || []);
      setSummary(data.summary || { totalIncome: 0, totalExpenses: 0, netProfit: 0 });
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [typeFilter, dateFilter.from, dateFilter.to]);

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Transaction?',
      text: 'Are you sure you want to delete this transaction record from your store?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/reseller/expenses-incomes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Transaction deleted');
        fetchTransactions();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to delete transaction');
      }
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
  };

  const filteredTransactions = useMemo(() => {
    if (!searchTerm.trim()) return transactions;
    const term = searchTerm.toLowerCase();
    return transactions.filter((tx) => {
      const title = tx.title?.toLowerCase() || '';
      const category = tx.category?.toLowerCase() || '';
      const desc = tx.description?.toLowerCase() || '';
      return title.includes(term) || category.includes(term) || desc.includes(term);
    });
  }, [transactions, searchTerm]);

  const ITEMS_PER_PAGE = 15;
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="flex-1 space-y-4 md:space-y-6">
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Expenses & Incomes</h2>
          <p className="text-xs md:text-sm text-muted-foreground">Manage and track your store's operating expenses and income</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/reseller/expenses-incomes/categories">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
              <Layers className="h-4 w-4" />
              Categories
            </Button>
          </Link>

          <Button
            size="sm"
            onClick={() => {
              setEditingTransaction(null);
              setIsDialogOpen(true);
            }}
            className="h-9 gap-1.5 text-xs font-bold"
          >
            <Plus className="h-4 w-4" />
            Add New Entry
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={fetchTransactions}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 md:gap-4">
        <Card className="border-green-500/20 bg-green-500/5 shadow-sm">
          <CardContent className="p-3.5 md:pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
              <p className="text-xs md:text-sm text-muted-foreground font-medium">Total Income</p>
            </div>
            <p className="text-xl md:text-2xl font-black text-green-600 mt-1">৳{summary.totalIncome.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-red-500/5 shadow-sm">
          <CardContent className="p-3.5 md:pt-6">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
              <p className="text-xs md:text-sm text-muted-foreground font-medium">Total Expenses</p>
            </div>
            <p className="text-xl md:text-2xl font-black text-red-600 mt-1">৳{summary.totalExpenses.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-3.5 md:pt-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              <p className="text-xs md:text-sm text-muted-foreground font-medium">Net Profit</p>
            </div>
            <p className={`text-xl md:text-2xl font-black mt-1 ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ৳{summary.netProfit.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, category, or note..."
            className="pl-8 h-9 text-xs md:text-sm"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={typeFilter} onValueChange={(val: any) => { if (val) setTypeFilter(val); setCurrentPage(1); }}>
            <SelectTrigger className="w-[125px] h-9 text-xs">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Types</SelectItem>
              <SelectItem value="expense" className="text-xs">Expense Only</SelectItem>
              <SelectItem value="income" className="text-xs">Income Only</SelectItem>
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

          {(dateFilter.from || dateFilter.to || typeFilter !== 'all' || searchTerm) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFilter({ from: '', to: '' });
                setTypeFilter('all');
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

      {/* Main Table / Mobile Card List */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold text-xs">Date</TableHead>
                <TableHead className="font-bold text-xs">Type</TableHead>
                <TableHead className="font-bold text-xs">Title / Description</TableHead>
                <TableHead className="font-bold text-xs">Category</TableHead>
                <TableHead className="font-bold text-xs">Payment Account</TableHead>
                <TableHead className="font-bold text-xs text-right">Amount</TableHead>
                <TableHead className="w-[60px] text-right font-bold text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-44 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground mt-2 font-medium">Loading transactions...</p>
                  </TableCell>
                </TableRow>
              ) : paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-44 text-center text-muted-foreground text-xs">
                    {searchTerm ? 'No matching entries found' : 'No transactions recorded yet. Click "Add New Entry" to record your first expense or income.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((tx) => (
                  <TableRow key={tx._id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs whitespace-nowrap">
                      {tx.date ? format(new Date(tx.date), 'dd MMM yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={tx.type === 'income' ? 'default' : 'secondary'}
                        className={`text-[10px] px-2 py-0.5 font-bold ${
                          tx.type === 'income'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20'
                        }`}
                      >
                        {tx.type === 'income' ? 'Income' : 'Expense'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-semibold text-foreground">{tx.title}</div>
                      {tx.description && (
                        <div className="text-[11px] text-muted-foreground line-clamp-1">{tx.description}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[10px]">
                        {tx.category || 'General'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {tx.paymentAccountId?.name || '-'}
                    </TableCell>
                    <TableCell
                      className={`text-right font-black text-xs ${
                        tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}৳{tx.amount?.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingTransaction(tx);
                              setIsDialogOpen(true);
                            }}
                            className="cursor-pointer text-xs"
                          >
                            <Edit className="mr-2 h-3.5 w-3.5" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(tx._id)}
                            className="cursor-pointer text-destructive focus:text-destructive text-xs"
                          >
                            <Trash className="mr-2 h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile List View */}
        <div className="block md:hidden p-2 space-y-2.5">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-xs">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
              Loading transactions...
            </div>
          ) : paginatedTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs">
              {searchTerm ? 'No matching entries found' : 'No transactions recorded yet.'}
            </div>
          ) : (
            paginatedTransactions.map((tx) => (
              <div key={tx._id} className="p-3 bg-card border rounded-lg shadow-sm space-y-2">
                <div className="flex items-start justify-between gap-2 border-b pb-2">
                  <div>
                    <h4 className="font-bold text-xs text-foreground line-clamp-1">{tx.title}</h4>
                    <span className="text-[10px] text-muted-foreground">
                      {tx.date ? format(new Date(tx.date), 'dd MMM yyyy') : '-'}
                    </span>
                  </div>
                  <span
                    className={`font-black text-sm block shrink-0 ${
                      tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}৳{tx.amount?.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-1 text-[11px]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 ${
                        tx.type === 'income' ? 'text-emerald-600 border-emerald-500/30' : 'text-rose-600 border-rose-500/30'
                      }`}
                    >
                      {tx.type}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                      {tx.category || 'General'}
                    </Badge>
                    {tx.paymentAccountId && (
                      <span className="text-[10px] text-muted-foreground">
                        via {tx.paymentAccountId.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        setEditingTransaction(tx);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={() => handleDelete(tx._id)}
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
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

      {/* Add / Edit Transaction Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingTransaction ? 'Edit Entry' : 'Add New Entry'}
            </DialogTitle>
          </DialogHeader>
          <TransactionForm
            initialData={editingTransaction}
            apiPrefix="/api/reseller"
            onSuccess={(wasEdit) => {
              if (wasEdit) setIsDialogOpen(false);
              fetchTransactions();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ResellerExpensesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ResellerExpensesContent />
    </Suspense>
  );
}

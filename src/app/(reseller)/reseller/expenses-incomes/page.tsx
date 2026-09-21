'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Loader2, TrendingUp, TrendingDown, RefreshCcw, BookOpen, Search } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 10;

export default function ResellerExpensesPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpenses: 0, netProfit: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch('/api/reseller/expenses-incomes');
    if (res.ok) {
      const d = await res.json();
      setEntries(d.entries || []);
      setSummary(d.summary || { totalIncome: 0, totalExpenses: 0, netProfit: 0 });
    } else toast.error('Failed to fetch data');
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const term = search.toLowerCase();
    return entries.filter(e => 
      e.description?.toLowerCase().includes(term) ||
      e.type?.toLowerCase().includes(term)
    );
  }, [entries, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="flex-1 space-y-4 px-0 py-2 md:p-8 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 md:px-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Expenses & Incomes</h2>
          <p className="text-xs md:text-sm text-muted-foreground">Track your store's financial performance</p>
        </div>
        <Button variant="outline" size="sm" className="h-9 self-start sm:self-auto" onClick={fetchData} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 md:gap-4 px-1 md:px-0">
        <Card className="border-green-500/20 bg-green-500/5 shadow-sm">
          <CardContent className="p-3.5 md:pt-6">
            <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-green-600" /><p className="text-xs md:text-sm text-muted-foreground">Total Income</p></div>
            <p className="text-xl md:text-2xl font-black text-green-600 mt-1">৳{summary.totalIncome.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/20 bg-red-500/5 shadow-sm">
          <CardContent className="p-3.5 md:pt-6">
            <div className="flex items-center gap-2"><TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-red-600" /><p className="text-xs md:text-sm text-muted-foreground">Total Expenses</p></div>
            <p className="text-xl md:text-2xl font-black text-red-600 mt-1">৳{summary.totalExpenses.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3.5 md:pt-6">
            <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 md:h-5 md:w-5 text-primary" /><p className="text-xs md:text-sm text-muted-foreground">Net Profit</p></div>
            <p className={`text-xl md:text-2xl font-black mt-1 ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>৳{summary.netProfit.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative flex-1 max-w-sm px-1 md:px-0">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search descriptions or type..." className="pl-8 h-9 text-xs md:text-sm" value={search} onChange={handleSearchChange} />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold">Date</TableHead>
                <TableHead className="font-bold">Type</TableHead>
                <TableHead className="font-bold">Description</TableHead>
                <TableHead className="font-bold text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="h-40 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                </TableCell></TableRow>
              ) : paginatedEntries.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-40 text-center text-muted-foreground">
                  {search ? 'No matching entries found' : 'No entries found'}
                </TableCell></TableRow>
              ) : (
                paginatedEntries.map(e => (
                  <TableRow key={e._id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-sm">{e.date ? format(new Date(e.date), 'dd MMM yyyy') : '-'}</TableCell>
                    <TableCell><Badge variant={e.type === 'income' ? 'default' : 'secondary'}>{e.type}</Badge></TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell className={`text-right font-bold ${e.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {e.type === 'income' ? '+' : '-'}৳{e.amount?.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="block md:hidden p-2 space-y-2.5">
          {loading ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
              Loading entries...
            </div>
          ) : paginatedEntries.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              {search ? 'No matching entries found' : 'No entries found'}
            </div>
          ) : (
            paginatedEntries.map(e => (
              <div key={e._id} className="p-3 bg-card border rounded-lg shadow-sm space-y-2">
                <div className="flex items-start justify-between gap-2 border-b pb-2">
                  <div>
                    <h4 className="font-semibold text-xs text-foreground line-clamp-1">{e.description}</h4>
                    <span className="text-[10px] text-muted-foreground">
                      {e.date ? format(new Date(e.date), 'dd MMM yyyy') : '-'}
                    </span>
                  </div>
                  <span className={`font-bold text-sm block shrink-0 ${e.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {e.type === 'income' ? '+' : '-'}৳{e.amount?.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-end">
                  <Badge variant={e.type === 'income' ? 'default' : 'secondary'} className="text-[9px] px-1.5 py-0">
                    {e.type}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of{' '}
              {filtered.length} entries
            </p>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Printer, RefreshCw, ArrowLeft, Search, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { fmt, fmtDate } from '@/components/admin/reports/utils';

export default function ResellerExpenseReportPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalExpenseAmount, setTotalExpenseAmount] = useState(0);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category,
        search: debouncedSearch,
        ...(dateRange.from && { from: dateRange.from }),
        ...(dateRange.to && { to: dateRange.to }),
      });
      const res = await fetch(`/api/reseller/reports/expense?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setExpenses(json.expenses || []);
        setTotalExpenseAmount(json.totalExpenseAmount || 0);
        setCategoryBreakdown(json.categoryBreakdown || []);
      }
    } catch (error) {
      console.error('Failed to fetch expense report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [category, debouncedSearch, dateRange]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 space-y-4 md:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/reseller/reports" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">Expense & Operations Report</h1>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Track advertising, marketing, packaging, courier and operational expenses incurred for your store.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchExpenses} disabled={loading} className="h-9 px-2.5">
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
        <h3 className="text-lg font-semibold text-slate-700">Store Operational Expenses Statement</h3>
        <p className="text-xs text-slate-500">Generated on {new Date().toLocaleDateString('en-GB')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
        <Card className="p-3 shadow-xs">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">Total Expenses</p>
          <p className="text-xl font-bold mt-1 text-rose-500">{fmt(totalExpenseAmount)}</p>
        </Card>
        <Card className="p-3 shadow-xs">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">Expense Entries</p>
          <p className="text-xl font-bold mt-1 text-slate-800 dark:text-slate-200">{expenses.length}</p>
        </Card>
        <Card className="p-3 shadow-xs">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">Active Categories</p>
          <p className="text-xl font-bold mt-1 text-indigo-600">{categoryBreakdown.length}</p>
        </Card>
        <Card className="p-3 shadow-xs">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">Top Category</p>
          <p className="text-base font-bold mt-1 text-slate-700 truncate">
            {categoryBreakdown[0]?._id || 'None'}
          </p>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between print:hidden">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <Select value={category} onValueChange={(val) => setCategory(val)}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Categories</SelectItem>
              {categoryBreakdown.map((c) => (
                <SelectItem key={c._id} value={c._id} className="text-xs">
                  {c._id} ({fmt(c.total)})
                </SelectItem>
              ))}
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
            <FileSpreadsheet className="h-4 w-4 text-primary" /> Store Expense Records
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {expenses.length} Records
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Expense Title</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right font-bold text-rose-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading expenses...
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      No expense records found.
                    </td>
                  </tr>
                ) : (
                  expenses.map((e) => (
                    <tr key={e._id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                        {fmtDate(e.date)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {e.title}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="secondary" className="text-[10px] font-semibold">
                          {e.category}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 max-w-[280px] truncate text-muted-foreground" title={e.description}>
                        {e.description || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                        {fmt(e.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {expenses.length > 0 && (
                <tfoot>
                  <tr className="bg-muted/80 font-bold border-t-2 border-border text-xs">
                    <td className="py-3 px-3 uppercase" colSpan={4}>
                      Total Expenses
                    </td>
                    <td className="py-3 px-3 text-right text-rose-600">
                      {fmt(totalExpenseAmount)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Printer, RefreshCw, ArrowLeft, Search, Receipt } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function ExpenseReportPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalExpense, setTotalExpense] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
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
        search: debouncedSearch,
        category: selectedCategory,
        ...(dateRange.from && { from: dateRange.from }),
        ...(dateRange.to && { to: dateRange.to })
      });
      const res = await fetch(`/api/admin/reports/expense?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setExpenses(json.expenses || []);
        setTotalExpense(json.totalExpenseAmount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch expense report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [debouncedSearch, selectedCategory, dateRange]);

  const handlePrint = () => {
    window.print();
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'Ads', label: 'Ads / Marketing' },
    { value: 'Salary', label: 'Salary' },
    { value: 'Rent', label: 'Office Rent' },
    { value: 'Utility', label: 'Utility Bills' },
    { value: 'Sales', label: 'Sales Expenses' },
    { value: 'Service', label: 'Services' },
    { value: 'Others', label: 'Others' }
  ];

  return (
    <div className="flex-1 space-y-6 px-0 py-4 md:p-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Expense Statement Report</h1>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Category-by-category expense ledger, vouchers, dates and notes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchExpenses} disabled={loading} className="h-9">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>

          <Button variant="default" size="sm" onClick={handlePrint} className="h-9 gap-1 font-semibold">
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between print:hidden">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expense description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <Select value={selectedCategory} onValueChange={(val) => val && setSelectedCategory(val)}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.value} value={c.value} className="text-xs">
                  {c.label}
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
        <h3 className="text-lg font-semibold text-slate-700">Expense Statement Report</h3>
      </div>

      {/* Report Table Card */}
      <Card className="shadow-xs overflow-hidden print:border-none print:shadow-none">
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs md:text-sm text-center border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b text-muted-foreground font-semibold">
                  <th className="p-2.5 text-left font-bold text-foreground">Date</th>
                  <th className="p-2.5 text-left font-bold text-foreground">Expense Title</th>
                  <th className="p-2.5 font-bold text-foreground">Category</th>
                  <th className="p-2.5 text-left font-bold text-muted-foreground">Notes / Description</th>
                  <th className="p-2.5 font-bold text-rose-600 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading expense records...</span>
                      </div>
                    </td>
                  </tr>
                ) : expenses.length > 0 ? (
                  expenses.map((exp: any) => (
                    <tr key={exp._id} className="border-b border-muted/30 hover:bg-muted/30 transition-colors">
                      <td className="p-2.5 text-left text-muted-foreground">
                        {new Date(exp.date).toLocaleDateString()}
                      </td>
                      <td className="p-2.5 text-left font-semibold text-foreground">{exp.title}</td>
                      <td className="p-2.5">
                        <Badge variant="outline" className="text-[10px]">
                          {exp.category}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-left text-muted-foreground text-xs">{exp.description || '-'}</td>
                      <td className="p-2.5 font-bold text-right text-rose-600">
                        ৳{Math.round(exp.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">No expense entries found.</td>
                  </tr>
                )}
              </tbody>
              {/* Summary Row */}
              <tfoot>
                <tr className="bg-muted/60 font-bold border-t-2 border-primary/20 text-foreground text-xs md:text-sm">
                  <td colSpan={4} className="p-3 text-left">Total Expenses:</td>
                  <td className="p-3 text-right text-rose-600">৳{Math.round(totalExpense).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="block md:hidden p-2 space-y-2.5">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-xs">Loading report...</span>
              </div>
            ) : expenses.length > 0 ? (
              <>
                {expenses.map((exp: any) => (
                  <div key={exp._id} className="bg-card border border-border/80 rounded-xl p-3 text-xs space-y-2 shadow-xs">
                    <div className="flex items-center justify-between font-bold border-b pb-1.5">
                      <span className="text-foreground font-semibold truncate max-w-[70%]">{exp.title}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {exp.category}
                      </Badge>
                    </div>
                    <div className="divide-y divide-border/40 text-[11px]">
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-medium text-foreground">{new Date(exp.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-bold text-rose-600">৳{Math.round(exp.amount).toLocaleString()}</span>
                      </div>
                      {exp.description && (
                        <div className="py-1 text-muted-foreground text-[10px]">
                          Note: {exp.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {totalExpense > 0 && (
                  <div className="bg-destructive/5 border-2 border-destructive/20 rounded-xl p-3 text-xs flex justify-between items-center font-bold">
                    <span className="text-foreground">Total Expenses:</span>
                    <span className="text-rose-600 text-sm font-black">৳{Math.round(totalExpense).toLocaleString()}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">No expense entries found.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

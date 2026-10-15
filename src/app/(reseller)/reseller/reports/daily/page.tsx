'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Printer, RefreshCw, Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { fmt } from '@/components/admin/reports/utils';

export default function ResellerDailyReportPage() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDailyReport = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reseller/reports/daily?month=${selectedMonth}&year=${selectedYear}`, { signal });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setData(null);
        toast.error('Failed to load daily report');
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      console.error('Failed to fetch reseller daily report:', error);
      setData(null);
      toast.error('Failed to load daily report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchDailyReport(controller.signal);
    return () => controller.abort();
  }, [selectedMonth, selectedYear]);

  const handlePrint = () => {
    window.print();
  };

  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => (currentDate.getFullYear() - i).toString());

  return (
    <div className="flex-1 space-y-6">
      {/* Top Header - Hidden in Print */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/reseller/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Daily Sales & Profit Report</h1>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Day-by-day sales revenue, customer delivery charges, base product cost, gross profit, expenses and net earnings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month Selector */}
          <Select value={selectedMonth} onValueChange={(val) => val && setSelectedMonth(val)}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year Selector */}
          <Select value={selectedYear} onValueChange={(val) => val && setSelectedYear(val)}>
            <SelectTrigger className="w-[100px] h-9 text-xs">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y} className="text-xs">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => fetchDailyReport()} disabled={loading} className="h-9">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>

          <Button variant="default" size="sm" onClick={handlePrint} className="h-9 gap-1 font-semibold">
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </Button>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block text-center border-b pb-4 mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-wider">Store Reseller Portal</h2>
        <h3 className="text-lg font-semibold text-slate-700">Daily Sales & Profit Statement</h3>
        <p className="text-xs text-slate-500">Period: {data?.monthName} {data?.year}</p>
      </div>

      {/* Daily Breakdown Table */}
      <Card className="shadow-xs overflow-hidden print:border-none print:shadow-none">
        <CardHeader className="bg-muted/40 py-2.5 px-3 sm:px-4 border-b flex flex-row items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <CardTitle className="text-xs sm:text-sm md:text-base font-bold">
              {data?.monthName} {data?.year} - Daily Performance
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {data?.daysInMonth || 0} Days
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase">
                  <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                  <th className="py-2.5 px-3 text-center">Day</th>
                  <th className="py-2.5 px-3 text-center">Orders</th>
                  <th className="py-2.5 px-3 text-right">Net Sales</th>
                  <th className="py-2.5 px-3 text-right">Delivery</th>
                  <th className="py-2.5 px-3 text-right">Total Sales</th>
                  <th className="py-2.5 px-3 text-right">Wholesale Cost</th>
                  <th className="py-2.5 px-3 text-right text-emerald-600 font-bold">Reseller Profit</th>
                  <th className="py-2.5 px-3 text-right text-rose-500">Expenses</th>
                  <th className="py-2.5 px-3 text-right font-bold">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading report data...
                    </td>
                  </tr>
                ) : !data?.days || data.days.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-muted-foreground">
                      No records found for {data?.monthName} {data?.year}.
                    </td>
                  </tr>
                ) : (
                  data.days.map((row: any) => {
                    const isToday = row.date === currentDate.toISOString().split('T')[0];
                    return (
                      <tr
                        key={row.date}
                        className={`hover:bg-muted/30 transition-colors ${isToday ? 'bg-primary/5 font-semibold' : ''}`}
                      >
                        <td className="py-2 px-3 whitespace-nowrap">{row.date}</td>
                        <td className="py-2 px-3 text-center text-muted-foreground">{row.dayName}</td>
                        <td className="py-2 px-3 text-center">
                          {row.orderCount > 0 ? (
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold">
                              {row.orderCount}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">{fmt(row.netSales)}</td>
                        <td className="py-2 px-3 text-right text-muted-foreground">{fmt(row.deliveryCost)}</td>
                        <td className="py-2 px-3 text-right font-medium">{fmt(row.totalSales)}</td>
                        <td className="py-2 px-3 text-right text-muted-foreground">{fmt(row.cogs)}</td>
                        <td className="py-2 px-3 text-right text-emerald-600 font-bold">{fmt(row.grossProfit)}</td>
                        <td className="py-2 px-3 text-right text-rose-500">
                          {row.expense > 0 ? fmt(row.expense) : '-'}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-bold ${
                            row.netProfit > 0 ? 'text-emerald-600' : row.netProfit < 0 ? 'text-rose-600' : ''
                          }`}
                        >
                          {fmt(row.netProfit)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {data?.summary && (
                <tfoot>
                  <tr className="bg-muted/80 font-bold border-t-2 border-border text-xs">
                    <td className="py-3 px-3 uppercase" colSpan={2}>
                      Total ({data.monthName})
                    </td>
                    <td className="py-3 px-3 text-center">{data.summary.orderCount}</td>
                    <td className="py-3 px-3 text-right">{fmt(data.summary.netSales)}</td>
                    <td className="py-3 px-3 text-right">{fmt(data.summary.deliveryCost)}</td>
                    <td className="py-3 px-3 text-right">{fmt(data.summary.totalSales)}</td>
                    <td className="py-3 px-3 text-right">{fmt(data.summary.cogs)}</td>
                    <td className="py-3 px-3 text-right text-emerald-600">{fmt(data.summary.grossProfit)}</td>
                    <td className="py-3 px-3 text-right text-rose-500">{fmt(data.summary.expense)}</td>
                    <td
                      className={`py-3 px-3 text-right ${
                        data.summary.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {fmt(data.summary.netProfit)}
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

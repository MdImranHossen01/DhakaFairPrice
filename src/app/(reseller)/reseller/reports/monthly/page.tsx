'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Printer, RefreshCw, Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { fmt } from '@/components/admin/reports/utils';

export default function ResellerMonthlyReportPage() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMonthlyReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reseller/reports/monthly?year=${selectedYear}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch reseller monthly report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyReport();
  }, [selectedYear]);

  const handlePrint = () => {
    window.print();
  };

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
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Monthly Financial Report</h1>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Month-by-month annual breakdown of sales, delivery costs, gross commissions, expenses and net profit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year Selector */}
          <Select value={selectedYear} onValueChange={(val) => val && setSelectedYear(val)}>
            <SelectTrigger className="w-[120px] h-9 text-xs">
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

          <Button variant="outline" size="sm" onClick={fetchMonthlyReport} disabled={loading} className="h-9">
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
        <h3 className="text-lg font-semibold text-slate-700">Annual Monthly Performance Statement</h3>
        <p className="text-xs text-slate-500">Year: {data?.year}</p>
      </div>

      {/* Report Table */}
      <Card className="shadow-xs overflow-hidden print:border-none print:shadow-none">
        <CardHeader className="bg-muted/40 py-2.5 px-3 sm:px-4 border-b flex flex-row items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <CardTitle className="text-xs sm:text-sm md:text-base font-bold">
              Year {data?.year} - 12 Months Financial Performance
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px]">
            Annual Statement
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase">
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3 text-center">Orders</th>
                  <th className="py-2.5 px-3 text-right">Net Sales</th>
                  <th className="py-2.5 px-3 text-right">Delivery Fees</th>
                  <th className="py-2.5 px-3 text-right">Total Sales</th>
                  <th className="py-2.5 px-3 text-right text-emerald-600 font-bold">Gross Profit</th>
                  <th className="py-2.5 px-3 text-right text-rose-500">Expenses</th>
                  <th className="py-2.5 px-3 text-right font-bold">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading annual data...
                    </td>
                  </tr>
                ) : !data?.monthlyRows || data.monthlyRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      No data recorded for year {data?.year}.
                    </td>
                  </tr>
                ) : (
                  data.monthlyRows.map((row: any) => (
                    <tr key={row.monthNumber} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {row.monthName}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {row.orderCount > 0 ? (
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold">
                            {row.orderCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">{fmt(row.netSales)}</td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">{fmt(row.deliveryCost)}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{fmt(row.totalSales)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">{fmt(row.grossProfit)}</td>
                      <td className="py-2.5 px-3 text-right text-rose-500">
                        {row.expense > 0 ? fmt(row.expense) : '-'}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          row.netProfit > 0 ? 'text-emerald-600' : row.netProfit < 0 ? 'text-rose-600' : ''
                        }`}
                      >
                        {fmt(row.netProfit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {data?.summary && (
                <tfoot>
                  <tr className="bg-muted/80 font-bold border-t-2 border-border text-xs">
                    <td className="py-3 px-3 uppercase">Total ({data.year})</td>
                    <td className="py-3 px-3 text-center">{data.summary.orderCount}</td>
                    <td className="py-3 px-3 text-right">{fmt(data.summary.netSales)}</td>
                    <td className="py-3 px-3 text-right">{fmt(data.summary.deliveryCost)}</td>
                    <td className="py-3 px-3 text-right">{fmt(data.summary.totalSales)}</td>
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

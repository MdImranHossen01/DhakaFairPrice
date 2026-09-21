'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Printer, RefreshCw, Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function MonthlyReportPage() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMonthlyReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports/monthly?year=${selectedYear}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch monthly report:', error);
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
    <div className="flex-1 space-y-6 px-0 py-4 md:p-8">
      {/* Top Header - Hidden in Print */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Monthly Financial Report</h1>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Month-by-month annual breakdown of sales, delivery costs, gross profit, expenses and net profit.
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
        <h2 className="text-2xl font-bold uppercase tracking-wider">Swapnobaz E-Commerce</h2>
        <h3 className="text-lg font-semibold text-slate-700">Monthly Financial Statement</h3>
        <p className="text-xs text-slate-500">Year: {data?.year}</p>
      </div>

      {/* Report Content */}
      <Card className="shadow-xs overflow-hidden print:border-none print:shadow-none">
        <CardHeader className="bg-muted/40 py-2.5 px-3 sm:px-4 border-b flex flex-row items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <CardTitle className="text-xs sm:text-sm md:text-base font-bold">
              Year {data?.year} - 12 Months Financial Performance
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px] sm:text-xs">
            Annual Statement
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs md:text-sm text-center border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b text-muted-foreground font-semibold">
                  <th className="p-2.5 text-left font-bold text-foreground">Month (মাস)</th>
                  <th className="p-2.5 font-bold text-emerald-600">Net Sales</th>
                  <th className="p-2.5 font-bold text-slate-600">Delivery Cost</th>
                  <th className="p-2.5 font-bold text-foreground">Total</th>
                  <th className="p-2.5 font-bold text-emerald-600">Sales Profit</th>
                  <th className="p-2.5 font-bold text-rose-600">Expense</th>
                  <th className="p-2.5 font-bold text-primary text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading monthly report...</span>
                      </div>
                    </td>
                  </tr>
                ) : data?.rows?.length > 0 ? (
                  data.rows.map((row: any) => (
                    <tr key={row.monthKey} className="border-b border-muted/30 hover:bg-muted/30 transition-colors">
                      <td className="p-2.5 text-left font-medium text-foreground">{row.month}</td>
                      <td className="p-2.5 font-medium text-emerald-600">৳{Math.round(row.netSales).toLocaleString()}</td>
                      <td className="p-2.5 text-muted-foreground">৳{Math.round(row.deliveryCost).toLocaleString()}</td>
                      <td className="p-2.5 font-medium text-foreground">৳{Math.round(row.total).toLocaleString()}</td>
                      <td className="p-2.5 font-semibold text-emerald-600">৳{Math.round(row.salesProfit).toLocaleString()}</td>
                      <td className="p-2.5 font-medium text-rose-600">৳{Math.round(row.expense).toLocaleString()}</td>
                      <td className={`p-2.5 font-bold text-right ${row.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ৳{Math.round(row.netProfit).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">No data found for this period.</td>
                  </tr>
                )}
              </tbody>
              {/* Summary / Total Footer Row */}
              {data?.summary && (
                <tfoot>
                  <tr className="bg-muted/60 font-bold border-t-2 border-primary/20 text-foreground text-xs md:text-sm">
                    <td className="p-3 text-left">Yearly Grand Total:</td>
                    <td className="p-3 text-emerald-600">৳{Math.round(data.summary.totalNetSales).toLocaleString()}</td>
                    <td className="p-3 text-slate-600">৳{Math.round(data.summary.totalDeliveryCost).toLocaleString()}</td>
                    <td className="p-3">৳{Math.round(data.summary.grandTotal).toLocaleString()}</td>
                    <td className="p-3 text-emerald-600">৳{Math.round(data.summary.totalSalesProfit).toLocaleString()}</td>
                    <td className="p-3 text-rose-600">৳{Math.round(data.summary.totalExpense).toLocaleString()}</td>
                    <td className={`p-3 text-right ${data.summary.totalNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ৳{Math.round(data.summary.totalNetProfit).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="block md:hidden p-2 space-y-2.5">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-xs">Loading report...</span>
              </div>
            ) : data?.rows?.length > 0 ? (
              <>
                {data.rows.map((row: any) => (
                  <div key={row.monthKey} className="bg-card border border-border/80 rounded-xl p-3 text-xs space-y-2 shadow-xs">
                    <div className="flex items-center justify-between font-bold border-b pb-1.5">
                      <span className="text-foreground">{row.month}</span>
                      <span className={row.netProfit >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                        Net Profit: ৳{Math.round(row.netProfit).toLocaleString()}
                      </span>
                    </div>
                    <div className="divide-y divide-border/40 text-[11px]">
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Net Sales:</span>
                        <span className="font-semibold text-emerald-600">৳{Math.round(row.netSales).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Delivery Cost:</span>
                        <span className="font-medium text-foreground">৳{Math.round(row.deliveryCost).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-bold text-foreground">৳{Math.round(row.total).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Sales Profit:</span>
                        <span className="font-semibold text-emerald-600">৳{Math.round(row.salesProfit).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Expense:</span>
                        <span className="font-semibold text-rose-600">৳{Math.round(row.expense).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Mobile Yearly Grand Total Card */}
                {data?.summary && (
                  <div className="bg-primary/5 border-2 border-primary/30 rounded-xl p-3 text-xs space-y-1.5 shadow-xs mt-3">
                    <div className="font-bold text-sm text-primary border-b pb-1">
                      Yearly Grand Total ({data?.year})
                    </div>
                    <div className="divide-y divide-border/40 text-[11px] font-semibold">
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Total Sales:</span>
                        <span className="text-foreground font-bold">৳{Math.round(data.summary.grandTotal).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Total Net Sales:</span>
                        <span className="text-emerald-600 font-bold">৳{Math.round(data.summary.totalNetSales).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Total Expenses:</span>
                        <span className="text-rose-600 font-bold">৳{Math.round(data.summary.totalExpense).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1 text-xs">
                        <span className="text-foreground">Net Profit:</span>
                        <span className={data.summary.totalNetProfit >= 0 ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}>
                          ৳{Math.round(data.summary.totalNetProfit).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">No data found for this year.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

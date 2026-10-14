'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Printer, RefreshCw, ArrowLeft, Tag } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { fmt, fmtQty } from '@/components/admin/reports/utils';

export default function ResellerBrandSalesReportPage() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchBrandSales = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reseller/reports/brand-sales?month=${selectedMonth}&year=${selectedYear}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch brand sales report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrandSales();
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
    <div className="flex-1 space-y-4 md:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/reseller/reports" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">Brand Wise Sales Report</h1>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Sales distribution, sold quantities and profit performance across brands in your store.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          <Button variant="outline" size="sm" onClick={fetchBrandSales} disabled={loading} className="h-9 px-2.5">
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
        <h3 className="text-lg font-semibold text-slate-700">Brand-wise Sales Performance</h3>
        <p className="text-xs text-slate-500">Period: {selectedMonth}/{selectedYear}</p>
      </div>

      {/* KPI Cards */}
      {data?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
          <Card className="p-3 shadow-xs">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Active Brands</p>
            <p className="text-lg font-bold mt-1 text-slate-800 dark:text-slate-200">{data.summary.totalBrands}</p>
          </Card>
          <Card className="p-3 shadow-xs">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Units Sold</p>
            <p className="text-lg font-bold mt-1 text-blue-600">{fmtQty(data.summary.totalQty)}</p>
          </Card>
          <Card className="p-3 shadow-xs">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Total Sales</p>
            <p className="text-lg font-bold mt-1 text-slate-700">{fmt(data.summary.totalSales)}</p>
          </Card>
          <Card className="p-3 shadow-xs">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Earned Profit</p>
            <p className="text-lg font-bold mt-1 text-emerald-600">{fmt(data.summary.totalProfit)}</p>
          </Card>
        </div>
      )}

      {/* Table Card */}
      <Card className="shadow-xs overflow-hidden print:border-none print:shadow-none">
        <CardHeader className="bg-muted/40 py-2.5 px-3 sm:px-4 border-b flex flex-row items-center justify-between print:hidden">
          <CardTitle className="text-xs sm:text-sm md:text-base font-bold flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" /> Brands Sales Performance
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {data?.brandSales?.length || 0} Brands
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase">
                  <th className="py-2.5 px-3">Brand Name</th>
                  <th className="py-2.5 px-3 text-center">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Total Sales</th>
                  <th className="py-2.5 px-3 text-right text-emerald-600 font-bold">Earned Profit</th>
                  <th className="py-2.5 px-3 text-center">Revenue Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading brand sales data...
                    </td>
                  </tr>
                ) : !data?.brandSales || data.brandSales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      No brand sales recorded for this month.
                    </td>
                  </tr>
                ) : (
                  data.brandSales.map((b: any, idx: number) => {
                    const share = data?.summary?.totalSales > 0
                      ? Math.round((b.totalSales / data.summary.totalSales) * 1000) / 10
                      : 0;
                    return (
                      <tr key={b._id || idx} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2.5">
                            {b.brandLogo ? (
                              <Image
                                src={b.brandLogo}
                                alt={b.brandName}
                                width={28}
                                height={28}
                                className="rounded border object-contain shrink-0"
                                unoptimized
                              />
                            ) : (
                              <div className="h-7 w-7 rounded bg-muted flex items-center justify-center shrink-0">
                                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                            )}
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {b.brandName}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center font-bold">{fmtQty(b.soldQty)}</td>
                        <td className="py-2 px-3 text-right font-medium">{fmt(b.totalSales)}</td>
                        <td className="py-2 px-3 text-right text-emerald-600 font-bold">{fmt(b.totalProfit)}</td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant="secondary" className="text-[10px] font-semibold">
                            {share}%
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {data?.summary && (
                <tfoot>
                  <tr className="bg-muted/80 font-bold border-t-2 border-border text-xs">
                    <td className="py-3 px-3 uppercase">Total Brands</td>
                    <td className="py-3 px-3 text-center">{fmtQty(data.summary.totalQty)}</td>
                    <td className="py-3 px-3 text-right">{fmt(data.summary.totalSales)}</td>
                    <td className="py-3 px-3 text-right text-emerald-600">{fmt(data.summary.totalProfit)}</td>
                    <td className="py-3 px-3 text-center">100%</td>
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

'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Printer, RefreshCw, ArrowLeft, Tag } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ReportCard, ReportRow } from '@/components/admin/reports/ReportCard';
import { fmt } from '@/components/admin/reports/utils';

export default function BrandSalesReportPage() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchBrandSales = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports/brand-sales?month=${selectedMonth}&year=${selectedYear}`, { signal });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setData(null);
        toast.error('Failed to load brand sales report');
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      console.error('Failed to fetch brand sales report:', error);
      setData(null);
      toast.error('Failed to load brand sales report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchBrandSales(controller.signal);
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
    <div className="flex-1 space-y-4 md:space-y-6 px-0 py-2 md:p-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">Brand Wise Sales Report</h1>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Monthly product units sold and total sales volume categorized by brand.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Select value={selectedMonth} onValueChange={(val) => val && setSelectedMonth(val)}>
            <SelectTrigger className="w-[110px] sm:w-[130px] h-9 text-xs">
              <SelectValue placeholder="Month" />
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
            <SelectTrigger className="w-[90px] sm:w-[100px] h-9 text-xs">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y} className="text-xs">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => fetchBrandSales()} disabled={loading} className="h-9 px-2.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>

          <Button variant="default" size="sm" onClick={handlePrint} className="h-9 gap-1 font-semibold px-3">
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </Button>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block text-center border-b pb-4 mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-wider">Swapnobaz E-Commerce</h2>
        <h3 className="text-lg font-semibold text-slate-700">Brand Wise Sales Report</h3>
        <p className="text-xs text-slate-500">Period: {data?.monthName} {data?.year}</p>
      </div>

      {/* Report Table Card */}
      <Card className="shadow-xs overflow-hidden print:border-none print:shadow-none">
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs md:text-sm text-center border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b text-muted-foreground font-semibold">
                  <th className="p-2.5 text-left font-bold text-foreground">Brand</th>
                  <th className="p-2.5 font-bold text-foreground">Month</th>
                  <th className="p-2.5 font-bold text-emerald-600">Qty Sold</th>
                  <th className="p-2.5 font-bold text-primary text-right">Net Sales Volume</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading brand sales...</span>
                      </div>
                    </td>
                  </tr>
                ) : data?.brands?.length > 0 ? (
                  data.brands.map((b: any) => (
                    <tr key={b._id} className="border-b border-muted/30 hover:bg-muted/30 transition-colors">
                      <td className="p-2.5 text-left font-bold text-foreground flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-primary" />
                        {b.brandName}
                      </td>
                      <td className="p-2.5 font-medium text-muted-foreground">{data.monthName} {data.year}</td>
                      <td className="p-2.5 font-bold text-foreground">{b.soldQty} pcs</td>
                      <td className="p-2.5 font-bold text-right text-primary">
                        {fmt(b.totalSales)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">No brand sales data recorded for this month.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="block md:hidden p-2 space-y-2.5">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                <span>Loading brand sales...</span>
              </div>
            ) : data?.brands?.length > 0 ? (
              data.brands.map((b: any) => (
                <ReportCard
                  key={b._id}
                  title={b.brandName || 'Unbranded'}
                  badge={
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {data.monthName} {data.year}
                    </span>
                  }
                  footer={
                    <div className="flex items-center justify-between w-full font-bold text-xs">
                      <span className="text-muted-foreground">Net Sales:</span>
                      <span className="text-primary text-sm">{fmt(b.totalSales)}</span>
                    </div>
                  }
                >
                  <ReportRow 
                    label="Units Sold" 
                    value={<span className="font-bold text-emerald-600">{b.soldQty} pcs</span>} 
                  />
                </ReportCard>
              ))
            ) : (
              <div className="p-6 text-center text-muted-foreground text-xs">
                No brand sales data recorded for this month.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

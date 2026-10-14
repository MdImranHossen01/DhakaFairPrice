'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Printer, RefreshCw, ArrowLeft, Search, Package } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { fmt, fmtQty } from '@/components/admin/reports/utils';

export default function ResellerItemProfitReportPage() {
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchItemProfit = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: debouncedSearch,
        ...(dateRange.from && { from: dateRange.from }),
        ...(dateRange.to && { to: dateRange.to }),
      });
      const res = await fetch(`/api/reseller/reports/item-profit?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setItems(json.items || []);
        setSummary(json.summary || null);
      }
    } catch (error) {
      console.error('Failed to fetch item profit report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemProfit();
  }, [debouncedSearch, dateRange]);

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
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">Product Wise Profit Report</h1>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Analyze product-level profit margins, sold quantities, retail revenue, wholesale cost and total profit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchItemProfit} disabled={loading} className="h-9 px-2.5">
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
        <h3 className="text-lg font-semibold text-slate-700">Product Profit Margins Statement</h3>
        <p className="text-xs text-slate-500">Generated on {new Date().toLocaleDateString('en-GB')}</p>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 print:grid-cols-5 print:gap-2">
          <Card className="p-3 shadow-xs">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Total Quantity Sold</p>
            <p className="text-lg font-bold mt-1 text-slate-800 dark:text-slate-200">{fmtQty(summary.totalQty)}</p>
          </Card>
          <Card className="p-3 shadow-xs">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Retail Revenue</p>
            <p className="text-lg font-bold mt-1 text-blue-600">{fmt(summary.totalSales)}</p>
          </Card>
          <Card className="p-3 shadow-xs">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Wholesale Cost</p>
            <p className="text-lg font-bold mt-1 text-muted-foreground">{fmt(summary.totalPurchase)}</p>
          </Card>
          <Card className="p-3 shadow-xs">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Total Profit</p>
            <p className="text-lg font-bold mt-1 text-emerald-600">{fmt(summary.totalProfit)}</p>
          </Card>
          <Card className="p-3 shadow-xs">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Average Margin</p>
            <p className="text-lg font-bold mt-1 text-indigo-600">{summary.avgMargin}%</p>
          </Card>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between print:hidden">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
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

      {/* Table View */}
      <Card className="shadow-xs overflow-hidden print:border-none print:shadow-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase">
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3 text-center">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Avg Retail Price</th>
                  <th className="py-2.5 px-3 text-right">Total Revenue</th>
                  <th className="py-2.5 px-3 text-right">Avg Wholesale Cost</th>
                  <th className="py-2.5 px-3 text-right">Total Cost</th>
                  <th className="py-2.5 px-3 text-right text-emerald-600 font-bold">Total Profit</th>
                  <th className="py-2.5 px-3 text-center">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading product analytics...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={it._id || idx} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2.5">
                          {it.image ? (
                            <Image
                              src={it.image}
                              alt={it.name}
                              width={32}
                              height={32}
                              className="rounded border object-cover shrink-0"
                              unoptimized
                            />
                          ) : (
                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 max-w-[260px]">
                            {it.name}
                          </p>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center font-semibold">{fmtQty(it.soldQty)}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{fmt(it.avgSalePrice)}</td>
                      <td className="py-2 px-3 text-right font-medium">{fmt(it.totalSalePrice)}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{fmt(it.avgPurchasePrice)}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{fmt(it.totalPurchasePrice)}</td>
                      <td className="py-2 px-3 text-right text-emerald-600 font-bold">{fmt(it.profit)}</td>
                      <td className="py-2 px-3 text-center">
                        <Badge
                          variant={it.margin >= 20 ? 'default' : 'secondary'}
                          className="text-[10px] font-semibold"
                        >
                          {it.margin}%
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {summary && (
                <tfoot>
                  <tr className="bg-muted/80 font-bold border-t-2 border-border text-xs">
                    <td className="py-3 px-3 uppercase">Total / Average</td>
                    <td className="py-3 px-3 text-center">{fmtQty(summary.totalQty)}</td>
                    <td className="py-3 px-3 text-right">-</td>
                    <td className="py-3 px-3 text-right text-blue-600">{fmt(summary.totalSales)}</td>
                    <td className="py-3 px-3 text-right">-</td>
                    <td className="py-3 px-3 text-right text-muted-foreground">{fmt(summary.totalPurchase)}</td>
                    <td className="py-3 px-3 text-right text-emerald-600">{fmt(summary.totalProfit)}</td>
                    <td className="py-3 px-3 text-center">{summary.avgMargin}%</td>
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

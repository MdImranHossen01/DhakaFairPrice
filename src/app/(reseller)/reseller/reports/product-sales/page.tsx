'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Printer, RefreshCw, ArrowLeft, TrendingUp, TrendingDown, Package } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { fmt, fmtQty } from '@/components/admin/reports/utils';

export default function ResellerProductSalesReportPage() {
  const [view, setView] = useState<'top' | 'low'>('top');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const fetchSalesVelocity = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        view,
        limit: '50',
        ...(dateRange.from && { from: dateRange.from }),
        ...(dateRange.to && { to: dateRange.to }),
      });
      const res = await fetch(`/api/reseller/reports/product-sales?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setProducts(json.products || []);
      }
    } catch (error) {
      console.error('Failed to fetch product sales velocity:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesVelocity();
  }, [view, dateRange]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 space-y-4 md:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/reseller/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">Top & Low Selling Products</h1>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Analyze bestselling revenue drivers and low velocity products in your reseller storefront.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchSalesVelocity} disabled={loading} className="h-9 px-2.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>

          <Button variant="default" size="sm" onClick={handlePrint} className="h-9 gap-1 font-semibold px-3">
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </Button>
        </div>
      </div>

      {/* Filter and Tabs Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between print:hidden">
        <Tabs value={view} onValueChange={(val) => setView(val as 'top' | 'low')}>
          <TabsList className="grid w-[260px] grid-cols-2">
            <TabsTrigger value="top" className="text-xs gap-1.5 font-semibold">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span>Top Sellers</span>
            </TabsTrigger>
            <TabsTrigger value="low" className="text-xs gap-1.5 font-semibold">
              <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
              <span>Low Sellers</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

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

      {/* Printable Report Header */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h2 className="text-2xl font-bold uppercase tracking-wider">Store Reseller Portal</h2>
        <h3 className="text-lg font-semibold text-slate-700">
          {view === 'top' ? 'Top Selling Products Report' : 'Low Selling Products Report'}
        </h3>
        <p className="text-xs text-slate-500">Generated on {new Date().toLocaleDateString('en-GB')}</p>
      </div>

      {/* Table Card */}
      <Card className="shadow-xs overflow-hidden print:border-none print:shadow-none">
        <CardHeader className="bg-muted/40 py-2.5 px-3 sm:px-4 border-b flex flex-row items-center justify-between print:hidden">
          <CardTitle className="text-xs sm:text-sm md:text-base font-bold flex items-center gap-2">
            {view === 'top' ? (
              <span className="flex items-center gap-1.5 text-emerald-600">
                <TrendingUp className="h-4 w-4" /> Top 50 Bestselling Products
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-500">
                <TrendingDown className="h-4 w-4" /> Slow Moving Products
              </span>
            )}
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {products.length} Products
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase">
                  <th className="py-2.5 px-3 w-12 text-center">Rank</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3 text-center">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Avg Retail Price</th>
                  <th className="py-2.5 px-3 text-right">Total Revenue</th>
                  <th className="py-2.5 px-3 text-right text-emerald-600 font-bold">Earned Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      Analyzing sales velocity...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No sales recorded for this criteria.
                    </td>
                  </tr>
                ) : (
                  products.map((p, idx) => (
                    <tr key={p._id || idx} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 text-center font-bold text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2.5">
                          {p.image ? (
                            <Image
                              src={p.image}
                              alt={p.name}
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
                          <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 max-w-[280px]">
                            {p.name}
                          </p>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center font-bold">{fmtQty(p.soldQty)}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{fmt(p.avgPrice)}</td>
                      <td className="py-2 px-3 text-right font-medium">{fmt(p.totalRevenue)}</td>
                      <td className="py-2 px-3 text-right text-emerald-600 font-bold">{fmt(p.totalProfit)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

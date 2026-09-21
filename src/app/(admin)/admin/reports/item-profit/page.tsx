'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Printer, RefreshCw, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { ReportCard, ReportRow } from '@/components/admin/reports/ReportCard';
import { fmt } from '@/components/admin/reports/utils';

export default function ItemProfitReportPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchItemProfit = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`/api/admin/reports/item-profit?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setItems(json.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch item profit report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemProfit();
  }, [debouncedSearch]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 space-y-4 md:space-y-6 px-0 py-2 md:p-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">Item Wise Profit Report</h1>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Product-by-product sold volume, total sale price, total purchase cost and gross profit.
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

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between print:hidden">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search product name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block text-center border-b pb-4 mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-wider">Swapnobaz E-Commerce</h2>
        <h3 className="text-lg font-semibold text-slate-700">Item Wise Profit Report</h3>
      </div>

      {/* Report Table Card */}
      <Card className="shadow-xs overflow-hidden print:border-none print:shadow-none">
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs md:text-sm text-center border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b text-muted-foreground font-semibold">
                  <th className="p-2.5 text-left font-bold text-foreground">Barcode / SKU</th>
                  <th className="p-2.5 text-left font-bold text-foreground">Item Name</th>
                  <th className="p-2.5 font-bold text-foreground">Qty Sold</th>
                  <th className="p-2.5 font-bold text-emerald-600">Total Sale Price</th>
                  <th className="p-2.5 font-bold text-slate-600">Total Purchase Price</th>
                  <th className="p-2.5 font-bold text-primary text-right">Profit / Loss</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading item profit report...</span>
                      </div>
                    </td>
                  </tr>
                ) : items.length > 0 ? (
                  items.map((item: any) => (
                    <tr key={item._id} className="border-b border-muted/30 hover:bg-muted/30 transition-colors">
                      <td className="p-2.5 text-left font-mono text-xs text-muted-foreground">{item.sku}</td>
                      <td className="p-2.5 text-left font-semibold text-foreground">{item.itemName}</td>
                      <td className="p-2.5 font-bold text-foreground">{item.qty} pcs</td>
                      <td className="p-2.5 font-medium text-emerald-600">{fmt(item.totalSalePrice)}</td>
                      <td className="p-2.5 text-muted-foreground">{fmt(item.totalPurchasePrice)}</td>
                      <td className={`p-2.5 font-bold text-right ${item.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {fmt(item.profit)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">No item profit data found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="block md:hidden p-2 space-y-2.5">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                <span>Loading item profit report...</span>
              </div>
            ) : items.length > 0 ? (
              items.map((item: any) => (
                <ReportCard
                  key={item._id}
                  title={item.itemName || 'Unnamed Item'}
                  badge={
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      item.profit >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {item.profit >= 0 ? 'Profit' : 'Loss'}
                    </span>
                  }
                  footer={
                    <div className="flex items-center justify-between w-full font-bold text-xs">
                      <span className="text-muted-foreground">Net P/L:</span>
                      <span className={`text-sm ${item.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {fmt(item.profit)}
                      </span>
                    </div>
                  }
                >
                  <ReportRow label="Barcode / SKU" value={<span className="font-mono text-xs">{item.sku || 'N/A'}</span>} />
                  <ReportRow label="Quantity Sold" value={`${item.qty} pcs`} />
                  <ReportRow label="Total Sale Price" value={<span className="text-emerald-600 font-semibold">{fmt(item.totalSalePrice)}</span>} />
                  <ReportRow label="Purchase Cost (COGS)" value={fmt(item.totalPurchasePrice)} />
                </ReportCard>
              ))
            ) : (
              <div className="p-6 text-center text-muted-foreground text-xs">
                No item profit data found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

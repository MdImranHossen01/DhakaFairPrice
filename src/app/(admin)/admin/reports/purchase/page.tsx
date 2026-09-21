'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Printer, RefreshCw, ArrowLeft, Search, FileText } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function PurchaseReportPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
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

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: debouncedSearch,
        ...(dateRange.from && { from: dateRange.from }),
        ...(dateRange.to && { to: dateRange.to })
      });
      const res = await fetch(`/api/admin/reports/purchase?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setPurchases(json.purchases || []);
      }
    } catch (error) {
      console.error('Failed to fetch purchase report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [debouncedSearch, dateRange]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 space-y-6 px-0 py-4 md:p-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Purchase & Supplier Bill Report</h1>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Track inventory stock purchases, supplier bills, paid amounts and outstanding supplier dues.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPurchases} disabled={loading} className="h-9">
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
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoice or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
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
        <h3 className="text-lg font-semibold text-slate-700">Purchase & Supplier Bill Report</h3>
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
                  <th className="p-2.5 font-bold text-foreground">Invoice No</th>
                  <th className="p-2.5 text-left font-bold text-foreground">Supplier</th>
                  <th className="p-2.5 font-bold text-foreground">Items</th>
                  <th className="p-2.5 font-bold text-foreground">Total Amount</th>
                  <th className="p-2.5 font-bold text-emerald-600">Paid Amount</th>
                  <th className="p-2.5 font-bold text-rose-600">Due Amount</th>
                  <th className="p-2.5 font-bold text-right text-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading purchase report...</span>
                      </div>
                    </td>
                  </tr>
                ) : purchases.length > 0 ? (
                  purchases.map((p: any) => (
                    <tr key={p._id} className="border-b border-muted/30 hover:bg-muted/30 transition-colors">
                      <td className="p-2.5 text-left text-muted-foreground">
                        {new Date(p.date).toLocaleDateString()}
                      </td>
                      <td className="p-2.5 font-medium text-foreground">{p.invoiceNo}</td>
                      <td className="p-2.5 text-left">
                        <div className="font-bold text-foreground">{p.supplierName}</div>
                        {p.supplierPhone && <div className="text-[11px] text-muted-foreground">{p.supplierPhone}</div>}
                      </td>
                      <td className="p-2.5 font-medium text-foreground">{p.itemsCount} items</td>
                      <td className="p-2.5 font-bold text-foreground">৳{Math.round(p.totalAmount).toLocaleString()}</td>
                      <td className="p-2.5 font-medium text-emerald-600">৳{Math.round(p.paidAmount).toLocaleString()}</td>
                      <td className="p-2.5 font-bold text-rose-600">৳{Math.round(p.dueAmount).toLocaleString()}</td>
                      <td className="p-2.5 text-right">
                        <Badge variant={p.dueAmount > 0 ? 'destructive' : 'secondary'} className="text-[10px]">
                          {p.dueAmount > 0 ? 'Due' : 'Paid'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground">No purchase records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="block md:hidden p-2 space-y-2.5">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-xs">Loading report...</span>
              </div>
            ) : purchases.length > 0 ? (
              purchases.map((p: any) => (
                <div key={p._id} className="bg-card border border-border/80 rounded-xl p-3 text-xs space-y-2 shadow-xs">
                  <div className="flex items-center justify-between font-bold border-b pb-1.5">
                    <span className="text-primary font-mono">{p.invoiceNo || 'Bill'}</span>
                    <Badge variant={p.dueAmount > 0 ? 'destructive' : 'secondary'} className="text-[10px]">
                      {p.dueAmount > 0 ? 'Due' : 'Paid'}
                    </Badge>
                  </div>
                  <div className="divide-y divide-border/40 text-[11px]">
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Date:</span>
                      <span className="font-medium text-foreground">{new Date(p.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Supplier:</span>
                      <span className="font-bold text-foreground">{p.supplierName}</span>
                    </div>
                    {p.supplierPhone && (
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Phone:</span>
                        <a href={`tel:${p.supplierPhone}`} className="text-primary font-medium">{p.supplierPhone}</a>
                      </div>
                    )}
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Total Bill:</span>
                      <span className="font-bold text-foreground">৳{Math.round(p.totalAmount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Paid:</span>
                      <span className="font-semibold text-emerald-600">৳{Math.round(p.paidAmount).toLocaleString()}</span>
                    </div>
                    {p.dueAmount > 0 && (
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Due:</span>
                        <span className="font-bold text-rose-600">৳{Math.round(p.dueAmount).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">No purchase records found.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

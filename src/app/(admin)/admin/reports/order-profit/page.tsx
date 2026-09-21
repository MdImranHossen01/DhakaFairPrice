'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Printer, RefreshCw, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { ReportCard, ReportRow } from '@/components/admin/reports/ReportCard';
import { fmt, fmtDate } from '@/components/admin/reports/utils';

export default function OrderProfitReportPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        search: debouncedSearch,
        ...(dateRange.from && { from: dateRange.from }),
        ...(dateRange.to && { to: dateRange.to })
      });
      const res = await fetch(`/api/admin/reports/order-profit?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setOrders(json.orders || []);
        setTotalPages(json.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch order profit report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, dateRange.from, dateRange.to]);

  useEffect(() => {
    fetchOrders();
  }, [page, debouncedSearch, dateRange]);

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
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">Invoice Wise Profit Report</h1>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Track individual order sales, delivery cost, COGS and net gross profit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading} className="h-9 px-2.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>

          <Button variant="default" size="sm" onClick={handlePrint} className="h-9 gap-1 font-semibold px-3">
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between print:hidden">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoice or customer..."
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
        <h3 className="text-lg font-semibold text-slate-700">Invoice Wise Profit Report</h3>
      </div>

      {/* Report Table Card */}
      <Card className="shadow-xs overflow-hidden print:border-none print:shadow-none">
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs md:text-sm text-center border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b text-muted-foreground font-semibold">
                  <th className="p-2.5 text-left font-bold text-foreground">Date</th>
                  <th className="p-2.5 font-bold text-foreground">Invoice No</th>
                  <th className="p-2.5 text-left font-bold text-foreground">Customer</th>
                  <th className="p-2.5 font-bold text-emerald-600">Net Sales</th>
                  <th className="p-2.5 font-bold text-slate-600">Delivery</th>
                  <th className="p-2.5 font-bold text-foreground">Total</th>
                  <th className="p-2.5 font-bold text-muted-foreground">Purchase/COGS</th>
                  <th className="p-2.5 font-bold text-primary text-right">Profit / Loss</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading profit report...</span>
                      </div>
                    </td>
                  </tr>
                ) : orders.length > 0 ? (
                  orders.map((order: any) => (
                    <tr key={order._id} className="border-b border-muted/30 hover:bg-muted/30 transition-colors">
                      <td className="p-2.5 text-left text-muted-foreground">
                        {fmtDate(order.date)}
                      </td>
                      <td className="p-2.5 font-medium text-foreground">
                        <Link href={`/admin/orders`} className="hover:underline text-primary font-mono">
                          {order.invoiceNo}
                        </Link>
                      </td>
                      <td className="p-2.5 text-left">
                        <div className="font-semibold text-foreground">{order.customerName}</div>
                        {order.customerPhone && (
                          <div className="text-[11px] text-muted-foreground">{order.customerPhone}</div>
                        )}
                      </td>
                      <td className="p-2.5 font-medium text-emerald-600">{fmt(order.netSales)}</td>
                      <td className="p-2.5 text-muted-foreground">{fmt(order.deliveryCost)}</td>
                      <td className="p-2.5 font-bold text-foreground">{fmt(order.total)}</td>
                      <td className="p-2.5 text-muted-foreground">{fmt(order.purchasePrice)}</td>
                      <td className={`p-2.5 font-bold text-right ${order.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {fmt(order.profit)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground">No orders found.</td>
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
                <span>Loading profit report...</span>
              </div>
            ) : orders.length > 0 ? (
              orders.map((order: any) => (
                <ReportCard
                  key={order._id}
                  title={
                    <span className="font-mono text-primary font-bold">
                      {order.invoiceNo}
                    </span>
                  }
                  badge={
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      order.profit >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {order.profit >= 0 ? 'Profit' : 'Loss'}
                    </span>
                  }
                  footer={
                    <div className="flex items-center justify-between w-full font-bold text-xs">
                      <span className="text-muted-foreground">Net P/L:</span>
                      <span className={`text-sm ${order.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {fmt(order.profit)}
                      </span>
                    </div>
                  }
                >
                  <ReportRow label="Date" value={fmtDate(order.date)} />
                  <ReportRow 
                    label="Customer" 
                    value={
                      <div className="text-right">
                        <div className="font-semibold">{order.customerName}</div>
                        {order.customerPhone && <div className="text-[11px] text-muted-foreground">{order.customerPhone}</div>}
                      </div>
                    } 
                  />
                  <ReportRow label="Net Sales" value={<span className="text-emerald-600 font-semibold">{fmt(order.netSales)}</span>} />
                  <ReportRow label="Delivery Charge" value={fmt(order.deliveryCost)} />
                  <ReportRow label="Total Order Value" value={<span className="font-bold">{fmt(order.total)}</span>} />
                  <ReportRow label="Purchase Cost (COGS)" value={fmt(order.purchasePrice)} />
                </ReportCard>
              ))
            ) : (
              <div className="p-6 text-center text-muted-foreground text-xs">
                No orders found.
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-3 border-t">
              <div className="text-xs text-muted-foreground">
                Page <span className="font-semibold text-foreground">{page}</span> of <span className="font-semibold text-foreground">{totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="h-8 text-xs px-2.5"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="h-8 text-xs px-2.5"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

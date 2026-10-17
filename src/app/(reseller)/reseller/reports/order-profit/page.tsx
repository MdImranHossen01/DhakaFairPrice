'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Printer, RefreshCw, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { fmt, fmtDate } from '@/components/admin/reports/utils';
import { ReportCard, ReportRow } from '@/components/admin/reports/ReportCard';

export default function ResellerOrderProfitReportPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
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
        status: statusFilter,
        ...(dateRange.from && { from: dateRange.from }),
        ...(dateRange.to && { to: dateRange.to }),
      });
      const res = await fetch(`/api/reseller/reports/order-profit?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setOrders(json.orders || []);
        setSummary(json.summary || null);
        setTotalPages(json.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch reseller order profit report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, dateRange.from, dateRange.to]);

  useEffect(() => {
    fetchOrders();
  }, [page, debouncedSearch, statusFilter, dateRange]);

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
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">Order Wise Profit Report</h1>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Track individual order sales, delivery charges, product cost and your net reseller commission.
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

      {/* Printable Report Header */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h2 className="text-2xl font-bold uppercase tracking-wider">Store Reseller Portal</h2>
        <h3 className="text-lg font-semibold text-slate-700">Order-wise Profit & Commission Statement</h3>
        <p className="text-xs text-slate-500">Generated on {new Date().toLocaleDateString('en-GB')}</p>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between print:hidden">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search order ID or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="Confirmed" className="text-xs">Confirmed</SelectItem>
              <SelectItem value="Processing" className="text-xs">Processing</SelectItem>
              <SelectItem value="Ready for Delivery" className="text-xs">Ready for Delivery</SelectItem>
              <SelectItem value="Released for Delivery" className="text-xs">Released for Delivery</SelectItem>
              <SelectItem value="Delivered" className="text-xs">Delivered</SelectItem>
              <SelectItem value="Paid" className="text-xs">Paid</SelectItem>
            </SelectContent>
          </Select>

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

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-2.5 sm:hidden print:hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No orders matching criteria.</div>
        ) : (
          orders.map((o) => (
            <ReportCard
              key={o._id}
              title={o.invoiceNo}
              subtitle={`${o.customerName} • ${fmtDate(o.date)}`}
              badge={
                <Badge variant={o.commissionStatus === 'cleared' ? 'default' : 'secondary'} className="text-[10px]">
                  {o.status}
                </Badge>
              }
            >
              <ReportRow label="Customer Phone" value={o.customerPhone} />
              <ReportRow label="Items" value={`${o.itemCount} items`} />
              <ReportRow label="Order Total" value={fmt(o.totalAmount)} />
              <ReportRow label="Delivery Fee" value={fmt(o.deliveryCost)} />
              <ReportRow label="Product Cost" value={fmt(o.cogs)} />
              <ReportRow
                label="Your Profit"
                value={
                  <span className="font-bold text-emerald-600">
                    {fmt(o.profit)}
                  </span>
                }
              />
            </ReportCard>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <Card className="shadow-xs overflow-hidden hidden sm:block print:block print:border-none print:shadow-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase">
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Items</th>
                  <th className="py-2.5 px-3 text-right">Net Sales</th>
                  <th className="py-2.5 px-3 text-right">Delivery</th>
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                  <th className="py-2.5 px-3 text-right">Product Cost</th>
                  <th className="py-2.5 px-3 text-right text-emerald-600 font-bold">Your Profit</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
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
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-muted-foreground">
                      No orders found for the selected period.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o._id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 font-semibold text-primary">{o.invoiceNo}</td>
                      <td className="py-2 px-3 whitespace-nowrap text-muted-foreground">{fmtDate(o.date)}</td>
                      <td className="py-2 px-3">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{o.customerName}</p>
                        <p className="text-[10px] text-muted-foreground">{o.customerPhone}</p>
                      </td>
                      <td className="py-2 px-3 max-w-[200px] truncate" title={o.itemsSummary}>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {o.itemCount} items
                        </span>
                        <p className="text-[10px] text-muted-foreground truncate">{o.itemsSummary}</p>
                      </td>
                      <td className="py-2 px-3 text-right">{fmt(o.netSales)}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{fmt(o.deliveryCost)}</td>
                      <td className="py-2 px-3 text-right font-medium">{fmt(o.totalAmount)}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{fmt(o.cogs)}</td>
                      <td className="py-2 px-3 text-right text-emerald-600 font-bold">{fmt(o.profit)}</td>
                      <td className="py-2 px-3 text-center">
                        <Badge
                          variant={o.status === 'Delivered' || o.status === 'Paid' ? 'default' : 'secondary'}
                          className="text-[10px] font-semibold"
                        >
                          {o.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-3 print:hidden">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="h-8 text-xs"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="h-8 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

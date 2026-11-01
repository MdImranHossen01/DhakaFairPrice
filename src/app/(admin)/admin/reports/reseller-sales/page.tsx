'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Printer,
  RefreshCw,
  ArrowLeft,
  Search,
  Store,
  TrendingUp,
  ShoppingBag,
  CheckCircle2,
  Award,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  ExternalLink,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import { ReportCard, ReportRow } from '@/components/admin/reports/ReportCard';
import { fmt } from '@/components/admin/reports/utils';

export default function ResellerSalesReportPage() {
  const [resellers, setResellers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [datePreset, setDatePreset] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('sales');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Handle Date Presets
  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    if (preset === 'today') {
      const todayStr = formatDate(now);
      setDateRange({ from: todayStr, to: todayStr });
    } else if (preset === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yestStr = formatDate(yesterday);
      setDateRange({ from: yestStr, to: yestStr });
    } else if (preset === 'this_week') {
      const firstDay = new Date(now);
      const day = firstDay.getDay();
      const diff = firstDay.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      firstDay.setDate(diff);
      setDateRange({ from: formatDate(firstDay), to: formatDate(now) });
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateRange({ from: formatDate(firstDay), to: formatDate(now) });
    } else if (preset === 'last_30_days') {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      setDateRange({ from: formatDate(thirtyDaysAgo), to: formatDate(now) });
    } else {
      setDateRange({ from: '', to: '' });
    }
  };

  const handleCustomDateChange = (key: 'from' | 'to', value: string) => {
    setDatePreset('custom');
    setDateRange(prev => ({ ...prev, [key]: value }));
  };

  const handleClearDates = () => {
    setDatePreset('all');
    setDateRange({ from: '', to: '' });
  };

  const handleColumnSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const fetchResellers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (dateRange.from) params.set('from', dateRange.from);
      if (dateRange.to) params.set('to', dateRange.to);
      if (sortBy) params.set('sortBy', sortBy);
      if (sortOrder) params.set('sortOrder', sortOrder);

      const res = await fetch(`/api/admin/reports/reseller-sales?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setResellers(json.resellers || []);
        setSummary(json.summary || null);
      }
    } catch (error) {
      console.error('Failed to fetch reseller sales report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResellers();
  }, [debouncedSearch, dateRange.from, dateRange.to, sortBy, sortOrder]);

  const handlePrint = () => {
    window.print();
  };

  const computedSummary = useMemo(() => {
    if (summary) return summary;
    return {
      totalResellers: resellers.length,
      activeResellers: resellers.filter(r => r.totalOrders > 0).length,
      totalOrders: resellers.reduce((sum, r) => sum + (r.totalOrders || 0), 0),
      deliveredOrders: resellers.reduce((sum, r) => sum + (r.deliveredOrders || 0), 0),
      totalSales: resellers.reduce((sum, r) => sum + (r.totalSales || 0), 0),
      totalEarnedCommission: resellers.reduce((sum, r) => sum + (r.totalEarnedCommission || 0), 0),
    };
  }, [summary, resellers]);

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="h-3 w-3 opacity-40 ml-1 inline" />;
    return sortOrder === 'desc' ? (
      <ArrowDown className="h-3.5 w-3.5 text-primary ml-1 inline" />
    ) : (
      <ArrowUp className="h-3.5 w-3.5 text-primary ml-1 inline" />
    );
  };

  return (
    <div className="flex-1 space-y-4 md:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">Reseller Sales & Performance</h1>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Performance-based ranking of dropshipping resellers by sales volume, delivered orders, and commission.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchResellers} disabled={loading} className="h-9 px-2.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>

          <Button variant="default" size="sm" onClick={handlePrint} className="h-9 gap-1 font-semibold px-3">
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        {/* Total Stores */}
        <Card className="shadow-xs border-border/60">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Registered Stores</span>
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Store className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-lg sm:text-2xl font-bold text-foreground">
              {computedSummary.totalResellers}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              <span className="font-semibold text-emerald-600">{computedSummary.activeResellers} Active</span> with orders
            </p>
          </CardContent>
        </Card>

        {/* Total Sales Volume */}
        <Card className="shadow-xs border-border/60">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Sales Volume</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-lg sm:text-2xl font-bold text-emerald-600">
              {fmt(computedSummary.totalSales)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Gross revenue generated
            </p>
          </CardContent>
        </Card>

        {/* Orders & Delivery Rate */}
        <Card className="shadow-xs border-border/60">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Orders</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-lg sm:text-2xl font-bold text-foreground">
              {computedSummary.totalOrders}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
              <span className="font-semibold text-emerald-600">{computedSummary.deliveredOrders} Delivered</span>
              {computedSummary.totalOrders > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  ({Math.round((computedSummary.deliveredOrders / computedSummary.totalOrders) * 100)}%)
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Earned Commission */}
        <Card className="shadow-xs border-border/60">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Reseller Commission</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                <Award className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-lg sm:text-2xl font-bold text-amber-600">
              {fmt(computedSummary.totalEarnedCommission)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Total margin earned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar (Search, Date Presets & Custom Range) */}
      <div className="bg-card border rounded-lg p-3 space-y-3 print:hidden">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search store name, subdomain, owner or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_30_days', label: 'Last 30 Days' },
            ].map(preset => (
              <Button
                key={preset.id}
                type="button"
                variant={datePreset === preset.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetChange(preset.id)}
                className={`h-8 text-xs px-2.5 whitespace-nowrap ${datePreset === preset.id ? 'font-semibold' : 'text-muted-foreground'}`}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Date Range & Sort Control */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1 border-t">
          {/* Date Range Inputs */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Range:</span>
            </div>
            <Input
              type="date"
              value={dateRange.from}
              onChange={(e) => handleCustomDateChange('from', e.target.value)}
              className="h-8 text-xs w-32 sm:w-36"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateRange.to}
              onChange={(e) => handleCustomDateChange('to', e.target.value)}
              className="h-8 text-xs w-32 sm:w-36"
            />
            {(dateRange.from || dateRange.to) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearDates}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Clear date filter"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                <span>Clear</span>
              </Button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Sort by:</span>
            <Select
              value={sortBy}
              onValueChange={(val) => {
                if (val) setSortBy(val);
                setSortOrder('desc');
              }}
            >
              <SelectTrigger className="h-8 text-xs w-[170px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">Sales Volume (Top)</SelectItem>
                <SelectItem value="orders">Total Orders</SelectItem>
                <SelectItem value="delivered">Delivered Orders</SelectItem>
                <SelectItem value="commission">Earned Commission</SelectItem>
                <SelectItem value="wallet">Wallet Balance</SelectItem>
                <SelectItem value="store">Store Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
              className="h-8 px-2 text-xs"
              title={sortOrder === 'desc' ? 'Descending' : 'Ascending'}
            >
              {sortOrder === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block text-center border-b pb-4 mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-wider">{process.env.NEXT_PUBLIC_STORE_NAME || 'E-Commerce'}</h2>
        <h3 className="text-lg font-semibold text-slate-700">Reseller Sales & Performance Report</h3>
        {(dateRange.from || dateRange.to) && (
          <p className="text-xs text-slate-500 mt-1">
            Period: {dateRange.from || 'Start'} to {dateRange.to || 'Today'}
          </p>
        )}
      </div>

      {/* Report Table Card */}
      <Card className="shadow-xs overflow-hidden print:border-none print:shadow-none">
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs md:text-sm text-center border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b text-muted-foreground font-semibold select-none">
                  <th className="p-2.5 text-center w-12 font-bold text-foreground">Rank</th>
                  <th
                    onClick={() => handleColumnSort('store')}
                    className="p-2.5 text-left font-bold text-foreground cursor-pointer hover:bg-muted/60 transition-colors"
                  >
                    Reseller Store {getSortIcon('store')}
                  </th>
                  <th className="p-2.5 text-left font-bold text-foreground">Owner</th>
                  <th
                    onClick={() => handleColumnSort('orders')}
                    className="p-2.5 font-bold text-foreground cursor-pointer hover:bg-muted/60 transition-colors"
                  >
                    Total Orders {getSortIcon('orders')}
                  </th>
                  <th
                    onClick={() => handleColumnSort('delivered')}
                    className="p-2.5 font-bold text-emerald-600 cursor-pointer hover:bg-muted/60 transition-colors"
                  >
                    Delivered {getSortIcon('delivered')}
                  </th>
                  <th
                    onClick={() => handleColumnSort('sales')}
                    className="p-2.5 font-bold text-primary cursor-pointer hover:bg-muted/60 transition-colors"
                  >
                    Sales Volume {getSortIcon('sales')}
                  </th>
                  <th
                    onClick={() => handleColumnSort('commission')}
                    className="p-2.5 font-bold text-amber-600 cursor-pointer hover:bg-muted/60 transition-colors"
                  >
                    Earned Commission {getSortIcon('commission')}
                  </th>
                  <th
                    onClick={() => handleColumnSort('wallet')}
                    className="p-2.5 font-bold text-foreground text-right cursor-pointer hover:bg-muted/60 transition-colors"
                  >
                    Wallet Balance {getSortIcon('wallet')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span>Loading reseller sales performance...</span>
                      </div>
                    </td>
                  </tr>
                ) : resellers.length > 0 ? (
                  resellers.map((r: any, idx: number) => {
                    const rank = idx + 1;
                    const isTop1 = rank === 1 && r.totalSales > 0;
                    const isTop2 = rank === 2 && r.totalSales > 0;
                    const isTop3 = rank === 3 && r.totalSales > 0;

                    return (
                      <tr
                        key={r._id}
                        className={`border-b border-muted/30 transition-colors ${
                          isTop1
                            ? 'bg-amber-500/5 hover:bg-amber-500/10'
                            : 'hover:bg-muted/30'
                        }`}
                      >
                        {/* Rank Badge */}
                        <td className="p-2.5 text-center">
                          {isTop1 ? (
                            <span className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full bg-amber-500/20 text-amber-700 font-bold text-xs border border-amber-500/30">
                              🥇 #1
                            </span>
                          ) : isTop2 ? (
                            <span className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full bg-slate-300/40 text-slate-700 font-bold text-xs border border-slate-400/30">
                              🥈 #2
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full bg-orange-400/20 text-orange-700 font-bold text-xs border border-orange-500/30">
                              🥉 #3
                            </span>
                          ) : (
                            <span className="inline-block text-xs font-semibold text-muted-foreground">
                              #{rank}
                            </span>
                          )}
                        </td>

                        {/* Store Info */}
                        <td className="p-2.5 text-left">
                          <div className="font-bold text-foreground flex items-center gap-1.5">
                            <Store className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{r.storeName}</span>
                            {r.status && r.status !== 'active' && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal capitalize">
                                {r.status}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                            <span>{r.subdomain}.{process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dhakafairprice.com'}</span>
                          </div>
                        </td>

                        {/* Owner Info */}
                        <td className="p-2.5 text-left">
                          <div className="font-medium text-foreground">{r.ownerName}</div>
                          {r.ownerPhone && (
                            <div className="text-[11px] text-muted-foreground">{r.ownerPhone}</div>
                          )}
                        </td>

                        {/* Total Orders */}
                        <td className="p-2.5 font-bold text-foreground">
                          {r.totalOrders}
                        </td>

                        {/* Delivered Orders */}
                        <td className="p-2.5 font-bold text-emerald-600">
                          {r.deliveredOrders}
                          {r.totalOrders > 0 && (
                            <span className="text-[10px] text-muted-foreground font-normal ml-1">
                              ({Math.round((r.deliveredOrders / r.totalOrders) * 100)}%)
                            </span>
                          )}
                        </td>

                        {/* Sales Volume */}
                        <td className="p-2.5 font-bold text-primary text-base">
                          {fmt(r.totalSales)}
                        </td>

                        {/* Earned Commission */}
                        <td className="p-2.5 font-bold text-amber-600">
                          {fmt(r.totalEarnedCommission ?? r.earnedCommission)}
                        </td>

                        {/* Wallet Balance */}
                        <td className="p-2.5 font-bold text-right text-foreground">
                          {fmt(r.walletBalance)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No reseller sales records found for the selected filter.
                    </td>
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
                <span>Loading reseller sales performance...</span>
              </div>
            ) : resellers.length > 0 ? (
              resellers.map((r: any, idx: number) => {
                const rank = idx + 1;
                return (
                  <ReportCard
                    key={r._id}
                    title={
                      <div className="flex items-center gap-1.5 font-bold text-sm">
                        <span className="text-xs font-black text-primary mr-1">#{rank}</span>
                        <Store className="h-4 w-4 text-primary shrink-0" />
                        <span>{r.storeName}</span>
                      </div>
                    }
                    badge={
                      <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                        {r.subdomain}
                      </span>
                    }
                    footer={
                      <div className="flex items-center justify-between w-full font-bold text-xs">
                        <span className="text-muted-foreground">Wallet Balance:</span>
                        <span className="text-foreground text-sm">{fmt(r.walletBalance)}</span>
                      </div>
                    }
                  >
                    <ReportRow
                      label="Owner"
                      value={
                        <div className="text-right">
                          <div>{r.ownerName}</div>
                          {r.ownerPhone && (
                            <div className="text-[11px] text-muted-foreground">{r.ownerPhone}</div>
                          )}
                        </div>
                      }
                    />
                    <ReportRow
                      label="Orders"
                      value={`${r.totalOrders} (Delivered: ${r.deliveredOrders})`}
                    />
                    <ReportRow
                      label="Sales Volume"
                      value={<span className="font-bold text-primary text-sm">{fmt(r.totalSales)}</span>}
                    />
                    <ReportRow
                      label="Earned Commission"
                      value={<span className="font-bold text-amber-600">{fmt(r.totalEarnedCommission ?? r.earnedCommission)}</span>}
                    />
                  </ReportCard>
                );
              })
            ) : (
              <div className="p-6 text-center text-muted-foreground text-xs">
                No reseller sales records found for the selected filter.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

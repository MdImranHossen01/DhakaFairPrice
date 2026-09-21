'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { CartesianGrid, Area, AreaChart, XAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  DollarSign,
  Users,
  ShoppingBag,
  AlertTriangle,
  Clock,
  Wallet,
  Loader2,
  TrendingUp,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Package,
  Layers,
  Sparkles,
  TrendingDown,
  RefreshCw,
  Landmark,
  Building2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { format, subDays, parseISO, isAfter, startOfToday } from 'date-fns';
import { AdminDashboardSkeleton } from '@/components/admin/AdminSkeletons';

const chartConfig = {
  revenue: {
    label: "Total Revenue",
    color: "var(--primary)",
  },
  profit: {
    label: "Gross Profit",
    color: "#10b981",
  },
  orders: {
    label: "Orders Count",
    color: "#f59e0b",
  },
  expense: {
    label: "Total Expenses",
    color: "#ef4444",
  },
} satisfies ChartConfig;

const CustomChartTooltip = ({ active, payload, label, activeChart }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const dateStr = label ? format(parseISO(label), 'dd MMMM yyyy') : '';

  return (
    <div className="bg-background/95 backdrop-blur-md border rounded-xl shadow-xl p-3.5 text-xs space-y-2 min-w-[200px]">
      <p className="font-bold text-foreground border-b pb-1.5">{dateStr}</p>
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Revenue:</span>
          <span className="font-bold text-primary">৳{Math.round(data.revenue || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Gross Profit:</span>
          <span className="font-bold text-emerald-600">৳{Math.round(data.profit || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Expense:</span>
          <span className="font-bold text-rose-600">৳{Math.round(data.expense || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Orders:</span>
          <span className="font-bold text-amber-600">{data.orders || 0}</span>
        </div>
        <div className="flex justify-between items-center border-t pt-1">
          <span className="font-semibold text-foreground">Net Income:</span>
          <span className={`font-bold ${(data.netIncome || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ৳{Math.round(data.netIncome || 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState<keyof typeof chartConfig>("revenue");

  // Date filter state
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });

  const [debouncedDateRange, setDebouncedDateRange] = useState(dateRange);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce date range changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDateRange(dateRange);
    }, 500);
    return () => clearTimeout(timer);
  }, [dateRange]);

  const handleDateChange = (key: 'from' | 'to', value: string) => {
    const newDate = parseISO(value);
    const today = startOfToday();

    if (isAfter(newDate, today)) {
      setDateRange(prev => ({ ...prev, [key]: format(today, 'yyyy-MM-dd') }));
      return;
    }

    setDateRange(prev => {
      const nextRange = { ...prev, [key]: value };
      const fromDate = parseISO(nextRange.from);
      const toDate = parseISO(nextRange.to);

      if (isAfter(fromDate, toDate)) {
        if (key === 'from') {
          return { ...nextRange, to: value };
        } else {
          return { ...nextRange, from: value };
        }
      }
      return nextRange;
    });
  };

  const setPresetRange = (days: number) => {
    setDateRange({
      from: format(subDays(new Date(), days), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const fetchStats = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        from: debouncedDateRange.from,
        to: debouncedDateRange.to,
      }).toString();

      const response = await fetch(`/api/admin/dashboard/stats?${query}`, {
        signal: controller.signal
      });
      if (response.ok) {
        const stats = await response.json();
        setData(stats);
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.message || `Failed to fetch: ${response.status}`);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Failed to fetch stats:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchStats();
  }, [debouncedDateRange]);

  const total = useMemo(() => {
    if (!data?.chartData) return { revenue: 0, profit: 0, orders: 0, expense: 0 };
    return {
      revenue: data.chartData.reduce((acc: number, curr: any) => acc + curr.revenue, 0),
      profit: data.chartData.reduce((acc: number, curr: any) => acc + curr.profit, 0),
      orders: data.chartData.reduce((acc: number, curr: any) => acc + curr.orders, 0),
      expense: data.chartData.reduce((acc: number, curr: any) => acc + curr.expense, 0),
    };
  }, [data]);

  const processedChartData = useMemo(() => {
    if (!data?.chartData) return [];

    const start = parseISO(dateRange.from);
    const end = parseISO(dateRange.to);
    const result = [];

    const dataMap = new Map(data.chartData.map((item: any) => [item.date, item]));

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = format(d, 'yyyy-MM-dd');
      const existing = dataMap.get(dateStr);
      if (existing) {
        result.push(existing);
      } else {
        result.push({
          date: dateStr,
          revenue: 0,
          profit: 0,
          orders: 0,
          expense: 0,
          netIncome: 0
        });
      }
    }
    return result;
  }, [data, dateRange]);

  if (loading && !data) {
    return <AdminDashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-8 w-8" />
          <h3 className="text-xl font-bold">Dashboard Error</h3>
        </div>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => fetchStats()}>Retry</Button>
      </div>
    );
  }

  const { stats, lowStockProducts, last7DaysStats } = data || {};

  return (
    <div className="flex-1 space-y-6 px-0 py-4 md:p-8">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Business Overview</h2>
          <p className="text-muted-foreground text-xs md:text-sm">
            E-commerce performance, financial ledgers, and order workflow.
            {lastUpdated && <span className="ml-2 opacity-70">(Updated at {lastUpdated})</span>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Presets */}
          <div className="hidden sm:flex items-center bg-muted/40 rounded-lg p-1 border">
            <button
              onClick={() => setPresetRange(7)}
              className="text-xs px-2.5 py-1 rounded hover:bg-background font-medium transition-colors"
            >
              7D
            </button>
            <button
              onClick={() => setPresetRange(30)}
              className="text-xs px-2.5 py-1 rounded hover:bg-background font-medium transition-colors"
            >
              30D
            </button>
            <button
              onClick={() => setPresetRange(90)}
              className="text-xs px-2.5 py-1 rounded hover:bg-background font-medium transition-colors"
            >
              90D
            </button>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border w-full sm:w-auto">
            <div className="flex items-center gap-1 px-2 shrink-0">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Range</span>
            </div>
            <div className="flex items-center gap-1 flex-1 sm:flex-initial">
              <Input
                type="date"
                className="h-8 w-full sm:w-32 border-none bg-transparent focus-visible:ring-0 cursor-pointer text-xs p-1"
                value={dateRange.from}
                onChange={(e) => handleDateChange('from', e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
              <span className="text-muted-foreground text-[10px] shrink-0">to</span>
              <Input
                type="date"
                className="h-8 w-full sm:w-32 border-none bg-transparent focus-visible:ring-0 cursor-pointer text-xs p-1"
                value={dateRange.to}
                onChange={(e) => handleDateChange('to', e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={fetchStats} className="h-10 px-3 font-semibold">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* 2. Core 6 Metric Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Sales & Revenue */}
        <div className="bg-card rounded-xl border p-4 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="text-sm font-bold text-foreground">Sales & Revenue</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="py-2 space-y-1.5 text-sm">
            <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-semibold">
              <span>Total Revenue:</span>
              <span className="font-bold">৳{Math.round(stats?.totalRevenue || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Paid / Delivered:</span>
              <span className="font-medium text-foreground">৳{Math.round(stats?.paidRevenue || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground text-xs">
              <span>Delivery Charges:</span>
              <span>৳{Math.round(stats?.totalDeliveryCharge || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground text-xs">
              <span>Sales Orders:</span>
              <span className="font-bold text-foreground">{stats?.salesCount || 0} orders</span>
            </div>
          </div>
        </div>

        {/* Card 2: Cost, Expense & Profit */}
        <div className="bg-card rounded-xl border p-4 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="text-sm font-bold text-foreground">Expenses & Profit</span>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="py-2 space-y-1.5 text-sm">
            <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 font-semibold">
              <span>Total Expenses:</span>
              <span className="font-bold">৳{Math.round(stats?.totalExpenses || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Product COGS (Cost):</span>
              <span className="font-medium text-foreground">৳{Math.round(stats?.totalCOGS || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-primary font-bold border-t pt-1">
              <span>Gross Profit:</span>
              <span>৳{Math.round(stats?.grossProfit || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Net Profit:</span>
              <span className={`font-bold ${(stats?.netProfit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ৳{Math.round(stats?.netProfit || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Orders Workflow */}
        <div className="bg-card rounded-xl border p-4 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="text-sm font-bold text-foreground">Orders Status</span>
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="py-2 space-y-1.5 text-sm">
            <Link href="/admin/orders" className="flex justify-between items-center text-orange-600 font-semibold hover:underline">
              <span>Pending Orders:</span>
              <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-bold">
                {stats?.pendingOrdersCount || 0}
              </Badge>
            </Link>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Processing / In-Transit:</span>
              <span className="font-medium text-foreground">{stats?.processingOrdersCount || 0}</span>
            </div>
            <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
              <span>Delivered Orders:</span>
              <span className="font-bold">{stats?.deliveredOrdersCount || 0}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground text-xs">
              <span>Cancelled:</span>
              <span>{stats?.cancelledOrdersCount || 0}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Customers & Resellers */}
        <div className="bg-card rounded-xl border p-4 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="text-sm font-bold text-foreground">Users & Resellers</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="py-2 space-y-1.5 text-sm">
            <Link href="/admin/users" className="flex justify-between items-center hover:underline">
              <span className="text-muted-foreground">Registered Customers:</span>
              <span className="font-bold text-foreground">{stats?.totalCustomers || 0}</span>
            </Link>
            <Link href="/admin/resellers" className="flex justify-between items-center hover:underline">
              <span className="text-muted-foreground">Active Resellers:</span>
              <span className="font-bold text-blue-600">{stats?.activeResellers || 0}</span>
            </Link>
            {(stats?.pendingResellers || 0) > 0 && (
              <Link href="/admin/resellers?status=pending" className="flex justify-between items-center hover:underline">
                <span className="text-orange-600 font-semibold flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Pending Approval:
                </span>
                <Badge className="bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-bold text-[10px] h-5">
                  {stats?.pendingResellers}
                </Badge>
              </Link>
            )}
            <div className="flex justify-between items-center text-muted-foreground text-xs">
              <span>Newsletter Subscribers:</span>
              <span className="font-medium text-foreground">{stats?.subscribersCount || 0}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground text-xs">
              <span>Reseller Wallet Total:</span>
              <span className="font-medium text-foreground">৳{Math.round(stats?.resellerWalletTotal || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Card 5: Liquid Accounts & Cash */}
        <div className="bg-card rounded-xl border p-4 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="text-sm font-bold text-foreground">Liquid Accounts</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600">
              <Landmark className="h-4 w-4" />
            </div>
          </div>
          <div className="py-2 space-y-1.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Cash in Hand:</span>
              <span className="font-bold text-foreground">৳{Math.round(stats?.cashBalance || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Bank Accounts:</span>
              <span className="font-bold text-foreground">৳{Math.round(stats?.bankBalance || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-1 font-bold text-primary">
              <span>Total Liquid Funds:</span>
              <span>৳{Math.round((stats?.cashBalance || 0) + (stats?.bankBalance || 0)).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Accounts Connected:</span>
              <span>{(stats?.cashAccountsCount || 0) + (stats?.bankAccountsList?.length || 0)}</span>
            </div>
          </div>
        </div>

        {/* Card 6: Inventory & Stock Health */}
        <div className="bg-card rounded-xl border p-4 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="text-sm font-bold text-foreground">Inventory & Stock</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="py-2 space-y-1.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Stock Units:</span>
              <span className="font-bold text-foreground">{(stats?.totalStockQuantity || 0).toLocaleString()} pcs</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Stock Value (at cost):</span>
              <span className="font-bold text-foreground">৳{Math.round(stats?.totalStockValue || 0).toLocaleString()}</span>
            </div>
            <Link href="/admin/products" className="flex justify-between items-center text-xs text-rose-600 font-semibold hover:underline border-t pt-1">
              <span className="flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> Low Stock Alerts:
              </span>
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                {lowStockProducts?.length || 0} items
              </Badge>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Assets & Liabilities (সম্পদ ও আর্থিক স্বাস্থ্য) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Total Assets Card */}
        <div className="bg-card rounded-xl border shadow-xs overflow-hidden">
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 py-2.5 px-4 flex items-center justify-between">
            <span className="font-bold text-emerald-700 dark:text-emerald-300 text-sm md:text-base flex items-center gap-1.5">
              <Landmark className="h-4 w-4" /> Business Assets Summary (মোট সম্পদ)
            </span>
            <Link 
              href="/admin/ledger/receivable" 
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400 uppercase tracking-wider hover:underline"
            >
              View Receivables &rarr;
            </Link>
          </div>
          <div className="p-4 space-y-2 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-muted">
              <Link href="/admin/inventory" className="text-muted-foreground hover:text-foreground transition-colors">
                Current Inventory Stock Value:
              </Link>
              <span className="font-medium text-foreground">৳{Math.round(stats?.totalStockValue || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-muted">
              <Link href="/admin/ledger/receivable" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                Accounts Receivable / Pending Orders:
              </Link>
              <Link href="/admin/ledger/receivable" className="font-bold text-primary hover:underline">
                ৳{Math.round(stats?.totalReceivable || 0).toLocaleString()}
              </Link>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-muted">
              <Link href="/admin/accounts" className="text-muted-foreground hover:text-foreground transition-colors">
                Cash in Hand & Bank Balances:
              </Link>
              <span className="font-medium text-foreground">৳{Math.round((stats?.cashBalance || 0) + (stats?.bankBalance || 0)).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-2 font-bold text-base text-emerald-600 dark:text-emerald-400">
              <span>Total Assets (মোট সম্পদ):</span>
              <span>৳{Math.round(stats?.totalAssetValue || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Financial Flow & Reseller Liabilities Card */}
        <div className="bg-card rounded-xl border shadow-xs overflow-hidden">
          <div className="bg-sky-500/10 border-b border-sky-500/20 py-2.5 px-4 flex items-center justify-between">
            <span className="font-bold text-sky-700 dark:text-sky-300 text-sm md:text-base flex items-center gap-1.5">
              <Wallet className="h-4 w-4" /> Payables & Reseller Liabilities (দায় ও বকেয়া)
            </span>
            <Link 
              href="/admin/ledger/payable" 
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 dark:hover:text-sky-400 uppercase tracking-wider hover:underline"
            >
              View Payables &rarr;
            </Link>
          </div>
          <div className="p-4 space-y-2 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-muted">
              <Link href="/admin/ledger/payable" className="text-muted-foreground hover:text-foreground transition-colors">
                Reseller Wallet Balances (Cleared):
              </Link>
              <span className="font-medium text-foreground">৳{Math.round(stats?.resellerWalletTotal || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-muted">
              <span className="text-muted-foreground">Pending In-Transit Reseller Profits:</span>
              <span className="font-medium text-foreground">৳{Math.round(stats?.resellerPendingTotal || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-2 font-bold text-base text-sky-600 dark:text-sky-400">
              <span>Total Payable Obligations:</span>
              <span>৳{Math.round(stats?.resellerWalletTotal || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Interactive Performance Trends Graph */}
      <Card className="col-span-full shadow-xs">
        <CardHeader className="flex flex-col items-stretch border-b p-0 sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-4 py-4 md:px-6 md:py-6">
            <CardTitle className="text-lg md:text-xl">Performance Trends</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Daily business metrics and trends comparison over the selected range.
            </CardDescription>
          </div>
          <div className="flex overflow-x-auto border-t sm:border-t-0 no-scrollbar">
            {[
              { key: "revenue", label: "Revenue", val: `৳${Math.round(total.revenue).toLocaleString()}` },
              { key: "profit", label: "Gross Profit", val: `৳${Math.round(total.profit).toLocaleString()}` },
              { key: "orders", label: "Sales Orders", val: total.orders.toLocaleString() },
              { key: "expense", label: "Expenses", val: `৳${Math.round(total.expense).toLocaleString()}` }
            ].map((item) => {
              const chart = item.key as keyof typeof chartConfig;
              return (
                <button
                  key={chart}
                  data-active={activeChart === chart}
                  className="flex flex-1 flex-col justify-center gap-1 border-r px-4 py-3 text-left data-[active=true]:bg-muted/50 sm:px-6 sm:py-4 transition-colors shrink-0"
                  onClick={() => setActiveChart(chart)}
                >
                  <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
                  <span className="text-sm sm:text-base font-bold leading-none text-foreground">{item.val}</span>
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <ChartContainer config={chartConfig} className="aspect-auto h-[280px] md:h-[340px] w-full">
            <AreaChart data={processedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="fillExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                minTickGap={28}
                tickFormatter={(value) => format(parseISO(value), 'dd MMM')}
              />
              <Tooltip content={<CustomChartTooltip activeChart={activeChart} />} />
              <ReferenceLine
                y={(total[activeChart] || 0) / (processedChartData?.length || 1)}
                label={{ value: 'Avg', position: 'insideRight', fill: 'var(--muted-foreground)', fontSize: 10 }}
                stroke="var(--muted-foreground)"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <Area
                dataKey="revenue"
                type="monotone"
                fill="url(#fillRevenue)"
                stroke="var(--primary)"
                strokeWidth={2}
                hide={activeChart !== "revenue"}
              />
              <Area
                dataKey="profit"
                type="monotone"
                fill="url(#fillProfit)"
                stroke="#10b981"
                strokeWidth={2}
                hide={activeChart !== "profit"}
              />
              <Area
                dataKey="orders"
                type="monotone"
                fill="url(#fillOrders)"
                stroke="#f59e0b"
                strokeWidth={2}
                hide={activeChart !== "orders"}
              />
              <Area
                dataKey="expense"
                type="monotone"
                fill="url(#fillExpense)"
                stroke="#ef4444"
                strokeWidth={2}
                hide={activeChart !== "expense"}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* 5. Last 7 Days Daily Performance Matrix Table / Mobile Cards */}
      <div className="bg-card rounded-xl border shadow-xs overflow-hidden">
        <div className="bg-muted/40 py-2.5 px-3 sm:px-4 flex items-center justify-between border-b">
          <span className="font-bold text-foreground text-xs sm:text-sm md:text-base flex items-center gap-1.5 truncate">
            <Clock className="h-4 w-4 text-primary shrink-0" /> Last 7 Days Breakdown (গত ৭ দিন)
          </span>
          <Badge variant="outline" className="text-[10px] sm:text-xs">Live Matrix</Badge>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto p-3">
          <table className="w-full min-w-[600px] border-collapse text-xs md:text-sm text-center">
            <thead>
              <tr className="border-b bg-muted/20 text-muted-foreground font-semibold">
                <th className="p-2.5 text-left font-bold text-foreground">Date (তারিখ)</th>
                <th className="p-2.5 font-bold text-emerald-600">Sales Revenue</th>
                <th className="p-2.5 font-bold text-blue-600">Collected</th>
                <th className="p-2.5 font-bold text-amber-600">Orders</th>
                <th className="p-2.5 font-bold text-rose-600">Expenses</th>
                <th className="p-2.5 font-bold text-primary text-right">Net Daily</th>
              </tr>
            </thead>
            <tbody>
              {last7DaysStats && last7DaysStats.length > 0 ? (
                last7DaysStats.map((day: any) => (
                  <tr key={day.date} className="border-b border-muted/30 hover:bg-muted/30 transition-colors">
                    <td className="p-2.5 text-left font-medium text-foreground">{day.displayDate}</td>
                    <td className="p-2.5 font-semibold text-emerald-600">৳{Math.round(day.sales || 0).toLocaleString()}</td>
                    <td className="p-2.5 font-medium text-foreground">৳{Math.round(day.collected || 0).toLocaleString()}</td>
                    <td className="p-2.5 font-bold text-foreground">{day.orders || 0}</td>
                    <td className="p-2.5 font-medium text-rose-600">৳{Math.round(day.expense || 0).toLocaleString()}</td>
                    <td className={`p-2.5 font-bold text-right ${(day.net || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ৳{Math.round(day.net || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground italic">No data recorded for the last 7 days.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="sm:hidden p-2 space-y-2">
          {last7DaysStats && last7DaysStats.length > 0 ? (
            last7DaysStats.map((day: any) => (
              <div key={day.date} className="bg-background border border-border/80 rounded-lg p-2.5 text-xs space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between font-bold border-b pb-1">
                  <span className="text-foreground">{day.displayDate}</span>
                  <span className={(day.net || 0) >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                    Net: ৳{Math.round(day.net || 0).toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Revenue:</span>
                    <span className="font-semibold text-emerald-600">৳{Math.round(day.sales || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Collected:</span>
                    <span className="font-semibold text-foreground">৳{Math.round(day.collected || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Orders:</span>
                    <span className="font-semibold text-amber-600">{day.orders || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expense:</span>
                    <span className="font-semibold text-rose-600">৳{Math.round(day.expense || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground italic text-xs">No data recorded.</div>
          )}
        </div>
      </div>
    </div>
  );
}

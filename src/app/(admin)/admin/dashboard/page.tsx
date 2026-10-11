'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Bar,
  BarChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  Package,
  RefreshCw,
  Landmark,
  AlertCircle,
  BarChart3,
  Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useSession } from 'next-auth/react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { format, subDays, parseISO, isAfter, startOfToday } from 'date-fns';
import { AdminDashboardSkeleton } from '@/components/admin/AdminSkeletons';

// Overview / Performance Trends Chart Config
const chartConfig = {
  revenue: {
    label: 'Total Revenue',
    color: 'var(--primary)',
  },
  profit: {
    label: 'Gross Profit',
    color: '#10b981',
  },
  orders: {
    label: 'Orders Count',
    color: '#f59e0b',
  },
  expense: {
    label: 'Total Expenses',
    color: '#ef4444',
  },
} satisfies ChartConfig;

// Expense Breakdown Chart Config
const expenseChartConfig = {
  cogs: {
    label: 'Product COGS',
    color: 'var(--chart-1)',
  },
  logistics: {
    label: 'Logistics',
    color: 'var(--chart-4)',
  },
  other: {
    label: 'Other Expenses',
    color: 'var(--chart-5)',
  },
} satisfies ChartConfig;

// Orders Status Chart Config
const orderStatusChartConfig = {
  pending: {
    label: 'Pending',
    color: 'var(--chart-4)',
  },
  processing: {
    label: 'Processing',
    color: 'var(--chart-1)',
  },
  delivered: {
    label: 'Delivered',
    color: 'var(--chart-2)',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'var(--chart-5)',
  },
} satisfies ChartConfig;

// Users & Resellers Chart Config
const usersChartConfig = {
  customers: {
    label: 'Customers',
    color: 'var(--chart-1)',
  },
  resellers: {
    label: 'Resellers',
    color: 'var(--chart-2)',
  },
  pending: {
    label: 'Pending',
    color: 'var(--chart-4)',
  },
} satisfies ChartConfig;

// Liquid Accounts Chart Config
const liquidAccountsChartConfig = {
  cash: {
    label: 'Cash in Hand',
    color: 'var(--chart-2)',
  },
  bank: {
    label: 'Bank Accounts',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

// Business Assets Chart Config
const assetsChartConfig = {
  inventory: {
    label: 'Inventory Value',
    color: 'var(--chart-2)',
  },
  receivables: {
    label: 'Receivables',
    color: 'var(--chart-1)',
  },
  liquid: {
    label: 'Liquid Funds',
    color: 'var(--chart-3)',
  },
} satisfies ChartConfig;

// Payables Chart Config
const payablesChartConfig = {
  cleared: {
    label: 'Reseller Cleared',
    color: 'var(--chart-1)',
  },
  transit: {
    label: 'In-Transit Profit',
    color: 'var(--chart-4)',
  },
  loans: {
    label: 'Business Loans',
    color: 'var(--chart-5)',
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
  const { data: session } = useSession();
  const userName = session?.user?.name ? session.user.name.split(' ')[0] : 'Admin';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState<keyof typeof chartConfig>('revenue');

  // Date filter state
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });

  const [debouncedDateRange, setDebouncedDateRange] = useState(dateRange);
  const abortControllerRef = useRef<AbortController | null>(null);

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
        signal: controller.signal,
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
          netIncome: 0,
        });
      }
    }
    return result;
  }, [data, dateRange]);

  // Expense breakdown items
  const expenseData = useMemo(() => {
    const cogs = data?.stats?.totalCOGS || 0;
    const delivery = data?.stats?.totalDeliveryCharge || 0;
    const totalExp = data?.stats?.totalExpenses || 0;
    const other = Math.max(0, totalExp - cogs - delivery);

    return [
      { type: 'cogs', label: 'Product COGS', amount: cogs, fill: 'var(--color-cogs)' },
      { type: 'logistics', label: 'Logistics', amount: delivery, fill: 'var(--color-logistics)' },
      { type: 'other', label: 'Other Expenses', amount: other, fill: 'var(--color-other)' },
    ].filter(d => d.amount > 0);
  }, [data?.stats]);

  // Orders status items
  const orderStatusData = useMemo(() => {
    const pending = data?.stats?.pendingOrdersCount || 0;
    const processing = data?.stats?.processingOrdersCount || 0;
    const delivered = data?.stats?.deliveredOrdersCount || 0;
    const cancelled = data?.stats?.cancelledOrdersCount || 0;

    return [
      { status: 'pending', count: pending, fill: 'var(--color-pending)' },
      { status: 'processing', count: processing, fill: 'var(--color-processing)' },
      { status: 'delivered', count: delivered, fill: 'var(--color-delivered)' },
      { status: 'cancelled', count: cancelled, fill: 'var(--color-cancelled)' },
    ].filter(d => d.count > 0);
  }, [data?.stats]);

  // Users Horizontal Chart Data
  const usersChartData = useMemo(() => {
    return [
      { category: 'Customers', count: data?.stats?.totalCustomers || 0, fill: 'var(--color-customers)' },
      { category: 'Resellers', count: data?.stats?.activeResellers || 0, fill: 'var(--color-resellers)' },
      { category: 'Pending', count: data?.stats?.pendingResellers || 0, fill: 'var(--color-pending)' },
    ];
  }, [data?.stats]);

  // Liquid Accounts Chart Data
  const liquidAccountsData = useMemo(() => {
    const cash = Math.max(0, data?.stats?.cashBalance || 0);
    const bank = Math.max(0, data?.stats?.bankBalance || 0);
    return [
      { account: 'Cash', balance: cash, fill: 'var(--color-cash)' },
      { account: 'Bank', balance: bank, fill: 'var(--color-bank)' },
    ];
  }, [data?.stats]);

  // Assets Distribution Chart Data
  const assetsDistributionData = useMemo(() => {
    const inv = data?.stats?.totalStockValue || 0;
    const rec = data?.stats?.totalReceivable || 0;
    const liquid = Math.max(0, (data?.stats?.cashBalance || 0) + (data?.stats?.bankBalance || 0));

    return [
      { name: 'Inventory', value: inv, fill: 'var(--color-inventory)' },
      { name: 'Receivables', value: rec, fill: 'var(--color-receivables)' },
      { name: 'Liquid Funds', value: liquid, fill: 'var(--color-liquid)' },
    ].filter(d => d.value > 0);
  }, [data?.stats]);

  // Payables Distribution Chart Data
  const payablesDistributionData = useMemo(() => {
    const cleared = data?.stats?.resellerWalletTotal || 0;
    const transit = data?.stats?.resellerPendingTotal || 0;
    const loans = data?.stats?.totalActiveLoansDue || 0;

    return [
      { type: 'Cleared', amount: cleared, fill: 'var(--color-cleared)' },
      { type: 'In-Transit', amount: transit, fill: 'var(--color-transit)' },
      { type: 'Loans', amount: loans, fill: 'var(--color-loans)' },
    ].filter(d => d.amount > 0);
  }, [data?.stats]);

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
    <div className="flex-1 space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Welcome Back{userName ? `, ${userName}` : ''}! 👋
          </h2>
          {lastUpdated && (
            <p className="text-muted-foreground text-xs opacity-70 mt-1">
              Updated at {lastUpdated}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Quick Presets */}
          <div className="hidden sm:flex items-center bg-muted/40 rounded-lg p-0.5 border h-8">
            <button
              onClick={() => setPresetRange(7)}
              className="text-[11px] px-2 py-0.5 rounded hover:bg-background font-semibold transition-colors"
            >
              7D
            </button>
            <button
              onClick={() => setPresetRange(30)}
              className="text-[11px] px-2 py-0.5 rounded hover:bg-background font-semibold transition-colors"
            >
              30D
            </button>
            <button
              onClick={() => setPresetRange(90)}
              className="text-[11px] px-2 py-0.5 rounded hover:bg-background font-semibold transition-colors"
            >
              90D
            </button>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-lg border h-8 w-full sm:w-auto">
            <div className="flex items-center gap-1 shrink-0">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Range</span>
            </div>
            <div className="flex items-center gap-1 flex-1 sm:flex-initial">
              <Input
                type="date"
                className="h-6 w-full sm:w-28 border-none bg-transparent focus-visible:ring-0 cursor-pointer text-[11px] p-0"
                value={dateRange.from}
                onChange={(e) => handleDateChange('from', e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
              <span className="text-muted-foreground text-[9px] shrink-0 font-medium">to</span>
              <Input
                type="date"
                className="h-6 w-full sm:w-28 border-none bg-transparent focus-visible:ring-0 cursor-pointer text-[11px] p-0"
                value={dateRange.to}
                onChange={(e) => handleDateChange('to', e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>

          <Button variant="outline" size="icon" onClick={fetchStats} className="h-8 w-8 rounded-lg shrink-0" title="Refresh">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* 2. Top KPI Cards (Rich Colorful & Fully Dynamic) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-card border border-blue-500/30 dark:border-blue-500/20 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-blue-500/50 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="p-3.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl shadow-md shadow-blue-500/20">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Total Sales</p>
              <h3 className="text-2xl font-black text-foreground mt-1">
                ৳{Math.round(stats?.totalRevenue || 0).toLocaleString()}
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-blue-500/20 mt-4">
            {(() => {
              const g = stats?.growth?.revenue ?? 0;
              return (
                <span className={`text-xs font-bold flex items-center gap-1 ${g >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {g >= 0 ? `↑ +${g}%` : `↓ ${g}%`}{' '}
                  <span className="text-muted-foreground font-normal">vs. previous period</span>
                </span>
              );
            })()}
            <BarChart3 className="h-4 w-4 text-blue-500 opacity-70" />
          </div>
        </div>

        {/* Total Expenses Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-sky-500/15 via-blue-500/10 to-card border border-sky-500/30 dark:border-sky-500/20 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-sky-500/50 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="p-3.5 bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
              <Wallet className="h-6 w-6" />
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">Total Expenses</p>
              <h3 className="text-2xl font-black text-foreground mt-1">
                ৳{Math.round(stats?.totalExpenses || 0).toLocaleString()}
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-sky-500/20 mt-4">
            {(() => {
              const g = stats?.growth?.expense ?? 0;
              return (
                <span className={`text-xs font-bold flex items-center gap-1 ${g <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {g <= 0 ? `↓ ${g}%` : `↑ +${g}%`}{' '}
                  <span className="text-muted-foreground font-normal">vs. previous period</span>
                </span>
              );
            })()}
            <BarChart3 className="h-4 w-4 text-sky-500 opacity-70" />
          </div>
        </div>

        {/* Pending Orders Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-card border border-amber-500/30 dark:border-amber-500/20 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-amber-500/50 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="p-3.5 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl shadow-md shadow-amber-500/20">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Pending Orders</p>
              <h3 className="text-2xl font-black text-foreground mt-1">
                {stats?.pendingOrdersCount || 0}
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-amber-500/20 mt-4">
            {(() => {
              const g = stats?.growth?.orders ?? 0;
              return (
                <span className={`text-xs font-bold flex items-center gap-1 ${g >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {g >= 0 ? `↗ +${g}%` : `↘ ${g}%`}{' '}
                  <span className="text-muted-foreground font-normal">vs. previous period</span>
                </span>
              );
            })()}
            <Clock className="h-4 w-4 text-amber-500 opacity-70" />
          </div>
        </div>

        {/* Pending Payouts Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-rose-500/15 via-red-500/10 to-card border border-rose-500/30 dark:border-rose-500/20 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-rose-500/50 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="p-3.5 bg-gradient-to-br from-rose-500 to-red-600 text-white rounded-xl shadow-md shadow-rose-500/20">
              <Wallet className="h-6 w-6" />
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Pending Payouts</p>
              <h3 className="text-2xl font-black text-foreground mt-1">
                ৳{Math.round(stats?.pendingPayoutsTotal || stats?.resellerPendingTotal || 0).toLocaleString()}
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-rose-500/20 mt-4">
            <span className="text-xs font-bold flex items-center gap-1 text-rose-600 dark:text-rose-400">
              {stats?.pendingPayoutsCount ? `${stats.pendingPayoutsCount} requests` : '0 requests'}{' '}
              <span className="text-muted-foreground font-normal">awaiting release</span>
            </span>
            <Coins className="h-4 w-4 text-rose-500 opacity-70" />
          </div>
        </div>
      </div>

      {/* 3. Expense Breakdown & Orders Status Visual Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Expense Breakdown Donut Chart */}
        <Card className="shadow-xs rounded-2xl border">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Expense Breakdown
            </CardTitle>
            <CardDescription className="text-xs">Distribution of business expenses</CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-1/2 h-[160px] relative flex items-center justify-center">
              <ChartContainer config={expenseChartConfig} className="mx-auto aspect-square h-[155px] w-[155px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={expenseData.length > 0 ? expenseData : [{ type: 'cogs', amount: 1, fill: 'var(--muted)' }]}
                    dataKey="amount"
                    nameKey="type"
                    innerRadius={42}
                    outerRadius={62}
                    strokeWidth={3}
                    stroke="var(--background)"
                  />
                </PieChart>
              </ChartContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-xs font-black text-foreground">
                  ৳{Math.round(stats?.totalExpenses || 0).toLocaleString()}
                </span>
                <span className="text-[9px] text-muted-foreground font-semibold uppercase">Expenses</span>
              </div>
            </div>

            <div className="w-full sm:w-1/2 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--chart-1)]" /> Product COGS
                </span>
                <span className="font-bold text-foreground">
                  ৳{Math.round(stats?.totalCOGS || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--chart-4)]" /> Logistics
                </span>
                <span className="font-bold text-foreground">
                  ৳{Math.round(stats?.totalDeliveryCharge || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--chart-5)]" /> Other Expenses
                </span>
                <span className="font-bold text-foreground">
                  ৳{Math.round(Math.max(0, (stats?.totalExpenses || 0) - (stats?.totalCOGS || 0) - (stats?.totalDeliveryCharge || 0))).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Status Donut Chart */}
        <Card className="shadow-xs rounded-2xl border">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              Orders Status
            </CardTitle>
            <CardDescription className="text-xs">Live order workflow tracking</CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-1/2 h-[160px] relative flex items-center justify-center">
              <ChartContainer config={orderStatusChartConfig} className="mx-auto aspect-square h-[155px] w-[155px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={orderStatusData.length > 0 ? orderStatusData : [{ status: 'pending', count: 1, fill: 'var(--muted)' }]}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={42}
                    outerRadius={62}
                    strokeWidth={3}
                    stroke="var(--background)"
                  />
                </PieChart>
              </ChartContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-foreground">
                  {stats?.pendingOrdersCount || 0}
                </span>
                <span className="text-[9px] text-muted-foreground font-semibold uppercase">Pending</span>
              </div>
            </div>

            <div className="w-full sm:w-1/2 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--chart-4)]" /> Pending
                </span>
                <span className="font-bold text-foreground">{stats?.pendingOrdersCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--chart-1)]" /> Processing
                </span>
                <span className="font-bold text-foreground">{stats?.processingOrdersCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--chart-2)]" /> Delivered
                </span>
                <span className="font-bold text-foreground">{stats?.deliveredOrdersCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--chart-5)]" /> Cancelled
                </span>
                <span className="font-bold text-foreground">{stats?.cancelledOrdersCount || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Row: Users & Resellers, Liquid Accounts, Inventory & Stock with Visual Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Users & Resellers with Visual Horizontal Bar Chart */}
        <div className="bg-card rounded-2xl border p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                  <Users className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold text-foreground">Users & Resellers</span>
              </div>
              <Link href="/admin/users" className="text-xs font-semibold text-primary hover:underline">
                View Details &rarr;
              </Link>
            </div>

            {/* Visual Horizontal Bar Chart */}
            <div className="py-3">
              <ChartContainer config={usersChartConfig} className="aspect-auto h-[100px] w-full">
                <BarChart
                  accessibilityLayer
                  data={usersChartData}
                  layout="vertical"
                  margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="category"
                    type="category"
                    tickLine={false}
                    tickMargin={6}
                    axisLine={false}
                    fontSize={11}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="count" radius={4}>
                    {usersChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-muted/50 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Subscribers:</span>
              <span className="font-semibold text-foreground">{stats?.subscribersCount || 0}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Reseller Wallet:</span>
              <span className="font-bold text-foreground">৳{Math.round(stats?.resellerWalletTotal || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Liquid Accounts with Visual Donut Chart */}
        <div className="bg-card rounded-2xl border p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                  <Landmark className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold text-foreground">Liquid Accounts</span>
              </div>
              <Link href="/admin/accounts" className="text-xs font-semibold text-primary hover:underline">
                View Details &rarr;
              </Link>
            </div>

            {/* Visual Donut Chart */}
            <div className="py-2 flex items-center justify-center gap-4">
              <div className="w-[100px] h-[100px] relative flex items-center justify-center shrink-0">
                <ChartContainer config={liquidAccountsChartConfig} className="mx-auto aspect-square h-[95px] w-[95px]">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={liquidAccountsData.some(d => d.balance > 0) ? liquidAccountsData : [{ account: 'Cash', balance: 1, fill: 'var(--muted)' }]}
                      dataKey="balance"
                      nameKey="account"
                      innerRadius={28}
                      outerRadius={44}
                      strokeWidth={2}
                      stroke="var(--background)"
                    />
                  </PieChart>
                </ChartContainer>
                <Coins className="h-4 w-4 text-indigo-500 absolute opacity-70" />
              </div>

              <div className="flex-1 space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-[var(--chart-2)]" /> Cash
                  </span>
                  <span className="font-bold text-foreground">৳{Math.round(stats?.cashBalance || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-[var(--chart-1)]" /> Bank
                  </span>
                  <span className="font-bold text-foreground">৳{Math.round(stats?.bankBalance || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-muted/50">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 flex justify-between items-center text-xs font-bold text-amber-700 dark:text-amber-300">
              <span>Total Liquid Funds:</span>
              <span>৳{Math.round((stats?.cashBalance || 0) + (stats?.bankBalance || 0)).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Inventory & Stock with Visual Progress / Metrics */}
        <div className="bg-card rounded-2xl border p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                  <Package className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold text-foreground">Inventory & Stock</span>
              </div>
              <Link href="/admin/products" className="text-xs font-semibold text-primary hover:underline">
                View Details &rarr;
              </Link>
            </div>

            {/* Visual Stock Metrics with Progress Bars */}
            <div className="py-3 space-y-3">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-muted-foreground">Total Stock Units</span>
                  <span className="font-bold text-foreground">{(stats?.totalStockQuantity || 0).toLocaleString()} pcs</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full w-full" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-muted-foreground">Stock Value (at cost)</span>
                  <span className="font-bold text-foreground">৳{Math.round(stats?.totalStockValue || 0).toLocaleString()}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-full rounded-full w-[85%]" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-muted/50 flex justify-between items-center text-xs">
            <span className="text-rose-600 font-semibold flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> Low Stock Alerts:
            </span>
            <Badge variant="destructive" className="h-5 px-2 text-[10px] font-bold">
              {lowStockProducts?.length || 0} items
            </Badge>
          </div>
        </div>
      </div>

      {/* 5. Row: Business Assets Summary & Payables / Liabilities with Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Business Assets Summary with Visual Donut Breakdown */}
        <div className="bg-card rounded-2xl border shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-emerald-500/10 border-b border-emerald-500/20 py-3 px-4 flex items-center justify-between">
              <span className="font-bold text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-1.5">
                <Landmark className="h-4 w-4" /> Business Assets Summary
              </span>
              <Link
                href="/admin/ledger/receivable"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400 uppercase tracking-wider hover:underline"
              >
                View &rarr;
              </Link>
            </div>

            {/* Visual Donut Chart + List */}
            <div className="p-4 flex items-center gap-4">
              <div className="w-[100px] h-[100px] relative flex items-center justify-center shrink-0">
                <ChartContainer config={assetsChartConfig} className="mx-auto aspect-square h-[95px] w-[95px]">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={assetsDistributionData.length > 0 ? assetsDistributionData : [{ name: 'Inventory', value: 1, fill: 'var(--muted)' }]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={28}
                      outerRadius={45}
                      strokeWidth={2}
                      stroke="var(--background)"
                    />
                  </PieChart>
                </ChartContainer>
              </div>

              <div className="flex-1 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-muted-foreground truncate">
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--chart-2)] shrink-0" /> Inventory Stock:
                  </span>
                  <span className="font-semibold text-foreground">৳{Math.round(stats?.totalStockValue || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-muted-foreground truncate">
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--chart-1)] shrink-0" /> Accounts Receivable:
                  </span>
                  <span className="font-bold text-primary">৳{Math.round(stats?.totalReceivable || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-muted-foreground truncate">
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--chart-3)] shrink-0" /> Cash & Bank Balances:
                  </span>
                  <span className="font-semibold text-foreground">৳{Math.round((stats?.cashBalance || 0) + (stats?.bankBalance || 0)).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-500/5 border-t border-emerald-500/10 flex justify-between items-center font-bold text-sm text-emerald-600 dark:text-emerald-400">
            <span>Total Assets:</span>
            <span className="text-base">৳{Math.round(stats?.totalAssetValue || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Payables & Reseller Liabilities with Visual Horizontal Bars */}
        <div className="bg-card rounded-2xl border shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-sky-500/10 border-b border-sky-500/20 py-3 px-4 flex items-center justify-between">
              <span className="font-bold text-sky-700 dark:text-sky-300 text-sm flex items-center gap-1.5">
                <Wallet className="h-4 w-4" /> Payables & Reseller Liabilities
              </span>
              <Link
                href="/admin/ledger/payable"
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 dark:hover:text-sky-400 uppercase tracking-wider hover:underline"
              >
                View &rarr;
              </Link>
            </div>

            {/* Visual Horizontal Comparative Bar */}
            <div className="p-4 space-y-3">
              <ChartContainer config={payablesChartConfig} className="aspect-auto h-[80px] w-full">
                <BarChart
                  accessibilityLayer
                  data={payablesDistributionData}
                  layout="vertical"
                  margin={{ left: 10, right: 20, top: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="type"
                    type="category"
                    tickLine={false}
                    tickMargin={6}
                    axisLine={false}
                    fontSize={11}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="amount" radius={4}>
                    {payablesDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>

              <div className="space-y-1.5 text-xs border-t pt-2">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[var(--chart-1)] shrink-0" /> Reseller Wallets (Cleared):</span>
                  <span className="font-semibold text-foreground">৳{Math.round(stats?.resellerWalletTotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[var(--chart-4)] shrink-0" /> In-Transit Reseller Profits:</span>
                  <span className="font-semibold text-foreground">৳{Math.round(stats?.resellerPendingTotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[var(--chart-5)] shrink-0" /> Business Loans (Active):</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">৳{Math.round(stats?.totalActiveLoansDue || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-sky-500/5 border-t border-sky-500/10 flex justify-between items-center font-bold text-sm text-sky-600 dark:text-sky-400">
            <span>Total Payable Obligations:</span>
            <span className="text-base">৳{Math.round((stats?.resellerWalletTotal || 0) + (stats?.totalActiveLoansDue || 0)).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 6. ORIGINAL UNTOUCHED PERFORMANCE TRENDS CHART RESTORED FULL-WIDTH */}
      <Card className="shadow-xs rounded-2xl border overflow-hidden">
        <CardHeader className="flex flex-col items-stretch border-b p-0 sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-4 py-4 md:px-6 md:py-6">
            <CardTitle className="text-lg md:text-xl">Performance Trends</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Daily business metrics, dynamic average lines, and net ledger balances.
            </CardDescription>
          </div>
          <div className="flex overflow-x-auto border-t sm:border-t-0 no-scrollbar">
            {[
              { key: 'revenue', label: 'Revenue', val: `৳${Math.round(total.revenue).toLocaleString()}` },
              { key: 'profit', label: 'Gross Profit', val: `৳${Math.round(total.profit).toLocaleString()}` },
              { key: 'orders', label: 'Sales Orders', val: total.orders.toLocaleString() },
              { key: 'expense', label: 'Expenses', val: `৳${Math.round(total.expense).toLocaleString()}` },
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
                hide={activeChart !== 'revenue'}
              />
              <Area
                dataKey="profit"
                type="monotone"
                fill="url(#fillProfit)"
                stroke="#10b981"
                strokeWidth={2}
                hide={activeChart !== 'profit'}
              />
              <Area
                dataKey="orders"
                type="monotone"
                fill="url(#fillOrders)"
                stroke="#f59e0b"
                strokeWidth={2}
                hide={activeChart !== 'orders'}
              />
              <Area
                dataKey="expense"
                type="monotone"
                fill="url(#fillExpense)"
                stroke="#ef4444"
                strokeWidth={2}
                hide={activeChart !== 'expense'}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* 7. Last 7 Days Daily Performance Matrix Table */}
      <div className="bg-card rounded-2xl border shadow-xs overflow-hidden">
        <div className="bg-muted/40 py-3 px-4 flex items-center justify-between border-b">
          <span className="font-bold text-foreground text-xs sm:text-sm flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-primary shrink-0" /> Last 7 Days Breakdown
          </span>
          <Badge variant="outline" className="text-[10px]">Live Matrix</Badge>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto p-3">
          <table className="w-full min-w-[600px] border-collapse text-xs md:text-sm text-center">
            <thead>
              <tr className="border-b bg-muted/20 text-muted-foreground font-semibold">
                <th className="p-2.5 text-left font-bold text-foreground">Date</th>
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
        <div className="sm:hidden p-2.5 space-y-2">
          {last7DaysStats && last7DaysStats.length > 0 ? (
            last7DaysStats.map((day: any) => (
              <div key={day.date} className="bg-background border border-border/80 rounded-xl p-3 text-xs space-y-2 shadow-2xs">
                <div className="flex items-center justify-between font-bold border-b pb-1.5">
                  <span className="text-foreground">{day.displayDate}</span>
                  <span className={(day.net || 0) >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                    Net: ৳{Math.round(day.net || 0).toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-0.5 text-[11px]">
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

'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Area,
  AreaChart,
  Pie,
  PieChart,
  CartesianGrid,
  XAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ShoppingBag,
  Wallet,
  Clock,
  Loader2,
  TrendingUp,
  Filter,
  Package,
  RefreshCcw,
  Coins,
  BarChart3,
  Copy,
  ExternalLink,
  Store,
  Activity,
  CheckCircle2,
  AlertCircle,
  Tag,
  CreditCard,
  ArrowUpRight,
  Landmark,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { format, subDays, parseISO, isAfter, startOfToday } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

// Main Trend AreaChart Config
const trendChartConfig = {
  revenue: {
    label: 'Store Sales',
    color: 'var(--primary)',
  },
  commission: {
    label: 'Commissions',
    color: '#10b981',
  },
  orders: {
    label: 'Sales Orders',
    color: '#f59e0b',
  },
  expense: {
    label: 'Store Expenses',
    color: '#f43f5e',
  },
} satisfies ChartConfig;

// Earnings Breakdown Chart Config
const earningsChartConfig = {
  wallet: {
    label: 'Cleared in Wallet',
    color: 'var(--chart-1)',
  },
  pending: {
    label: 'In-Transit / Pending',
    color: 'var(--chart-4)',
  },
  withdrawn: {
    label: 'Completed Payouts',
    color: 'var(--chart-2)',
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

// Liquid Accounts Chart Config
const liquidAccountsChartConfig = {
  cash: {
    label: 'Cash',
    color: 'var(--chart-2)',
  },
  bank: {
    label: 'Bank',
    color: 'var(--chart-1)',
  },
  mfs: {
    label: 'Mobile Wallets',
    color: 'var(--chart-3)',
  },
} satisfies ChartConfig;

const getStoreStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return {
        label: '● Pending Approval',
        className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      };
    case 'suspended':
      return {
        label: '● Suspended',
        className: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
      };
    case 'rejected':
      return {
        label: '● Rejected',
        className: 'bg-red-500/10 text-red-600 border-red-500/20',
      };
    case 'expired':
      return {
        label: '● Expired',
        className: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
      };
    case 'active':
    default:
      return {
        label: '● Active Store',
        className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      };
  }
};

// Custom Chart Tooltip
const CustomTrendTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload;
  const dateStr = label ? format(parseISO(label), 'dd MMMM yyyy') : '';

  return (
    <div className="bg-background/95 backdrop-blur-md border rounded-xl shadow-xl p-3.5 text-xs space-y-2 min-w-[200px]">
      <p className="font-bold text-foreground border-b pb-1.5">{dateStr}</p>
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Store Sales:</span>
          <span className="font-bold text-primary">৳{Math.round(item?.revenue || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Commission:</span>
          <span className="font-bold text-emerald-600">৳{Math.round(item?.commission || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Expense:</span>
          <span className="font-bold text-rose-600">৳{Math.round(item?.expense || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center border-t pt-1">
          <span className="text-muted-foreground">Orders Placed:</span>
          <span className="font-bold text-amber-600">{item?.orders || 0}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-foreground">Net Profit:</span>
          <span className={`font-bold ${(item?.netProfit ?? ((item?.commission || 0) - (item?.expense || 0))) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ৳{Math.round(item?.netProfit ?? ((item?.commission || 0) - (item?.expense || 0))).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function ResellerDashboard() {
  const { data: session } = useSession();
  const userName = session?.user?.name ? session.user.name.split(' ')[0] : 'Partner';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState<keyof typeof trendChartConfig>('revenue');

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
    }, 400);
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
    try {
      const query = new URLSearchParams({
        from: debouncedDateRange.from,
        to: debouncedDateRange.to,
      }).toString();

      const response = await fetch(`/api/reseller/dashboard?${query}`, {
        signal: controller.signal,
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        toast.error('Failed to load dashboard statistics.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Failed to fetch reseller stats:', err);
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchStats();
  }, [debouncedDateRange]);

  const copyLink = () => {
    const rawDomain = data?.reseller?.customDomain?.trim();
    const liveUrl = rawDomain
      ? (rawDomain.startsWith('http') ? rawDomain : `https://${rawDomain}`)
      : `https://${data?.reseller?.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;
    navigator.clipboard.writeText(liveUrl);
    toast.success('Store link copied to clipboard!');
  };

  // Totals for active chart tabs
  const chartTotals = useMemo(() => {
    if (!data?.chartData) return { revenue: 0, commission: 0, orders: 0, expense: 0 };
    return {
      revenue: data.chartData.reduce((acc: number, curr: any) => acc + (curr.revenue || 0), 0),
      commission: data.chartData.reduce((acc: number, curr: any) => acc + (curr.commission || 0), 0),
      orders: data.chartData.reduce((acc: number, curr: any) => acc + (curr.orders || 0), 0),
      expense: data.chartData.reduce((acc: number, curr: any) => acc + (curr.expense || 0), 0),
    };
  }, [data]);

  // Processed continuous daily series
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
          commission: 0,
          orders: 0,
          expense: 0,
          netProfit: 0,
        });
      }
    }
    return result;
  }, [data, dateRange]);

  // Earnings Breakdown Donut Items
  const earningsBreakdownData = useMemo(() => {
    const wallet = data?.breakdown?.earnings?.walletBalance || 0;
    const pending = data?.breakdown?.earnings?.pendingBalance || 0;
    const withdrawn = data?.breakdown?.earnings?.totalWithdrawn || 0;

    return [
      { type: 'wallet', label: 'In Wallet', amount: wallet, fill: 'var(--chart-1)' },
      { type: 'pending', label: 'In-Transit Pending', amount: pending, fill: 'var(--chart-4)' },
      { type: 'withdrawn', label: 'Completed Payouts', amount: withdrawn, fill: 'var(--chart-2)' },
    ].filter(d => d.amount > 0);
  }, [data?.breakdown]);

  // Order Status Donut Items
  const orderStatusData = useMemo(() => {
    const pending = data?.breakdown?.orderStatus?.pending || 0;
    const processing = data?.breakdown?.orderStatus?.processing || 0;
    const delivered = data?.breakdown?.orderStatus?.delivered || 0;
    const cancelled = data?.breakdown?.orderStatus?.cancelled || 0;

    return [
      { status: 'pending', count: pending, fill: 'var(--chart-4)' },
      { status: 'processing', count: processing, fill: 'var(--chart-1)' },
      { status: 'delivered', count: delivered, fill: 'var(--chart-2)' },
      { status: 'cancelled', count: cancelled, fill: 'var(--chart-5)' },
    ].filter(d => d.count > 0);
  }, [data?.breakdown]);

  // Liquid Accounts Chart Data
  const liquidAccountsData = useMemo(() => {
    const cash = Math.max(0, data?.stats?.cashBalance || 0);
    const bank = Math.max(0, data?.stats?.bankBalance || 0);
    const mfs = Math.max(0, data?.stats?.mfsBalance || 0);
    return [
      { account: 'Cash', balance: cash, fill: 'var(--chart-2)' },
      { account: 'Bank', balance: bank, fill: 'var(--chart-1)' },
      { account: 'Mobile Wallets', balance: mfs, fill: 'var(--chart-3)' },
    ];
  }, [data?.stats?.cashBalance, data?.stats?.bankBalance, data?.stats?.mfsBalance]);

  if (loading && !data) {
    return (
      <div className="space-y-6 p-2 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!data?.reseller) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-4 text-center p-4">
        <Store className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-black">Reseller account not found</h2>
        <Button asChild><Link href="/reseller/register">Register as Reseller</Link></Button>
      </div>
    );
  }

  const { reseller, stats, catalogStats, recentOrders = [] } = data;
  const storeLink = reseller.customDomain?.trim()
    ? (reseller.customDomain.trim().startsWith('http') ? reseller.customDomain.trim() : `https://${reseller.customDomain.trim()}`)
    : `https://${reseller.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;

  const orderStatusColor: Record<string, string> = {
    'Order Placed': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    'Confirmed': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    'Paid': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    'Hold': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    'Processing': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    'Ready for Delivery': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    'Released for Delivery': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    'Delivered': 'bg-green-500/10 text-green-600 border-green-500/20',
    'Cancelled': 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  return (
    <div className="flex-1 space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Welcome Back{userName ? `, ${userName}` : ''}! 👋
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground text-xs opacity-75">
              Store: <span className="font-semibold text-foreground">{reseller.storeName}</span>
            </p>
            {(() => {
              const statusInfo = getStoreStatusBadge(reseller.status || 'pending');
              return (
                <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 ${statusInfo.className}`}>
                  {statusInfo.label}
                </Badge>
              );
            })()}
            {lastUpdated && (
              <span className="text-[11px] text-muted-foreground hidden sm:inline-block">
                • Updated at {lastUpdated}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end gap-2.5">
          {/* Top Right: Store Action Buttons */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" className="h-8 text-xs font-semibold shadow-xs" onClick={copyLink}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy Link
            </Button>
            <Button size="sm" className="h-8 text-xs font-semibold shadow-xs" asChild>
              <a href={storeLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Visit Store
              </a>
            </Button>
          </div>

          {/* Underneath: Filtering Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Presets */}
            <div className="hidden sm:flex items-center bg-muted/40 rounded-lg p-0.5 border h-8">
              <button
                onClick={() => setPresetRange(7)}
                className="text-[11px] px-2.5 py-0.5 rounded hover:bg-background font-semibold transition-colors"
              >
                7D
              </button>
              <button
                onClick={() => setPresetRange(30)}
                className="text-[11px] px-2.5 py-0.5 rounded hover:bg-background font-semibold transition-colors"
              >
                30D
              </button>
              <button
                onClick={() => setPresetRange(90)}
                className="text-[11px] px-2.5 py-0.5 rounded hover:bg-background font-semibold transition-colors"
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
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Status Notice Banner if not active */}
      {reseller?.status === 'pending' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-sm">স্টোর অনুমোদনের অপেক্ষায় (Pending Approval)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                আপনার স্টোরটি এখনো অ্যাডমিন অনুমোদনের অপেক্ষায় রয়েছে। অ্যাডমিন অনুমোদন করার পর আপনার স্টোরফ্রন্ট কাস্টমারদের জন্য লাইভ হয়ে যাবে।
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 text-xs px-2.5 py-1 font-semibold shrink-0">
            অপেক্ষমান
          </Badge>
        </div>
      )}

      {reseller?.status === 'suspended' && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-800 dark:text-rose-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-sm">স্টোর সাময়িকভাবে স্থগিত (Suspended)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {reseller?.suspendReason || 'আপনার স্টোরটি সাময়িকভাবে বন্ধ রাখা হয়েছে। সহায়তার জন্য অ্যাডমিনের সাথে যোগাযোগ করুন।'}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40 text-xs px-2.5 py-1 font-semibold shrink-0">
            স্থগিত
          </Badge>
        </div>
      )}

      {/* 2. Top KPI Cards (Rich Colorful Gradients Matching Admin Dashboard) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales Card */}
        <Link
          href="/reseller/orders"
          className="relative overflow-hidden bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-card border border-blue-500/30 dark:border-blue-500/20 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-blue-500/50 transition-all flex flex-col justify-between group cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="p-3.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
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
            <BarChart3 className="h-4 w-4 text-blue-500 opacity-70 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        {/* Total Earnings Card */}
        <Link
          href="/reseller/reports/payouts"
          className="relative overflow-hidden bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-card border border-emerald-500/30 dark:border-emerald-500/20 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-emerald-500/50 transition-all flex flex-col justify-between group cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="p-3.5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Coins className="h-6 w-6" />
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Total Earnings</p>
              <h3 className="text-2xl font-black text-foreground mt-1">
                ৳{Math.round(stats?.totalEarnings || 0).toLocaleString()}
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-emerald-500/20 mt-4">
            {(() => {
              const g = stats?.growth?.earnings ?? 0;
              return (
                <span className={`text-xs font-bold flex items-center gap-1 ${g >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {g >= 0 ? `↑ +${g}%` : `↓ ${g}%`}{' '}
                  <span className="text-muted-foreground font-normal">vs. previous period</span>
                </span>
              );
            })()}
            <BarChart3 className="h-4 w-4 text-emerald-500 opacity-70 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        {/* Pending Orders Card */}
        <Link
          href="/reseller/orders"
          className="relative overflow-hidden bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-card border border-amber-500/30 dark:border-amber-500/20 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-amber-500/50 transition-all flex flex-col justify-between group cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="p-3.5 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
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
            <Clock className="h-4 w-4 text-amber-500 opacity-70 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        {/* Wallet Balance Card */}
        <Link
          href="/reseller/wallet"
          className="relative overflow-hidden bg-gradient-to-br from-violet-500/15 via-purple-500/10 to-card border border-violet-500/30 dark:border-violet-500/20 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-violet-500/50 transition-all flex flex-col justify-between group cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="p-3.5 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-xl shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform">
              <Wallet className="h-6 w-6" />
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">Wallet Balance</p>
              <h3 className="text-2xl font-black text-foreground mt-1">
                ৳{Math.round(reseller?.walletBalance || 0).toLocaleString()}
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-v      {/* 3. Visual Donut Charts (Row 1: 3 Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Earnings Breakdown Donut Chart */}
        <Card className="shadow-xs rounded-2xl border flex flex-col justify-between">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              Earnings Breakdown
            </CardTitle>
            <CardDescription className="text-xs">Distribution of store commissions & wallet payouts</CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-1/2 h-[150px] relative flex items-center justify-center">
              <ChartContainer config={earningsChartConfig} className="mx-auto aspect-square h-[145px] w-[145px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={earningsBreakdownData.length > 0 ? earningsBreakdownData : [{ type: 'wallet', amount: 1, fill: 'var(--muted)' }]}
                    dataKey="amount"
                    nameKey="type"
                    innerRadius={38}
                    outerRadius={56}
                    strokeWidth={3}
                    stroke="var(--background)"
                  />
                </PieChart>
              </ChartContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-xs font-black text-foreground">
                  ৳{Math.round((reseller.walletBalance || 0) + (reseller.pendingBalance || 0)).toLocaleString()}
                </span>
                <span className="text-[9px] text-muted-foreground font-semibold uppercase">Earnings</span>
              </div>
            </div>

            <div className="w-full sm:w-1/2 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--chart-1)]" /> Cleared in Wallet
                </span>
                <span className="font-bold text-foreground">
                  ৳{Math.round(reseller.walletBalance || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--chart-4)]" /> In-Transit Pending
                </span>
                <span className="font-bold text-foreground">
                  ৳{Math.round(reseller.pendingBalance || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--chart-2)]" /> Completed Payouts
                </span>
                <span className="font-bold text-foreground">
                  ৳{Math.round(data?.breakdown?.earnings?.totalWithdrawn || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Status Donut Chart */}
        <Card className="shadow-xs rounded-2xl border flex flex-col justify-between">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              Orders Status
            </CardTitle>
            <CardDescription className="text-xs">Live order workflow tracking</CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-1/2 h-[150px] relative flex items-center justify-center">
              <ChartContainer config={orderStatusChartConfig} className="mx-auto aspect-square h-[145px] w-[145px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={orderStatusData.length > 0 ? orderStatusData : [{ status: 'pending', count: 1, fill: 'var(--muted)' }]}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={38}
                    outerRadius={56}
                    strokeWidth={3}
                    stroke="var(--background)"
                  />
                </PieChart>
              </ChartContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
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

        {/* Liquid Accounts Donut Chart */}
        <Card className="shadow-xs rounded-2xl border flex flex-col justify-between">
          <CardHeader className="pb-2 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Landmark className="h-4 w-4 text-primary" />
                Liquid Accounts
              </CardTitle>
              <Link href="/reseller/accounts" className="text-xs font-semibold text-primary hover:underline">
                View Details &rarr;
              </Link>
            </div>
            <CardDescription className="text-xs">Current balance in Cash, Bank & Mobile Wallets</CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-1/2 h-[150px] relative flex items-center justify-center">
              <ChartContainer config={liquidAccountsChartConfig} className="mx-auto aspect-square h-[145px] w-[145px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={liquidAccountsData.some(d => d.balance > 0) ? liquidAccountsData : [{ account: 'Cash', balance: 1, fill: 'var(--muted)' }]}
                    dataKey="balance"
                    nameKey="account"
                    innerRadius={38}
                    outerRadius={56}
                    strokeWidth={3}
                    stroke="var(--background)"
                  />
                </PieChart>
              </ChartContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-xs font-black text-foreground">
                  ৳{Math.round(stats?.totalLiquidBalance || ((stats?.cashBalance || 0) + (stats?.bankBalance || 0) + (stats?.mfsBalance || 0))).toLocaleString()}
                </span>
                <span className="text-[9px] text-muted-foreground font-semibold uppercase">Liquid Funds</span>
              </div>
            </div>

            <div className="w-full sm:w-1/2 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--chart-2)]" /> Cash
                </span>
                <span className="font-bold text-foreground">৳{Math.round(stats?.cashBalance || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--chart-1)]" /> Bank
                </span>
                <span className="font-bold text-foreground">৳{Math.round(stats?.bankBalance || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--chart-3)]" /> Mobile Wallets
                </span>
                <span className="font-bold text-foreground">৳{Math.round(stats?.mfsBalance || 0).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Operational Insights (Row 2: 3 Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Order Fulfillment & Success Rate */}
        <div className="bg-card rounded-2xl border p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold text-foreground">Delivery Success</span>
              </div>
              <span className="text-xs font-bold text-emerald-600">
                {stats?.deliverySuccessRate || 100}%
              </span>
            </div>

            <div className="py-3 space-y-3">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-muted-foreground">Fulfillment Rate</span>
                  <span className="font-bold text-foreground">{stats?.deliverySuccessRate || 100}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, stats?.deliverySuccessRate || 100))}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-muted-foreground">Avg. Order Value (AOV):</span>
                <span className="font-bold text-foreground">৳{Math.round(stats?.averageOrderValue || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-muted/50 flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Total Processed Orders:</span>
            <span className="font-bold text-foreground">{stats?.totalOrders || 0}</span>
          </div>
        </div>

        {/* Catalog & Inventory Stock */}
        <div className="bg-card rounded-2xl border p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                  <Package className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold text-foreground">Catalog & Stock</span>
              </div>
              <Link href="/reseller/products" className="text-xs font-semibold text-primary hover:underline">
                Manage &rarr;
              </Link>
            </div>

            <div className="py-3 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Active Products in Store:</span>
                <span className="font-bold text-foreground">{catalogStats?.totalProducts || 0} items</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Commission Profit Rate:</span>
                <span className="font-bold text-emerald-600">{reseller?.commissionRate || 10}%</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-muted/50 flex justify-between items-center text-xs">
            <span className="text-rose-600 font-semibold flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> Low Stock Alerts:
            </span>
            <Badge variant="outline" className="h-5 px-2 text-[10px] font-bold border-rose-300 text-rose-600 bg-rose-50 dark:bg-rose-950/20">
              {catalogStats?.lowStockCount || 0} items
            </Badge>
          </div>
        </div>

        {/* Wallet & Payout Fast Access */}
        <div className="bg-card rounded-2xl border p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600">
                  <Wallet className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold text-foreground">Wallet Settlement</span>
              </div>
              <Link href="/reseller/wallet" className="text-xs font-semibold text-violet-600 hover:underline">
                History &rarr;
              </Link>
            </div>

            <div className="py-3 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Available to Withdraw:</span>
                <span className="font-black text-foreground text-sm">৳{Math.round(reseller?.walletBalance || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Pending / In-Transit:</span>
                <span className="font-medium text-amber-600">৳{Math.round(reseller?.pendingBalance || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-muted/50">
            <Button size="sm" className="w-full h-8 text-xs font-bold" asChild>
              <Link href="/reseller/wallet">
                <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Request Payout
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 5. Main Performance Trends Chart (Full Width with Dynamic Tabs) */}
      <Card className="shadow-xs rounded-2xl border overflow-hidden">
        <CardHeader className="flex flex-col items-stretch border-b p-0 sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-4 py-4 md:px-6 md:py-6">
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Performance Trends
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Daily store sales revenue, commissions earned, and sales order volume.
            </CardDescription>
          </div>
          <div className="flex overflow-x-auto border-t sm:border-t-0 no-scrollbar">
            {[
              { key: 'revenue', label: 'Store Sales', val: `৳${Math.round(chartTotals.revenue).toLocaleString()}` },
              { key: 'commission', label: 'Commissions', val: `৳${Math.round(chartTotals.commission).toLocaleString()}` },
              { key: 'orders', label: 'Sales Orders', val: chartTotals.orders.toLocaleString() },
              { key: 'expense', label: 'Expenses', val: `৳${Math.round(chartTotals.expense).toLocaleString()}` },
            ].map((item) => {
              const chartKey = item.key as keyof typeof trendChartConfig;
              return (
                <button
                  key={chartKey}
                  data-active={activeChart === chartKey}
                  className="flex flex-1 flex-col justify-center gap-1 border-r px-4 py-3 text-left data-[active=true]:bg-muted/50 sm:px-6 sm:py-4 transition-colors shrink-0"
                  onClick={() => setActiveChart(chartKey)}
                >
                  <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
                  <span className="text-sm sm:text-base font-bold leading-none text-foreground">{item.val}</span>
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <ChartContainer config={trendChartConfig} className="aspect-auto h-[280px] md:h-[340px] w-full">
            <AreaChart data={processedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fillStoreRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="fillStoreCommission" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="fillStoreOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="fillStoreExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.05} />
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
              <Tooltip content={<CustomTrendTooltip />} />
              <ReferenceLine
                y={(chartTotals[activeChart] || 0) / (processedChartData?.length || 1)}
                label={{ value: 'Avg', position: 'insideRight', fill: 'var(--muted-foreground)', fontSize: 10 }}
                stroke="var(--muted-foreground)"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <Area
                dataKey="revenue"
                type="monotone"
                fill="url(#fillStoreRevenue)"
                stroke="var(--primary)"
                strokeWidth={2}
                hide={activeChart !== 'revenue'}
              />
              <Area
                dataKey="commission"
                type="monotone"
                fill="url(#fillStoreCommission)"
                stroke="#10b981"
                strokeWidth={2}
                hide={activeChart !== 'commission'}
              />
              <Area
                dataKey="orders"
                type="monotone"
                fill="url(#fillStoreOrders)"
                stroke="#f59e0b"
                strokeWidth={2}
                hide={activeChart !== 'orders'}
              />
              <Area
                dataKey="expense"
                type="monotone"
                fill="url(#fillStoreExpense)"
                stroke="#f43f5e"
                strokeWidth={2}
                hide={activeChart !== 'expense'}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* 6. Recent Orders & Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Recent Orders */}
        <Card className="lg:col-span-2 shadow-xs rounded-2xl border">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-primary" />
                Recent Orders
              </CardTitle>
              <CardDescription className="text-xs">Latest orders placed in your store</CardDescription>
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs font-semibold" asChild>
              <Link href="/reseller/orders">View All Orders &rarr;</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ShoppingBag className="h-12 w-12 opacity-20 mb-3" />
                <p className="text-sm font-medium">No Orders Placed Yet</p>
                <p className="text-xs text-muted-foreground mt-1">Share your store link to start receiving customer orders.</p>
              </div>
            ) : (
              <div className="divide-y">
                {recentOrders.map((o: any) => (
                  <div key={o._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/30 transition-colors gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/reseller/orders`} className="text-sm font-bold text-primary hover:underline">
                          #{o.shortId || String(o._id).slice(-8).toUpperCase()}
                        </Link>
                        <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 ${orderStatusColor[o.status] || ''}`}>
                          {o.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">
                        {o.customer?.name} {o.customer?.phone ? `(${o.customer.phone})` : ''} • {format(new Date(o.createdAt), 'dd MMM, yyyy h:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 justify-between sm:justify-end">
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-black text-foreground">৳{Math.round(o.totalAmount || 0).toLocaleString()}</p>
                        <p className="text-[11px] text-emerald-600 font-semibold">
                          +৳{Math.round(o.resellerCommission || 0).toLocaleString()} commission
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
                        <Link href="/reseller/orders" title="View details">
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Store Links & Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="shadow-xs rounded-2xl border">
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'View Orders', href: '/reseller/orders', icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                  { label: 'Add Product', href: '/reseller/products/new', icon: Package, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                  { label: 'Coupons', href: '/reseller/coupons', icon: Tag, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                  { label: 'Wallet', href: '/reseller/wallet', icon: Wallet, color: 'text-violet-500', bg: 'bg-violet-500/10' },
                ].map((act, i) => (
                  <Link
                    key={i}
                    href={act.href}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-transparent hover:border-border hover:bg-muted/50 transition-all text-center gap-2 group"
                  >
                    <div className={`p-2.5 rounded-xl ${act.bg} ${act.color} group-hover:scale-110 transition-transform`}>
                      <act.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">{act.label}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Store Info Card */}
          <Card className="shadow-xs rounded-2xl border bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                Storefront Portal
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="p-3 bg-muted/50 rounded-xl border text-xs space-y-1">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Live URL</span>
                <span className="font-mono text-xs font-semibold break-all text-foreground">{storeLink}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 text-xs font-bold" onClick={copyLink}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy Link
                </Button>
                <Button size="sm" className="flex-1 text-xs font-bold" asChild>
                  <a href={storeLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open Store
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

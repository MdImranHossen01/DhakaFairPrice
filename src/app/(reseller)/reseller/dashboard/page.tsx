'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, ShoppingBag, Wallet, Clock, ArrowUpRight,
  Loader2, Store, ExternalLink, Copy, RefreshCcw,
  Package, Tag, Activity, CreditCard
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function ResellerDashboard() {
  const { data: session } = useSession();
  const userName = session?.user?.name ? session.user.name.split(' ')[0] : '';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    fetch('/api/reseller/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const copyLink = () => {
    const rawDomain = data?.reseller?.customDomain?.trim();
    const liveUrl = rawDomain
      ? (rawDomain.startsWith('http') ? rawDomain : `https://${rawDomain}`)
      : `https://${data?.reseller?.subdomain}.swapnobaz.com`;
    navigator.clipboard.writeText(liveUrl);
    toast.success('Store link copied!');
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-bold">Loading dashboard...</p>
        </div>
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

  const { reseller, recentOrders = [], recentTransactions = [] } = data;
  const storeLink = reseller.customDomain?.trim()
    ? (reseller.customDomain.trim().startsWith('http') ? reseller.customDomain.trim() : `https://${reseller.customDomain.trim()}`)
    : `https://${reseller.subdomain}.swapnobaz.com`;

  const statusColorMap: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    suspended: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  };

  const orderStatusColor: Record<string, string> = {
    'Order Placed': 'bg-blue-500/10 text-blue-600',
    'Confirmed': 'bg-indigo-500/10 text-indigo-600',
    'Paid': 'bg-emerald-500/10 text-emerald-600',
    'Hold': 'bg-amber-500/10 text-amber-600',
    'Processing': 'bg-yellow-500/10 text-yellow-600',
    'Ready for Delivery': 'bg-purple-500/10 text-purple-600',
    'Released for Delivery': 'bg-orange-500/10 text-orange-600',
    'Delivered': 'bg-green-500/10 text-green-600',
    'Cancelled': 'bg-red-500/10 text-red-600',
  };

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Welcome Back{userName ? `, ${userName}` : ''}! 👋
          </h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
            Here's what's happening with <span className="font-semibold text-foreground">{reseller.storeName}</span> today.
            <Badge className={`text-[10px] ml-2 ${statusColorMap[reseller.status] || ''}`}>
              {reseller.status === 'active' ? '● Active Store' : reseller.status}
            </Badge>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="secondary" className="h-9 font-medium shadow-sm" onClick={copyLink}>
            <Copy className="h-4 w-4 mr-2" /> Copy Link
          </Button>
          <Button size="sm" className="h-9 font-medium shadow-sm" asChild>
            <a href={storeLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" /> Visit Store
            </a>
          </Button>
          <Button size="icon" variant="outline" className="h-9 w-9 shadow-sm" onClick={fetchData}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {reseller.status === 'pending' && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-sm text-amber-800 dark:text-amber-300">Pending Approval</p>
            <p className="text-sm text-amber-700/80 dark:text-amber-400/80 mt-1">Your reseller account is currently under review. Your store will become active once approved by the administrator.</p>
          </div>
        </div>
      )}

      {/* Colorful Stats Cards (Reference Image Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
          <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4">
            <ShoppingBag className="h-32 w-32" />
          </div>
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <ShoppingBag className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold">{reseller.totalOrders}</p>
            <p className="text-sm font-medium text-blue-100 mt-1">Total Orders</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden relative">
          <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4">
            <TrendingUp className="h-32 w-32" />
          </div>
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold">৳{(reseller.totalEarnings ?? 0).toLocaleString()}</p>
            <p className="text-sm font-medium text-emerald-100 mt-1">Total Earnings</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-amber-500 to-amber-600 text-white overflow-hidden relative">
          <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4">
            <Clock className="h-32 w-32" />
          </div>
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold">৳{(reseller.pendingBalance ?? 0).toLocaleString()}</p>
            <p className="text-sm font-medium text-amber-100 mt-1">Pending Commission</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-violet-500 to-violet-600 text-white overflow-hidden relative">
          <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4">
            <Wallet className="h-32 w-32" />
          </div>
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Wallet className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold">৳{(reseller.walletBalance ?? 0).toLocaleString()}</p>
            <p className="text-sm font-medium text-violet-100 mt-1">Wallet Balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Recent Orders */}
        <Card className="lg:col-span-2 shadow-sm border-border/60">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 pb-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Recent Orders
              </CardTitle>
              <CardDescription>Latest orders placed in your store</CardDescription>
            </div>
            <Button size="sm" variant="outline" className="h-8 shadow-sm" asChild>
              <Link href="/reseller/orders">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ShoppingBag className="h-12 w-12 opacity-20 mb-3" />
                <p className="text-sm font-medium">No Orders Found</p>
              </div>
            ) : (
              <div className="divide-y">
                {recentOrders.slice(0, 5).map((o: any) => (
                  <div key={o._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col gap-1 mb-2 sm:mb-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-primary">{o.shortId}</p>
                        <Badge className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 ${orderStatusColor[o.status] || ''}`}>{o.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">
                        {o.customer?.name} • {format(new Date(o.createdAt), 'dd MMM, yyyy h:mm a')}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-black">৳{o.totalAmount?.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Amount</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Wallet & Quick Links */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="border-b bg-muted/20 pb-3">
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
                ].map(q => (
                  <Link key={q.href} href={q.href}>
                    <div className="rounded-lg border p-3 flex flex-col items-center justify-center text-center gap-2 bg-card hover:bg-muted/50 transition-colors cursor-pointer group">
                      <div className={`p-2 rounded-full ${q.bg} group-hover:scale-110 transition-transform`}>
                        <q.icon className={`h-5 w-5 ${q.color}`} />
                      </div>
                      <span className="text-xs font-semibold">{q.label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Wallet Transactions */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 pb-4">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Wallet Activity
                </CardTitle>
              </div>
              <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                <Link href="/reseller/wallet">View All</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex justify-between items-center mb-4">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Available Balance</p>
                  <p className="text-2xl font-black text-primary">৳{(reseller.walletBalance ?? 0).toLocaleString()}</p>
                </div>
                <Button size="sm" className="shadow-sm" asChild><Link href="/reseller/wallet">Withdraw</Link></Button>
              </div>
              
              <div className="space-y-3">
                {recentTransactions.length === 0 ? (
                  <p className="text-xs text-center text-muted-foreground py-2">No recent transactions</p>
                ) : (
                  recentTransactions.slice(0, 4).map((t: any) => (
                    <div key={t._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-full ${t.amount > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                          {t.amount > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5 transform rotate-180" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold line-clamp-1">{t.description}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(t.createdAt), 'dd MMM yyyy')}</p>
                        </div>
                      </div>
                      <p className={`text-sm font-bold shrink-0 ml-2 ${t.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {t.amount > 0 ? '+' : ''}৳{Math.abs(t.amount).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

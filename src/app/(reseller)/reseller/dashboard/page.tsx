'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, ShoppingBag, Wallet, Clock, ArrowUpRight,
  Loader2, Store, ExternalLink, Copy, RefreshCcw,
  Package, Tag, FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ResellerDashboard() {
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
    toast.success('স্টোর লিংক কপি হয়েছে!');
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
        <h2 className="text-xl font-black">রিসেলার একাউন্ট পাওয়া যায়নি</h2>
        <Button asChild><Link href="/reseller/register">রিসেলার হিসেবে নিবন্ধন করুন</Link></Button>
      </div>
    );
  }

  const { reseller, recentOrders = [], recentTransactions = [], stats = {} } = data;
  const storeLink = reseller.customDomain?.trim()
    ? (reseller.customDomain.trim().startsWith('http') ? reseller.customDomain.trim() : `https://${reseller.customDomain.trim()}`)
    : `https://${reseller.subdomain}.swapnobaz.com`;

  const statusColorMap: Record<string, string> = {
    active: 'bg-green-500/10 text-green-600 border-green-500/20',
    pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    suspended: 'bg-red-500/10 text-red-600 border-red-500/20',
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
    <div className="flex-1 space-y-4 px-0 py-2 md:p-8 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1 md:px-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">{reseller.storeName}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge className={`text-[10px] border ${statusColorMap[reseller.status] || ''}`}>
                {reseller.status === 'active' ? '● Active Store' : reseller.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={copyLink}>
            <Copy className="h-3.5 w-3.5 mr-1" /> Store Link
          </Button>
          <Button size="sm" className="h-8 text-xs" asChild>
            <a href={storeLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> Visit Store
            </a>
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={fetchData}>
            <RefreshCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {reseller.status === 'pending' && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 md:p-4 flex items-start gap-3 mx-1 md:mx-0">
          <Clock className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-xs md:text-sm">অনুমোদনের অপেক্ষায়</p>
            <p className="text-xs text-muted-foreground">আপনার রিসেলার একাউন্ট পর্যালোচনা করা হচ্ছে। অ্যাডমিন অনুমোদনের পর আপনার স্টোর সক্রিয় হবে।</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 px-1 md:px-0">
        {[
          { label: 'মোট অর্ডার', value: reseller.totalOrders, icon: ShoppingBag, color: 'text-blue-500' },
          { label: 'পেন্ডিং কমিশন', value: `৳${(reseller.pendingBalance ?? 0).toLocaleString()}`, icon: Clock, color: 'text-yellow-500' },
          { label: 'উত্তোলনযোগ্য', value: `৳${(reseller.walletBalance ?? 0).toLocaleString()}`, icon: Wallet, color: 'text-green-500' },
          { label: 'মোট আয়', value: `৳${(reseller.totalEarnings ?? 0).toLocaleString()}`, icon: TrendingUp, color: 'text-primary' },
        ].map(stat => (
          <Card key={stat.label} className="border shadow-sm">
            <CardContent className="p-3 md:pt-4 md:pb-3">
              <div className="flex items-center justify-between mb-1.5 md:mb-2">
                <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
                <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
              </div>
              <p className="text-lg md:text-2xl font-black">{stat.value}</p>
              <p className="text-[11px] md:text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3 px-1 md:px-0">
        {[
          { label: 'অর্ডার দেখুন', href: '/reseller/orders', icon: ShoppingBag },
          { label: 'পণ্য যোগ করুন', href: '/reseller/products/new', icon: Package },
          { label: 'কুপন তৈরি', href: '/reseller/coupons', icon: Tag },
          { label: 'ওয়ালেট', href: '/reseller/wallet', icon: Wallet },
        ].map(q => (
          <Link key={q.href} href={q.href}>
            <div className="border rounded-xl p-2.5 md:p-3 flex items-center gap-2 bg-card hover:bg-muted/30 transition-colors cursor-pointer shadow-sm">
              <q.icon className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs md:text-sm font-semibold">{q.label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 px-1 md:px-0">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-3 md:p-6 pb-2 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-black">সাম্প্রতিক অর্ডার</CardTitle>
            <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
              <Link href="/reseller/orders">সব দেখুন →</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            {recentOrders.length === 0 ? (
              <p className="text-xs md:text-sm text-muted-foreground text-center py-6">কোনো অর্ডার নেই</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.slice(0, 5).map((o: any) => (
                  <div key={o._id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-xs md:text-sm font-semibold">{o.shortId}</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground">{o.customer?.name} · {format(new Date(o.createdAt), 'dd MMM')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs md:text-sm font-black">৳{o.totalAmount?.toLocaleString()}</p>
                      <Badge className={`text-[9px] md:text-[10px] ${orderStatusColor[o.status] || ''}`}>{o.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-3 md:p-6 pb-2 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-black">ওয়ালেট লেনদেন</CardTitle>
            <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
              <Link href="/reseller/wallet">সব দেখুন →</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <div className="rounded-xl border p-2.5 md:p-3 bg-muted/10 flex justify-between items-center mb-3">
              <div>
                <p className="text-[10px] md:text-xs text-muted-foreground">উত্তোলনযোগ্য ব্যালেন্স</p>
                <p className="text-lg md:text-2xl font-black text-green-600">৳{(reseller.walletBalance ?? 0).toLocaleString()}</p>
              </div>
              <Button size="sm" className="h-8 text-xs" asChild><Link href="/reseller/wallet">উত্তোলন</Link></Button>
            </div>
            {recentTransactions.slice(0, 4).map((t: any) => (
              <div key={t._id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                <div>
                  <p className="text-xs font-medium line-clamp-1">{t.description}</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(t.createdAt), 'dd MMM yyyy')}</p>
                </div>
                <p className={`text-xs md:text-sm font-bold shrink-0 ml-2 ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {t.amount > 0 ? '+' : ''}৳{Math.abs(t.amount).toLocaleString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

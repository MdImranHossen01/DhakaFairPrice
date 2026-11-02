'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  ShoppingBag,
  Wallet,
  Package,
  Clock,
  CheckCheck,
  Trash2,
  Loader2,
  ExternalLink,
  Inbox,
  AlertTriangle,
  RefreshCw,
  Info,
  ArrowUpCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ResellerQueueStats {
  pendingOrders: number;
  pendingProducts: number;
  walletBalance: number;
  pendingBalance: number;
  lowStock: number;
  totalQueueActions: number;
}

interface ResellerNotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export default function ResellerNotificationsPage() {
  const router = useRouter();
  const [queues, setQueues] = useState<ResellerQueueStats>({
    pendingOrders: 0,
    pendingProducts: 0,
    walletBalance: 0,
    pendingBalance: 0,
    lowStock: 0,
    totalQueueActions: 0,
  });
  const [notifications, setNotifications] = useState<ResellerNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reseller/notifications?limit=80');
      if (res.ok) {
        const data = await res.json();
        setQueues(
          data.queues || {
            pendingOrders: 0,
            pendingProducts: 0,
            walletBalance: 0,
            pendingBalance: 0,
            lowStock: 0,
            totalQueueActions: 0,
          }
        );
        setNotifications(data.notifications || []);
        setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
      } else {
        toast.error('Failed to load notifications');
      }
    } catch {
      toast.error('Network error loading notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      setIsUpdating(true);
      const res = await fetch('/api/reseller/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      } else {
        toast.error('Failed to mark all as read');
      }
    } catch {
      toast.error('Error updating notifications');
    } finally {
      setIsUpdating(false);
    }
  };

  const markAsRead = async (notif: ResellerNotificationItem) => {
    if (!notif.read) {
      try {
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        await fetch('/api/reseller/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: notif._id }),
        });
      } catch {
        // silent
      }
    }

    if (notif.link) {
      router.push(notif.link);
    }
  };

  const deleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/reseller/notifications?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n._id !== id));
        toast.success('Notification removed');
      } else {
        toast.error('Failed to delete notification');
      }
    } catch {
      toast.error('Error deleting notification');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <ShoppingBag className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'payout':
        return <ArrowUpCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case 'product':
        return <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case 'wallet':
        return <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const diffMs = Date.now() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHr = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHr / 24);

      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'all') return true;
    return n.type === filter;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black">Reseller Notifications & Alerts</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="rounded-full text-xs px-2.5 py-0.5">
                {unreadCount} Unread
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time management for customer orders, wallet payouts, product approvals, and alerts.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="text-xs"
            title="Refresh notifications"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={unreadCount === 0 || isUpdating}
            className="text-xs"
          >
            {isUpdating ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
            )}
            Mark All as Read
          </Button>
        </div>
      </div>

      {/* Live Action Queues Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Link href="/reseller/orders" className="group">
          <Card className="hover:border-blue-500/50 hover:shadow-md transition-all">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Pending Orders</span>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                  <ShoppingBag className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-black">{queues.pendingOrders}</span>
                <span className="text-[11px] text-blue-600 font-semibold group-hover:underline flex items-center gap-0.5">
                  View <ExternalLink className="h-2.5 w-2.5" />
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/reseller/products" className="group">
          <Card className="hover:border-amber-500/50 hover:shadow-md transition-all">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Pending Approvals</span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                  <Package className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-black">{queues.pendingProducts}</span>
                <span className="text-[11px] text-amber-600 font-semibold group-hover:underline flex items-center gap-0.5">
                  Manage <ExternalLink className="h-2.5 w-2.5" />
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/reseller/wallet" className="group">
          <Card className="hover:border-emerald-500/50 hover:shadow-md transition-all">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Wallet Balance</span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-black">৳{queues.walletBalance.toLocaleString('en-BD')}</span>
                <span className="text-[11px] text-emerald-600 font-semibold group-hover:underline flex items-center gap-0.5">
                  Wallet <ExternalLink className="h-2.5 w-2.5" />
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/reseller/low-stock" className="group">
          <Card className="hover:border-orange-500/50 hover:shadow-md transition-all">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Low Stock Items</span>
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-black">{queues.lowStock}</span>
                <span className="text-[11px] text-orange-600 font-semibold group-hover:underline flex items-center gap-0.5">
                  Stock <ExternalLink className="h-2.5 w-2.5" />
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {queues.lowStock > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Inventory Warning:</strong> {queues.lowStock} products in your store currently have fewer than 5 units left in stock.
            </span>
          </div>
          <Link href="/reseller/low-stock" className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline shrink-0">
            Check Stock &rarr;
          </Link>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'all', label: `All (${notifications.length})` },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'order', label: 'Orders' },
          { key: 'product', label: 'Products' },
          { key: 'payout', label: 'Payouts' },
          { key: 'system', label: 'System' },
        ].map((tab) => (
          <Button
            key={tab.key}
            size="sm"
            variant={filter === tab.key ? 'default' : 'outline'}
            onClick={() => setFilter(tab.key)}
            className="text-xs rounded-full h-8"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-sm">Loading reseller notifications...</p>
          </CardContent>
        </Card>
      ) : filteredNotifications.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <div className="size-14 rounded-full bg-muted flex items-center justify-center mb-3">
              <Inbox className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground text-base">No Notifications Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              {filter === 'unread'
                ? 'All store alerts have been reviewed.'
                : 'No alerts found for this category.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0 divide-y">
            {filteredNotifications.map((notif) => (
              <div
                key={notif._id}
                onClick={() => markAsRead(notif)}
                className={`group p-4 sm:p-5 flex items-start gap-3 sm:gap-4 transition-all cursor-pointer ${
                  !notif.read
                    ? 'bg-primary/[0.04] dark:bg-primary/[0.08] hover:bg-primary/[0.08]'
                    : 'bg-card hover:bg-muted/40'
                }`}
              >
                <div
                  className={`size-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                    !notif.read
                      ? 'bg-background border-primary/30 shadow-xs'
                      : 'bg-muted/50 border-transparent'
                  }`}
                >
                  {getIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`text-sm tracking-tight ${
                          !notif.read ? 'font-bold text-foreground' : 'font-medium text-foreground/90'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      {!notif.read && (
                        <span className="size-2 rounded-full bg-primary inline-block" />
                      )}
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {notif.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatTime(notif.createdAt)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => deleteNotification(e, notif._id)}
                        className="opacity-0 group-hover:opacity-100 size-7 text-muted-foreground hover:text-destructive transition-opacity"
                        title="Delete notification"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {notif.message}
                  </p>

                  {notif.link && (
                    <div className="pt-1 flex items-center gap-1 text-[11px] font-semibold text-primary">
                      <span>View details</span>
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

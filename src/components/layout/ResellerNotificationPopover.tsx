'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  ShoppingBag,
  Wallet,
  CheckCheck,
  Settings,
  Info,
  Clock,
  ArrowUpCircle,
  Package,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { NotificationSettingsDialog } from '@/components/admin/NotificationSettingsDialog';
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

export default function ResellerNotificationPopover() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/reseller/notifications?limit=10');
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
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      const res = await fetch('/api/reseller/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      }
    } catch {
      toast.error('Failed to mark notifications as read');
    }
  };

  const handleNotificationClick = async (notif: ResellerNotificationItem) => {
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

    setOpen(false);
    if (notif.link) {
      router.push(notif.link);
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

      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const bellBadgeCount = unreadCount > 0 ? unreadCount : 0;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          nativeButton={true}
          render={
            <Button
              variant="outline"
              size="icon"
              className="relative rounded-full h-9 w-9 bg-background/80 hover:bg-accent border shadow-sm"
              title="Reseller Notifications & Action Center"
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
              {bellBadgeCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
                  {bellBadgeCount > 99 ? '99+' : bellBadgeCount}
                </span>
              )}
            </Button>
          }
        />

        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-[360px] sm:w-[410px] p-0 shadow-2xl rounded-2xl overflow-hidden border border-border"
        >
          {/* Header */}
          <div className="p-3.5 bg-card border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-foreground">Action Center</h3>
              {queues.totalQueueActions > 0 && (
                <Badge variant="destructive" className="rounded-full text-[10px] px-2 py-0">
                  {queues.totalQueueActions} Pending
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 text-[11px] text-muted-foreground hover:text-foreground px-2"
              >
                <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark all read
              </Button>
            )}
          </div>

          {/* Quick Reseller Stats */}
          <div className="p-3 bg-muted/30 border-b">
            <p className="text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-wider">
              Store Queues & Wallet
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                href="/reseller/orders"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between p-2 rounded-lg bg-card hover:bg-primary/[0.06] border border-border/60 transition-colors"
              >
                <span className="flex items-center gap-1.5 font-medium truncate">
                  <ShoppingBag className="h-3.5 w-3.5 text-blue-600 shrink-0" /> Pending Orders
                </span>
                <Badge
                  variant={queues.pendingOrders > 0 ? 'default' : 'secondary'}
                  className="text-[10px] h-5 px-1.5 shrink-0"
                >
                  {queues.pendingOrders}
                </Badge>
              </Link>

              <Link
                href="/reseller/products"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between p-2 rounded-lg bg-card hover:bg-primary/[0.06] border border-border/60 transition-colors"
              >
                <span className="flex items-center gap-1.5 font-medium truncate">
                  <Package className="h-3.5 w-3.5 text-amber-600 shrink-0" /> Pending Approvals
                </span>
                <Badge
                  variant={queues.pendingProducts > 0 ? 'default' : 'secondary'}
                  className="text-[10px] h-5 px-1.5 shrink-0"
                >
                  {queues.pendingProducts}
                </Badge>
              </Link>

              <Link
                href="/reseller/wallet"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between p-2 rounded-lg bg-card hover:bg-primary/[0.06] border border-border/60 transition-colors"
              >
                <span className="flex items-center gap-1.5 font-medium truncate">
                  <Wallet className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Wallet Balance
                </span>
                <span className="text-[11px] font-bold text-emerald-600">
                  ৳{queues.walletBalance.toLocaleString('en-BD')}
                </span>
              </Link>

              <Link
                href="/reseller/low-stock"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between p-2 rounded-lg bg-card hover:bg-primary/[0.06] border border-border/60 transition-colors"
              >
                <span className="flex items-center gap-1.5 font-medium truncate">
                  <AlertTriangle className="h-3.5 w-3.5 text-orange-600 shrink-0" /> Low Stock
                </span>
                <Badge
                  variant={queues.lowStock > 0 ? 'secondary' : 'secondary'}
                  className="text-[10px] h-5 px-1.5 shrink-0"
                >
                  {queues.lowStock}
                </Badge>
              </Link>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[260px] overflow-y-auto divide-y divide-border/60">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No recent notifications logged.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 flex items-start gap-2.5 transition-colors cursor-pointer ${
                    !notif.read
                      ? 'bg-primary/[0.04] hover:bg-primary/[0.08]'
                      : 'bg-card hover:bg-muted/40'
                  }`}
                >
                  <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs truncate ${
                          !notif.read ? 'font-bold text-foreground' : 'font-medium text-foreground/80'
                        }`}
                      >
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {formatTime(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                  {!notif.read && (
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-muted/40 border-t flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                setIsSettingsOpen(true);
              }}
              className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-3.5 w-3.5 text-primary" />
              Alert Settings
            </Button>

            <Link
              href="/reseller/notifications"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-primary hover:underline pr-1"
            >
              <span>View All Alerts & Logs</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </PopoverContent>
      </Popover>

      {/* Settings Dialog when triggered from Popover Footer */}
      <NotificationSettingsDialog
        openControlled={isSettingsOpen}
        onOpenControlledChange={setIsSettingsOpen}
        hideTriggerButton={true}
      />
    </>
  );
}

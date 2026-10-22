'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, RefreshCw, DollarSign, ShoppingBag, ExternalLink, Phone } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ResellerReceivablePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReceivables = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reseller/ledger/receivable');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch receivables:', error);
      toast.error('Failed to load receivable ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceivables();
  }, []);

  const orders = data?.orders || [];
  const summary = data?.summary || { totalReceivable: 0, pendingOrdersCount: 0 };

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/reseller/ledger">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Account Receivable</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Track pending commission and receivables from in-transit customer orders</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchReceivables} disabled={loading} className="h-9">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <p className="text-xs text-muted-foreground font-medium">Total Pending Receivables (Pending Commission)</p>
            </div>
            <p className="text-2xl font-black text-emerald-600 mt-1">৳{(summary.totalReceivable || 0).toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Pending Receivable Orders</p>
            </div>
            <p className="text-2xl font-black text-foreground mt-1">{summary.pendingOrdersCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Receivables Orders Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-3.5 border-b bg-muted/40 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Pending In-Transit Receivable Orders</h3>
          <Badge variant="secondary" className="text-[10px]">{orders.length}</Badge>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-xs font-bold">Order ID</TableHead>
                <TableHead className="text-xs font-bold">Date</TableHead>
                <TableHead className="text-xs font-bold">Customer</TableHead>
                <TableHead className="text-xs font-bold">Status</TableHead>
                <TableHead className="text-xs font-bold">Payment Method</TableHead>
                <TableHead className="text-xs font-bold text-right">Order Total</TableHead>
                <TableHead className="text-xs font-bold text-right">Your Receivable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-36 text-center">
                    <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground mt-2 font-medium">Loading receivables...</p>
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-36 text-center text-muted-foreground text-xs">
                    No pending receivable orders found.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((o: any) => (
                  <TableRow key={o._id} className="hover:bg-muted/30">
                    <TableCell className="text-xs font-bold text-primary">
                      #{o.shortId || o._id.substring(o._id.length - 6)}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {o.createdAt ? format(new Date(o.createdAt), 'dd MMM yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-xs">
                      <p className="font-semibold text-foreground">{o.customer?.name || o.shippingAddress?.name || 'Customer'}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {o.customer?.phone || o.shippingAddress?.phone || '-'}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[10px]">
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-medium">
                      {o.paymentMethod || 'COD'}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground font-mono">
                      ৳{(o.totalAmount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-xs font-black text-emerald-600 font-mono">
                      ৳{(o.resellerCommission !== undefined ? o.resellerCommission : (o.commission || 0)).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

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
import { ArrowLeft, Loader2, RefreshCw, Wallet, Clock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ResellerPayablePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchPayables = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reseller/ledger/payable');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch payables:', error);
      toast.error('Failed to load payable ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayables();
  }, []);

  const pendingPayouts = data?.pendingPayouts || [];
  const summary = data?.summary || { totalPayable: 0, pendingPayoutsCount: 0, walletBalance: 0, pendingBalance: 0 };

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
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Account Payable</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Track pending payout requests and payment obligations</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPayables} disabled={loading} className="h-9">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-rose-500/20 bg-rose-500/5 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-rose-600" />
              <p className="text-xs text-muted-foreground font-medium">Pending Payouts</p>
            </div>
            <p className="text-2xl font-black text-rose-600 mt-1">৳{(summary.totalPayable || 0).toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-600" />
              <p className="text-xs text-muted-foreground font-medium">Available Wallet Balance</p>
            </div>
            <p className="text-2xl font-black text-emerald-600 mt-1">৳{(summary.walletBalance || 0).toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Pending Release Balance</p>
            </div>
            <p className="text-2xl font-black text-foreground mt-1">৳{(summary.pendingBalance || 0).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Payables Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-3.5 border-b bg-muted/40 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Pending Payout Requests</h3>
          <Badge variant="secondary" className="text-[10px]">{pendingPayouts.length}</Badge>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-xs font-bold">Request Date</TableHead>
                <TableHead className="text-xs font-bold">Description / Method</TableHead>
                <TableHead className="text-xs font-bold">Status</TableHead>
                <TableHead className="text-xs font-bold text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-36 text-center">
                    <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground mt-2 font-medium">Loading payable records...</p>
                  </TableCell>
                </TableRow>
              ) : pendingPayouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-36 text-center text-muted-foreground text-xs">
                    No pending payouts or payable dues found.
                  </TableCell>
                </TableRow>
              ) : (
                pendingPayouts.map((p: any) => (
                  <TableRow key={p._id} className="hover:bg-muted/30">
                    <TableCell className="text-xs whitespace-nowrap">
                      {p.createdAt ? format(new Date(p.createdAt), 'dd MMM yyyy, hh:mm a') : '-'}
                    </TableCell>
                    <TableCell className="text-xs">
                      <p className="font-semibold text-foreground">{p.description || 'Withdrawal Request'}</p>
                      {p.accountDetails && (
                        <p className="text-[10px] text-muted-foreground">{p.accountDetails}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                        Pending
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs font-black text-rose-600">
                      ৳{Math.abs(p.amount || 0).toLocaleString()}
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

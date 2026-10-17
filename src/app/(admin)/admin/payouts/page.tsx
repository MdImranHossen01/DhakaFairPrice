'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Check, X, CreditCard, Search, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { MobileDataCard, MobileDataRow } from '@/components/common/MobileDataCard';
import { Pagination } from '@/components/ui/pagination';

const ITEMS_PER_PAGE = 10;

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [processingTransaction, setProcessingTransaction] = useState<any | null>(null);
  const [payoutReference, setPayoutReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const fetchPayouts = async () => {
    try {
      const res = await fetch('/api/admin/payouts');
      if (res.ok) {
        const data = await res.json();
        setPayouts(data.payouts || []);
      }
    } catch {
      toast.error('Failed to load payout data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/admin/accounts');
      if (res.ok) {
        const data = await res.json();
        const liquid = (data.accounts || []).filter((a: any) =>
          a.type !== 'liability' && a.code !== 'AP' && a.code !== 'AR'
        );
        setAccounts(liquid);
      }
    } catch {
      console.error('Failed to load accounts');
    }
  };

  useEffect(() => {
    fetchPayouts();
    fetchAccounts();
  }, []);

  const openPayoutDialog = (p: any) => {
    setProcessingTransaction(p);
    setPayoutReference('');
    const method = (p.payoutMethod || '').toLowerCase();
    const matched = accounts.find((a: any) =>
      a.name?.toLowerCase().includes(method) ||
      a.mfsProvider?.toLowerCase().includes(method) ||
      a.code?.toLowerCase().includes(method)
    );
    setSelectedAccountId(matched ? matched._id : (accounts[0]?._id || ''));
  };

  const selectedAccount = accounts.find((a: any) => a._id === selectedAccountId);

  const handleProcessPayout = async (action: 'approve' | 'reject', transaction: any = processingTransaction) => {
    if (!transaction) return;
    if (action === 'approve' && !selectedAccountId) {
      toast.error('যে অ্যাকাউন্ট থেকে টাকা কর্তন হবে তা নির্বাচন করুন');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: transaction._id,
          action,
          payoutReference: action === 'approve' ? payoutReference : undefined,
          fromAccountId: action === 'approve' ? selectedAccountId : undefined,
        }),
      });
      if (res.ok) {
        toast.success(action === 'approve' ? 'Payout disbursed successfully' : 'Payout cancelled and refunded');
        setProcessingTransaction(null);
        setPayoutReference('');
        fetchPayouts();
        fetchAccounts();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Operation failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadgeColor: Record<string, string> = {
    cleared: 'bg-green-500/10 text-green-600 border-green-500/20',
    pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    failed: 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  const filtered = payouts.filter(p =>
    p.resellerId?.storeName?.toLowerCase().includes(search.toLowerCase()) ||
    p.payoutReference?.toLowerCase().includes(search.toLowerCase()) ||
    p.payoutMethod?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginatedPayouts = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="flex-1 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">Payout Requests</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Manage all reseller payout requests and payment records</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search store name, method, or reference..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-8 h-9 text-xs"
          />
        </div>
      </div>

      <Card className="shadow-xs overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : paginatedPayouts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-xs">
              <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No payout requests found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reseller Store</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Account / Reference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPayouts.map(p => (
                      <TableRow key={p._id}>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(p.createdAt), 'dd MMM yyyy, hh:mm a')}</TableCell>
                        <TableCell className="font-bold">{p.resellerId?.storeName || 'Deleted Store'}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{p.resellerId?.userId?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{p.resellerId?.userId?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-black text-red-600">৳{Math.abs(p.amount).toLocaleString()}</TableCell>
                        <TableCell className="capitalize font-bold">{p.payoutMethod}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{p.payoutReference}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadgeColor[p.status] || ''}>
                            {p.status === 'cleared' ? 'Paid' : p.status === 'pending' ? 'Pending' : 'Cancelled'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          {p.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 h-8 text-xs font-semibold"
                                onClick={() => openPayoutDialog(p)}
                              >
                                <Check className="h-3.5 w-3.5 mr-1" />Release Payment
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 text-xs font-semibold"
                                onClick={async () => {
                                  const result = await Swal.fire({
                                    title: 'Cancel this request?',
                                    text: 'Funds will be refunded to the reseller wallet.',
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonColor: '#d33',
                                    cancelButtonColor: '#3085d6',
                                    confirmButtonText: 'Yes, cancel it',
                                    cancelButtonText: 'Back'
                                  });
                                  if (result.isConfirmed) {
                                    handleProcessPayout('reject', p);
                                  }
                                }}
                              >
                                <X className="h-3.5 w-3.5 mr-1" />Cancel
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List */}
              <div className="block md:hidden p-2 space-y-2.5">
                {paginatedPayouts.map(p => (
                  <MobileDataCard
                    key={p._id}
                    title={p.resellerId?.storeName || 'Deleted Store'}
                    badge={
                      <Badge variant="outline" className={`text-[10px] ${statusBadgeColor[p.status] || ''}`}>
                        {p.status === 'cleared' ? 'Paid' : p.status === 'pending' ? 'Pending' : 'Cancelled'}
                      </Badge>
                    }
                    footer={
                      <div className="flex items-center justify-between w-full font-bold text-xs">
                        <span className="text-muted-foreground">Payout Amount:</span>
                        <span className="text-rose-600 text-sm font-black">৳{Math.abs(p.amount).toLocaleString()}</span>
                      </div>
                    }
                  >
                    <MobileDataRow label="Date" value={format(new Date(p.createdAt), 'dd MMM yyyy, hh:mm a')} />
                    <MobileDataRow label="Owner" value={p.resellerId?.userId?.name || 'Unknown'} />
                    <MobileDataRow label="Method" value={<span className="capitalize font-semibold">{p.payoutMethod}</span>} />
                    <MobileDataRow label="A/C / Ref" value={<span className="font-mono text-xs">{p.payoutReference}</span>} />

                    {p.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 h-7 text-xs font-semibold px-2"
                          onClick={() => openPayoutDialog(p)}
                        >
                          <Check className="h-3 w-3 mr-1" /> Release
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs font-semibold px-2"
                          onClick={async () => {
                            const result = await Swal.fire({
                              title: 'Cancel this request?',
                              text: 'Funds will be refunded to the reseller wallet.',
                              icon: 'warning',
                              showCancelButton: true,
                              confirmButtonColor: '#d33',
                              cancelButtonColor: '#3085d6',
                              confirmButtonText: 'Yes, cancel it',
                              cancelButtonText: 'Back'
                            });
                            if (result.isConfirmed) {
                              handleProcessPayout('reject', p);
                            }
                          }}
                        >
                          <X className="h-3 w-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    )}
                  </MobileDataCard>
                ))}
              </div>

              {/* Pagination */}
              {!loading && totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} (Total {filtered.length})
                  </p>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Payout Approval Dialog */}
      <Dialog open={processingTransaction !== null && processingTransaction.status === 'pending'} onOpenChange={open => !open && setProcessingTransaction(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Payment Release</DialogTitle>
            <DialogDescription>
              Record the transaction ID or payout reference number after sending payment to the reseller.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Payment Method</Label>
              <Input value={processingTransaction?.payoutMethod?.toUpperCase()} disabled className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Account Number</Label>
              <Input value={processingTransaction?.payoutReference} disabled className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Amount (৳)</Label>
              <Input value={Math.abs(processingTransaction?.amount || 0)} disabled className="h-8 text-xs font-bold" />
            </div>

            {/* Deduct From Account Selection */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Deduct From Account (পরিশোধের অ্যাকাউন্ট) *</Label>
              {accounts.length === 0 ? (
                <p className="text-[11px] text-destructive">কোনো সক্রিয় অ্যাকাউন্ট পাওয়া যায়নি।</p>
              ) : (
                <select
                  value={selectedAccountId}
                  onChange={e => setSelectedAccountId(e.target.value)}
                  className="w-full h-8 border rounded-md px-2 text-xs bg-background focus:ring-1 focus:ring-primary focus:outline-none"
                  required
                >
                  <option value="" disabled>-- সিলেক্ট করুন --</option>
                  {accounts.map((acc: any) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name} ({acc.category || acc.code}) — ব্যালেন্স: ৳{(acc.currentBalance || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              )}
              {selectedAccount && (
                <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-0.5">
                  <span>বর্তমান ব্যালেন্স: <strong className="text-foreground">৳{(selectedAccount.currentBalance || 0).toLocaleString()}</strong></span>
                  {selectedAccount.currentBalance < Math.abs(processingTransaction?.amount || 0) && (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">সতর্কতা: অপর্যাপ্ত ব্যালেন্স</span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Transaction ID / Payment Reference</Label>
              <Input
                placeholder="e.g. TRXXXXXXXX"
                value={payoutReference}
                onChange={e => setPayoutReference(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setProcessingTransaction(null)} disabled={submitting}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => handleProcessPayout('approve')}
              disabled={submitting || !payoutReference || !selectedAccountId}
              className="font-bold"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Complete Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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

  const fetchPayouts = async () => {
    try {
      const res = await fetch('/api/admin/payouts');
      if (res.ok) {
        const data = await res.json();
        setPayouts(data.payouts || []);
      }
    } catch {
      toast.error('পেআউট তথ্য লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const handleProcessPayout = async (action: 'approve' | 'reject', transaction: any = processingTransaction) => {
    if (!transaction) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: transaction._id,
          action,
          payoutReference: action === 'approve' ? payoutReference : undefined,
        }),
      });
      if (res.ok) {
        toast.success(action === 'approve' ? 'পেআউট সফলভাবে পরিশোধিত হয়েছে' : 'পেআউট বাতিল ও রিফান্ড করা হয়েছে');
        setProcessingTransaction(null);
        setPayoutReference('');
        fetchPayouts();
      } else {
        const err = await res.json();
        toast.error(err.error || 'সমস্যা হয়েছে');
      }
    } catch {
      toast.error('নেটওয়ার্ক ত্রুটি');
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
    <div className="flex-1 space-y-4 md:space-y-6 px-0 py-2 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">পেআউট অনুরোধ সমূহ</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">রিসেলারদের সকল পেআউট অনুরোধ ও পেমেন্ট রেকর্ড পরিচালনা করুন</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="স্টোর নাম, মেথড বা রেফারেন্স..."
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
              <p>কোনো পেআউট অনুরোধ পাওয়া যায়নি</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>তারিখ</TableHead>
                      <TableHead>রিসেলার স্টোর</TableHead>
                      <TableHead>মালিক</TableHead>
                      <TableHead>পরিমাণ</TableHead>
                      <TableHead>পদ্ধতি</TableHead>
                      <TableHead>হিসাব নম্বর / রেফারেন্স</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead className="text-right">অ্যাকশন</TableHead>
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
                            {p.status === 'cleared' ? 'পরিশোধিত' : p.status === 'pending' ? 'পেন্ডিং' : 'বাতিল'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          {p.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 h-8 text-xs font-semibold"
                                onClick={() => {
                                  setProcessingTransaction(p);
                                  setPayoutReference('');
                                }}
                              >
                                <Check className="h-3.5 w-3.5 mr-1" />পেমেন্ট রিলিজ
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 text-xs font-semibold"
                                onClick={async () => {
                                  const result = await Swal.fire({
                                    title: 'অনুরোধটি বাতিল করতে চান?',
                                    text: 'বাতিল করলে টাকা রিসেলারের ওয়ালেটে ফেরত যাবে।',
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonColor: '#d33',
                                    cancelButtonColor: '#3085d6',
                                    confirmButtonText: 'হ্যাঁ, বাতিল করুন',
                                    cancelButtonText: 'ফিরে যান'
                                  });
                                  if (result.isConfirmed) {
                                    handleProcessPayout('reject', p);
                                  }
                                }}
                              >
                                <X className="h-3.5 w-3.5 mr-1" />বাতিল
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
                        {p.status === 'cleared' ? 'পরিশোধিত' : p.status === 'pending' ? 'পেন্ডিং' : 'বাতিল'}
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
                          onClick={() => {
                            setProcessingTransaction(p);
                            setPayoutReference('');
                          }}
                        >
                          <Check className="h-3 w-3 mr-1" /> রিলিজ
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs font-semibold px-2"
                          onClick={async () => {
                            const result = await Swal.fire({
                              title: 'অনুরোধটি বাতিল করতে চান?',
                              text: 'বাতিল করলে টাকা রিসেলারের ওয়ালেটে ফেরত যাবে।',
                              icon: 'warning',
                              showCancelButton: true,
                              confirmButtonColor: '#d33',
                              cancelButtonColor: '#3085d6',
                              confirmButtonText: 'হ্যাঁ, বাতিল করুন',
                              cancelButtonText: 'ফিরে যান'
                            });
                            if (result.isConfirmed) {
                              handleProcessPayout('reject', p);
                            }
                          }}
                        >
                          <X className="h-3 w-3 mr-1" /> বাতিল
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
                    দেখাচ্ছে {(currentPage - 1) * ITEMS_PER_PAGE + 1} থেকে{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} (মোট {filtered.length})
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
            <DialogTitle>পেমেন্ট রিলিজ নিশ্চিতকরণ</DialogTitle>
            <DialogDescription>
              রিসেলারকে পেমেন্ট পাঠানোর পর প্রাপ্ত ট্রানজেকশন আইডি বা রেফারেন্স নম্বর এখানে সংরক্ষণ করুন।
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">পেমেন্ট মেথড</Label>
              <Input value={processingTransaction?.payoutMethod?.toUpperCase()} disabled className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">হিসাব নম্বর</Label>
              <Input value={processingTransaction?.payoutReference} disabled className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">পরিমাণ (৳)</Label>
              <Input value={Math.abs(processingTransaction?.amount || 0)} disabled className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ট্রানজেকশন আইডি / পেমেন্ট রেফারেন্স</Label>
              <Input
                placeholder="যেমন: TRXXXXXXXX"
                value={payoutReference}
                onChange={e => setPayoutReference(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setProcessingTransaction(null)} disabled={submitting}>বাতিল</Button>
            <Button size="sm" onClick={() => handleProcessPayout('approve')} disabled={submitting || !payoutReference} className="font-bold">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              পরিশোধ সম্পন্ন করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

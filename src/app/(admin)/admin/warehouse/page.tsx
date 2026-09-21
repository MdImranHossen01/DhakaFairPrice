'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { Loader2, Search, ArrowUpDown, ShieldAlert, Package, Check } from 'lucide-react';
import { toast } from 'sonner';
import { MobileDataCard, MobileDataRow } from '@/components/common/MobileDataCard';

export default function AdminWarehousePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [adjustingItem, setAdjustingItem] = useState<{ product: any; variant?: any } | null>(null);
  const [adjustmentValue, setAdjustmentValue] = useState<number>(0);
  const [adjustmentType, setAdjustmentType] = useState<'inc' | 'set'>('inc');
  const [adjustmentReason, setAdjustmentReason] = useState('Restock');
  const [updating, setUpdating] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=100');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch {
      toast.error('পণ্য তালিকা লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAdjustStock = async () => {
    if (!adjustingItem) return;
    setUpdating(true);
    try {
      const res = await fetch('/api/admin/warehouse/stock-adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: adjustingItem.product._id,
          variantId: adjustingItem.variant?._id || undefined,
          quantity: adjustmentValue,
          type: adjustmentType,
          reason: adjustmentReason,
        }),
      });

      if (res.ok) {
        toast.success('স্টক সফলভাবে আপডেট করা হয়েছে');
        setAdjustingItem(null);
        fetchProducts();
      } else {
        const err = await res.json();
        toast.error(err.error || 'স্টক আপডেট করতে ব্যর্থ');
      }
    } catch {
      toast.error('নেটওয়ার্ক ত্রুটি');
    } finally {
      setUpdating(false);
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-4 px-0 py-2 md:p-8 font-sans">
      <div className="border-b pb-3">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">গুদাম ও ইনভেন্টরি কন্ট্রোল</h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">গুদামের পণ্যের স্টক লেভেল পর্যবেক্ষণ ও সমন্বয় করুন</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="পণ্য বা SKU দিয়ে খুঁজুন..."
            value={search}
            onChange={e => setSearch(e.target.value)}
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
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-xs">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>কোনো পণ্য পাওয়া যায়নি</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>পণ্যের নাম</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>ভ্যারিয়েন্ট বিবরণ</TableHead>
                      <TableHead>স্টক লেভেল</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead className="text-right">সমন্বয়</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(p => {
                      const hasVariants = p.variants && p.variants.length > 0;
                      return (
                        <TableRow key={p._id}>
                          <TableCell className="font-semibold">{p.name}</TableCell>
                          <TableCell className="font-mono text-xs">{p.sku || 'ভ্যারিয়েন্ট SKU'}</TableCell>
                          <TableCell>
                            {hasVariants ? (
                              <div className="space-y-1">
                                {p.variants.map((v: any) => (
                                  <div key={v._id} className="text-xs flex items-center justify-between border-b pb-1 last:border-0 last:pb-0">
                                    <span>{v.color || 'No Color'} / {v.size || 'No Size'} ({v.sku || 'No SKU'})</span>
                                    <span className="font-bold mr-4">{v.stock} pcs</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => {
                                        setAdjustingItem({ product: p, variant: v });
                                        setAdjustmentValue(0);
                                        setAdjustmentType('inc');
                                      }}
                                    >
                                      স্টক এডজাস্ট
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">কোনো ভ্যারিয়েন্ট নেই</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`font-black text-sm ${p.stock <= 5 ? 'text-destructive' : 'text-green-600'}`}>
                              {p.stock} pcs
                            </span>
                          </TableCell>
                          <TableCell>
                            {p.stock <= 5 ? (
                              <span className="text-[10px] text-destructive bg-destructive/10 px-2 py-0.5 rounded font-black uppercase">Low Stock</span>
                            ) : (
                              <span className="text-[10px] text-green-600 bg-green-500/10 px-2 py-0.5 rounded font-black uppercase">In Stock</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!hasVariants && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setAdjustingItem({ product: p });
                                  setAdjustmentValue(0);
                                  setAdjustmentType('inc');
                                }}
                              >
                                স্টক এডজাস্ট
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List View */}
              <div className="block md:hidden p-2 space-y-2.5">
                {filtered.map(p => {
                  const hasVariants = p.variants && p.variants.length > 0;
                  return (
                    <MobileDataCard
                      key={p._id}
                      title={p.name}
                      badge={
                        p.stock <= 5 ? (
                          <span className="text-[10px] text-destructive bg-destructive/10 px-2 py-0.5 rounded font-black uppercase">Low Stock</span>
                        ) : (
                          <span className="text-[10px] text-green-600 bg-green-500/10 px-2 py-0.5 rounded font-black uppercase">In Stock</span>
                        )
                      }
                      footer={
                        !hasVariants ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-8 text-xs font-semibold"
                            onClick={() => {
                              setAdjustingItem({ product: p });
                              setAdjustmentValue(0);
                              setAdjustmentType('inc');
                            }}
                          >
                            স্টক এডজাস্ট করুন
                          </Button>
                        ) : undefined
                      }
                    >
                      <MobileDataRow label="SKU" value={<span className="font-mono text-xs">{p.sku || 'N/A'}</span>} />
                      <MobileDataRow 
                        label="Total Stock" 
                        value={
                          <span className={`font-black ${p.stock <= 5 ? 'text-destructive' : 'text-green-600'}`}>
                            {p.stock} pcs
                          </span>
                        } 
                      />
                      {hasVariants && (
                        <div className="border-t pt-2 space-y-1.5">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">ভ্যারিয়েন্ট তালিকা:</p>
                          {p.variants.map((v: any) => (
                            <div key={v._id} className="text-xs flex items-center justify-between bg-muted/40 p-1.5 rounded">
                              <span>{v.color || ''} {v.size ? `(${v.size})` : ''}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{v.stock} pcs</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-1.5 text-[10px]"
                                  onClick={() => {
                                    setAdjustingItem({ product: p, variant: v });
                                    setAdjustmentValue(0);
                                    setAdjustmentType('inc');
                                  }}
                                >
                                  এডজাস্ট
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </MobileDataCard>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Adjust Dialog */}
      <Dialog open={adjustingItem !== null} onOpenChange={open => !open && setAdjustingItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>ইনভেন্টরি স্টক সমন্বয়</DialogTitle>
            <DialogDescription>
              {adjustingItem?.product?.name} {adjustingItem?.variant ? `(${adjustingItem.variant.color || ''} / ${adjustingItem.variant.size || ''})` : ''} এর স্টক এডজাস্ট করুন।
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">সমন্বয়ের ধরন</Label>
              <select
                value={adjustmentType}
                onChange={e => setAdjustmentType(e.target.value as 'inc' | 'set')}
                className="w-full h-8 border rounded-lg px-2 text-xs bg-background"
              >
                <option value="inc">যোগ/বিয়োগ করুন (যেমন: +১০ বা -৫)</option>
                <option value="set">সরাসরি নতুন স্টক নির্ধারণ করুন (যেমন: ৫০)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">পরিমাণ (সংখ্যা)</Label>
              <Input
                type="number"
                value={adjustmentValue}
                onChange={e => setAdjustmentValue(Number(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">সমন্বয়ের কারণ</Label>
              <select
                value={adjustmentReason}
                onChange={e => setAdjustmentReason(e.target.value)}
                className="w-full h-8 border rounded-lg px-2 text-xs bg-background"
              >
                <option value="Restock">নতুন রি-স্টক (Restock)</option>
                <option value="Damage">ক্ষতিগ্রস্ত পণ্য (Damage)</option>
                <option value="Customer Return">গ্রাহক রিটার্ন (Return)</option>
                <option value="Audit adjustment">অডিট এবং কাউন্ট সমন্বয় (Audit)</option>
              </select>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setAdjustingItem(null)} disabled={updating}>বাতিল</Button>
            <Button size="sm" onClick={handleAdjustStock} disabled={updating} className="font-bold">
              {updating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              স্টক সেভ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
      toast.error('Failed to load product list');
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
        toast.success('Stock updated successfully');
        setAdjustingItem(null);
        fetchProducts();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update stock');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setUpdating(false);
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-4  font-sans">
      <div className="border-b pb-3">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Warehouse & Inventory Control</h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Monitor and adjust warehouse product stock levels</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by product name or SKU..."
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
              <p>No products found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Variant Details</TableHead>
                      <TableHead>Stock Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Adjustment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(p => {
                      const hasVariants = p.variants && p.variants.length > 0;
                      return (
                        <TableRow key={p._id}>
                          <TableCell className="font-semibold">{p.name}</TableCell>
                          <TableCell className="font-mono text-xs">{p.sku || 'Variant SKU'}</TableCell>
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
                                      Adjust Stock
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">No variants</span>
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
                                Adjust Stock
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
                            Adjust Stock
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
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Variant List:</p>
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
                                  Adjust
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
            <DialogTitle>Adjust Inventory Stock</DialogTitle>
            <DialogDescription>
              Adjust stock for {adjustingItem?.product?.name} {adjustingItem?.variant ? `(${adjustingItem.variant.color || ''} / ${adjustingItem.variant.size || ''})` : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Adjustment Type</Label>
              <select
                value={adjustmentType}
                onChange={e => setAdjustmentType(e.target.value as 'inc' | 'set')}
                className="w-full h-8 border rounded-lg px-2 text-xs bg-background"
              >
                <option value="inc">Add / Deduct (e.g. +10 or -5)</option>
                <option value="set">Set Exact New Stock (e.g. 50)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quantity</Label>
              <Input
                type="number"
                value={adjustmentValue}
                onChange={e => setAdjustmentValue(Number(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Adjustment Reason</Label>
              <select
                value={adjustmentReason}
                onChange={e => setAdjustmentReason(e.target.value)}
                className="w-full h-8 border rounded-lg px-2 text-xs bg-background"
              >
                <option value="Restock">New Restock</option>
                <option value="Damage">Damaged Product</option>
                <option value="Customer Return">Customer Return</option>
                <option value="Audit adjustment">Audit Count Adjustment</option>
              </select>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setAdjustingItem(null)} disabled={updating}>Cancel</Button>
            <Button size="sm" onClick={handleAdjustStock} disabled={updating} className="font-bold">
              {updating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

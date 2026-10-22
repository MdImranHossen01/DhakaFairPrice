'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Store, Package } from 'lucide-react';

export interface SelectedProductItem {
  productId: string;
  name: string;
  price: number;
  purchasePrice?: number;
  quantity: number;
  color?: string;
  size?: string;
  image?: string;
  variantId?: string;
}

interface ProductPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddSelected: (items: SelectedProductItem[]) => void;
  uploadedByFilter?: string | null;
  sellerName?: string;
  title?: string;
}

export default function ProductPickerDialog({
  open,
  onOpenChange,
  onAddSelected,
  uploadedByFilter,
  sellerName,
  title = 'Select Products',
}: ProductPickerDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<
    Record<string, { product: any; variant: any | null }>
  >({});

  // Reset search and selection when modal opens
  useEffect(() => {
    if (open) {
      setSelectedVariants({});
      setSearchTerm('');
      fetchProducts('');
    }
  }, [open, uploadedByFilter]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      fetchProducts(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchProducts = async (search: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '50');
      if (search.trim()) {
        params.set('search', search.trim());
      }
      if (uploadedByFilter) {
        params.set('uploadedBy', uploadedByFilter);
      }

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Error fetching products for picker:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleVariant = (product: any, variant: any | null) => {
    const key = `${product._id}_${variant?._id || 'standard'}`;
    setSelectedVariants((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = { product, variant };
      }
      return next;
    });
  };

  const handleAdd = () => {
    const items: SelectedProductItem[] = Object.values(selectedVariants).map(
      ({ product, variant }) => {
        const hasVariant = Boolean(variant);
        const name = hasVariant
          ? `${product.name} — ${[variant.color, variant.size].filter(Boolean).join(' / ')}`
          : product.name;
        const price = Number(
          hasVariant
            ? variant.salePrice || variant.price
            : product.salePrice || product.price || 0
        );
        const purchasePrice = Number(
          hasVariant
            ? variant.purchasePrice || product.purchasePrice || 0
            : product.purchasePrice || 0
        );
        const image =
          (product.images && product.images[0]) || product.image || '';

        return {
          productId: product._id,
          name,
          price,
          purchasePrice,
          quantity: 1,
          color: variant?.color || '',
          size: variant?.size || '',
          image,
          variantId: variant?._id,
        };
      }
    );

    if (items.length > 0) {
      onAddSelected(items);
    }
    setSelectedVariants({});
    onOpenChange(false);
  };

  const selectedCount = Object.keys(selectedVariants).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {title}
            </DialogTitle>
          </div>
        </DialogHeader>

        {sellerName && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-2.5 flex items-center justify-between text-xs text-primary">
            <div className="flex items-center gap-2 font-medium">
              <Store className="h-4 w-4 shrink-0" />
              <span>
                Showing products from seller: <strong>{sellerName}</strong>
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-background">
              Unified Pickup
            </Badge>
          </div>
        )}

        <div className="space-y-3 flex-1 overflow-hidden flex flex-col pt-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name or SKU..."
              className="pl-9 h-9 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="border rounded-md overflow-hidden flex-1 overflow-y-auto min-h-[300px]">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs">Select</TableHead>
                  <TableHead className="text-xs">Product</TableHead>
                  <TableHead className="text-xs">Options / Variants</TableHead>
                  <TableHead className="text-right text-xs">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span>Loading products...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground text-xs py-8">
                        <Package className="h-8 w-8 mb-2 opacity-40" />
                        <span>No products found</span>
                        {sellerName && (
                          <span className="text-[10px] text-muted-foreground/75 mt-1">
                            This seller does not have products matching the query.
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((prod) => {
                    const hasVariants = prod.variants && prod.variants.length > 0;
                    const standardKey = `${prod._id}_standard`;
                    const isStandardSelected = !!selectedVariants[standardKey];

                    return (
                      <TableRow key={prod._id} className="hover:bg-muted/40">
                        <TableCell className="text-center align-middle">
                          {!hasVariants && (
                            <Checkbox
                              checked={isStandardSelected}
                              onCheckedChange={() => toggleVariant(prod, null)}
                            />
                          )}
                        </TableCell>
                        <TableCell className="align-middle">
                          <div className="flex items-center gap-2.5">
                            {prod.images?.[0] ? (
                              <img
                                src={prod.images[0]}
                                alt={prod.name}
                                className="h-9 w-9 rounded-md object-cover border shrink-0"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                                <Package className="h-4 w-4" />
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-xs text-foreground line-clamp-1">
                                {prod.name}
                              </p>
                              {prod.uploadedBy?.storeName && !sellerName && (
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Store className="h-3 w-3" />
                                  {prod.uploadedBy.storeName}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="align-middle">
                          {hasVariants ? (
                            <div className="flex flex-wrap gap-1.5 py-1">
                              {prod.variants.map((v: any) => {
                                const variantKey = `${prod._id}_${v._id}`;
                                const isSelected = !!selectedVariants[variantKey];
                                const label = [v.color, v.size]
                                  .filter(Boolean)
                                  .join(' / ');
                                const price = v.salePrice || v.price;
                                return (
                                  <Button
                                    key={v._id}
                                    type="button"
                                    variant={isSelected ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => toggleVariant(prod, v)}
                                    className={`text-[11px] py-1 px-2.5 h-7 transition-colors ${
                                      isSelected
                                        ? 'bg-primary text-primary-foreground font-semibold'
                                        : 'hover:bg-muted'
                                    }`}
                                  >
                                    {label || 'Variant'} {price ? `(৳${price})` : ''}
                                  </Button>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              Standard Item
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right align-middle text-xs font-bold">
                          {!hasVariants && `৳${prod.salePrice || prod.price || 0}`}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-xs text-muted-foreground font-medium">
              {selectedCount} item{selectedCount === 1 ? '' : 's'} selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={selectedCount === 0}
                className="bg-primary text-primary-foreground font-bold text-xs"
              >
                Add Selected ({selectedCount})
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

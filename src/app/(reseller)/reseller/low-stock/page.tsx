'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  TrendingDown,
  Edit,
  PlusCircle,
  CheckCircle2,
  Store,
  TrendingUp,
  Loader2,
  Package,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LowStockItem {
  id: string;
  productId: string;
  name: string;
  slug: string;
  color: string | null;
  size: string | null;
  location: string;
  stock: number;
  price: number;
  salePrice?: number;
  resellerPrice?: number;
  purchasePrice?: number;
  images: string[];
  uploadedBy: string | null;
  uploadedByStoreName: string | null;
  isOwnProduct: boolean;
  isSourced: boolean;
  sourceType: 'own' | 'mother' | 'other_reseller';
}

const ITEMS_PER_PAGE = 10;

export default function ResellerLowStockPage() {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Sourcing Modal State
  const [selectedSourceItem, setSelectedSourceItem] = useState<LowStockItem | null>(null);
  const [retailPrice, setRetailPrice] = useState<number>(0);
  const [sourcing, setSourcing] = useState(false);

  const fetchLowStock = async () => {
    try {
      const response = await fetch('/api/products/low-stock');
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching low stock:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLowStock();
  }, []);

  // Filtered & Paginated items
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const term = search.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        (item.color && item.color.toLowerCase().includes(term)) ||
        (item.size && item.size.toLowerCase().includes(term)) ||
        (item.uploadedByStoreName && item.uploadedByStoreName.toLowerCase().includes(term))
    );
  }, [items, search]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1;

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const openSourceModal = (item: LowStockItem) => {
    setSelectedSourceItem(item);
    const wholesale = Math.round(Number(item.resellerPrice ?? item.purchasePrice ?? item.price ?? 0));
    const initialPrice = Math.round(Number(item.salePrice ?? item.price ?? wholesale));
    setRetailPrice(initialPrice);
  };

  const handleAddToStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSourceItem) return;

    const wholesale = Math.round(
      Number(selectedSourceItem.resellerPrice ?? selectedSourceItem.purchasePrice ?? selectedSourceItem.price ?? 0)
    );

    if (!retailPrice || retailPrice <= 0) {
      toast.error('Please enter a valid retail price');
      return;
    }

    if (wholesale > 0 && retailPrice < wholesale) {
      toast.warning('Selling price cannot be less than wholesale cost!');
      return;
    }

    setSourcing(true);
    try {
      const res = await fetch('/api/reseller/products/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedSourceItem.productId,
          retailPrice: Number(retailPrice),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`✓ "${selectedSourceItem.name}" added to your store successfully!`);
        // Update local items state so it shows as sourced
        setItems((prev) =>
          prev.map((i) =>
            i.productId === selectedSourceItem.productId ? { ...i, isSourced: true } : i
          )
        );
        setSelectedSourceItem(null);
      } else {
        toast.error(data.error || 'Failed to add product to store');
      }
    } catch {
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setSourcing(false);
    }
  };

  const wholesaleCost = selectedSourceItem
    ? Math.round(
        Number(
          selectedSourceItem.resellerPrice ??
            selectedSourceItem.purchasePrice ??
            selectedSourceItem.price ??
            0
        )
      )
    : 0;

  const estimatedProfit = (Number(retailPrice) || 0) - wholesaleCost;

  return (
    <div className="flex-1 space-y-4 px-0 py-2 md:p-8 md:space-y-6 w-full max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 md:px-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
            <TrendingDown className="h-5 w-5 md:h-6 md:w-6 text-red-500" />
            Low Stock Inventory
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Inventory monitoring for products and variants with less than 5 units remaining in stock
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search low stock products..."
            className="pl-9 h-9 text-xs md:text-sm rounded-xl"
            value={search}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Variant / Specs</TableHead>
                <TableHead>Inventory Scope</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Stock Level</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto rounded-lg" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    {search ? 'No low stock products match your search.' : 'All products are adequately stocked (≥ 5 units).'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="font-bold text-sm">
                      <div className="flex items-center gap-2.5">
                        {item.images && item.images.length > 0 && (
                          <div className="relative h-9 w-9 rounded-lg overflow-hidden shrink-0 border bg-muted">
                            <Image
                              src={item.images[0]}
                              alt={item.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        )}
                        <span className="line-clamp-1">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.color || item.size ? (
                        <div className="flex gap-1.5 items-center">
                          {item.color && <span className="font-medium text-foreground">{item.color}</span>}
                          {item.color && item.size && <span>•</span>}
                          {item.size && <span>{item.size}</span>}
                        </div>
                      ) : (
                        'Base Product'
                      )}
                    </TableCell>
                    <TableCell>
                      {item.isOwnProduct ? (
                        <Badge
                          variant="outline"
                          className="text-[11px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200"
                        >
                          <Package className="h-3 w-3 mr-1" />
                          Personal Product
                        </Badge>
                      ) : item.sourceType === 'mother' ? (
                        <Badge
                          variant="outline"
                          className="text-[11px] font-medium text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200"
                        >
                          <Store className="h-3 w-3 mr-1" />
                          Mother Catalog
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[11px] font-medium text-purple-700 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200"
                        >
                          <Store className="h-3 w-3 mr-1" />
                          {item.uploadedByStoreName || 'Reseller'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`font-bold text-xs ${
                          item.stock === 0
                            ? 'text-destructive border-destructive/50 bg-destructive/5'
                            : 'text-orange-600 border-orange-200 bg-orange-50'
                        }`}
                      >
                        {item.stock} {item.stock === 1 ? 'unit' : 'units'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.stock === 0 ? (
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                          <AlertTriangle className="h-3 w-3" /> Out of Stock
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1 w-fit bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200 border-red-200"
                        >
                          Critical Low
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.isOwnProduct ? (
                        /* Only Reseller's own products can be Restocked/Edited */
                        <Link href={`/reseller/products/${item.productId}/edit`}>
                          <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs gap-1.5 font-medium hover:bg-primary/5">
                            <Edit className="h-3.5 w-3.5 text-primary" /> Restock / Edit
                          </Button>
                        </Link>
                      ) : item.isSourced ? (
                        /* Already added to reseller's store */
                        <Badge
                          variant="outline"
                          className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 font-medium py-1 px-2.5 inline-flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> In Your Store
                        </Badge>
                      ) : (
                        /* Admin/Other reseller product can be sourced to own store */
                        <Button
                          size="sm"
                          variant="default"
                          className="h-8 rounded-lg text-xs gap-1.5 font-semibold bg-primary text-primary-foreground shadow-xs hover:opacity-90"
                          onClick={() => openSourceModal(item)}
                        >
                          <PlusCircle className="h-3.5 w-3.5" /> Add to Store
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Desktop Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-2 pt-4">
            <p className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} of{' '}
              {filteredItems.length} items
            </p>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 border rounded-2xl bg-card shadow-sm space-y-2">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-4 w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : paginatedItems.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-card rounded-2xl border">
            {search ? 'No low stock products match your search.' : 'All products are adequately stocked.'}
          </div>
        ) : (
          paginatedItems.map((item) => (
            <div key={item.id} className="p-4 border rounded-2xl bg-card shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.images && item.images.length > 0 && (
                    <div className="relative h-10 w-10 rounded-lg overflow-hidden shrink-0 border bg-muted">
                      <Image
                        src={item.images[0]}
                        alt={item.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[item.color, item.size].filter(Boolean).join(' • ') || 'Base Stock'}
                    </div>
                  </div>
                </div>
                {item.stock === 0 ? (
                  <Badge variant="destructive" className="text-[10px] shrink-0">Out of Stock</Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-800 border-red-200 shrink-0">
                    Low ({item.stock})
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t">
                <span className="text-muted-foreground">Scope:</span>
                {item.isOwnProduct ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200"
                  >
                    Personal Product
                  </Badge>
                ) : item.sourceType === 'mother' ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-blue-700 bg-blue-50 border-blue-200"
                  >
                    Mother Catalog
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-purple-700 bg-purple-50 border-purple-200"
                  >
                    {item.uploadedByStoreName || 'Reseller'}
                  </Badge>
                )}
              </div>

              <div className="pt-1 flex justify-end">
                {item.isOwnProduct ? (
                  <Link href={`/reseller/products/${item.productId}/edit`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full h-8 rounded-lg text-xs gap-1.5">
                      <Edit className="h-3.5 w-3.5 text-primary" /> Restock / Edit
                    </Button>
                  </Link>
                ) : item.isSourced ? (
                  <div className="w-full py-1 text-center bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" /> In Your Store
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="default"
                    className="w-full h-8 rounded-lg text-xs gap-1.5 font-semibold bg-primary text-primary-foreground"
                    onClick={() => openSourceModal(item)}
                  >
                    <PlusCircle className="h-3.5 w-3.5" /> Add to Store
                  </Button>
                )}
              </div>
            </div>
          ))
        )}

        {/* Mobile Pagination */}
        {!loading && totalPages > 1 && (
          <div className="pt-2">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Quick Sourcing Modal */}
      {selectedSourceItem && (
        <Dialog open={Boolean(selectedSourceItem)} onOpenChange={(open) => !open && setSelectedSourceItem(null)}>
          <DialogContent
            className="sm:max-w-[480px] p-6 rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <DialogHeader className="space-y-1 text-left">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Store className="h-4 w-4" /> Reseller Store Sourcing
              </div>
              <DialogTitle className="text-lg font-black tracking-tight leading-snug">
                Add Product to Your Store
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set your desired retail selling price based on wholesale cost to start selling.
              </DialogDescription>
            </DialogHeader>

            {/* Product Summary Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/60 mt-1">
              {selectedSourceItem.images && selectedSourceItem.images.length > 0 ? (
                <div className="relative h-14 w-14 rounded-lg overflow-hidden shrink-0 border bg-muted">
                  <Image
                    src={selectedSourceItem.images[0]}
                    alt={selectedSourceItem.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center shrink-0 border">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground line-clamp-2 leading-snug">
                  {selectedSourceItem.name}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Main Store Price:{' '}
                  <span className="font-semibold text-foreground">
                    Tk {Math.round(selectedSourceItem.price || 0)}
                  </span>
                </p>
              </div>
            </div>

            <form onSubmit={handleAddToStore} className="space-y-4 pt-2">
              {/* Cost vs Selling Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs">
                <div>
                  <span className="text-muted-foreground text-[11px] block">Wholesale Cost:</span>
                  <span className="text-base font-black text-foreground">Tk {wholesaleCost}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px] block">Estimated Net Profit:</span>
                  <span
                    className={cn(
                      'text-base font-black flex items-center gap-1',
                      estimatedProfit >= 0 ? 'text-emerald-600' : 'text-destructive'
                    )}
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    Tk {estimatedProfit}
                  </span>
                </div>
              </div>

              {/* Retail Price Input */}
              <div className="space-y-1.5">
                <Label htmlFor="selling-price" className="text-xs font-bold">
                  Your Retail Selling Price <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">
                    Tk
                  </span>
                  <Input
                    id="selling-price"
                    type="number"
                    min={wholesaleCost || 1}
                    value={retailPrice}
                    onChange={(e) => setRetailPrice(Number(e.target.value))}
                    className="pl-9 text-base font-black h-11"
                    placeholder="e.g. 500"
                    required
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Customers on your storefront (<Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">subdomain.swapnobaz.com</Badge>) will buy at this price.
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedSourceItem(null)}
                  disabled={sourcing}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={sourcing} className="font-bold">
                  {sourcing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding to Store...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Add to Store
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

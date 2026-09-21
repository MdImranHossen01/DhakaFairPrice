'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Loader2, Search, Package, CheckCircle2, Store, Users, ShoppingBag, Filter, Flame,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

type SourceFilter = 'all' | 'top_selling' | 'admin' | 'reseller' | 'sourced';

const SOURCE_TABS: { key: SourceFilter; label: string; icon: any; color: string }[] = [
  { key: 'all',         label: 'সব প্রোডাক্ট',        icon: Filter,       color: 'bg-primary text-primary-foreground border-primary' },
  { key: 'top_selling', label: 'Top Selling',          icon: Flame,        color: 'bg-amber-600 text-white border-amber-600' },
  { key: 'admin',       label: 'Main Store',           icon: Store,        color: 'bg-blue-600 text-white border-blue-600' },
  { key: 'reseller',    label: 'অন্য Reseller',         icon: Users,        color: 'bg-purple-600 text-white border-purple-600' },
  { key: 'sourced',     label: 'আমার Store-এ আছে',     icon: CheckCircle2, color: 'bg-green-600 text-white border-green-600' },
];

function SourceProductsContent() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [counts, setCounts] = useState({ all: 0, top_selling: 0, admin: 0, reseller: 0, sourced: 0 });

  // Sourcing Dialog
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [retailPrice, setRetailPrice] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = async (currentPage = page, currentFilter = sourceFilter, currentSearch = search) => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: '12',
      source: currentFilter,
    });
    if (currentSearch) params.set('search', currentSearch);

    try {
      const res = await fetch(`/api/reseller/products/source?${params}`);
      if (res.ok) {
        const d = await res.json();
        setProducts(d.products || []);
        setTotalPages(d.pagination?.totalPages || 1);
        setTotal(d.pagination?.total || 0);
        if (d.counts) setCounts(d.counts);
      } else {
        toast.error('প্রোডাক্ট লোড করতে সমস্যা হয়েছে');
      }
    } catch (err) {
      console.error(err);
      toast.error('নেটওয়ার্ক ত্রুটি');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(page, sourceFilter, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sourceFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts(1, sourceFilter, search);
  };

  const handleFilterChange = (filter: SourceFilter) => {
    setSourceFilter(filter);
    setPage(1);
  };

  const openSourcingDialog = (product: any) => {
    setSelectedProduct(product);
    const wholesalePrice = product.resellerPrice || product.purchasePrice || product.price || 0;
    const initialRetailPrice = product.isSourced && product.sourcedDetails?.retailPrice
      ? String(product.sourcedDetails.retailPrice)
      : String(Math.round(wholesalePrice * 1.2));
    setRetailPrice(initialRetailPrice);
  };

  const handleSourceProduct = async () => {
    if (!selectedProduct) return;
    const priceNum = parseFloat(retailPrice);
    const wholesalePrice = selectedProduct.resellerPrice || selectedProduct.purchasePrice || selectedProduct.price || 0;

    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('সঠিক retail price দিন');
      return;
    }
    if (priceNum < wholesalePrice) {
      toast.error(`Retail price কমপক্ষে ৳${wholesalePrice} হতে হবে`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/reseller/products/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProduct._id, retailPrice: priceNum }),
      });

      if (res.ok) {
        toast.success(selectedProduct.isSourced ? 'Retail price আপডেট হয়েছে ✓' : 'প্রোডাক্ট আপনার Store-এ যোগ হয়েছে ✓');
        setSelectedProduct(null);
        fetchProducts(page, sourceFilter, search);
      } else {
        const error = await res.json();
        toast.error(error.error || 'সমস্যা হয়েছে');
      }
    } catch (err) {
      console.error(err);
      toast.error('নেটওয়ার্ক ত্রুটি');
    } finally {
      setSubmitting(false);
    }
  };

  const profit = selectedProduct
    ? Math.max(0, parseFloat(retailPrice || '0') - (selectedProduct.resellerPrice || selectedProduct.purchasePrice || selectedProduct.price || 0))
    : 0;

  return (
    <div className="flex-1 space-y-4 px-0 py-2 md:p-8 md:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 md:px-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Source B2B Products</h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Main Store বা অন্য Reseller-এর product আপনার store-এ যোগ করুন
          </p>
        </div>
      </div>

      {/* Source Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap px-1 md:px-0">
        {SOURCE_TABS.map(tab => {
          const Icon = tab.icon;
          const count = counts[tab.key];
          const isActive = sourceFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleFilterChange(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isActive ? tab.color : 'bg-card text-muted-foreground border-border hover:bg-muted/40'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              <span className={`ml-0.5 ${isActive ? 'opacity-80' : 'text-muted-foreground'}`}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 px-1 md:px-0 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 h-9 text-xs md:text-sm"
            placeholder="নাম বা SKU দিয়ে খুঁজুন..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" size="sm" className="h-9 text-xs">খুঁজুন</Button>
      </form>

      {/* Source type badge description */}
      {sourceFilter !== 'all' && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border mx-1 md:mx-0 ${
          sourceFilter === 'top_selling' ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300' :
          sourceFilter === 'admin' ? 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300' :
          sourceFilter === 'reseller' ? 'bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300' :
          'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300'
        }`}>
          {sourceFilter === 'top_selling' && <><Flame className="h-3.5 w-3.5 text-amber-500" /> সর্বাধিক বিক্রিত ও জনপ্রিয় প্রোডাক্ট (Top Selling) দেখাচ্ছে</>}
          {sourceFilter === 'admin' && <><Store className="h-3.5 w-3.5" /> Main Store (Admin) এর product দেখাচ্ছে</>}
          {sourceFilter === 'reseller' && <><Users className="h-3.5 w-3.5" /> অন্য Reseller-এর shared product দেখাচ্ছে</>}
          {sourceFilter === 'sourced' && <><CheckCircle2 className="h-3.5 w-3.5" /> আপনার Store-এ ইতিমধ্যে যোগ করা product দেখাচ্ছে</>}
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-xl p-8 md:p-12 bg-card text-center gap-2 mx-1 md:mx-0">
          <Package className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
          <p className="font-semibold text-base md:text-lg">কোনো প্রোডাক্ট পাওয়া যায়নি</p>
          <p className="text-xs md:text-sm text-muted-foreground max-w-sm">
            {sourceFilter === 'sourced'
              ? 'আপনি এখনো কোনো product source করেননি।'
              : sourceFilter === 'reseller'
              ? 'কোনো reseller তাদের product share করেনি।'
              : sourceFilter === 'top_selling'
              ? 'কোনো Top Selling প্রোডাক্ট পাওয়া যায়নি।'
              : 'কোনো B2B product পাওয়া যায়নি।'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground px-1 md:px-0">{total} টি প্রোডাক্ট পাওয়া গেছে</p>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 px-1 md:px-0">
            {products.map(product => {
              const wholesalePrice = product.resellerPrice || product.purchasePrice || product.price || 0;
              const isSourced = product.isSourced;
              const isAdmin = product.sourceType === 'admin';
              const resellerStore = product.uploadedBy?.storeName || product.sourceStoreName || 'Reseller';

              return (
                <div
                  key={product._id}
                  className="bg-card border rounded-xl overflow-hidden flex flex-col hover:shadow-md transition-shadow group"
                >
                  {/* Image */}
                  <div className="aspect-[4/3] bg-muted relative w-full overflow-hidden border-b">
                    {product.images?.[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <Package className="h-10 w-10 absolute inset-0 m-auto text-muted-foreground" />
                    )}
                    {/* Source badge */}
                    <div className={`absolute top-2 left-2 flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full max-w-[85%] shadow-sm ${
                      isAdmin ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'
                    }`}>
                      {isAdmin ? (
                        <>
                          <Store className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">Main Store</span>
                        </>
                      ) : (
                        <>
                          <Users className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">Reseller: {resellerStore}</span>
                        </>
                      )}
                    </div>
                    {/* Sourced badge */}
                    {isSourced && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 shadow-sm" title="আপনার Store-এ আছে">
                        <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5 md:p-3 flex flex-col flex-1 gap-1.5">
                    <div className="flex items-center justify-between gap-1 text-[9px] md:text-[10px] text-muted-foreground font-semibold">
                      <span className="uppercase tracking-wider truncate">
                        {product.categories?.[0]?.name || 'Uncategorized'}
                      </span>
                      <span className={isAdmin ? 'text-blue-600 font-bold shrink-0' : 'text-purple-600 font-bold shrink-0 truncate max-w-[110px]'}>
                        {isAdmin ? 'Swapnobaz' : resellerStore}
                      </span>
                    </div>
                    <p className="text-xs md:text-sm font-bold line-clamp-2 leading-snug">{product.name}</p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                      <span>SKU: {product.sku || '-'}</span>
                      {Boolean(product.totalSales && product.totalSales > 0) && (
                        <span className="flex items-center gap-0.5 font-bold text-amber-600 dark:text-amber-400 font-sans">
                          <Flame className="h-3 w-3 fill-amber-500 text-amber-500 shrink-0" />
                          {product.totalSales} Sold
                        </span>
                      )}
                    </div>

                    {/* Price row */}
                    <div className="flex items-center justify-between bg-muted/30 rounded-lg px-2 py-1.5 border text-xs mt-auto">
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase font-bold">Wholesale</span>
                        <span className="font-extrabold text-foreground">৳{wholesalePrice.toLocaleString()}</span>
                      </div>
                      {isSourced && (
                        <div className="text-right">
                          <span className="text-green-600 block text-[9px] uppercase font-bold">আপনার দাম</span>
                          <span className="font-extrabold text-green-600">
                            ৳{product.sourcedDetails?.retailPrice?.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action button */}
                    <Button
                      variant={isSourced ? 'outline' : 'default'}
                      className={`w-full text-xs font-semibold h-8 mt-1 ${isSourced ? 'border-green-500 text-green-600 hover:bg-green-500/10' : ''}`}
                      onClick={() => openSourcingDialog(product)}
                    >
                      {isSourced ? '✓ দাম পরিবর্তন করুন' : '+ Store-এ যোগ করুন'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4 md:mt-6 px-2">
              <Button variant="outline" size="sm" className="h-8 text-xs px-2.5" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                ← পূর্ববর্তী
              </Button>
              <span className="text-xs py-1.5 px-2.5 border rounded-lg">
                {page} / {totalPages}
              </span>
              <Button variant="outline" size="sm" className="h-8 text-xs px-2.5" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                পরবর্তী →
              </Button>
            </div>
          )}
        </>
      )}

      {/* Sourcing Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct?.isSourced ? '💰 Retail Price আপডেট' : '🛒 Store-এ যোগ করুন'}
            </DialogTitle>
            <DialogDescription>
              আপনার store-এ এই product কোন দামে বিক্রি করতে চান সেটি নির্ধারণ করুন।
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4 py-2">
              {/* Product preview */}
              <div className="flex gap-3 items-center border p-3 rounded-lg bg-muted/20">
                <div className="h-14 w-14 bg-muted relative rounded-md overflow-hidden border shrink-0">
                  {selectedProduct.images?.[0] ? (
                    <Image src={selectedProduct.images[0]} alt={selectedProduct.name} fill className="object-cover" />
                  ) : (
                    <Package className="h-7 w-7 absolute inset-0 m-auto text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm line-clamp-1">{selectedProduct.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">SKU: {selectedProduct.sku || '-'}</p>
                  <Badge className={`text-[9px] mt-1 ${selectedProduct.sourceType === 'admin' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                    {selectedProduct.sourceType === 'admin'
                      ? 'Main Store (Swapnobaz)'
                      : `Reseller: ${selectedProduct.uploadedBy?.storeName || selectedProduct.sourceStoreName || 'Reseller'}`}
                  </Badge>
                </div>
              </div>

              {/* Cost / Profit display */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border p-3 rounded-lg text-center bg-muted/40">
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">Wholesale Cost</span>
                  <span className="text-lg font-black text-foreground">
                    ৳{(selectedProduct.resellerPrice || selectedProduct.purchasePrice || selectedProduct.price || 0).toLocaleString()}
                  </span>
                </div>
                <div className={`border p-3 rounded-lg text-center ${profit > 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-muted/40'}`}>
                  <span className={`text-[10px] block uppercase font-bold ${profit > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                    আপনার লাভ
                  </span>
                  <span className={`text-lg font-black ${profit > 0 ? 'text-green-600' : 'text-foreground'}`}>
                    ৳{profit.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Price input */}
              <div className="space-y-1">
                <Label htmlFor="retail-price" className="font-bold text-xs">আপনার বিক্রয় মূল্য (Tk)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-bold">৳</span>
                  <Input
                    id="retail-price"
                    type="number"
                    value={retailPrice}
                    onChange={e => setRetailPrice(e.target.value)}
                    placeholder="বিক্রয় মূল্য লিখুন"
                    className="pl-7 h-10 text-sm font-extrabold"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Wholesale cost-এর চেয়ে বেশি দাম দিতে হবে
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProduct(null)} disabled={submitting}>বাতিল</Button>
            <Button onClick={handleSourceProduct} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedProduct?.isSourced ? 'দাম আপডেট করুন' : 'Store-এ যোগ করুন'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SourceProductsPage() {
  return (
    <Suspense fallback={<div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <SourceProductsContent />
    </Suspense>
  );
}

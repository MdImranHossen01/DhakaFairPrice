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
  { key: 'all',         label: 'All Products',        icon: Filter,       color: 'bg-primary text-primary-foreground border-primary' },
  { key: 'top_selling', label: 'Top Selling',          icon: Flame,        color: 'bg-amber-600 text-white border-amber-600' },
  { key: 'admin',       label: 'Main Store',           icon: Store,        color: 'bg-blue-600 text-white border-blue-600' },
  { key: 'reseller',    label: 'Other Resellers',      icon: Users,        color: 'bg-purple-600 text-white border-purple-600' },
  { key: 'sourced',     label: 'In My Store',          icon: CheckCircle2, color: 'bg-green-600 text-white border-green-600' },
];

interface VariantPricingState {
  color?: string;
  size?: string;
  sku?: string;
  wholesalePrice: number;
  retailPrice: string;
  stock: number;
}

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
  const [variantPricing, setVariantPricing] = useState<VariantPricingState[]>([]);
  const [bulkMarginPercent, setBulkMarginPercent] = useState<string>('20');
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
        toast.error('Failed to load products');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error');
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
    const defaultFeeRatio = 0.15;
    const wholesalePrice = product.resellerPrice || (product.purchasePrice ? Math.round(product.purchasePrice * (1 + defaultFeeRatio)) : (product.price || 0));

    const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
    if (hasVariants) {
      const mapped: VariantPricingState[] = product.variants.map((v: any) => {
        let wPrice = Number(v.resellerPrice) || 0;
        if (wPrice <= 0 && Number(v.purchasePrice) > 0) {
          wPrice = Math.round(Number(v.purchasePrice) * (1 + defaultFeeRatio));
        }
        if (wPrice <= 0) {
          wPrice = wholesalePrice;
        }

        const savedVar = (product.sourcedDetails?.variants || []).find((sv: any) =>
          String(sv.color || '').trim().toLowerCase() === String(v.color || '').trim().toLowerCase() &&
          String(sv.size || '').trim().toLowerCase() === String(v.size || '').trim().toLowerCase()
        );

        const initialPrice = savedVar?.retailPrice
          ? String(savedVar.retailPrice)
          : String(Math.round(wPrice * 1.2));

        return {
          color: v.color,
          size: v.size,
          sku: v.sku,
          wholesalePrice: wPrice,
          retailPrice: initialPrice,
          stock: Number(v.stock) || 0,
        };
      });

      setVariantPricing(mapped);
      setRetailPrice(mapped[0]?.retailPrice || String(Math.round(wholesalePrice * 1.2)));
    } else {
      setVariantPricing([]);
      const initialRetailPrice = product.isSourced && product.sourcedDetails?.retailPrice
        ? String(product.sourcedDetails.retailPrice)
        : String(Math.round(wholesalePrice * 1.2));
      setRetailPrice(initialRetailPrice);
    }
  };

  const handleVariantPriceChange = (index: number, val: string) => {
    setVariantPricing(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], retailPrice: val };
      if (index === 0) {
        setRetailPrice(val);
      }
      return updated;
    });
  };

  const applyBulkMargin = () => {
    const pct = parseFloat(bulkMarginPercent) || 0;
    setVariantPricing(prev => {
      const updated = prev.map(vp => ({
        ...vp,
        retailPrice: String(Math.max(vp.wholesalePrice, Math.round(vp.wholesalePrice * (1 + pct / 100))))
      }));
      if (updated.length > 0) {
        setRetailPrice(updated[0].retailPrice);
      }
      return updated;
    });
  };

  const handleSourceProduct = async () => {
    if (!selectedProduct) return;
    const hasVariants = variantPricing.length > 0;

    let finalRetailPrice = 0;
    let payloadVariants: any[] | undefined = undefined;

    if (hasVariants) {
      for (let i = 0; i < variantPricing.length; i++) {
        const vp = variantPricing[i];
        const vNum = parseFloat(vp.retailPrice);
        const label = [vp.color, vp.size].filter(Boolean).join(' / ') || `Variant ${i + 1}`;
        if (isNaN(vNum) || vNum <= 0) {
          toast.error(`Please enter a valid retail price for ${label}`);
          return;
        }
        if (vNum < vp.wholesalePrice) {
          toast.error(`Price for ${label} must be at least ৳${vp.wholesalePrice}`);
          return;
        }
      }

      finalRetailPrice = parseFloat(variantPricing[0].retailPrice);
      payloadVariants = variantPricing.map(vp => ({
        color: vp.color,
        size: vp.size,
        sku: vp.sku,
        retailPrice: parseFloat(vp.retailPrice),
        purchasePrice: vp.wholesalePrice,
        stock: vp.stock,
      }));
    } else {
      const priceNum = parseFloat(retailPrice);
      const defaultFeeRatio = 0.15;
      const wholesalePrice = selectedProduct.resellerPrice || (selectedProduct.purchasePrice ? Math.round(selectedProduct.purchasePrice * (1 + defaultFeeRatio)) : (selectedProduct.price || 0));

      if (isNaN(priceNum) || priceNum <= 0) {
        toast.error('Please enter a valid retail price');
        return;
      }
      if (priceNum < wholesalePrice) {
        toast.error(`Retail price must be at least ৳${wholesalePrice}`);
        return;
      }
      finalRetailPrice = priceNum;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/reseller/products/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct._id,
          retailPrice: finalRetailPrice,
          ...(payloadVariants ? { variants: payloadVariants } : {}),
        }),
      });

      if (res.ok) {
        toast.success(selectedProduct.isSourced ? 'Retail price updated successfully ✓' : 'Product added to your store ✓');
        setSelectedProduct(null);
        fetchProducts(page, sourceFilter, search);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to process request');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const defaultFeeRatio = 0.15;
  const singleWholesaleCost = selectedProduct
    ? (selectedProduct.resellerPrice || (selectedProduct.purchasePrice ? Math.round(selectedProduct.purchasePrice * (1 + defaultFeeRatio)) : (selectedProduct.price || 0)))
    : 0;

  const profit = selectedProduct
    ? Math.max(0, parseFloat(retailPrice || '0') - singleWholesaleCost)
    : 0;

  return (
    <div className="flex-1 space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Source B2B Products</h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Add products from the Main Store or other Resellers to your storefront
          </p>
        </div>
      </div>

      {/* Source Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
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
      <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 h-9 text-xs md:text-sm"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" size="sm" className="h-9 text-xs">Search</Button>
      </form>

      {/* Source type badge description */}
      {sourceFilter !== 'all' && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border mx-1 md:mx-0 ${
          sourceFilter === 'top_selling' ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300' :
          sourceFilter === 'admin' ? 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300' :
          sourceFilter === 'reseller' ? 'bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300' :
          'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300'
        }`}>
          {sourceFilter === 'top_selling' && <><Flame className="h-3.5 w-3.5 text-amber-500" /> Showing top selling & trending products</>}
          {sourceFilter === 'admin' && <><Store className="h-3.5 w-3.5" /> Showing products from Main Store (Admin)</>}
          {sourceFilter === 'reseller' && <><Users className="h-3.5 w-3.5" /> Showing products shared by other resellers</>}
          {sourceFilter === 'sourced' && <><CheckCircle2 className="h-3.5 w-3.5" /> Showing products already added to your store</>}
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
          <p className="font-semibold text-base md:text-lg">No Products Found</p>
          <p className="text-xs md:text-sm text-muted-foreground max-w-sm">
            {sourceFilter === 'sourced'
              ? 'You have not sourced any products yet.'
              : sourceFilter === 'reseller'
              ? 'No other resellers have shared products yet.'
              : sourceFilter === 'top_selling'
              ? 'No top selling products found.'
              : 'No B2B products found.'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{total} products found</p>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {products.map(product => {
              const defaultFeeRatio = 0.15;
              const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
              let minWholesale = product.resellerPrice || (product.purchasePrice ? Math.round(product.purchasePrice * (1 + defaultFeeRatio)) : (product.price || 0));
              let maxWholesale = minWholesale;
              let minYourPrice = product.sourcedDetails?.retailPrice || 0;
              let maxYourPrice = minYourPrice;

              if (hasVariants) {
                const ws = product.variants.map((v: any) => {
                  let w = Number(v.resellerPrice) || 0;
                  if (w <= 0 && Number(v.purchasePrice) > 0) {
                    w = Math.round(Number(v.purchasePrice) * (1 + defaultFeeRatio));
                  }
                  return w > 0 ? w : minWholesale;
                });
                minWholesale = Math.min(...ws);
                maxWholesale = Math.max(...ws);

                if (Array.isArray(product.sourcedDetails?.variants) && product.sourcedDetails.variants.length > 0) {
                  const rs = product.sourcedDetails.variants.map((v: any) => Number(v.retailPrice) || 0).filter((p: number) => p > 0);
                  if (rs.length > 0) {
                    minYourPrice = Math.min(...rs);
                    maxYourPrice = Math.max(...rs);
                  }
                }
              }

              const isSourced = product.isSourced;
              const isAdmin = product.sourceType === 'admin';
              const resellerStore = product.uploadedBy?.storeName || product.sourceStoreName || 'Reseller';

              return (
                <div
                  key={product._id}
                  className="bg-card border rounded-xl overflow-hidden flex flex-col hover:shadow-md transition-shadow group"
                >
                  {/* Image */}
                  <a
                    href={product.storefrontUrl || `/product/${product.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-[4/3] bg-muted relative w-full overflow-hidden border-b block group/img"
                    title={`View ${product.name}`}
                  >
                    {product.images?.[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover group-hover/img:scale-105 group-hover:scale-105 transition-transform duration-300"
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
                      <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 shadow-sm" title="Added to your store">
                        <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </div>
                    )}
                  </a>

                  {/* Info */}
                  <div className="p-2.5 md:p-3 flex flex-col flex-1 gap-1.5">
                    <div className="flex items-center justify-between gap-1 text-[9px] md:text-[10px] text-muted-foreground font-semibold">
                      <span className="uppercase tracking-wider truncate">
                        {product.categories?.[0]?.name || 'Uncategorized'}
                      </span>
                      <span className={isAdmin ? 'text-blue-600 font-bold shrink-0' : 'text-purple-600 font-bold shrink-0 truncate max-w-[110px]'}>
                        {isAdmin ? (process.env.NEXT_PUBLIC_STORE_NAME || 'Main Store') : resellerStore}
                      </span>
                    </div>
                    <a
                      href={product.storefrontUrl || `/product/${product.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs md:text-sm font-bold line-clamp-2 leading-snug hover:text-primary hover:underline transition-colors"
                      title="View product details"
                    >
                      {product.name}
                    </a>
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                      <span>SKU: {product.sku || '-'}</span>
                      <div className="flex items-center gap-1">
                        {hasVariants && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/30 text-primary">
                            {product.variants.length} Var
                          </Badge>
                        )}
                        {Boolean(product.totalSales && product.totalSales > 0) && (
                          <span className="flex items-center gap-0.5 font-bold text-amber-600 dark:text-amber-400 font-sans">
                            <Flame className="h-3 w-3 fill-amber-500 text-amber-500 shrink-0" />
                            {product.totalSales} Sold
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price row */}
                    <div className="flex items-center justify-between bg-muted/30 rounded-lg px-2 py-1.5 border text-xs mt-auto">
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase font-bold">Wholesale</span>
                        <span className="font-extrabold text-foreground">
                          ৳{minWholesale.toLocaleString()}{minWholesale !== maxWholesale ? ` - ৳${maxWholesale.toLocaleString()}` : ''}
                        </span>
                      </div>
                      {isSourced && (
                        <div className="text-right">
                          <span className="text-green-600 block text-[9px] uppercase font-bold">Your Price</span>
                          <span className="font-extrabold text-green-600">
                            ৳{minYourPrice.toLocaleString()}{minYourPrice !== maxYourPrice ? ` - ৳${maxYourPrice.toLocaleString()}` : ''}
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
                      {isSourced ? '✓ Update Price' : '+ Add to Store'}
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
                ← Previous
              </Button>
              <span className="text-xs py-1.5 px-2.5 border rounded-lg">
                {page} / {totalPages}
              </span>
              <Button variant="outline" size="sm" className="h-8 text-xs px-2.5" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next →
              </Button>
            </div>
          )}
        </>
      )}

      {/* Sourcing Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-md md:max-w-lg rounded-xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct?.isSourced ? '💰 Update Retail Price' : '🛒 Add to Store'}
            </DialogTitle>
            <DialogDescription>
              {variantPricing.length > 0
                ? 'Set selling prices for each variant. The first variant price will be shown on product cards by default.'
                : 'Set your customer selling price for this product.'}
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4 py-2 overflow-y-auto pr-1">
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
                  <a
                    href={selectedProduct.storefrontUrl || `/product/${selectedProduct.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-sm line-clamp-1 hover:text-primary hover:underline transition-colors block"
                    title="View product details"
                  >
                    {selectedProduct.name}
                  </a>
                  <p className="text-[11px] text-muted-foreground font-mono">SKU: {selectedProduct.sku || '-'}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge className={`text-[9px] ${selectedProduct.sourceType === 'admin' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                      {selectedProduct.sourceType === 'admin'
                        ? `Main Store (${process.env.NEXT_PUBLIC_STORE_NAME || 'Mother Store'})`
                        : `Reseller: ${selectedProduct.uploadedBy?.storeName || selectedProduct.sourceStoreName || 'Reseller'}`}
                    </Badge>
                    {variantPricing.length > 0 && (
                      <Badge variant="outline" className="text-[9px]">
                        {variantPricing.length} Variants
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {variantPricing.length > 0 ? (
                <>
                  {/* Bulk Margin Helper */}
                  <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground">Quick Profit Margin</Label>
                      <span className="text-[11px] text-muted-foreground">Applies % markup to wholesale of all variants</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          value={bulkMarginPercent}
                          onChange={e => setBulkMarginPercent(e.target.value)}
                          placeholder="e.g. 20"
                          className="h-8 text-xs font-bold pl-3 pr-7"
                        />
                        <span className="absolute right-2.5 top-1.5 text-xs text-muted-foreground font-bold">%</span>
                      </div>
                      <Button type="button" size="sm" variant="secondary" className="h-8 text-xs font-bold" onClick={applyBulkMargin}>
                        Apply to All
                      </Button>
                    </div>
                  </div>

                  {/* Variants list */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold px-1">
                      <span>Variant & Wholesale Cost</span>
                      <span>Your Selling Price</span>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {variantPricing.map((vp, idx) => {
                        const vNum = parseFloat(vp.retailPrice) || 0;
                        const vProfit = Math.max(0, vNum - vp.wholesalePrice);
                        const vName = [vp.color, vp.size].filter(Boolean).join(' / ') || `Variant #${idx + 1}`;
                        const isFirst = idx === 0;

                        return (
                          <div key={idx} className={`p-2.5 border rounded-lg bg-card transition-colors ${isFirst ? 'border-primary/40 bg-primary/5' : ''}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-xs">{vName}</span>
                                  {isFirst && (
                                    <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4 bg-primary text-primary-foreground font-bold">
                                      Card Default
                                    </Badge>
                                  )}
                                  {vp.stock !== undefined && (
                                    <span className="text-[10px] text-muted-foreground font-mono">({vp.stock} in stock)</span>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                                  <span>Wholesale: <strong className="text-foreground">৳{vp.wholesalePrice.toLocaleString()}</strong></span>
                                  <span className={`font-bold ${vProfit > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                                    Profit: {vProfit > 0 ? `+৳${vProfit.toLocaleString()}` : '৳0'}
                                  </span>
                                </div>
                              </div>
                              <div className="w-28 shrink-0">
                                <div className="relative">
                                  <span className="absolute left-2.5 top-2 text-muted-foreground text-xs font-bold">৳</span>
                                  <Input
                                    type="number"
                                    value={vp.retailPrice}
                                    onChange={e => handleVariantPriceChange(idx, e.target.value)}
                                    className="h-8 pl-6 text-xs font-extrabold"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Single product Cost / Profit display */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border p-3 rounded-lg text-center bg-muted/40">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold">Wholesale Cost</span>
                      <span className="text-lg font-black text-foreground">
                        ৳{(selectedProduct.resellerPrice || (selectedProduct.purchasePrice ? Math.round(selectedProduct.purchasePrice * 1.15) : (selectedProduct.price || 0))).toLocaleString()}
                      </span>
                    </div>
                    <div className={`border p-3 rounded-lg text-center ${profit > 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-muted/40'}`}>
                      <span className={`text-[10px] block uppercase font-bold ${profit > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                        Your Profit
                      </span>
                      <span className={`text-lg font-black ${profit > 0 ? 'text-green-600' : 'text-foreground'}`}>
                        ৳{profit.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Single Price input */}
                  <div className="space-y-1">
                    <Label htmlFor="retail-price" className="font-bold text-xs">Your Selling Price (৳)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-bold">৳</span>
                      <Input
                        id="retail-price"
                        type="number"
                        value={retailPrice}
                        onChange={e => setRetailPrice(e.target.value)}
                        placeholder="Enter retail price"
                        className="pl-7 h-10 text-sm font-extrabold"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Price must be equal to or higher than wholesale cost
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" onClick={() => setSelectedProduct(null)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSourceProduct} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedProduct?.isSourced ? 'Update Price' : 'Add to Store'}
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

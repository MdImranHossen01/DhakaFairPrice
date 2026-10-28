/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import * as React from 'react';
import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Plus, Edit, Trash, Loader2, Search, Package, RefreshCw,
  MoreHorizontal, ChevronDown, ChevronRight, PackagePlus, Store,
  Layers, CheckCircle2, Clock, Eye, EyeOff
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

type ResellerTabType = 'all' | 'approved' | 'pending' | 'published' | 'draft';

function calculateCumulativeStock(product: any): number {
  if (product.variants && product.variants.length > 0) {
    return product.variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
  }
  return product.stock || 0;
}

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as ResellerTabType) || 'all';

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<ResellerTabType>(initialTab);
  const [counts, setCounts] = useState({ all: 0, approved: 0, pending: 0, published: 0, draft: 0 });
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Add Stock Modal State
  const [addStockModalOpen, setAddStockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [stockToAddTopLevel, setStockToAddTopLevel] = useState<number>(0);
  const [variantStockUpdates, setVariantStockUpdates] = useState<{ [variantId: string]: number }>({});
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [submittingStock, setSubmittingStock] = useState(false);

  const limit = 10;

  // Open Add Stock Modal
  const openAddStockModal = (product: any) => {
    setSelectedProduct(product);
    setStockToAddTopLevel(0);
    const initialVariants: { [id: string]: number } = {};
    if (product.variants && product.variants.length > 0) {
      product.variants.forEach((v: any) => {
        initialVariants[v._id || `${v.color}-${v.size}`] = 0;
      });
    }
    setVariantStockUpdates(initialVariants);
    setBatchNumber(`BATCH-${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`);
    setExpiryDate('');
    setAddStockModalOpen(true);
  };

  // Handle Add Stock Submit
  const handleSaveStock = async () => {
    if (!selectedProduct) return;
    setSubmittingStock(true);

    try {
      const hasVariants = selectedProduct.variants && selectedProduct.variants.length > 0;
      let updatedVariants = undefined;
      let updatedStock = selectedProduct.stock || 0;
      const updatedBatches = Array.isArray(selectedProduct.batches) ? [...selectedProduct.batches] : [];

      if (hasVariants) {
        let totalVariantStock = 0;
        updatedVariants = selectedProduct.variants.map((v: any) => {
          const key = v._id || `${v.color}-${v.size}`;
          const addAmount = Number(variantStockUpdates[key]) || 0;
          const newVarStock = (v.stock || 0) + addAmount;
          totalVariantStock += newVarStock;

          const varBatches = Array.isArray(v.batches) ? [...v.batches] : [];
          if (addAmount > 0 && batchNumber) {
            varBatches.push({
              batchNumber,
              expiryDate: expiryDate ? new Date(expiryDate) : undefined,
              stock: addAmount
            });
          }

          return {
            ...v,
            stock: newVarStock,
            batches: varBatches
          };
        });

        updatedStock = totalVariantStock;
      } else {
        const addAmount = Number(stockToAddTopLevel) || 0;
        updatedStock = (selectedProduct.stock || 0) + addAmount;
        if (addAmount > 0 && batchNumber) {
          updatedBatches.push({
            batchNumber,
            expiryDate: expiryDate ? new Date(expiryDate) : undefined,
            stock: addAmount
          });
        }
      }

      const res = await fetch(`/api/reseller/products?id=${selectedProduct._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock: updatedStock,
          ...(hasVariants && { variants: updatedVariants }),
          ...(!hasVariants && { batches: updatedBatches })
        })
      });

      if (res.ok) {
        toast.success(`Stock updated successfully for ${selectedProduct.name}`);
        setAddStockModalOpen(false);
        fetchProducts(undefined, currentPage);
      } else {
        toast.error('Failed to update stock');
      }
    } catch (error) {
      console.error('Error saving stock:', error);
      toast.error('An error occurred while saving stock');
    } finally {
      setSubmittingStock(false);
    }
  };

  const fetchProducts = async (signal?: AbortSignal, page = currentPage, tab = activeTab) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: String(limit), tab });
      if (search) params.set('search', search);
      const res = await fetch(`/api/reseller/products?${params}`, { signal });
      if (!res.ok) { toast.error('Failed to fetch products'); return; }
      const d = await res.json();
      setProducts(d.products || []);
      setPagination(d.pagination || { total: 0, totalPages: 1 });
      if (d.counts) {
        setCounts(d.counts);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: ResellerTabType) => {
    setActiveTab(tab);
    setCurrentPage(1);
    router.push(`/reseller/products?tab=${tab}`);
    fetchProducts(undefined, 1, tab);
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal, currentPage, activeTab);
    return () => controller.abort();
  }, [currentPage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchProducts(undefined, 1, activeTab);
  };

  const handleDelete = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: 'Delete Product?',
      text: `Remove"${name}" from your store?`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', confirmButtonText: 'Yes, remove it!',
      customClass: { popup: 'rounded-xl', confirmButton: 'rounded-lg px-4 py-2 font-bold', cancelButton: 'rounded-lg px-4 py-2' },
    });
    if (!result.isConfirmed) return;
    const res = await fetch(`/api/reseller/products?id=${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success(data.message || 'Product removed');
      fetchProducts(undefined, currentPage, activeTab);
    } else {
      toast.error(data.error || data.message || 'Failed to remove');
    }
  };

  const togglePublish = async (id: string, current: boolean) => {
    const res = await fetch(`/api/reseller/products`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isPublished: !current }),
    });
    if (res.ok) { toast.success(`Product ${!current ? 'published' : 'unpublished'}`); fetchProducts(undefined, currentPage, activeTab); }
    else toast.error('Failed to update');
  };

  const syncOwnProducts = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/reseller/products/sync-own', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Synced ${data.synced} products to your store!`);
        fetchProducts(undefined, currentPage, activeTab);
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (products.every(p => selectedIds.includes(p._id))) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map(p => p._id));
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    router.push(`/reseller/products?page=${page}&tab=${activeTab}`);
  };

  return (
    <div className="flex-1 space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Personal Products</h2>
          <p className="text-muted-foreground text-xs sm:text-sm">Manage your personal product catalog ({pagination.total} total)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={syncOwnProducts} disabled={syncing}
            className="flex items-center gap-1.5 h-8 text-xs font-semibold border-primary text-primary hover:bg-primary/10"
          >
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Sync to Store
          </Button>
          <Link href="/reseller/products/new">
            <Button size="sm" className="h-8 text-xs font-bold gap-1">
              <Plus className="h-3.5 w-3.5" /> Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-2">
        <Button
          variant={activeTab === 'all' ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs font-semibold gap-1.5"
          onClick={() => handleTabChange('all')}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>All</span>
          {counts.all > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-4 text-[10px]">
              {counts.all}
            </Badge>
          )}
        </Button>
        <Button
          variant={activeTab === 'approved' ? 'default' : 'outline'}
          size="sm"
          className={`h-8 text-xs font-semibold gap-1.5 ${activeTab === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10'}`}
          onClick={() => handleTabChange('approved')}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Approved</span>
          {counts.approved > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-4 text-[10px]">
              {counts.approved}
            </Badge>
          )}
        </Button>
        <Button
          variant={activeTab === 'pending' ? 'default' : 'outline'}
          size="sm"
          className={`h-8 text-xs font-semibold gap-1.5 ${activeTab === 'pending' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10'}`}
          onClick={() => handleTabChange('pending')}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Pending Approval</span>
          {counts.pending > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-4 text-[10px]">
              {counts.pending}
            </Badge>
          )}
        </Button>
        <Button
          variant={activeTab === 'published' ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs font-semibold gap-1.5"
          onClick={() => handleTabChange('published')}
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Published</span>
          {counts.published > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-4 text-[10px]">
              {counts.published}
            </Badge>
          )}
        </Button>
        <Button
          variant={activeTab === 'draft' ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs font-semibold gap-1.5"
          onClick={() => handleTabChange('draft')}
        >
          <EyeOff className="h-3.5 w-3.5" />
          <span>Draft</span>
          {counts.draft > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-4 text-[10px]">
              {counts.draft}
            </Badge>
          )}
        </Button>
      </div>

      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU..."
            className="pl-8 h-9 text-xs sm:text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" size="sm" className="h-9 text-xs">Search</Button>
      </form>

      <div className="rounded-xl border bg-background overflow-hidden relative shadow-xs">
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={products.length > 0 && products.every(p => selectedIds.includes(p._id))}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-[64px]">Image</TableHead>
                <TableHead className="min-w-[180px] max-w-[240px]">Name</TableHead>
                <TableHead className="w-[130px] max-w-[140px]">SKU</TableHead>
                <TableHead className="w-[100px] whitespace-nowrap">Price</TableHead>
                <TableHead className="min-w-[140px] max-w-[200px]">Total Stock</TableHead>
                <TableHead className="w-[70px] text-center">Views</TableHead>
                <TableHead className="w-[70px] text-center">Sales</TableHead>
                <TableHead className="w-[90px] text-center">Status</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-10 w-10 text-muted-foreground" />
                      <p className="text-muted-foreground font-medium">No products found</p>
                      <Link href="/reseller/products/new">
                        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add First Product</Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => {
                  const totalStock = calculateCumulativeStock(product);
                  const hasVariants = product.variants && product.variants.length > 0;
                  const isExpanded = expandedRow === product._id;
                  return (
                    <React.Fragment key={product._id}>
                      <TableRow className={selectedIds.includes(product._id) ? 'bg-muted/50' : ''}>
                        <TableCell className="w-10">
                          <Checkbox
                            checked={selectedIds.includes(product._id)}
                            onCheckedChange={() => toggleSelect(product._id)}
                          />
                        </TableCell>
                        <TableCell className="w-8">
                          {hasVariants ? (
                            <button
                              onClick={() => setExpandedRow(isExpanded ? null : product._id)}
                              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          ) : null}
                        </TableCell>
                        <TableCell className="w-[64px]">
                          <div className="h-12 w-12 overflow-hidden rounded-md border bg-muted">
                            {product.images && product.images.length > 0 ? (
                              <Image src={product.images[0]} alt={product.name} width={48} height={48} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium min-w-[180px] max-w-[240px]">
                          <div className="flex flex-col gap-0.5 max-w-full">
                            <Link
                              href={`/product/${product.slug}`} target="_blank"
                              className="hover:text-primary transition-colors hover:underline decoration-primary/30 underline-offset-4 truncate block font-bold text-sm"
                              title={product.name}
                            >
                              {product.name}
                            </Link>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                              {product.brand && (
                                <span className="text-muted-foreground font-semibold flex items-center gap-0.5 truncate max-w-[130px]">
                                  Brand: <span className="text-foreground truncate">{typeof product.brand === 'object' ? product.brand.name : product.brand}</span>
                                </span>
                              )}
                              {product.uploadedBy ? (
                                <span
                                  className="inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 max-w-[120px] truncate"
                                  title={`Reseller: ${product.uploadedBy.storeName}`}
                                >
                                  <Store className="h-2.5 w-2.5 shrink-0" />
                                  <span className="truncate">{product.uploadedBy.storeName}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">Admin</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground w-[130px] max-w-[140px]">
                          <span className="truncate block" title={product.sku || '-'}>
                            {product.sku || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="w-[100px] whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className={product.salePrice ? 'text-xs line-through text-muted-foreground' : ''}>
                              {String.fromCharCode(2547)}{product.price ? Math.round(product.price) : '0'}
                            </span>
                            {product.salePrice && (
                              <span className="font-semibold text-primary">{String.fromCharCode(2547)}{Math.round(product.salePrice)}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[140px] max-w-[200px]">
                          <div className="flex flex-col gap-1 max-w-full">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-bold text-sm ${totalStock <= 5 ? 'text-destructive' : 'text-foreground'}`}>
                                {totalStock} pcs
                              </span>
                              {hasVariants && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/40 text-primary">
                                  {product.variants.length} Variants
                                </Badge>
                              )}
                            </div>
                            {hasVariants && (
                              <div className="flex flex-wrap gap-1 max-w-full">
                                {product.variants.slice(0, 3).map((v: any, idx: number) => (
                                  <span key={idx} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground truncate max-w-[120px]">
                                    {v.color || ''}{v.color && v.size ? '/' : ''}{v.size || ''}: <b className="text-foreground">{v.stock || 0}</b>
                                  </span>
                                ))}
                                {product.variants.length > 3 && (
                                  <span className="text-[10px] text-primary cursor-pointer font-medium whitespace-nowrap" onClick={() => setExpandedRow(isExpanded ? null : product._id)}>
                                    +{product.variants.length - 3} more...
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="w-[70px] text-center whitespace-nowrap">
                          <span className="font-medium text-muted-foreground">{product.views ?? 0}</span>
                        </TableCell>
                        <TableCell className="w-[70px] text-center whitespace-nowrap">
                          <span className="font-bold text-primary">{product.totalSales ?? 0}</span>
                        </TableCell>
                        <TableCell className="w-[120px] text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1">
                            <button
                              onClick={() => togglePublish(product._id, product.isPublished)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                                product.isPublished
                                  ? 'bg-primary/10 text-primary hover:bg-primary/20'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                              }`}
                              title="Click to toggle Published / Draft"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${product.isPublished ? 'bg-primary' : 'bg-muted-foreground'}`} />
                              {product.isPublished ? 'Published' : 'Draft'}
                            </button>
                            {product.isApprovedByAdmin ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 font-semibold text-[10px] px-2 py-0">
                                Approved
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 font-semibold text-[10px] px-2 py-0" title="Mother Shop approval required before selling">
                                Not Approved
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="w-[80px] text-right whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => openAddStockModal(product)} className="text-primary font-semibold gap-2 cursor-pointer">
                                <PackagePlus className="h-4 w-4" /> Add Stock
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/reseller/products/${product._id}/edit`)} className="gap-2">
                                <Edit className="h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(product._id, product.name)} className="text-destructive gap-2">
                                <Trash className="h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>

                      {isExpanded && hasVariants && (
                        <TableRow className="bg-muted/30 border-y border-muted">
                          <TableCell colSpan={11} className="p-3 pl-12">
                            <div className="bg-background rounded-lg border p-3 space-y-2">
                              <div className="text-xs font-bold text-foreground flex items-center gap-1.5 pb-1.5 border-b">
                                <PackagePlus className="h-3.5 w-3.5 text-primary" />
                                Variant Stock Breakdown
                              </div>
                              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                                {product.variants.map((v: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between bg-muted/60 rounded-md px-3 py-2 text-xs">
                                    <span className="font-medium text-foreground">
                                      {[v.color, v.size].filter(Boolean).join(' / ') || `Variant ${idx + 1}`}
                                    </span>
                                    <span className={`font-bold ml-2 ${(v.stock || 0) <= 5 ? 'text-destructive' : 'text-primary'}`}>
                                      {v.stock || 0} pcs
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="block md:hidden p-2 space-y-2.5">
          {loading ? (
            <div className="text-center py-10">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-muted-foreground text-sm">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-10">
              <Package className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">No products found</p>
              <Link href="/reseller/products/new" className="mt-2 inline-block">
                <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Product</Button>
              </Link>
            </div>
          ) : (
            products.map(product => {
              const totalStock = calculateCumulativeStock(product);
              const hasVariants = product.variants && product.variants.length > 0;
              return (
                <div key={product._id} className="p-3 bg-card border rounded-lg shadow-sm space-y-2">
                  <div className="flex items-start gap-2.5">
                    <div className="h-14 w-14 rounded-md border bg-muted overflow-hidden relative shrink-0">
                      {product.images?.[0] ? (
                        <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
                      ) : (
                        <Package className="h-6 w-6 absolute inset-0 m-auto text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-xs leading-snug line-clamp-2 text-foreground">{product.name}</h4>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                        <span className="font-mono truncate max-w-[180px]" title={product.sku || '-'}>SKU: {product.sku || '-'}</span>
                        {product.brand && (
                          <span>
                            • {typeof product.brand === 'object' ? product.brand.name : product.brand}
                          </span>
                        )}
                        {product.uploadedBy ? (
                          <span className="inline-flex items-center gap-1 font-semibold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[10px]">
                            <Store className="h-2.5 w-2.5 shrink-0" />
                            {product.uploadedBy.storeName}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">• Admin</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {product.salePrice && product.salePrice < product.price ? (
                          <>
                            <span className="font-bold text-xs text-primary">{String.fromCharCode(2547)}{Math.round(product.salePrice).toLocaleString()}</span>
                            <span className="text-[10px] text-muted-foreground line-through">{String.fromCharCode(2547)}{Math.round(product.price).toLocaleString()}</span>
                          </>
                        ) : (
                          <span className="font-bold text-xs">{String.fromCharCode(2547)}{Math.round(product.price || 0).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`font-bold text-xs ${totalStock <= 5 ? 'text-destructive' : 'text-foreground'}`}>
                        {totalStock} pcs
                      </span>
                      {hasVariants && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-primary/40 text-primary">
                          {product.variants.length} Var
                        </Badge>
                      )}
                      <button
                        onClick={() => togglePublish(product._id, product.isPublished)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer transition-colors ${
                          product.isPublished
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                        title="Click to toggle Published / Draft"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${product.isPublished ? 'bg-primary' : 'bg-muted-foreground'}`} />
                        {product.isPublished ? 'Published' : 'Draft'}
                      </button>
                      {product.isApprovedByAdmin ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 text-[10px] font-semibold px-1.5 py-0 shadow-none">
                          Approved
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 text-[10px] font-semibold px-1.5 py-0 shadow-none">
                          Not Approved
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2 text-primary font-semibold"
                        onClick={() => openAddStockModal(product)}
                      >
                        <PackagePlus className="h-3.5 w-3.5 mr-1" /> +Stock
                      </Button>
                      <Link href={`/reseller/products/${product._id}/edit`}>
                        <Button variant="outline" size="sm" className="h-7 text-xs px-2">
                          <Edit className="h-3 w-3 mr-1" />Edit
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(product._id, product.name)}>
                        <Trash className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4 px-2">
          <Button variant="outline" size="sm" className="h-8 text-xs px-2.5" disabled={currentPage <= 1} onClick={() => handlePageChange(currentPage - 1)}>Prev</Button>
          <span className="text-xs py-1.5 px-2.5 border rounded-lg">{currentPage} / {pagination.totalPages}</span>
          <Button variant="outline" size="sm" className="h-8 text-xs px-2.5" disabled={currentPage >= pagination.totalPages} onClick={() => handlePageChange(currentPage + 1)}>Next</Button>
        </div>
      )}

      {/* Add Stock Modal */}
      <Dialog open={addStockModalOpen} onOpenChange={setAddStockModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-primary" />
              Add Stock: {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <Label className="text-xs">Batch Number</Label>
                <Input
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="e.g. BATCH-2026-01"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Expiry Date (Optional)</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {selectedProduct?.variants && selectedProduct.variants.length > 0 ? (
              <div className="space-y-2 border-t pt-2">
                <Label className="text-xs font-bold text-foreground">Add Quantity per Variant (Color / Size)</Label>
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {selectedProduct.variants.map((v: any) => {
                    const key = v._id || `${v.color}-${v.size}`;
                    return (
                      <div key={key} className="flex items-center justify-between gap-2 p-2 border rounded-md bg-muted/20 text-xs">
                        <div>
                          <div className="font-bold text-foreground">{v.color || 'Variant'} {v.size ? `(${v.size})` : ''}</div>
                          <div className="text-[11px] text-muted-foreground">Current Stock: {v.stock || 0} pcs</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold">+</span>
                          <Input
                            type="number"
                            min="0"
                            value={variantStockUpdates[key] || 0}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setVariantStockUpdates(prev => ({ ...prev, [key]: val }));
                            }}
                            className="h-8 w-20 text-right text-xs"
                          />
                          <span className="text-[11px] text-muted-foreground">pcs</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-2 border-t pt-2">
                <Label className="text-xs font-bold">Quantity to Add</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={stockToAddTopLevel}
                    onChange={(e) => setStockToAddTopLevel(Math.max(0, parseInt(e.target.value) || 0))}
                    className="h-9 text-xs"
                    placeholder="Enter stock quantity to add"
                  />
                  <span className="text-xs text-muted-foreground">pcs</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Current Stock: {selectedProduct?.stock || 0} pcs
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddStockModalOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveStock} disabled={submittingStock} className="font-bold">
              {submittingStock ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Confirm & Add Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ResellerProductsPage() {
  return (
    <Suspense fallback={<div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <ProductsContent />
    </Suspense>
  );
}


'use client';

import * as React from 'react';
import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
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
  Plus, 
  Edit, 
  Trash, 
  Loader2, 
  Search, 
  DatabaseZap, 
  Download, 
  MoreHorizontal,
  Layers,
  ChevronDown,
  ChevronRight,
  PackagePlus,
  Store
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Swal from 'sweetalert2';
import { Pagination } from '@/components/ui/pagination';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface AdminProduct {
  _id: string;
  name: string;
  sku: string;
  price: number;
  salePrice?: number;
  stock: number;
  isPublished: boolean;
  images?: string[];
  slug: string;
  brand?: any;
  batches?: any[];
  views?: number;
  totalSales?: number;
  description?: string;
  categories?: any[];
  variants?: any[];
  uploadedBy?: { _id: string; storeName: string; subdomain: string } | null;
}

function ProductsContent() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Add Stock Modal State
  const [addStockModalOpen, setAddStockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [stockToAddTopLevel, setStockToAddTopLevel] = useState<number>(0);
  const [variantStockUpdates, setVariantStockUpdates] = useState<{ [variantId: string]: number }>({});
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [submittingStock, setSubmittingStock] = useState(false);

  const limit = 10;

  const fetchProducts = async (signal?: AbortSignal, page = currentPage) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products?page=${page}&limit=${limit}`, { signal });
      if (!response.ok) {
        toast.error(`Failed to fetch products: ${response.status} ${response.statusText}`);
        return;
      }
      const data = await response.json();
      setProducts(Array.isArray(data.products) ? data.products : []);
      setPagination(data.pagination || { total: 0, totalPages: 1 });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal);
    return () => controller.abort();
  }, []);

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This product will be permanently deleted!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#00D1B2',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
      customClass: {
        popup: 'rounded-xl',
        confirmButton: 'rounded-lg px-4 py-2 font-bold',
        cancelButton: 'rounded-lg px-4 py-2 font-bold'
      }
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/products/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          toast.success('Product deleted successfully');
          setProducts(products.filter(product => product._id !== id));
          fetchProducts(undefined, currentPage);
        } else {
          toast.error('Failed to delete product');
        }
      } catch (error) {
        toast.error('An error occurred while deleting the product');
      }
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p._id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const cleanDescription = (html: string | undefined): string => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '').replace(/(\r\n|\n|\r)/gm, " ").trim();
  };

  const getAbsoluteUrl = (url: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const exportToCSV = async () => {
    let productsToExport: AdminProduct[] = [];
    setExportLoading(true);

    try {
      toast.info('Fetching products for export...');
      const response = await fetch(`/api/products?page=1&limit=1000`);
      if (response.ok) {
        const data = await response.json();
        const allProducts: AdminProduct[] = Array.isArray(data.products) ? data.products : [];
        if (selectedIds.length > 0) {
          productsToExport = allProducts.filter(p => selectedIds.includes(p._id));
        } else {
          productsToExport = allProducts;
        }
      } else {
        productsToExport = selectedIds.length > 0 
          ? products.filter(p => selectedIds.includes(p._id))
          : products;
      }

      if (productsToExport.length === 0) {
        toast.error('No products to export');
        return;
      }

      const headers = [
        'id', 'title', 'item_group_id', 'description', 'availability', 'condition',
        'sku', 'price', 'sale_price', 'link', 'image_link', 'brand', 'fb_product_category',
        'colour', 'additional_image_link'
      ];

      const rows: any[][] = [];

      productsToExport.forEach(p => {
        if (p.variants && p.variants.length > 0) {
          p.variants.forEach((v: any, index: number) => {
            const varPrice = v.price || p.price || 0;
            const varSalePrice = v.salePrice || p.salePrice || undefined;
            const varPriceVal = `${Math.round(varPrice)} BDT`;
            const varSalePriceVal = varSalePrice && varSalePrice < varPrice ? `${Math.round(varSalePrice)} BDT` : '';
            const varStock = v.stock !== undefined ? v.stock : (p.stock || 0);

            const primaryImage = v.image || (p.images && p.images[0]) || '';
            const additionalImages = (p.images || [])
              .filter(img => img !== primaryImage)
              .map(img => getAbsoluteUrl(img))
              .join(',');

            rows.push([
              v._id || `${p._id}-${index}`,
              p.name,
              p._id,
              cleanDescription(p.description),
              varStock > 0 ? 'in stock' : 'out of stock',
              'new',
              v.sku || p.sku || '',
              varPriceVal,
              varSalePriceVal,
              `${window.location.origin}/product/${p.slug}`,
              getAbsoluteUrl(primaryImage),
              'unknown',
              p.categories?.[0]?.name || '',
              v.color || '',
              additionalImages
            ]);
          });
        } else {
          const priceVal = `${Math.round(p.price || 0)} BDT`;
          const salePriceVal = p.salePrice && p.salePrice < p.price ? `${Math.round(p.salePrice)} BDT` : '';
          const stockVal = p.stock || 0;
          const primaryImage = (p.images && p.images[0]) || '';
          const additionalImages = (p.images || [])
            .slice(1)
            .map(img => getAbsoluteUrl(img))
            .join(',');

          rows.push([
            p._id,
            p.name,
            p._id,
            cleanDescription(p.description),
            stockVal > 0 ? 'in stock' : 'out of stock',
            'new',
            p.sku || '',
            priceVal,
            salePriceVal,
            `${window.location.origin}/product/${p.slug}`,
            getAbsoluteUrl(primaryImage),
            'unknown',
            p.categories?.[0]?.name || '',
            '',
            additionalImages
          ]);
        }
      });

      const csvContent = 'data:text/csv;charset=utf-8,' 
        + [headers.join(','), ...rows.map(e => e.map(item => `"${String(item).replace(/"/g, '""')}"`).join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `products_catalog_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Products exported successfully!');
    } catch (error) {
      console.error('Export Error:', error);
      toast.error('Failed to export products');
    } finally {
      setExportLoading(false);
    }
  };

  // Open Add Stock Modal
  const openAddStockModal = (product: AdminProduct) => {
    setSelectedProduct(product);
    setStockToAddTopLevel(0);
    const initialVariants: { [id: string]: number } = {};
    if (product.variants && product.variants.length > 0) {
      product.variants.forEach(v => {
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
      let updatedBatches = Array.isArray(selectedProduct.batches) ? [...selectedProduct.batches] : [];

      if (hasVariants) {
        let totalVariantStock = 0;
        updatedVariants = selectedProduct.variants!.map(v => {
          const key = v._id || `${v.color}-${v.size}`;
          const addAmount = Number(variantStockUpdates[key]) || 0;
          const newVarStock = (v.stock || 0) + addAmount;
          totalVariantStock += newVarStock;

          let varBatches = Array.isArray(v.batches) ? [...v.batches] : [];
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

      const res = await fetch(`/api/products/${selectedProduct._id}`, {
        method: 'PUT',
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

  const calculateCumulativeStock = (product: AdminProduct) => {
    if (product.variants && product.variants.length > 0) {
      return product.variants.reduce((acc, curr) => acc + (curr.stock || 0), 0);
    }
    return product.stock || 0;
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-3 sm:space-y-4 px-0 py-2 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Manage your product catalog, size/color variant stocks, batches, and pricing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={exportLoading}
            className="flex items-center gap-1.5 h-8 text-xs font-semibold"
          >
            {exportLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {selectedIds.length > 0 ? `Export (${selectedIds.length})` : 'Export All'}
          </Button>
          <Link href="/admin/products/new">
            <Button size="sm" className="h-8 text-xs font-bold gap-1">
              <Plus className="h-3.5 w-3.5" /> Add Product
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU..."
            className="pl-8 h-9 text-xs sm:text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-background overflow-hidden relative shadow-xs">
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.includes(p._id))}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-[70px]">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="min-w-[150px]">Total Stock (Cumulative)</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Sales</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center">
                    No products found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const totalStock = calculateCumulativeStock(product);
                  const hasVariants = product.variants && product.variants.length > 0;
                  const isExpanded = expandedRow === product._id;

                  return (
                    <React.Fragment key={product._id}>
                      <TableRow className={selectedIds.includes(product._id) ? "bg-muted/50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(product._id)}
                            onCheckedChange={() => toggleSelect(product._id)}
                          />
                        </TableCell>
                        <TableCell>
                          {hasVariants ? (
                            <button
                              onClick={() => setExpandedRow(isExpanded ? null : product._id)}
                              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                              title="Expand variants stock"
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="h-12 w-12 overflow-hidden rounded-md border bg-muted">
                            {product.images && product.images.length > 0 ? (
                              <Image 
                                src={product.images[0]} 
                                alt={product.name} 
                                width={48}
                                height={48}
                                className="h-full w-full object-cover" 
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Plus className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium max-w-[240px]">
                          <div className="flex flex-col gap-0.5">
                            <Link 
                              href={`/product/${product.slug}`} 
                              target="_blank"
                              className="hover:text-primary transition-colors hover:underline decoration-primary/30 underline-offset-4 truncate font-bold text-sm"
                            >
                              {product.name}
                            </Link>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                              {product.brand && (
                                <span className="text-muted-foreground font-semibold flex items-center gap-1">
                                  Brand: <span className="text-foreground">{typeof product.brand === 'object' ? product.brand.name : product.brand}</span>
                                </span>
                              )}
                              {product.uploadedBy ? (
                                <Link
                                  href={`/admin/users?search=${encodeURIComponent(product.uploadedBy.storeName)}`}
                                  className="inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 hover:opacity-80 transition-opacity max-w-[120px] truncate"
                                  title={`Reseller: ${product.uploadedBy.storeName}`}
                                >
                                  <Store className="h-2.5 w-2.5 shrink-0" />
                                  <span className="truncate">{product.uploadedBy.storeName}</span>
                                </Link>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">Admin</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className={product.salePrice ? 'text-xs line-through text-muted-foreground' : ''}>
                              ৳{product.price ? Math.round(product.price) : '0'}
                            </span>
                            {product.salePrice && (
                              <span className="font-semibold text-primary">
                                ৳{Math.round(product.salePrice)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-bold text-sm ${totalStock <= 5 ? 'text-destructive' : 'text-foreground'}`}>
                                {totalStock} pcs
                              </span>
                              {hasVariants && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/40 text-primary">
                                  {product.variants!.length} Variants
                                </Badge>
                              )}
                            </div>
                            {/* Quick Variant badges display */}
                            {hasVariants && (
                              <div className="flex flex-wrap gap-1 max-w-[260px]">
                                {product.variants!.slice(0, 3).map((v: any, idx: number) => (
                                  <span key={idx} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                    {v.color || ''}{v.color && v.size ? '/' : ''}{v.size || ''}: <b className="text-foreground">{v.stock || 0}</b>
                                  </span>
                                ))}
                                {product.variants!.length > 3 && (
                                  <span className="text-[10px] text-primary cursor-pointer font-medium" onClick={() => setExpandedRow(isExpanded ? null : product._id)}>
                                    +{product.variants!.length - 3} more...
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-muted-foreground">{product.views ?? 0}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-primary">{product.totalSales ?? 0}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.isPublished ? 'default' : 'secondary'}>
                            {product.isPublished ? 'Published' : 'Draft'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => openAddStockModal(product)} className="text-primary font-semibold gap-2">
                                <PackagePlus className="h-4 w-4" /> Add Stock
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/admin/products/${product._id}/edit`)} className="gap-2">
                                <Edit className="h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(product._id)} className="text-destructive gap-2">
                                <Trash className="h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Row for Variants & Batches Breakdown */}
                      {isExpanded && hasVariants && (
                        <TableRow className="bg-muted/30 border-y border-muted">
                          <TableCell colSpan={11} className="p-3 pl-12">
                            <div className="bg-background rounded-lg border p-3 space-y-2">
                              <div className="text-xs font-bold text-foreground flex items-center gap-1.5 pb-1.5 border-b">
                                <Layers className="h-3.5 w-3.5 text-primary" />
                                Variants Stock Breakdown (সাইজ ও কালার অনুযায়ী স্টক)
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                                {product.variants!.map((v: any, vIdx: number) => (
                                  <div key={vIdx} className="p-2 border rounded-md bg-muted/20 flex flex-col justify-between gap-1">
                                    <div className="flex justify-between items-center font-bold text-foreground">
                                      <span>{v.color || 'No Color'} {v.size ? `(${v.size})` : ''}</span>
                                      <Badge variant={(v.stock || 0) > 0 ? 'outline' : 'destructive'} className="text-[10px]">
                                        {v.stock || 0} in stock
                                      </Badge>
                                    </div>
                                    <div className="flex justify-between text-[11px] text-muted-foreground">
                                      <span>Price: ৳{Math.round(v.price || product.price)}</span>
                                      {v.sku && <span className="font-mono">{v.sku}</span>}
                                    </div>
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

        {/* Mobile Products Card View */}
        <div className="block md:hidden p-2 space-y-2.5">
          {loading ? (
            <div className="h-24 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-xs text-muted-foreground">
              No products found.
            </div>
          ) : (
            filteredProducts.map((product) => {
              const totalStock = calculateCumulativeStock(product);
              const hasVariants = product.variants && product.variants.length > 0;
              const isExpanded = expandedRow === product._id;

              return (
                <div
                  key={product._id}
                  className={`bg-card border border-border/90 rounded-xl p-3 text-xs space-y-2 shadow-xs transition-colors ${
                    selectedIds.includes(product._id) ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      checked={selectedIds.includes(product._id)}
                      onCheckedChange={() => toggleSelect(product._id)}
                      className="mt-1 shrink-0"
                    />

                    <div className="h-14 w-14 overflow-hidden rounded-lg border bg-muted shrink-0">
                      {product.images && product.images.length > 0 ? (
                        <Image 
                          src={product.images[0]} 
                          alt={product.name} 
                          width={56}
                          height={56}
                          className="h-full w-full object-cover" 
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Plus className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/product/${product.slug}`}
                        target="_blank"
                        className="font-bold text-foreground text-xs hover:text-primary transition-colors line-clamp-2"
                      >
                        {product.name}
                      </Link>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                        {product.sku && <span className="font-mono">{product.sku}</span>}
                        {product.brand && (
                          <span className="truncate">
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
                    </div>
                  </div>

                  {/* Pricing & Stock Details Row */}
                  <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-dashed text-[11px]">
                    <div>
                      <span className="text-muted-foreground">Price: </span>
                      <span className="font-bold text-foreground">
                        ৳{Math.round(product.salePrice || product.price || 0)}
                      </span>
                      {product.salePrice && (
                        <span className="text-[10px] line-through text-muted-foreground ml-1">
                          ৳{Math.round(product.price)}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground">Stock: </span>
                      <span className={`font-bold ${totalStock <= 5 ? 'text-destructive' : 'text-foreground'}`}>
                        {totalStock} pcs
                      </span>
                    </div>
                  </div>

                  {/* Variants Summary if any */}
                  {hasVariants && (
                    <div className="space-y-1 pt-1 border-t border-dashed">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground font-medium">{product.variants!.length} Variants:</span>
                        <button
                          onClick={() => setExpandedRow(isExpanded ? null : product._id)}
                          className="text-primary font-semibold flex items-center gap-0.5"
                        >
                          {isExpanded ? 'Hide' : 'Show All'}
                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </button>
                      </div>

                      {isExpanded ? (
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          {product.variants!.map((v: any, vIdx: number) => (
                            <div key={vIdx} className="bg-muted/40 p-1.5 rounded border text-[10px] flex justify-between">
                              <span>{v.color || ''} {v.size ? `(${v.size})` : ''}</span>
                              <span className="font-bold">{v.stock || 0} pcs</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {product.variants!.slice(0, 3).map((v: any, idx: number) => (
                            <span key={idx} className="text-[10px] bg-muted px-1.5 py-0.2 rounded text-muted-foreground">
                              {v.color || ''}{v.color && v.size ? '/' : ''}{v.size || ''}: <b>{v.stock || 0}</b>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Card Bottom Actions */}
                  <div className="flex items-center justify-between pt-2 border-t gap-1">
                    <Badge variant={product.isPublished ? 'default' : 'secondary'} className="text-[10px]">
                      {product.isPublished ? 'Published' : 'Draft'}
                    </Badge>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs text-primary font-semibold"
                        onClick={() => openAddStockModal(product)}
                      >
                        <PackagePlus className="h-3.5 w-3.5 mr-1" /> +Stock
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => router.push(`/admin/products/${product._id}/edit`)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(product._id)}
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {!loading && pagination.totalPages > 1 && (
        <div className="py-4">
          <Pagination 
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={(page) => {
              setCurrentPage(page);
              fetchProducts(undefined, page);
              const params = new URLSearchParams(searchParams.toString());
              params.set('page', page.toString());
              router.push(`?${params.toString()}`);
            }}
          />
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
                <Label className="text-xs font-bold text-foreground">Add Quantity per Variant (কালার/সাইজ অনুযায়ী স্টক যোগ করুন)</Label>
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
                <Label className="text-xs font-bold">Quantity to Add (যোগ করার পরিমাণ)</Label>
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

export default function AdminProductsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}

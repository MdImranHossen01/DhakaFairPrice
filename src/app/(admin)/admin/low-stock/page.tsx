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
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { AlertTriangle, TrendingDown, Edit, Store, Package, Search } from 'lucide-react';
import { MobileDataCard, MobileDataRow } from '@/components/common/MobileDataCard';

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
  sourceType: 'own' | 'mother' | 'other_reseller';
}

const ITEMS_PER_PAGE = 10;

export default function LowStockPage() {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

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

  return (
    <div className="flex flex-col gap-4 px-0 py-2 md:p-6 w-full max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            Low Stock Inventory
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Products and variants with less than 5 units remaining in stock across catalogs
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search low stock..."
            className="pl-9 h-9 text-xs md:text-sm rounded-xl"
            value={search}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
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
                          className="text-[11px] font-medium text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200"
                        >
                          <Package className="h-3 w-3 mr-1" />
                          Main Store Stock
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[11px] font-medium text-purple-700 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200"
                        >
                          <Store className="h-3 w-3 mr-1" />
                          Reseller: {item.uploadedByStoreName || 'Reseller'}
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
                        /* Admin can only restock/edit mother catalog products */
                        <Link href={`/admin/products/${item.slug}/edit`}>
                          <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs gap-1.5 font-medium hover:bg-primary/5">
                            <Edit className="h-3.5 w-3.5 text-primary" /> Restock / Edit
                          </Button>
                        </Link>
                      ) : (
                        /* Reseller product - Admin cannot edit reseller's inventory */
                        <Badge
                          variant="outline"
                          className="text-xs bg-muted/40 text-muted-foreground border-border font-medium py-1 px-2.5 inline-flex items-center gap-1"
                        >
                          <Store className="h-3.5 w-3.5 text-purple-600" /> Reseller Managed
                        </Badge>
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
      <div className="block md:hidden p-1 space-y-2.5">
        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3 border rounded-xl bg-card shadow-xs space-y-2">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-4 w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : paginatedItems.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-card rounded-xl border text-xs">
            {search ? 'No low stock products match your search.' : 'All products are adequately stocked.'}
          </div>
        ) : (
          paginatedItems.map((item) => (
            <MobileDataCard
              key={item.id}
              title={item.name}
              badge={
                item.stock === 0 ? (
                  <Badge variant="destructive" className="text-[10px]">Out of Stock</Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-800 border-red-200">
                    Low ({item.stock})
                  </Badge>
                )
              }
              footer={
                item.isOwnProduct ? (
                  <Link href={`/admin/products/${item.slug}/edit`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full h-8 rounded-lg text-xs gap-1.5 font-medium">
                      <Edit className="h-3.5 w-3.5 text-primary" /> Restock / Edit Product
                    </Button>
                  </Link>
                ) : (
                  <div className="w-full py-1 text-center bg-muted/40 text-muted-foreground rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border border-border">
                    <Store className="h-3.5 w-3.5 text-purple-600" /> Reseller Managed Product
                  </div>
                )
              }
            >
              <MobileDataRow 
                label="Variant / Specs" 
                value={[item.color, item.size].filter(Boolean).join(' • ') || 'Base Stock'} 
              />
              <MobileDataRow
                label="Scope"
                value={
                  item.isOwnProduct
                    ? 'Main Store Stock'
                    : `Reseller: ${item.uploadedByStoreName || 'Reseller'}`
                }
              />
              <MobileDataRow 
                label="Remaining Stock" 
                value={
                  <span className={`font-bold ${item.stock === 0 ? 'text-destructive' : 'text-orange-600'}`}>
                    {item.stock} {item.stock === 1 ? 'unit' : 'units'}
                  </span>
                } 
              />
            </MobileDataCard>
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
    </div>
  );
}

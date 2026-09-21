'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { format } from 'date-fns';
import { CalendarDays, AlertTriangle, Edit, Search } from 'lucide-react';
import Link from 'next/link';
import { MobileDataCard, MobileDataRow } from '@/components/common/MobileDataCard';

interface ExpiringBatch {
  id: string;
  productId: string;
  name: string;
  color: string | null;
  size: string | null;
  batchNumber: string;
  expiryDate: string;
  stock: number;
}

const ITEMS_PER_PAGE = 10;

export default function UpcomingExpiryPage() {
  const [batches, setBatches] = useState<ExpiringBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchUpcomingExpiry = async () => {
    try {
      const response = await fetch('/api/products/upcoming-expiry');
      if (response.ok) {
        const data = await response.json();
        setBatches(data.batches || []);
      }
    } catch (error) {
      console.error('Error fetching upcoming expiry:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcomingExpiry();
  }, []);

  const getDaysRemaining = (expiryDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredBatches = useMemo(() => {
    if (!search.trim()) return batches;
    const term = search.toLowerCase();
    return batches.filter(
      (b) =>
        b.name.toLowerCase().includes(term) ||
        b.batchNumber.toLowerCase().includes(term) ||
        (b.color && b.color.toLowerCase().includes(term)) ||
        (b.size && b.size.toLowerCase().includes(term))
    );
  }, [batches, search]);

  const totalPages = Math.ceil(filteredBatches.length / ITEMS_PER_PAGE) || 1;

  const paginatedBatches = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBatches.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredBatches, currentPage]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col gap-4 px-0 py-2 md:p-6 w-full max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-orange-500" />
            Upcoming Expiry Batches
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Monitor batches across all products expiring within the next 30 days
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search expiring batches..."
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
                <TableHead>Batch No</TableHead>
                <TableHead>Remaining Stock</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Days Left</TableHead>
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
                    <TableCell><Skeleton className="h-4 w-12 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto rounded-lg" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedBatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    {search ? 'No expiring batches match your search.' : 'No products expiring within the next 30 days.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedBatches.map((batch) => {
                  const daysLeft = getDaysRemaining(batch.expiryDate);
                  return (
                    <TableRow key={batch.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-bold text-sm">{batch.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {batch.color || batch.size ? (
                          <div className="flex gap-1.5 items-center">
                            {batch.color && <span className="font-medium text-foreground">{batch.color}</span>}
                            {batch.color && batch.size && <span>•</span>}
                            {batch.size && <span>{batch.size}</span>}
                          </div>
                        ) : (
                          'Main Stock'
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">{batch.batchNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-bold text-xs">
                          {batch.stock} units
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {format(new Date(batch.expiryDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        {daysLeft <= 0 ? (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <AlertTriangle className="h-3 w-3" /> Expired
                          </Badge>
                        ) : daysLeft <= 7 ? (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit bg-red-600">
                            {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1 w-fit bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200 border-orange-200">
                            {daysLeft} days left
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/products`}>
                          <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs gap-1">
                            <Edit className="h-3.5 w-3.5" /> View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Desktop Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-2 pt-4">
            <p className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredBatches.length)} of{' '}
              {filteredBatches.length} batches
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
        ) : paginatedBatches.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-card rounded-xl border text-xs">
            {search ? 'No expiring batches match your search.' : 'No products expiring within next 30 days.'}
          </div>
        ) : (
          paginatedBatches.map((batch) => {
            const daysLeft = getDaysRemaining(batch.expiryDate);
            return (
              <MobileDataCard
                key={batch.id}
                title={batch.name}
                badge={
                  daysLeft <= 0 ? (
                    <Badge variant="destructive" className="text-[10px]">Expired</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] bg-orange-100 text-orange-800 border-orange-200">
                      {daysLeft} days left
                    </Badge>
                  )
                }
                footer={
                  <Link href={`/admin/products`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full h-8 rounded-lg text-xs gap-1">
                      <Edit className="h-3.5 w-3.5" /> Manage Product
                    </Button>
                  </Link>
                }
              >
                <MobileDataRow 
                  label="Batch / Specs" 
                  value={`${batch.batchNumber} • ${[batch.color, batch.size].filter(Boolean).join(' / ') || 'Base'}`} 
                />
                <MobileDataRow 
                  label="Remaining Stock" 
                  value={<span className="font-bold">{batch.stock} units</span>} 
                />
                <MobileDataRow 
                  label="Expiry Date" 
                  value={format(new Date(batch.expiryDate), 'dd MMM yyyy')} 
                />
              </MobileDataCard>
            );
          })
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

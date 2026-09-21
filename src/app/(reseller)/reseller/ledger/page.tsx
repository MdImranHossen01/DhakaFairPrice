'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Loader2, Wallet, RefreshCcw, Search } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 10;

export default function ResellerLedgerPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [balance, setBalance] = useState({ available: 0, pending: 0, withdrawn: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reseller/ledger');
      if (res.ok) {
        const d = await res.json();
        setEntries(d.entries || []);
        setBalance(d.balance || { available: 0, pending: 0, withdrawn: 0 });
      } else toast.error('Failed to fetch ledger');
    } catch (error) {
      console.error(error);
      toast.error('An error occurred while fetching ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const term = search.toLowerCase();
    return entries.filter(e => 
      e.description?.toLowerCase().includes(term) ||
      e.reference?.toLowerCase().includes(term) ||
      e.type?.toLowerCase().includes(term)
    );
  }, [entries, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="flex-1 space-y-4 px-0 py-2 md:p-8 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 md:px-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Accounts Ledger</h2>
          <p className="text-xs md:text-sm text-muted-foreground">Complete financial record of your store account</p>
        </div>
        <Button variant="outline" size="sm" className="h-9 self-start sm:self-auto" onClick={fetchData} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 md:gap-4 px-1 md:px-0">
        {[
          { label: 'Available Balance', value: balance.available, color: 'text-green-600' },
          { label: 'Pending Balance', value: balance.pending, color: 'text-yellow-600' },
          { label: 'Total Withdrawn', value: balance.withdrawn, color: 'text-blue-600' },
        ].map(b => (
          <Card key={b.label} className="shadow-sm">
            <CardContent className="p-3.5 md:pt-6">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className={`h-4 w-4 ${b.color}`} />
                <p className="text-xs text-muted-foreground">{b.label}</p>
              </div>
              <p className={`text-xl md:text-2xl font-black ${b.color}`}>৳{(b.value || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative flex-1 max-w-sm px-1 md:px-0">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search descriptions or ref..." className="pl-8 h-9 text-xs md:text-sm" value={search} onChange={handleSearchChange} />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold">Date</TableHead>
                <TableHead className="font-bold">Description</TableHead>
                <TableHead className="font-bold">Reference</TableHead>
                <TableHead className="font-bold">Type</TableHead>
                <TableHead className="font-bold text-right">Amount</TableHead>
                <TableHead className="font-bold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="h-40 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                </TableCell></TableRow>
              ) : paginatedEntries.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                  {search ? 'No matching ledger entries found' : 'No ledger entries found'}
                </TableCell></TableRow>
              ) : (
                paginatedEntries.map(e => (
                  <TableRow key={e._id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-sm">{e.createdAt ? format(new Date(e.createdAt), 'dd MMM yyyy, hh:mm a') : '-'}</TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{e.reference || '-'}</TableCell>
                    <TableCell><Badge variant={e.type === 'credit' ? 'default' : 'secondary'}>{e.type}</Badge></TableCell>
                    <TableCell className={`text-right font-bold ${e.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                      {e.type === 'credit' ? '+' : '-'}৳{Math.abs(e.amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{e.status || 'settled'}</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="block md:hidden p-2 space-y-2.5">
          {loading ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
              Loading ledger...
            </div>
          ) : paginatedEntries.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              {search ? 'No matching ledger entries found' : 'No ledger entries found'}
            </div>
          ) : (
            paginatedEntries.map(e => (
              <div key={e._id} className="p-3 bg-card border rounded-lg shadow-sm space-y-2">
                <div className="flex items-start justify-between gap-2 border-b pb-2">
                  <div>
                    <h4 className="font-semibold text-xs text-foreground line-clamp-1">{e.description}</h4>
                    <span className="text-[10px] text-muted-foreground">
                      {e.createdAt ? format(new Date(e.createdAt), 'dd MMM yyyy, hh:mm a') : '-'}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`font-bold text-sm block ${e.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                      {e.type === 'credit' ? '+' : '-'}৳{Math.abs(e.amount || 0).toLocaleString()}
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0">{e.status || 'settled'}</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                  <span className="font-mono">Ref: {e.reference || '-'}</span>
                  <Badge variant={e.type === 'credit' ? 'default' : 'secondary'} className="text-[9px] px-1.5 py-0">
                    {e.type}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of{' '}
              {filtered.length} entries
            </p>
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

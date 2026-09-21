'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Check, X, ShieldAlert, Store, Search, ExternalLink, RefreshCw } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

const ITEMS_PER_PAGE = 10;

export default function AdminResellersPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';
  const [resellers, setResellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [updating, setUpdating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchResellers = async () => {
    try {
      const res = await fetch('/api/admin/resellers');
      if (res.ok) {
        const data = await res.json();
        setResellers(data.resellers || []);
      }
    } catch {
      toast.error('Failed to load resellers list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResellers();
  }, []);

  const handleStatusChange = async (resellerId: string, status: 'active' | 'suspended', name: string) => {
    const actionVerb = status === 'active' ? 'approve' : 'suspend';
    const actionText = status === 'active' ? 'Approved' : 'Suspended';
    const confirmResult = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to ${actionVerb} "${name}" store?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
    });

    if (!confirmResult.isConfirmed) return;

    try {
      const res = await fetch('/api/admin/resellers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resellerId, status }),
      });
      if (res.ok) {
        toast.success(`Store successfully ${actionText.toLowerCase()}`);
        fetchResellers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'An error occurred');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const statusBadgeColor: Record<string, string> = {
    active: 'bg-green-500/10 text-green-600 border-green-500/20',
    pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    suspended: 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  const filtered = resellers.filter(r => {
    const matchSearch =
      r.storeName.toLowerCase().includes(search.toLowerCase()) ||
      r.subdomain.toLowerCase().includes(search.toLowerCase()) ||
      r.userId?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginatedResellers = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const counts = {
    all: resellers.length,
    pending: resellers.filter(r => r.status === 'pending').length,
    active: resellers.filter(r => r.status === 'active').length,
    suspended: resellers.filter(r => r.status === 'suspended').length,
  };

  return (
    <div className="flex-1 space-y-4 px-0 py-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 md:px-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Store className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            Reseller Management
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Manage all reseller storefronts, domains, and account approval statuses
          </p>
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs w-fit" onClick={fetchResellers}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap px-1 md:px-0">
        {(['all', 'pending', 'active', 'suspended'] as const).map(s => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              statusFilter === s
                ? s === 'pending'
                  ? 'bg-yellow-500 text-white border-yellow-500'
                  : s === 'active'
                  ? 'bg-green-600 text-white border-green-600'
                  : s === 'suspended'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:bg-muted/40'
            }`}
          >
            {s === 'all' ? 'All' : s === 'pending' ? 'Pending' : s === 'active' ? 'Active' : 'Suspended'}
            <span className="ml-1.5 opacity-70">({counts[s]})</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 px-1 md:px-0">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by store, domain, or owner..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 h-9 text-xs md:text-sm"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : paginatedResellers.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Store className="h-16 w-16 mx-auto mb-4" />
              <p>No reseller stores found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store Name</TableHead>
                      <TableHead>Domain / Subdomain</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Total Orders</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedResellers.map(r => (
                      <TableRow key={r._id}>
                        <TableCell className="font-bold">
                          <div>
                            <span>{r.storeName}</span>
                            {r.description && <p className="text-xs text-muted-foreground line-clamp-1 font-normal">{r.description}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <a
                              href={`https://${r.subdomain}.swapnobaz.com`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-semibold"
                            >
                              {r.subdomain}.swapnobaz.com
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            {r.customDomain && (
                              <div className="flex items-center gap-1">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                                  Custom: {r.customDomain}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{r.userId?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{r.contact?.phone || r.userId?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{r.totalOrders}</TableCell>
                        <TableCell>৳{r.totalRevenue?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadgeColor[r.status] || ''}>
                            {r.status === 'active' ? 'Active' : r.status === 'pending' ? 'Pending Approval' : 'Suspended'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          {r.status === 'pending' && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleStatusChange(r._id, 'active', r.storeName)}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />Approve
                            </Button>
                          )}
                          {r.status === 'active' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleStatusChange(r._id, 'suspended', r.storeName)}
                            >
                              <ShieldAlert className="h-3.5 w-3.5 mr-1" />Suspend
                            </Button>
                          )}
                          {r.status === 'suspended' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(r._id, 'active', r.storeName)}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />Activate
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden p-2 space-y-2.5">
                {paginatedResellers.map(r => (
                  <div key={r._id} className="p-3 bg-card border rounded-lg shadow-sm space-y-2.5">
                    <div className="flex items-start justify-between gap-2 border-b pb-2">
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{r.storeName}</h4>
                        <p className="text-[11px] text-muted-foreground">{r.userId?.name || 'Unknown'} • {r.contact?.phone || r.userId?.email}</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${statusBadgeColor[r.status] || ''}`}>
                        {r.status === 'active' ? 'Active' : r.status === 'pending' ? 'Pending Approval' : 'Suspended'}
                      </Badge>
                    </div>

                    <div className="text-xs space-y-1">
                      <a
                        href={`https://${r.subdomain}.swapnobaz.com`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                      >
                        {r.subdomain}.swapnobaz.com
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      {r.customDomain && (
                        <div>
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 font-mono">
                            Custom: {r.customDomain}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 bg-muted/40 p-2 rounded text-center text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Orders</span>
                        <span className="font-semibold">{r.totalOrders || 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Revenue</span>
                        <span className="font-semibold">৳{(r.totalRevenue || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      {r.status === 'pending' && (
                        <Button
                          size="sm"
                          className="h-7 text-xs px-2.5 bg-green-600 hover:bg-green-700"
                          onClick={() => handleStatusChange(r._id, 'active', r.storeName)}
                        >
                          <Check className="h-3 w-3 mr-1" />Approve
                        </Button>
                      )}
                      {r.status === 'active' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs px-2.5"
                          onClick={() => handleStatusChange(r._id, 'suspended', r.storeName)}
                        >
                          <ShieldAlert className="h-3 w-3 mr-1" />Suspend
                        </Button>
                      )}
                      {r.status === 'suspended' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2.5"
                          onClick={() => handleStatusChange(r._id, 'active', r.storeName)}
                        >
                          <Check className="h-3 w-3 mr-1" />Activate
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {!loading && totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} entries
                  </p>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

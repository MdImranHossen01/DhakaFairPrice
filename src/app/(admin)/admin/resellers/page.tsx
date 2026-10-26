'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Check, X, ShieldAlert, Store, Search, ExternalLink, RefreshCw, Globe, MoreVertical, XCircle, Trash2, Truck, Calendar, CalendarDays, Clock, Percent, KeyRound } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pagination } from '@/components/ui/pagination';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

const ITEMS_PER_PAGE = 10;
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || '';

export default function AdminResellersPage() {
  const { data: session } = useSession();
  const isSuperAdmin = (session?.user as any)?.role === 'super_admin' || session?.user?.email === 'imranshuvo101@gmail.com';
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';
  const [resellers, setResellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [updating, setUpdating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Domain Management Dialog state
  const [domainDialogOpen, setDomainDialogOpen] = useState(false);
  const [selectedReseller, setSelectedReseller] = useState<any>(null);
  const [editSubdomain, setEditSubdomain] = useState('');
  const [editCustomDomain, setEditCustomDomain] = useState('');
  const [savingDomain, setSavingDomain] = useState(false);

  // Courier Hub Modal state
  const [courierDialogOpen, setCourierDialogOpen] = useState(false);
  const [selectedCourierReseller, setSelectedCourierReseller] = useState<any>(null);
  const [courierSteadfastApiKey, setCourierSteadfastApiKey] = useState('');
  const [courierSteadfastSecretKey, setCourierSteadfastSecretKey] = useState('');
  const [courierPathaoStoreId, setCourierPathaoStoreId] = useState('');
  const [courierRedxPickupStoreId, setCourierRedxPickupStoreId] = useState('');
  const [savingCourier, setSavingCourier] = useState(false);
  const [creatingPathaoStore, setCreatingPathaoStore] = useState(false);
  const [creatingRedxStore, setCreatingRedxStore] = useState(false);

  // Activation & Expiry Dialog state
  const [activationDialogOpen, setActivationDialogOpen] = useState(false);
  const [targetReseller, setTargetReseller] = useState<any>(null);
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [isNoExpiry, setIsNoExpiry] = useState<boolean>(false);
  const [savingActivation, setSavingActivation] = useState(false);
  const [activationFee, setActivationFee] = useState<number>(15);

  // Fee Management Dialog state
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [selectedFeeReseller, setSelectedFeeReseller] = useState<any>(null);
  const [systemFeePercent, setSystemFeePercent] = useState<number>(15);
  const [savingFee, setSavingFee] = useState(false);

  const openFeeModal = (reseller: any) => {
    setSelectedFeeReseller(reseller);
    const fee = reseller.systemFeePercent !== undefined ? reseller.systemFeePercent : (reseller.commissionRate ?? 15);
    setSystemFeePercent(fee);
    setFeeDialogOpen(true);
  };

  const handleSaveFee = async () => {
    if (!selectedFeeReseller) return;
    const rate = Number(systemFeePercent);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error('System fee must be a number between 0% and 100%');
      return;
    }
    setSavingFee(true);
    try {
      const res = await fetch('/api/admin/resellers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resellerId: selectedFeeReseller._id,
          systemFeePercent: rate,
          commissionRate: rate,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`System fee for "${selectedFeeReseller.storeName}" set to ${rate}%!`);
        setFeeDialogOpen(false);
        fetchResellers();
      } else {
        toast.error(data.error || 'Failed to update system fee');
      }
    } catch {
      toast.error('Network error updating system fee');
    } finally {
      setSavingFee(false);
    }
  };

  const openActivationModal = (reseller: any) => {
    setTargetReseller(reseller);
    setActivationFee(reseller.systemFeePercent !== undefined ? reseller.systemFeePercent : (reseller.commissionRate ?? 15));
    if (reseller.expiresAt) {
      const d = new Date(reseller.expiresAt);
      setExpiryDate(d.toISOString().split('T')[0]);
      setIsNoExpiry(false);
    } else {
      // Default to +30 days
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setExpiryDate(d.toISOString().split('T')[0]);
      setIsNoExpiry(false);
    }
    setActivationDialogOpen(true);
  };

  const setQuickExpiry = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setExpiryDate(d.toISOString().split('T')[0]);
    setIsNoExpiry(false);
  };

  const handleConfirmActivation = async () => {
    if (!targetReseller) return;
    if (!isNoExpiry && !expiryDate) {
      toast.error('Please select an expiration date or choose Lifetime access');
      return;
    }

    setSavingActivation(true);
    try {
      const finalExpiry = isNoExpiry ? null : new Date(expiryDate).toISOString();
      const res = await fetch('/api/admin/resellers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resellerId: targetReseller._id,
          status: 'active',
          expiresAt: finalExpiry,
          systemFeePercent: Number(activationFee),
          commissionRate: Number(activationFee),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Store "${targetReseller.storeName}" has been successfully activated and expiry date updated!`);
        setActivationDialogOpen(false);
        fetchResellers();
      } else {
        toast.error(data.error || 'Failed to save changes');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSavingActivation(false);
    }
  };

  const handleCreatePathaoStore = async () => {
    if (!selectedCourierReseller) return;
    setCreatingPathaoStore(true);
    try {
      const res = await fetch(`/api/admin/resellers/${selectedCourierReseller._id}/create-pathao-store`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Pathao store created successfully!');
        if (data.storeId) {
          setCourierPathaoStoreId(String(data.storeId));
        }
        fetchResellers();
      } else {
        toast.error(data.error || data.message || 'Failed to create Pathao store');
      }
    } catch {
      toast.error('Network error creating Pathao store');
    } finally {
      setCreatingPathaoStore(false);
    }
  };

  const handleCreateRedxStore = async () => {
    if (!selectedCourierReseller) return;
    setCreatingRedxStore(true);
    try {
      const res = await fetch(`/api/admin/resellers/${selectedCourierReseller._id}/create-redx-store`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'RedX pickup store created successfully!');
        if (data.storeId) {
          setCourierRedxPickupStoreId(String(data.storeId));
        }
        fetchResellers();
      } else {
        toast.error(data.error || data.message || 'Failed to create RedX pickup store');
      }
    } catch {
      toast.error('Network error creating RedX pickup store');
    } finally {
      setCreatingRedxStore(false);
    }
  };

  const openCourierModal = (reseller: any) => {
    setSelectedCourierReseller(reseller);
    setCourierSteadfastApiKey(reseller.courierConfig?.steadfast?.apiKey || '');
    setCourierSteadfastSecretKey(reseller.courierConfig?.steadfast?.secretKey || '');
    setCourierPathaoStoreId(reseller.courierConfig?.pathao?.storeId || '');
    setCourierRedxPickupStoreId(reseller.courierConfig?.redx?.pickupStoreId || '');
    setCourierDialogOpen(true);
  };

  const handleSaveCourier = async () => {
    if (!selectedCourierReseller) return;
    setSavingCourier(true);
    try {
      const res = await fetch('/api/admin/resellers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resellerId: selectedCourierReseller._id,
          courierConfig: {
            ...(selectedCourierReseller.courierConfig || {}),
            steadfast: {
              apiKey: courierSteadfastApiKey.trim(),
              secretKey: courierSteadfastSecretKey.trim(),
            },
            pathao: {
              storeId: courierPathaoStoreId.trim(),
            },
            redx: {
              ...(selectedCourierReseller.courierConfig?.redx || {}),
              pickupStoreId: courierRedxPickupStoreId.trim(),
            },
          },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Courier hub configuration saved successfully');
        setCourierDialogOpen(false);
        fetchResellers();
      } else {
        toast.error(data.error || 'Failed to save courier configuration');
      }
    } catch {
      toast.error('Network error saving courier configuration');
    } finally {
      setSavingCourier(false);
    }
  };

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

  const openDomainModal = (reseller: any) => {
    setSelectedReseller(reseller);
    setEditSubdomain(reseller.subdomain || '');
    setEditCustomDomain(reseller.customDomain || '');
    setDomainDialogOpen(true);
  };

  const handleSaveDomain = async () => {
    if (!selectedReseller) return;
    const cleanSub = editSubdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!cleanSub) {
      toast.error('Subdomain cannot be empty');
      return;
    }

    setSavingDomain(true);
    try {
      const res = await fetch('/api/admin/resellers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resellerId: selectedReseller._id,
          subdomain: cleanSub,
          customDomain: editCustomDomain.trim().toLowerCase(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Domain configuration updated successfully');
        setDomainDialogOpen(false);
        fetchResellers();
      } else {
        toast.error(data.error || 'Failed to update domain');
      }
    } catch {
      toast.error('Network error while updating domain');
    } finally {
      setSavingDomain(false);
    }
  };

  const handleStatusChange = async (resellerId: string, status: 'active' | 'suspended' | 'rejected', name: string) => {
    if (status === 'active') {
      const r = resellers.find(item => item._id === resellerId);
      if (r) {
        openActivationModal(r);
        return;
      }
    }
    const actionVerb = status === 'active' ? 'approve' : status === 'rejected' ? 'reject' : 'suspend';
    const actionText = status === 'active' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Suspended';
    const confirmResult = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to ${actionVerb} "${name}" store?`,
      icon: status === 'active' ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonText: `Yes, ${actionVerb}`,
      cancelButtonText: 'Cancel',
      confirmButtonColor: status === 'active' ? '#10b981' : '#d33',
      cancelButtonColor: '#6b7280',
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

  const handleDeleteReseller = async (resellerId: string, name: string) => {
    const confirmResult = await Swal.fire({
      title: 'Delete Reseller Store?',
      text: `Are you sure you want to permanently delete "${name}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
    });

    if (!confirmResult.isConfirmed) return;

    try {
      const res = await fetch(`/api/admin/resellers?resellerId=${resellerId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Store deleted successfully');
        fetchResellers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete store');
      }
    } catch {
      toast.error('Network error while deleting store');
    }
  };

  const handleImpersonateReseller = async (reseller: any) => {
    const targetUserId = reseller.userId?._id || reseller.userId;
    const targetName = reseller.userId?.name || reseller.storeName;
    const storeInfo = reseller.storeName ? `Store: ${reseller.storeName}` : 'Reseller';

    if (!targetUserId) {
      toast.error('Reseller user account not found');
      return;
    }

    const result = await Swal.fire({
      title: 'Login as Reseller?',
      html: `Are you sure you want to log in as <b>${targetName}</b> (${storeInfo})?<br/><span class="text-xs text-muted-foreground mt-2 block">You will enter their Reseller Dashboard. You can return to Super Admin Panel at any time from the topbar profile dropdown.</span>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Login as Reseller',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#f59e0b',
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'rounded-xl font-bold px-5 py-2.5',
        cancelButton: 'rounded-xl font-medium px-5 py-2.5',
      },
    });

    if (!result.isConfirmed) return;

    try {
      toast.loading('Starting reseller session...', { id: 'impersonate-reseller' });
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to start impersonation');
      }

      toast.loading(`Signing in as ${targetName}...`, { id: 'impersonate-reseller' });
      const signInRes = await signIn('credentials', {
        impersonationToken: data.token,
        redirect: false,
      });

      if (signInRes?.error) {
        throw new Error(signInRes.error);
      }

      toast.success(`Logged in as ${targetName}`, { id: 'impersonate-reseller' });
      window.location.href = data.redirectUrl || '/reseller-dashboard';
    } catch (err: any) {
      toast.error(err.message || 'Error logging in as reseller', { id: 'impersonate-reseller' });
    }
  };

  const statusBadgeColor: Record<string, string> = {
    active: 'bg-green-500/10 text-green-600 border-green-500/20',
    pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    expired: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    suspended: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  const filtered = resellers.filter(r => {
    const matchSearch =
      r.storeName?.toLowerCase().includes(search.toLowerCase()) ||
      r.subdomain?.toLowerCase().includes(search.toLowerCase()) ||
      r.customDomain?.toLowerCase().includes(search.toLowerCase()) ||
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
    expired: resellers.filter(r => r.status === 'expired').length,
    suspended: resellers.filter(r => r.status === 'suspended').length,
    rejected: resellers.filter(r => r.status === 'rejected').length,
  };

  return (
    <div className="flex-1 space-y-4 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Store className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            Reseller Management
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Manage all reseller storefronts, subdomains, custom domains, and account statuses
          </p>
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs w-fit" onClick={fetchResellers}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(['all', 'pending', 'active', 'expired', 'suspended', 'rejected'] as const).map(s => (
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
                  : s === 'expired'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : s === 'suspended'
                  ? 'bg-orange-600 text-white border-orange-600'
                  : s === 'rejected'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:bg-muted/40'
            }`}
          >
            {s === 'all' ? 'All' : s === 'pending' ? 'Pending' : s === 'active' ? 'Active' : s === 'expired' ? 'Expired' : s === 'suspended' ? 'Suspended' : 'Rejected'}
            <span className="ml-1.5 opacity-70">({counts[s]})</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
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

      <Card className="overflow-hidden border shadow-sm w-full">
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
              <div className="hidden md:block overflow-x-auto w-full">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[10%] min-w-[85px]">Date</TableHead>
                      <TableHead className="w-[17%] min-w-[140px]">Store Name</TableHead>
                      <TableHead className="w-[19%] min-w-[150px]">Domain & Subdomain</TableHead>
                      <TableHead className="w-[14%] min-w-[120px]">Owner</TableHead>
                      <TableHead className="w-[7%] min-w-[60px] text-center">Orders</TableHead>
                      <TableHead className="w-[8%] min-w-[75px]">Revenue</TableHead>
                      <TableHead className="w-[13%] min-w-[110px]">Status & Expiry</TableHead>
                      <TableHead className="text-right w-[70px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedResellers.map(r => (
                      <TableRow key={r._id}>
                        <TableCell className="w-[10%] min-w-[85px] align-top py-3 text-xs">
                          <div className="font-semibold text-foreground">
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}
                          </div>
                          {r.createdAt && (
                            <div className="text-[10px] text-muted-foreground">
                              {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="w-[17%] min-w-[140px] align-top py-3 whitespace-normal">
                          <div className="space-y-1 whitespace-normal">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm block leading-tight truncate" title={r.storeName}>{r.storeName}</span>
                              <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-indigo-50/80 text-indigo-700 border-indigo-200/80 shrink-0">
                                Fee: {r.systemFeePercent !== undefined ? r.systemFeePercent : (r.commissionRate ?? 15)}%
                              </Badge>
                            </div>
                            {r.description && (
                              <p className="text-xs text-muted-foreground font-normal whitespace-normal break-words leading-relaxed line-clamp-2" title={r.description}>
                                {r.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="w-[19%] min-w-[150px] align-top py-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <a
                                href={`https://${r.subdomain}.${ROOT_DOMAIN}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-semibold max-w-full"
                                title={`${r.subdomain}.${ROOT_DOMAIN}`}
                              >
                                <span className="truncate">{r.subdomain}.{ROOT_DOMAIN}</span>
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            </div>
                            {r.customDomain ? (
                              <div className="flex items-center gap-1">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 font-mono truncate max-w-full bg-primary/10 text-primary border border-primary/20" title={r.customDomain}>
                                  🌐 {r.customDomain}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic block">No custom domain linked</span>
                            )}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[11px] px-2 text-primary border-primary/30 hover:bg-primary/5 gap-1"
                                onClick={() => openDomainModal(r)}
                              >
                                <Globe className="h-3 w-3" /> Domain
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[11px] px-2 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/5 gap-1"
                                onClick={() => openCourierModal(r)}
                              >
                                <Truck className="h-3 w-3" /> Courier Hub
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="w-[14%] min-w-[120px] align-top py-3">
                          <div>
                            <p className="text-sm font-medium truncate" title={r.userId?.name || 'Unknown'}>{r.userId?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground truncate" title={r.contact?.phone || r.userId?.email}>{r.contact?.phone || r.userId?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="w-[7%] min-w-[60px] text-center align-top py-3">{r.totalOrders || 0}</TableCell>
                        <TableCell className="w-[8%] min-w-[75px] align-top py-3 font-semibold">৳{(r.totalRevenue || 0).toLocaleString()}</TableCell>
                        <TableCell className="w-[13%] min-w-[110px] align-top py-3">
                          <div className="space-y-1">
                            <Badge variant="outline" className={`text-xs whitespace-nowrap ${statusBadgeColor[r.status] || ''}`}>
                              {r.status === 'active' ? '● Active' : r.status === 'pending' ? 'Pending Approval' : r.status === 'expired' ? '⌛ Expired' : r.status === 'rejected' ? 'Rejected' : 'Suspended'}
                            </Badge>
                            {r.status === 'active' && r.expiresAt && (
                              <div className="text-[11px] leading-tight">
                                {(() => {
                                  const exp = new Date(r.expiresAt);
                                  const diffDays = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                  const isUrgent = diffDays <= 5;
                                  return (
                                    <span className={isUrgent ? 'text-amber-600 font-semibold block' : 'text-muted-foreground block'}>
                                      Expires: {exp.toLocaleDateString()}
                                      <span className="block text-[10px] opacity-85">
                                        {diffDays > 0 ? `(${diffDays} days left)` : '(Expires today)'}
                                      </span>
                                    </span>
                                  );
                                })()}
                              </div>
                            )}
                            {r.status === 'expired' && (
                              <div className="text-[10px] text-rose-600 font-semibold leading-tight">
                                {r.expiresAt ? `Expired on: ${new Date(r.expiresAt).toLocaleDateString()}` : 'Expired'}
                              </div>
                            )}
                            {r.status === 'active' && !r.expiresAt && (
                              <div className="text-[10px] text-emerald-600/80">
                                Lifetime Access
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right w-[70px] align-top py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 p-0 hover:bg-muted">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              {isSuperAdmin && (
                                <>
                                  <DropdownMenuItem
                                    className="cursor-pointer font-bold text-amber-600 focus:text-amber-700 bg-amber-50 hover:bg-amber-100 text-xs"
                                    onClick={() => handleImpersonateReseller(r)}
                                  >
                                    <KeyRound className="mr-2 h-4 w-4 text-amber-600" />
                                    Login as Reseller
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              {r.status === 'pending' && (
                                <>
                                  <DropdownMenuItem
                                    className="cursor-pointer font-bold text-emerald-600 focus:text-emerald-700 text-xs"
                                    onClick={() => openActivationModal(r)}
                                  >
                                    <Check className="mr-2 h-4 w-4 text-emerald-600" />
                                    Approve Store (Set Expiry)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer font-bold text-rose-600 focus:text-rose-700 text-xs"
                                    onClick={() => handleStatusChange(r._id, 'rejected', r.storeName)}
                                  >
                                    <XCircle className="mr-2 h-4 w-4 text-rose-600" />
                                    Reject Store
                                  </DropdownMenuItem>
                                </>
                              )}
                              {r.status === 'active' && (
                                <>
                                  <DropdownMenuItem
                                    className="cursor-pointer font-semibold text-primary focus:text-primary text-xs"
                                    onClick={() => openActivationModal(r)}
                                  >
                                    <Calendar className="mr-2 h-4 w-4 text-primary" />
                                    Extend / Edit Expiry Date
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer font-semibold text-rose-600 focus:text-rose-700 text-xs"
                                    onClick={() => handleStatusChange(r._id, 'suspended', r.storeName)}
                                  >
                                    <ShieldAlert className="mr-2 h-4 w-4 text-rose-600" />
                                    Suspend Store
                                  </DropdownMenuItem>
                                </>
                              )}
                              {r.status === 'expired' && (
                                <DropdownMenuItem
                                  className="cursor-pointer font-bold text-emerald-600 focus:text-emerald-700 text-xs"
                                  onClick={() => openActivationModal(r)}
                                >
                                  <RefreshCw className="mr-2 h-4 w-4 text-emerald-600" />
                                  Renew / Re-activate Store
                                </DropdownMenuItem>
                              )}
                              {(r.status === 'suspended' || r.status === 'rejected') && (
                                <DropdownMenuItem
                                  className="cursor-pointer font-bold text-emerald-600 focus:text-emerald-700 text-xs"
                                  onClick={() => openActivationModal(r)}
                                >
                                  <Check className="mr-2 h-4 w-4 text-emerald-600" />
                                  Activate Store (Set Expiry)
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="cursor-pointer text-xs font-semibold text-indigo-600 focus:text-indigo-700"
                                onClick={() => openFeeModal(r)}
                              >
                                <Percent className="mr-2 h-4 w-4 text-indigo-600" />
                                Set System Fee (%)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer text-xs"
                                onClick={() => openDomainModal(r)}
                              >
                                <Globe className="mr-2 h-4 w-4 text-primary" />
                                Configure Domain
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer text-xs"
                                onClick={() => openCourierModal(r)}
                              >
                                <Truck className="mr-2 h-4 w-4 text-emerald-600" />
                                Courier Hub Settings
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer text-xs"
                                onClick={() => window.open(`https://${r.subdomain}.${ROOT_DOMAIN}`, '_blank')}
                              >
                                <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />
                                Visit Storefront
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="cursor-pointer font-bold text-destructive focus:text-destructive text-xs"
                                onClick={() => handleDeleteReseller(r._id, r.storeName)}
                              >
                                <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                                Delete Store
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-sm text-foreground">{r.storeName}</h4>
                          <Badge variant="outline" className="text-[9px] font-bold px-1 py-0 bg-indigo-50/80 text-indigo-700 border-indigo-200/80 shrink-0">
                            Fee: {r.systemFeePercent !== undefined ? r.systemFeePercent : (r.commissionRate ?? 15)}%
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{r.userId?.name || 'Unknown'} • {r.contact?.phone || r.userId?.email}</p>
                        {r.createdAt && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Date: {new Date(r.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${statusBadgeColor[r.status] || ''}`}>
                          {r.status === 'active' ? 'Active' : r.status === 'pending' ? 'Pending Approval' : r.status === 'expired' ? 'Expired' : r.status === 'rejected' ? 'Rejected' : 'Suspended'}
                        </Badge>
                        {r.status === 'active' && r.expiresAt && (
                          <span className="text-[10px] text-muted-foreground">
                            Expires: {new Date(r.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                        {r.status === 'expired' && (
                          <span className="text-[10px] text-rose-600 font-bold">
                            {r.expiresAt ? `Expired on: ${new Date(r.expiresAt).toLocaleDateString()}` : 'Expired'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <a
                          href={`https://${r.subdomain}.${ROOT_DOMAIN}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                        >
                          {r.subdomain}.{ROOT_DOMAIN}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-2 text-primary"
                          onClick={() => openDomainModal(r)}
                        >
                          <Globe className="h-3 w-3 mr-1" /> Domain
                        </Button>
                      </div>
                      {r.customDomain && (
                        <div>
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 font-mono bg-primary/10 text-primary">
                            🌐 {r.customDomain}
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

                    <div className="flex items-center justify-between pt-1 border-t">
                      <div className="text-[11px] text-muted-foreground">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
                            <MoreVertical className="h-3.5 w-3.5 mr-1" />
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          {isSuperAdmin && (
                            <>
                              <DropdownMenuItem
                                className="cursor-pointer font-bold text-amber-600 focus:text-amber-700 bg-amber-50 hover:bg-amber-100 text-xs"
                                onClick={() => handleImpersonateReseller(r)}
                              >
                                <KeyRound className="mr-2 h-4 w-4 text-amber-600" />
                                Login as Reseller
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {r.status === 'pending' && (
                            <>
                              <DropdownMenuItem
                                className="cursor-pointer font-bold text-emerald-600 focus:text-emerald-700 text-xs"
                                onClick={() => openActivationModal(r)}
                              >
                                <Check className="mr-2 h-4 w-4 text-emerald-600" />
                                Approve Store (Set Expiry)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer font-bold text-rose-600 focus:text-rose-700 text-xs"
                                onClick={() => handleStatusChange(r._id, 'rejected', r.storeName)}
                              >
                                <XCircle className="mr-2 h-4 w-4 text-rose-600" />
                                Reject Store
                              </DropdownMenuItem>
                            </>
                          )}
                          {r.status === 'active' && (
                            <>
                              <DropdownMenuItem
                                className="cursor-pointer font-semibold text-primary focus:text-primary text-xs"
                                onClick={() => openActivationModal(r)}
                              >
                                <Calendar className="mr-2 h-4 w-4 text-primary" />
                                Extend / Edit Expiry Date
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer font-semibold text-rose-600 focus:text-rose-700 text-xs"
                                onClick={() => handleStatusChange(r._id, 'suspended', r.storeName)}
                              >
                                <ShieldAlert className="mr-2 h-4 w-4 text-rose-600" />
                                Suspend Store
                              </DropdownMenuItem>
                            </>
                          )}
                          {r.status === 'expired' && (
                            <DropdownMenuItem
                              className="cursor-pointer font-bold text-emerald-600 focus:text-emerald-700 text-xs"
                              onClick={() => openActivationModal(r)}
                            >
                              <RefreshCw className="mr-2 h-4 w-4 text-emerald-600" />
                              Renew / Re-activate Store
                            </DropdownMenuItem>
                          )}
                          {(r.status === 'suspended' || r.status === 'rejected') && (
                            <DropdownMenuItem
                              className="cursor-pointer font-bold text-emerald-600 focus:text-emerald-700 text-xs"
                              onClick={() => openActivationModal(r)}
                            >
                              <Check className="mr-2 h-4 w-4 text-emerald-600" />
                              Activate Store (Set Expiry)
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="cursor-pointer text-xs font-semibold text-indigo-600 focus:text-indigo-700"
                            onClick={() => openFeeModal(r)}
                          >
                            <Percent className="mr-2 h-4 w-4 text-indigo-600" />
                            Set System Fee (%)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer text-xs"
                            onClick={() => openDomainModal(r)}
                          >
                            <Globe className="mr-2 h-4 w-4 text-primary" />
                            Configure Domain
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer text-xs"
                            onClick={() => window.open(`https://${r.subdomain}.${ROOT_DOMAIN}`, '_blank')}
                          >
                            <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />
                            Visit Storefront
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="cursor-pointer font-bold text-destructive focus:text-destructive text-xs"
                            onClick={() => handleDeleteReseller(r._id, r.storeName)}
                          >
                            <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                            Delete Store
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      {/* Reseller Domain Configuration Dialog */}
      <Dialog open={domainDialogOpen} onOpenChange={setDomainDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Reseller Domain Setup
            </DialogTitle>
            <DialogDescription>
              Configure or link store subdomain and custom branded domain for{' '}
              <span className="font-semibold text-foreground">{selectedReseller?.storeName}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Store Subdomain */}
            <div className="space-y-1.5 p-3.5 rounded-lg border bg-muted/20">
              <label className="text-xs font-bold text-foreground">Free Store Subdomain</label>
              <p className="text-[11px] text-muted-foreground">
                Set unique subdomain name on {ROOT_DOMAIN} platform:
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={editSubdomain}
                  onChange={e => setEditSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="e.g. bhootbazar"
                  className="font-mono text-sm h-9 bg-background"
                />
                <span className="text-xs font-bold text-primary whitespace-nowrap bg-primary/10 px-2.5 py-2 rounded-md border border-primary/20">
                  .{ROOT_DOMAIN}
                </span>
              </div>
              {editSubdomain && (
                <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1">
                  <span>Preview Store:</span>
                  <a
                    href={`https://${editSubdomain}.${ROOT_DOMAIN}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5"
                  >
                    https://{editSubdomain}.{ROOT_DOMAIN}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Custom Domain */}
            <div className="space-y-1.5 p-3.5 rounded-lg border bg-background">
              <label className="text-xs font-bold text-foreground">Custom Branded Domain (Optional)</label>
              <p className="text-[11px] text-muted-foreground">
                Link reseller's purchased custom domain (e.g. www.bhootbazar.com)
              </p>
              <Input
                value={editCustomDomain}
                onChange={e => setEditCustomDomain(e.target.value.toLowerCase().trim())}
                placeholder="www.bhootbazar.com"
                className="font-mono text-sm h-9 mt-1"
              />
            </div>

            {/* DNS Instructions for Server Admin */}
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">i</span>
                  DNS Configuration (A Records)
                </span>
                <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">IP: 68.183.191.215</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-background p-2 rounded border">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-sans font-semibold">ROOT DOMAIN</span>
                  <span className="font-semibold text-foreground">@ &rarr; 68.183.191.215</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-sans font-semibold">WWW SUBDOMAIN</span>
                  <span className="font-semibold text-foreground">www &rarr; 68.183.191.215</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDomainDialogOpen(false)}
              disabled={savingDomain}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveDomain}
              disabled={savingDomain}
              className="font-semibold"
            >
              {savingDomain && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save Domain Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Courier Hub Configuration Dialog */}
      <Dialog open={courierDialogOpen} onOpenChange={setCourierDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Courier Hub Configuration
            </DialogTitle>
            <DialogDescription>
              Assign dedicated sub-merchant or warehouse pickup credentials for{' '}
              <span className="font-bold text-foreground">{selectedCourierReseller?.storeName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-5 overflow-y-auto flex-1 text-xs">
            {/* Pickup Info Banner */}
            <div className="p-3 rounded-lg border bg-muted/40 space-y-1">
              <span className="font-semibold text-foreground block">Registered Pickup Address:</span>
              <p className="text-muted-foreground">
                {selectedCourierReseller?.pickupAddress?.address || 'No address set yet'}
                {selectedCourierReseller?.pickupAddress?.thana ? `, ${selectedCourierReseller.pickupAddress.thana}` : ''}
                {selectedCourierReseller?.pickupAddress?.district ? `, ${selectedCourierReseller.pickupAddress.district}` : ''}
              </p>
              <p className="text-muted-foreground font-mono">
                Phone: {selectedCourierReseller?.pickupAddress?.phone || selectedCourierReseller?.contact?.phone || 'N/A'}
              </p>
            </div>

            {/* Steadfast Sub-Merchant */}
            <div className="space-y-2 p-3.5 rounded-lg border bg-background">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                  Steadfast Sub-Merchant (Business Profile)
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">steadfast.com.bd</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                In Steadfast dashboard, create a Business for this reseller, then paste its Api-Key and Secret-Key below. All COD funds will still be credited to your main payout account.
              </p>
              <div className="space-y-2 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground">Steadfast API Key</label>
                  <Input
                    value={courierSteadfastApiKey}
                    onChange={e => setCourierSteadfastApiKey(e.target.value.trim())}
                    placeholder="Enter business Api-Key"
                    className="font-mono text-xs h-9 mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground">Steadfast Secret Key</label>
                  <Input
                    value={courierSteadfastSecretKey}
                    onChange={e => setCourierSteadfastSecretKey(e.target.value.trim())}
                    placeholder="Enter business Secret-Key"
                    className="font-mono text-xs h-9 mt-0.5"
                  />
                </div>
              </div>
            </div>

            {/* Pathao Store ID */}
            <div className="space-y-2 p-3.5 rounded-lg border bg-background">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
                  Pathao Courier Hub (Store ID)
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">merchant.pathao.com</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pathao Store ID for this reseller's pickup hub. You can click the button below to auto-create this hub in your Pathao merchant account using the reseller's address.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Input
                  value={courierPathaoStoreId}
                  onChange={e => setCourierPathaoStoreId(e.target.value.trim())}
                  placeholder="e.g. 383246"
                  className="font-mono text-xs h-9 flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCreatePathaoStore}
                  disabled={creatingPathaoStore || savingCourier}
                  className="h-9 text-xs font-semibold text-rose-600 border-rose-300 hover:bg-rose-50 shrink-0"
                >
                  {creatingPathaoStore ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                  ⚡ Auto-Create Store in Pathao
                </Button>
              </div>
            </div>

            {/* RedX Pickup Store ID */}
            <div className="space-y-2 p-3.5 rounded-lg border bg-background">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-600 inline-block" />
                  RedX Courier Hub (Pickup Store ID)
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">redx.com.bd</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                RedX Pickup Store ID for this reseller. Click below to automatically create and register this pickup store in RedX using the reseller's address.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Input
                  value={courierRedxPickupStoreId}
                  onChange={e => setCourierRedxPickupStoreId(e.target.value.trim())}
                  placeholder="e.g. 105"
                  className="font-mono text-xs h-9 flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCreateRedxStore}
                  disabled={creatingRedxStore || savingCourier}
                  className="h-9 text-xs font-semibold text-red-600 border-red-300 hover:bg-red-50 shrink-0"
                >
                  {creatingRedxStore ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                  ⚡ Auto-Create Store in RedX
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 px-5 border-t bg-muted/20 flex items-center justify-end gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCourierDialogOpen(false)}
              disabled={savingCourier}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveCourier}
              disabled={savingCourier}
              className="font-semibold"
            >
              {savingCourier && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save Courier Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Reseller Activation & Expiry Configuration Dialog */}
      <Dialog open={activationDialogOpen} onOpenChange={setActivationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {targetReseller?.status === 'active' ? 'Extend / Update Subscription Expiry' : 'Activate Store & Set Expiry Date'}
            </DialogTitle>
            <DialogDescription>
              Set the expiration date for <span className="font-semibold text-foreground">{targetReseller?.storeName}</span>. Once expired, the storefront will automatically become inactive.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Store Info Summary */}
            <div className="p-3 bg-muted/30 rounded-xl border flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-foreground">{targetReseller?.storeName}</p>
                <p className="text-muted-foreground text-[11px]">{targetReseller?.subdomain}.{ROOT_DOMAIN}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] ${statusBadgeColor[targetReseller?.status] || ''}`}>
                {targetReseller?.status === 'active' ? 'Active' : targetReseller?.status === 'pending' ? 'Pending' : targetReseller?.status === 'expired' ? 'Expired' : 'Suspended'}
              </Badge>
            </div>

            {/* Quick Preset Buttons */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Quick Presets
              </label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setQuickExpiry(30)}
                >
                  +1 Month (30 Days)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setQuickExpiry(90)}
                >
                  +3 Months (90 Days)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setQuickExpiry(180)}
                >
                  +6 Months (180 Days)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setQuickExpiry(365)}
                >
                  +1 Year (365 Days)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setQuickExpiry(730)}
                >
                  +2 Years
                </Button>
                <Button
                  type="button"
                  variant={isNoExpiry ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => {
                    setIsNoExpiry(true);
                    setExpiryDate('');
                  }}
                >
                  Lifetime Access
                </Button>
              </div>
            </div>

            {/* Date Input */}
            {!isNoExpiry ? (
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" />
                  Specific Expiry Date
                </label>
                <Input
                  type="date"
                  value={expiryDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => {
                    setExpiryDate(e.target.value);
                    setIsNoExpiry(false);
                  }}
                  className="h-10 text-sm font-medium"
                />
                {expiryDate && (
                  <p className="text-[11px] text-muted-foreground">
                    Selected Expiry: Active until <strong className="text-primary">{new Date(expiryDate).toLocaleDateString()}</strong>
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-300">
                ✔ This store will have no expiry date (Lifetime active).
              </div>
            )}
            {/* System Fee Selection in Activation Dialog */}
            <div className="space-y-1.5 pt-2 border-t">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-indigo-600" />
                  System Platform Fee (%)
                </span>
                <span className="text-xs font-bold text-indigo-600">{activationFee}%</span>
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[0, 5, 10, 15, 20].map((rate) => (
                  <Button
                    key={rate}
                    type="button"
                    variant={activationFee === rate ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7 px-1 font-bold"
                    onClick={() => setActivationFee(rate)}
                  >
                    {rate}%
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActivationDialogOpen(false)}
              disabled={savingActivation}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmActivation}
              disabled={savingActivation}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {savingActivation && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {targetReseller?.status === 'active' ? 'Update Expiry' : 'Activate & Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reseller System Fee Dialog */}
      <Dialog open={feeDialogOpen} onOpenChange={setFeeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-indigo-600" />
              Configure System Platform Fee (%)
            </DialogTitle>
            <DialogDescription>
              Set the platform fee percentage added to product reseller prices for <span className="font-semibold text-foreground">{selectedFeeReseller?.storeName}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="p-3 bg-muted/30 rounded-xl border flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-foreground">{selectedFeeReseller?.storeName}</p>
                <p className="text-muted-foreground text-[11px]">{selectedFeeReseller?.subdomain}.{ROOT_DOMAIN}</p>
              </div>
              <Badge variant="secondary" className="text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Current Fee: {selectedFeeReseller?.systemFeePercent !== undefined ? selectedFeeReseller.systemFeePercent : (selectedFeeReseller?.commissionRate ?? 15)}%
              </Badge>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Quick Presets
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[0, 5, 10, 15, 20].map((rate) => (
                  <Button
                    key={rate}
                    type="button"
                    variant={systemFeePercent === rate ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-8 px-2 font-bold"
                    onClick={() => setSystemFeePercent(rate)}
                  >
                    {rate}% {rate === 0 ? '(Free)' : rate === 15 ? '(Default)' : ''}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5 text-indigo-600" />
                Custom Fee Percentage (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={systemFeePercent}
                onChange={(e) => setSystemFeePercent(e.target.value === '' ? '' as any : Number(e.target.value))}
                placeholder="e.g. 15"
                className="h-10 text-sm font-bold"
              />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                When this reseller adds products, the system fee will be calculated as: 
                <strong className="text-foreground ml-1">
                  Reseller Price + {systemFeePercent || 0}% Fee = Shared Catalog Price
                </strong>
                . E.g., ৳100 reseller price + {systemFeePercent || 0}% fee = ৳{Math.round(100 * (1 + (Number(systemFeePercent) || 0) / 100))}.
              </p>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFeeDialogOpen(false)}
              disabled={savingFee}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveFee}
              disabled={savingFee}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {savingFee && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save System Fee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

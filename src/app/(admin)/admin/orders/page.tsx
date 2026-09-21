'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import OrderDetailsDialog from '@/components/admin/OrderDetailsDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2,
  Eye,
  Package,
  Truck,
  CheckCircle,
  Trash2,
  XCircle,
  Download,
  MoreHorizontal,
  ChevronDown,
  Printer,
  FileText,
  Filter as FilterIcon,
  Copy,
  Search
} from 'lucide-react';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width="1em"
    height="1em"
    {...props}
  >
    <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.37 5.054L2 22l5.132-1.347a9.937 9.937 0 004.877 1.28h.005c5.505 0 9.989-4.478 9.99-9.985A9.992 9.992 0 0012.012 2zm5.836 14.199c-.32.899-1.576 1.706-2.185 1.761-.559.05-1.286.074-2.074-.176a9.839 9.839 0 01-4.705-3.023 9.388 9.388 0 01-1.926-3.412 5.097 5.097 0 01-.137-2.138c.112-.601.442-1.01.691-1.272.249-.262.502-.328.67-.328.167 0 .335.006.475.014.148.009.347-.058.544.417.202.489.691 1.684.75 1.805.059.12.098.262.019.41-.079.158-.12.262-.24.399-.118.136-.251.306-.358.411-.118.114-.242.238-.104.475.138.238.614 1.01.32.957.382.341.703.56.963.666.26.106.41.088.56-.079.15-.167.643-.75.814-.999.171-.249.34-.208.573-.122.233.086 1.48.697 1.737.825.257.128.428.192.488.295.06.103.06.596-.26 1.495z"/>
  </svg>
);
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { generateInvoicePDF } from '@/lib/invoice-generator';
import { printStickerInvoice } from '@/lib/sticker-generator';


const fraudCache: { [phone: string]: { success_ratio: number; total_parcel: number } | null } = {};
const fraudPendingRequests: { [phone: string]: Promise<any> | null } = {};

function FraudCheckBadge({ phone }: { phone?: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!phone) return;

    if (fraudCache[phone] !== undefined) {
      setData(fraudCache[phone]);
      return;
    }

    const fetchFraud = async () => {
      setLoading(true);
      try {
        let promise = fraudPendingRequests[phone];
        if (!promise) {
          promise = fetch(`/api/admin/courier/fraud-check?phone=${phone}`).then(res => {
            if (res.ok) return res.json();
            throw new Error('Failed');
          });
          fraudPendingRequests[phone] = promise;
        }
        
        const json = await promise;
        if (json?.status === 'success' && json?.data?.summary) {
          const summary = json.data.summary;
          fraudCache[phone] = {
            success_ratio: summary.success_ratio,
            total_parcel: summary.total_parcel
          };
        } else {
          fraudCache[phone] = null;
        }
      } catch (e) {
        fraudCache[phone] = null;
      } finally {
        setData(fraudCache[phone]);
        setLoading(false);
        delete fraudPendingRequests[phone];
      }
    };

    fetchFraud();
  }, [phone]);

  if (loading) {
    return <span className="text-[10px] text-muted-foreground ml-1.5 animate-pulse">Checking...</span>;
  }

  if (!data) return null;

  const ratio = data.success_ratio;
  const colorClass = ratio >= 80 ? 'text-green-600 font-extrabold' : ratio >= 60 ? 'text-yellow-600 font-extrabold' : 'text-red-600 font-extrabold';

  return (
    <span className={`text-[10px] px-1 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 ${colorClass}`} title={`${data.total_parcel} total parcels`}>
      {ratio}% Success
    </span>
  );
}

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(Math.max(1, parseInt(searchParams.get('page') || '1')));

  const [orders, setOrders] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<any>({
    all: 0,
    placed: 0,
    confirmed: 0,
    paid: 0,
    hold: 0,
    ready: 0,
    released: 0,
    delivered: 0,
    cancelled: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchParams.get('search') || '');
  const [resellers, setResellers] = useState<any[]>([]);
  const [resellerFilter, setResellerFilter] = useState(searchParams.get('resellerId') || 'all');
  const [commissionFilter, setCommissionFilter] = useState(searchParams.get('commissionStatus') || 'All');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'All');
  const [dateFilter, setDateFilter] = useState({
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
  });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
 
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
 
  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);
 
  // Sync state to URL search parameters when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    }
    if (statusFilter !== 'All') {
      params.set('status', statusFilter);
    }
    if (debouncedSearchTerm) {
      params.set('search', debouncedSearchTerm);
    }
    if (dateFilter.from) {
      params.set('from', dateFilter.from);
    }
    if (dateFilter.to) {
      params.set('to', dateFilter.to);
    }
    if (resellerFilter !== 'all') {
      params.set('resellerId', resellerFilter);
    }
    if (commissionFilter !== 'All') {
      params.set('commissionStatus', commissionFilter);
    }

    const currentQuery = searchParams.toString();
    const newQuery = params.toString();
    if (currentQuery !== newQuery) {
      router.push(`/admin/orders?${newQuery}`);
    }
  }, [currentPage, statusFilter, debouncedSearchTerm, dateFilter.from, dateFilter.to, resellerFilter, commissionFilter]);

  const handleDownloadInvoice = async (order: any) => {
    try {
      toast.info('Generating PDF invoice...');
      await generateInvoicePDF(order, settings);
    } catch (error) {
      toast.error('Failed to generate PDF invoice');
    }
  };

  const handlePrint = async (ids: string[]) => {
    const toPrint = orders.filter(o => ids.includes(o._id));
    if (toPrint.length === 0) {
      toast.error('No orders found to print');
      return;
    }
    toast.info(`Generating ${toPrint.length > 1 ? toPrint.length + ' invoices' : 'invoice'}...`);
    await generateInvoicePDF(toPrint, settings, 'print');
  };

  const handlePrintStickers = async (ids: string[]) => {
    const toPrint = orders.filter(o => ids.includes(o._id));
    if (toPrint.length === 0) {
      toast.error('No orders found to print');
      return;
    }
    toast.info('Preparing sticker invoice...');
    await printStickerInvoice(toPrint, settings);
  };

  const fetchOrders = async (pageVal = currentPage) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        all: 'true',
        page: pageVal.toString(),
        limit: '20',
        search: debouncedSearchTerm,
        status: statusFilter,
        from: dateFilter.from,
        to: dateFilter.to,
        resellerId: resellerFilter
      });
      if (commissionFilter !== 'All') {
        queryParams.set('commissionStatus', commissionFilter);
      }
      const res = await fetch(`/api/orders?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load orders: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
      if (data.counts) {
        setStatusCounts(data.counts);
      }

      // Also fetch settings for the invoice generator
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        setSettings(await settingsRes.json());
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(currentPage);
  }, [currentPage, debouncedSearchTerm, statusFilter, dateFilter.from, dateFilter.to, resellerFilter, commissionFilter]);

  // Fetch resellers for filter
  useEffect(() => {
    fetch('/api/admin/resellers')
      .then(res => res.json())
      .then(data => {
        if (data.resellers) {
          setResellers(data.resellers);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const pageFromParams = Math.max(1, parseInt(searchParams.get('page') || '1'));
    if (pageFromParams !== currentPage) {
      setCurrentPage(pageFromParams);
    }
    const statusFromParams = searchParams.get('status') || 'All';
    if (statusFromParams !== statusFilter) {
      setStatusFilter(statusFromParams);
    }
    const commFromParams = searchParams.get('commissionStatus') || 'All';
    if (commFromParams !== commissionFilter) {
      setCommissionFilter(commFromParams);
    }
    const searchFromParams = searchParams.get('search') || '';
    if (searchFromParams !== searchTerm) {
      setSearchTerm(searchFromParams);
    }
    const fromFromParams = searchParams.get('from') || '';
    const toFromParams = searchParams.get('to') || '';
    if (fromFromParams !== dateFilter.from || toFromParams !== dateFilter.to) {
      setDateFilter({ from: fromFromParams, to: toFromParams });
    }
    const resellerFromParams = searchParams.get('resellerId') || 'all';
    if (resellerFromParams !== resellerFilter) {
      setResellerFilter(resellerFromParams);
    }
  }, [searchParams]);

  const filteredOrders = orders;

  const toggleSelectAll = () => {
    const filteredIds = filteredOrders.map(o => o._id);
    const areAllSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id));

    if (areAllSelected) {
      // Unselect only the filtered ones
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // Add missing filtered ones to selection
      setSelectedIds(prev => [...prev, ...filteredIds.filter(id => !prev.includes(id))]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const updateStatus = async (id: string, status: string, extraData: any = {}) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...extraData }),
      });

      if (res.ok) {
        toast.success(`Order updated successfully`);
        fetchOrders();
      } else {
        toast.error('Failed to update order');
      }
    } catch (error) {
      toast.error('Error updating order');
    }
  };

  const handleBulkUpdate = async (status: string) => {
    if (selectedIds.length === 0) return;

    const result = await Swal.fire({
      title: 'Bulk Update?',
      text: `Are you sure you want to update ${selectedIds.length} orders to "${status}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#00D1B2',
      confirmButtonText: 'Yes, update them!'
    });

    if (!result.isConfirmed) return;

    setBulkActionLoading(true);
    try {
      const res = await fetch('/api/admin/orders/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, status }),
      });

      if (res.ok) {
        toast.success(`Bulk update completed successfully`);
        setSelectedIds([]);
        fetchOrders();
      } else {
        toast.error('Bulk update failed');
      }
    } catch (error) {
      toast.error('Error in bulk update');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const result = await Swal.fire({
      title: 'Bulk Delete?',
      text: `Are you sure you want to permanently delete ${selectedIds.length} orders? This cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, delete all!'
    });

    if (!result.isConfirmed) return;

    setBulkActionLoading(true);
    try {
      const res = await fetch('/api/admin/orders/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (res.ok) {
        toast.success(`Orders deleted successfully`);
        setSelectedIds([]);
        fetchOrders();
      } else {
        toast.error('Bulk delete failed');
      }
    } catch (error) {
      toast.error('Error in bulk delete');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const exportToCSV = () => {
    const ordersToExport = selectedIds.length > 0
      ? orders.filter(o => selectedIds.includes(o._id))
      : filteredOrders;

    if (ordersToExport.length === 0) {
      toast.error('No orders to export');
      return;
    }

    const headers = [
      'Order ID',
      'Date',
      'Customer',
      'Email',
      'Phone',
      'Address',
      'Division/State',
      'Items',
      'Shipping Charge',
      'Discount',
      'Total Amount',
      'Purchase Cost',
      'Profit',
      'Reseller Commission',
      'Commission Status',
      'Payment Status',
      'Order Status'
    ];

    const rows = ordersToExport.map(o => {
      const shipping = o.shippingAddress || {};
      const fullAddress = `${shipping.street || ''}, ${shipping.city || ''}`;
      const itemsList = o.items.map((i: any) => {
        const variantDesc = [i.color, i.size].filter(Boolean).join('/');
        return `• ${i.quantity} x ${i.name}${variantDesc ? ` [${variantDesc}]` : ''} (@৳${i.price})`;
      }).join('\n');

      // Profit Calculation: Total - COGS - DeliveryCharge
      const totalPurchaseCost = o.items.reduce((acc: number, i: any) => acc + ((i.purchasePrice || 0) * i.quantity), 0);
      const profit = o.totalAmount - totalPurchaseCost - (o.deliveryCharge || 0);

      return [
        o.shortId || o._id.toUpperCase(),
        format(new Date(o.createdAt), 'yyyy-MM-dd HH:mm'),
        shipping.fullName || o.user?.name || 'Guest',
        o.user?.email || 'Guest',
        shipping.phone || 'N/A',
        fullAddress,
        shipping.division || shipping.state || 'N/A',
        itemsList,
        o.deliveryCharge || 0,
        o.couponDiscountAmount || 0,
        o.totalAmount,
        totalPurchaseCost,
        Math.round(profit),
        o.resellerId ? Math.round(o.resellerCommission || 0) : 'N/A',
        o.resellerId ? (o.commissionStatus === 'cleared' ? 'Paid' : o.commissionStatus === 'cancelled' ? 'Cancelled' : 'Pending') : 'N/A',
        o.paymentStatus,
        o.status
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_export_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Excel/CSV export started');
  };

  const deleteOrder = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This order will be permanently deleted from the database!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#00D1B2',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/orders/${id}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          toast.success('Order deleted successfully');
          fetchOrders();
        } else {
          toast.error('Failed to delete order');
        }
      } catch (error) {
        toast.error('Error deleting order');
      }
    }
  };

  const handleSendToSteadfast = async (ids: string[]) => {
    if (ids.length === 0) return;

    const result = await Swal.fire({
      title: 'Send to Steadfast?',
      text: `Are you sure you want to send ${ids.length} order(s) to Steadfast Courier?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      confirmButtonText: 'Yes, send now!'
    });

    if (!result.isConfirmed) return;

    setBulkActionLoading(true);
    try {
      const res = await fetch('/api/admin/courier/steadfast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: ids }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        if (ids.length > 1) setSelectedIds([]);
        fetchOrders();
      } else {
        toast.error(data.message || 'Submission failed');
      }
    } catch (error) {
      toast.error('Error sending to Steadfast');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleHoldOrder = async (orderId: string) => {
    const result = await Swal.fire({
      title: 'Hold Order',
      text: 'Please provide an internal note explaining the reason for holding this order:',
      input: 'textarea',
      inputPlaceholder: 'Enter reason (e.g. Customer requested delayed delivery, awaiting stock)...',
      inputAttributes: {
        'aria-label': 'Hold reason',
        'rows': '3'
      },
      showCancelButton: true,
      confirmButtonColor: '#d97706',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Hold Order',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'An internal note / reason is required to hold this order!';
        }
        return null;
      }
    });

    if (result.isConfirmed && result.value) {
      await updateStatus(orderId, 'Hold', { internalNote: result.value.trim() });
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const result = await Swal.fire({
      title: 'Cancel Order?',
      text: "Are you sure you want to cancel this order?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Yes, cancel it!',
    });

    if (result.isConfirmed) {
      await updateStatus(orderId, 'Cancelled');
    }
  };

  const openDetails = (id: string) => {
    setSelectedOrderId(id);
    setIsDetailsOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Order Placed': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-none">Placed</Badge>;
      case 'Confirmed': return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-none">Confirmed</Badge>;
      case 'Paid': return <Badge variant="secondary" className="bg-green-100 text-green-800 border-none text-[10px]">Paid</Badge>;
      case 'Hold': return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-none text-[10px]">Hold</Badge>;
      case 'Ready for Delivery': return <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-none text-[10px]">Ready</Badge>;
      case 'Released for Delivery': return <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-none text-[10px]">Released</Badge>;
      case 'Delivered': return <Badge variant="default" className="bg-green-600 text-white border-none">Delivered</Badge>;
      case 'Cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 px-0 py-4 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-shrink-0">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight whitespace-nowrap">Order Management</h2>
          <p className="text-muted-foreground text-xs md:text-sm hidden sm:block">Review, fulfillment and track shop orders.</p>
        </div>
        <Button onClick={exportToCSV} className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold shrink-0">
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
      </div>

      {/* Search and Date Range Row (1 Row) */}
      <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full">
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, email or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 w-full h-10"
          />
        </div>

        <div className="w-full md:w-48 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 w-full justify-between px-3 font-normal">
                <span className="truncate">
                  {resellerFilter === 'all' 
                    ? 'All Resellers' 
                    : resellers.find(r => r._id === resellerFilter)?.storeName || 'Unknown Reseller'}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px] max-h-[300px] overflow-y-auto">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => {
                    setResellerFilter('all');
                    setCurrentPage(1);
                  }}
                  className={resellerFilter === 'all' ? "bg-accent font-bold" : ""}
                >
                  All Resellers
                </DropdownMenuItem>
                {resellers.map((r) => (
                  <DropdownMenuItem
                    key={r._id}
                    onClick={() => {
                      setResellerFilter(r._id);
                      setCurrentPage(1);
                    }}
                    className={resellerFilter === r._id ? "bg-accent font-bold" : ""}
                  >
                    {r.storeName}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Commission Status Filter */}
        <div className="w-full md:w-44 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 w-full justify-between px-3 font-normal text-xs">
                <span className="truncate">
                  {commissionFilter === 'All' ? 'All Commission' : 
                   commissionFilter === 'cleared' ? 'Commission: Paid' :
                   commissionFilter === 'pending' ? 'Commission: Pending' : 
                   'Commission: Cancelled'}
                </span>
                <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-50 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-xs">Commission Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setCommissionFilter('All'); setCurrentPage(1); }} className={commissionFilter === 'All' ? 'bg-accent font-bold' : ''}>
                All Commission
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setCommissionFilter('cleared'); setCurrentPage(1); }} className={commissionFilter === 'cleared' ? 'bg-accent font-bold text-emerald-700' : ''}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 shrink-0"></span> Paid
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setCommissionFilter('pending'); setCurrentPage(1); }} className={commissionFilter === 'pending' ? 'bg-accent font-bold text-amber-700' : ''}>
                <span className="w-2 h-2 rounded-full bg-amber-500 mr-2 shrink-0"></span> Pending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setCommissionFilter('cancelled'); setCurrentPage(1); }} className={commissionFilter === 'cancelled' ? 'bg-accent font-bold text-red-700' : ''}>
                <span className="w-2 h-2 rounded-full bg-red-500 mr-2 shrink-0"></span> Cancelled
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="block md:hidden w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 w-full">
                <FilterIcon className="mr-2 h-4 w-4" />
                {statusFilter === 'All' ? 'All Status' : statusFilter}
                <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {[
                  { label: 'All', value: 'All', count: statusCounts.all },
                  { label: 'Placed', value: 'Order Placed', count: statusCounts.placed },
                  { label: 'Confirmed', value: 'Confirmed', count: statusCounts.confirmed },
                  { label: 'Paid', value: 'Paid', count: statusCounts.paid },
                  { label: 'Hold', value: 'Hold', count: statusCounts.hold },
                  { label: 'Ready', value: 'Ready for Delivery', count: statusCounts.ready },
                  { label: 'Released', value: 'Released for Delivery', count: statusCounts.released },
                  { label: 'Delivered', value: 'Delivered', count: statusCounts.delivered },
                  { label: 'Cancelled', value: 'Cancelled', count: statusCounts.cancelled }
                ].map((status) => (
                  <DropdownMenuItem
                    key={status.value}
                    onClick={() => {
                      setStatusFilter(status.value);
                      setCurrentPage(1);
                    }}
                    className={statusFilter === status.value ? "bg-accent font-bold" : ""}
                  >
                    <div className="flex items-center justify-between w-full text-xs">
                      <span>{status.label}</span>
                      <Badge variant="secondary" className="ml-2 text-[9px] px-1.5 py-0">
                        {status.count ?? 0}
                      </Badge>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-md border w-full md:w-auto h-10">
          <Input
            type="date"
            className="h-8 w-full md:w-36 border-none bg-transparent focus-visible:ring-0"
            value={dateFilter.from}
            onChange={(e) => {
              setDateFilter(prev => ({ ...prev, from: e.target.value }));
              setCurrentPage(1);
            }}
          />
          <span className="text-muted-foreground text-xs">to</span>
          <Input
            type="date"
            className="h-8 w-full md:w-36 border-none bg-transparent focus-visible:ring-0"
            value={dateFilter.to}
            onChange={(e) => {
              setDateFilter(prev => ({ ...prev, to: e.target.value }));
              setCurrentPage(1);
            }}
          />
        </div>

        {(statusFilter !== 'All' || resellerFilter !== 'all' || commissionFilter !== 'All' || dateFilter.from || dateFilter.to || searchTerm) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('All');
              setResellerFilter('all');
              setCommissionFilter('All');
              setDateFilter({ from: '', to: '' });
              setSearchTerm('');
              setCurrentPage(1);
            }}
            className="text-xs text-muted-foreground hover:text-primary shrink-0"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Status Tabs Row (Desktop only - Full Width Grid) */}
      <div className="hidden md:grid md:grid-cols-9 gap-2 pb-2 border-b">
        {[
          { label: 'All', value: 'All', count: statusCounts.all },
          { label: 'Placed', value: 'Order Placed', count: statusCounts.placed },
          { label: 'Confirmed', value: 'Confirmed', count: statusCounts.confirmed },
          { label: 'Paid', value: 'Paid', count: statusCounts.paid },
          { label: 'Hold', value: 'Hold', count: statusCounts.hold },
          { label: 'Ready', value: 'Ready for Delivery', count: statusCounts.ready },
          { label: 'Released', value: 'Released for Delivery', count: statusCounts.released },
          { label: 'Delivered', value: 'Delivered', count: statusCounts.delivered },
          { label: 'Cancelled', value: 'Cancelled', count: statusCounts.cancelled }
        ].map((status) => {
          const isActive = statusFilter === status.value;
          return (
            <button
              key={status.value}
              onClick={() => {
                setStatusFilter(status.value);
                setCurrentPage(1);
              }}
              className={`w-full py-2 text-xs font-semibold rounded-md transition-all duration-200 text-center truncate flex items-center justify-center gap-1.5 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-background hover:bg-muted text-muted-foreground border border-input'
              }`}
              title={`${status.label} (${status.count ?? 0})`}
            >
              <span>{status.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                isActive 
                  ? 'bg-white/20 text-white' 
                  : 'bg-muted text-muted-foreground border'
              }`}>
                {status.count ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-md border bg-background overflow-hidden relative">
        {/* Bulk Action Toolbar */}
        {selectedIds.length > 0 && (
          <div className="sticky top-0 z-20 w-full bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-4 text-sm font-medium">
              <span>{selectedIds.length} orders selected</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground hover:bg-white/10"
                onClick={() => setSelectedIds([])}
              >
                Deselect All
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-white text-primary hover:bg-white/90"
                onClick={() => handlePrint(selectedIds)}
              >
                <Printer className="mr-2 h-3 w-3" /> Print Invoices
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="bg-white text-primary hover:bg-white/90"
                onClick={() => handlePrintStickers(selectedIds)}
              >
                <Printer className="mr-2 h-3 w-3" /> Print Stickers
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="bg-orange-500 text-white hover:bg-orange-600 border-none"
                onClick={() => handleSendToSteadfast(selectedIds)}
              >
                <Truck className="mr-2 h-3 w-3" /> Send to Steadfast
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-white text-primary hover:bg-white/90">
                    Update Status <ChevronDown className="ml-2 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Change Status to:</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleBulkUpdate('Confirmed')}>Confirmed</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkUpdate('Paid')}>Paid</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkUpdate('Ready for Delivery')}>Ready for Delivery</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkUpdate('Released for Delivery')}>Released for Delivery</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkUpdate('Delivered')}>Delivered</DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="destructive"
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === filteredOrders.length && filteredOrders.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Order Info</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No orders found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order._id} className={selectedIds.includes(order._id) ? "bg-muted/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(order._id)}
                        onCheckedChange={() => toggleSelect(order._id)}
                      />
                    </TableCell>
                    <TableCell className="max-w-[200px] whitespace-normal">
                      <div className="flex flex-col gap-1.5 text-xs">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => openDetails(order._id)}
                          >
                            <span className={`font-bold hover:underline ${order.isDuplicate ? 'text-red-500 font-extrabold' : order.isRepeat ? 'text-yellow-600 font-extrabold' : 'text-primary'}`}>
                              #{order.shortId || order._id.slice(-8).toUpperCase()}
                            </span>
                          </button>
                          {order.isDuplicate ? (
                            <Badge className="bg-red-500 text-white hover:bg-red-600 border-none text-[9px] px-1 py-0 h-4">Duplicate</Badge>
                          ) : order.isRepeat ? (
                            <Badge className="bg-yellow-500 text-black hover:bg-yellow-600 border-none text-[9px] px-1 py-0 h-4">Repeat</Badge>
                          ) : null}
                        </div>
                        
                        <div className="flex flex-col text-[11px] text-slate-700 dark:text-zinc-300 mt-1 space-y-0.5">
                          <span className="font-semibold text-slate-900 dark:text-white break-words block">{order.shippingAddress?.fullName || order.user?.name || 'Guest User'}</span>
                          <div className="flex items-center gap-1.5">
                            <span 
                              onClick={() => order.shippingAddress?.phone && setSearchTerm(order.shippingAddress.phone)}
                              className="text-muted-foreground hover:text-primary cursor-pointer hover:underline font-medium"
                            >
                              {order.shippingAddress?.phone || 'No Phone'}
                            </span>
                            {order.shippingAddress?.phone && (
                              <>
                                <a 
                                  href={`https://wa.me/${order.shippingAddress.phone.replace(/[^0-9]/g, '').startsWith('88') ? order.shippingAddress.phone.replace(/[^0-9]/g, '') : '88' + (order.shippingAddress.phone.replace(/[^0-9]/g, '').startsWith('0') ? order.shippingAddress.phone.replace(/[^0-9]/g, '').slice(1) : order.shippingAddress.phone.replace(/[^0-9]/g, ''))}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-600 hover:text-green-700 transition-colors p-0.5 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded"
                                  title="Chat on WhatsApp"
                                >
                                  <WhatsAppIcon className="h-3.5 w-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(order.shippingAddress.phone);
                                    toast.success('Phone number copied!');
                                  }}
                                  className="text-muted-foreground hover:text-primary transition-colors p-0.5 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded animate-in fade-in duration-200"
                                  title="Copy Phone Number"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </>
                            )}
                          </div>
                          {order.shippingAddress?.phone && (
                            <div className="mt-0.5">
                              <FraudCheckBadge phone={order.shippingAddress.phone} />
                            </div>
                          )}
                          <span className="text-muted-foreground truncate max-w-[150px]">{order.user?.email || 'No Email'}</span>
                          <span className="text-[10px] text-muted-foreground uppercase mt-0.5">
                            {order.createdAt ? format(new Date(order.createdAt), 'MMM dd, p') : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {order.items?.map((item: any, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-[9px] px-1 py-0 font-normal truncate max-w-[180px]">
                              {item.quantity}× {item.name}
                              {(item.color || item.size) && (
                                <span className="text-muted-foreground ml-1">
                                  ({[item.color, item.size].filter(Boolean).join('/')})
                                </span>
                              )}
                            </Badge>
                          ))}
                        </div>
                        {/* Customer Note */}
                        {order.customerNote && (
                          <div className="mt-1 text-[10px] bg-sky-50 dark:bg-sky-950/20 text-sky-800 dark:text-sky-300 px-1.5 py-0.5 rounded border border-sky-200/50 font-medium whitespace-pre-line max-w-[200px]" title={`Customer Note: ${order.customerNote}`}>
                            💬 Customer: {order.customerNote}
                          </div>
                        )}
                        {/* Internal Note */}
                        {order.internalNote && (
                          <div className="mt-1 text-[10px] bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200/50 font-medium whitespace-pre-line max-w-[200px]" title={`Internal Note: ${order.internalNote}`}>
                            🔒 Staff: {order.internalNote}
                          </div>
                        )}
                        {/* System Note */}
                        {order.systemNote && (
                          <div className="mt-1 text-[9px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded border border-border font-mono max-w-[200px] truncate" title={`System Info: ${order.systemNote}`}>
                            ⚙️ {order.systemNote}
                          </div>
                        )}
                        {order.resellerId && typeof order.resellerId === 'object' && order.resellerId.storeName && (
                          <div className="mt-1 text-[9px] bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-200/50 font-bold whitespace-nowrap max-w-[200px] truncate" title={order.resellerId.storeName}>
                            Store: {order.resellerId.storeName}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">৳{Math.round(order.totalAmount ?? 0)}</TableCell>
                    <TableCell>
                      {order.resellerId ? (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="font-bold text-green-600 text-sm">
                            ৳{Math.round(order.resellerCommission || 0)}
                          </span>
                          {order.commissionStatus === 'cleared' ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[9px] px-1.5 py-0 font-semibold">
                              Paid
                            </Badge>
                          ) : order.commissionStatus === 'cancelled' ? (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-[9px] px-1.5 py-0 font-semibold">
                              Cancelled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[9px] px-1.5 py-0 font-semibold">
                              Pending
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant="outline"
                          className={order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700 border-none font-bold' : 'bg-yellow-100 text-yellow-700 border-none font-bold'}
                        >
                          {order.paymentStatus}
                        </Badge>
                        {order.paymentMethod === 'Manual' && order.manualPaymentDetails && (
                          <div className="flex flex-col text-[10px] text-muted-foreground bg-slate-50 dark:bg-zinc-900 p-1.5 rounded border border-slate-100 dark:border-zinc-800 font-mono">
                            <span className="font-bold text-primary uppercase text-[9px]">{order.manualPaymentDetails.methodName}</span>
                            {order.manualPaymentDetails.senderNumber && (
                              <span>No: {order.manualPaymentDetails.senderNumber}</span>
                            )}
                            {order.manualPaymentDetails.transactionId && (
                              <span className="truncate max-w-[120px] font-bold text-slate-800 dark:text-zinc-200" title={order.manualPaymentDetails.transactionId}>
                                TrxID: {order.manualPaymentDetails.transactionId}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {order.paymentMethod === 'Manual' && order.paymentStatus === 'Pending' && order.status !== 'Cancelled' && (
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" 
                              title="Approve Manual Payment"
                              onClick={() => {
                                Swal.fire({
                                  title: 'Approve Payment?',
                                  text: `Are you sure you want to approve manual payment for order #${order._id.slice(-8).toUpperCase()}? This will mark the order as Confirmed & Paid.`,
                                  icon: 'question',
                                  showCancelButton: true,
                                  confirmButtonColor: '#00D1B2',
                                  confirmButtonText: 'Yes, Approve!'
                                }).then((result) => {
                                  if (result.isConfirmed) {
                                    updateStatus(order._id, 'Confirmed', { paymentStatus: 'Paid' });
                                  }
                                });
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30" 
                              title="Cancel Order"
                              onClick={() => handleCancelOrder(order._id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => openDetails(order._id)}>
                          <Eye className="h-4 w-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleDownloadInvoice(order)}>
                                <FileText className="mr-2 h-4 w-4 text-primary" /> Download Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrint([order._id])}>
                                <Printer className="mr-2 h-4 w-4 text-primary" /> Print Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrintStickers([order._id])}>
                                <Printer className="mr-2 h-4 w-4 text-primary" /> Print Sticker Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSendToSteadfast([order._id])} disabled={!!order.shippingDetails?.consignmentId}>
                                <Truck className="mr-2 h-4 w-4 text-orange-500" /> Send to Steadfast
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => updateStatus(order._id, 'Confirmed')}>Confirm</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(order._id, 'Paid', { paymentStatus: 'Paid' })}>Mark Paid</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleHoldOrder(order._id)}>Hold Order</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(order._id, 'Ready for Delivery')}>Ready for Delivery</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(order._id, 'Released for Delivery')}>Release for Delivery</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(order._id, 'Delivered')}>Mark Delivered</DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleCancelOrder(order._id)}>Cancel Order</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive font-bold" onClick={() => deleteOrder(order._id)}>Delete Order</DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards View */}
        <div className="block md:hidden p-2 space-y-2.5">
          {filteredOrders.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-center text-muted-foreground text-xs">
              No orders found.
            </div>
          ) : (
            filteredOrders.map((order) => {
              const phone = order.shippingAddress?.phone;
              return (
                <div
                  key={order._id}
                  className={`bg-card border border-border/90 rounded-xl p-3 text-xs space-y-2 shadow-xs transition-colors ${
                    selectedIds.includes(order._id) ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 border-b pb-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedIds.includes(order._id)}
                        onCheckedChange={() => toggleSelect(order._id)}
                      />
                      <button
                        type="button"
                        className="font-bold text-xs text-primary hover:underline"
                        onClick={() => openDetails(order._id)}
                      >
                        #{order.shortId || order._id.slice(-8).toUpperCase()}
                      </button>
                      {order.isDuplicate && (
                        <Badge className="bg-red-500 text-white text-[9px] px-1 py-0 h-4">Dup</Badge>
                      )}
                      {order.isRepeat && (
                        <Badge className="bg-yellow-500 text-black text-[9px] px-1 py-0 h-4">Repeat</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {getStatusBadge(order.status)}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground text-xs">
                        {order.shippingAddress?.fullName || order.user?.name || 'Guest User'}
                      </span>
                      <span className="font-bold text-sm text-primary">
                        ৳{Math.round(order.totalAmount ?? 0).toLocaleString()}
                      </span>
                    </div>

                    {phone && (
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${phone}`}
                            className="text-primary font-medium hover:underline flex items-center gap-1"
                          >
                            {phone}
                          </a>
                          <a
                            href={`https://wa.me/${phone.replace(/[^0-9]/g, '').startsWith('88') ? phone.replace(/[^0-9]/g, '') : '88' + (phone.replace(/[^0-9]/g, '').startsWith('0') ? phone.replace(/[^0-9]/g, '').slice(1) : phone.replace(/[^0-9]/g, ''))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 p-0.5"
                          >
                            <WhatsAppIcon className="h-3.5 w-3.5" />
                          </a>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {order.createdAt ? format(new Date(order.createdAt), 'dd MMM, p') : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-dashed">
                    {order.items?.map((item: any, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0.5 font-normal">
                        {item.quantity}× {item.name}
                        {(item.color || item.size) && (
                          <span className="text-muted-foreground ml-1">
                            ({[item.color, item.size].filter(Boolean).join('/')})
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>

                  {order.customerNote && (
                    <div className="text-[10px] bg-sky-50 dark:bg-sky-950/20 text-sky-800 dark:text-sky-300 px-1.5 py-0.5 rounded border border-sky-200/50 font-medium whitespace-pre-line">
                      💬 Customer: {order.customerNote}
                    </div>
                  )}
                  {order.internalNote && (
                    <div className="text-[10px] bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200/50 font-medium whitespace-pre-line">
                      🔒 Staff: {order.internalNote}
                    </div>
                  )}
                  {order.systemNote && (
                    <div className="text-[9px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded border border-border font-mono truncate">
                      ⚙️ {order.systemNote}
                    </div>
                  )}
                  {order.resellerId && (
                    <div className="flex items-center justify-between gap-1 text-[10px] bg-indigo-50/70 dark:bg-indigo-950/20 px-2 py-1 rounded border border-indigo-200/50">
                      <span className="font-bold text-indigo-700 dark:text-indigo-300 truncate">
                        🏪 {typeof order.resellerId === 'object' && order.resellerId.storeName ? order.resellerId.storeName : 'Reseller Order'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-bold text-green-700 dark:text-green-400">
                          Comm: ৳{Math.round(order.resellerCommission || 0)}
                        </span>
                        {order.commissionStatus === 'cleared' ? (
                          <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[8px] px-1 py-0 font-semibold h-4">
                            Paid
                          </Badge>
                        ) : order.commissionStatus === 'cancelled' ? (
                          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 text-[8px] px-1 py-0 font-semibold h-4">
                            Cancelled
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[8px] px-1 py-0 font-semibold h-4">
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Card Bottom Actions */}
                  <div className="flex items-center justify-between pt-2 border-t gap-1">
                    <div className="flex items-center gap-1">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0.2 ${
                          order.paymentStatus === 'Paid'
                            ? 'bg-green-100 text-green-700 border-none font-bold'
                            : 'bg-yellow-100 text-yellow-700 border-none font-bold'
                        }`}
                      >
                        {order.paymentStatus}
                      </Badge>
                      {order.shippingDetails?.consignmentId && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-blue-100 text-blue-700">
                          Couriered
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs text-primary"
                        onClick={() => openDetails(order._id)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => handleDownloadInvoice(order)}>
                              <FileText className="mr-2 h-4 w-4 text-primary" /> Invoice PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrint([order._id])}>
                              <Printer className="mr-2 h-4 w-4 text-primary" /> Print
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleSendToSteadfast([order._id])}
                              disabled={!!order.shippingDetails?.consignmentId}
                            >
                              <Truck className="mr-2 h-4 w-4 text-orange-500" /> Send Steadfast
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => updateStatus(order._id, 'Confirmed')}>Confirm</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(order._id, 'Paid', { paymentStatus: 'Paid' })}>Mark Paid</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleHoldOrder(order._id)}>Hold Order</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(order._id, 'Delivered')}>Mark Delivered</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleCancelOrder(order._id)}>Cancel</DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="py-4 border-t bg-card px-3 sm:px-6 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => {
                setCurrentPage(page);
                fetchOrders(page);
                const params = new URLSearchParams(searchParams.toString());
                params.set('page', page.toString());
                router.push(`?${params.toString()}`);
              }}
            />
          </div>
        )}
      </div>

      <OrderDetailsDialog
        orderId={selectedOrderId}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onUpdate={fetchOrders}
      />


      {bulkActionLoading && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-bold">Processing bulk action...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <OrdersContent />
    </Suspense>
  );
}

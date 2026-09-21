'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2,
  Plus,
  Trash2,
  Printer,
  Download,
  DollarSign,
  Users,
  Search,
  CreditCard,
  FileText,
  Package,
  Eye,
  MapPin,
  Phone,
  User,
  CalendarDays,
  Hash,
  MoreHorizontal,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { generateBillPDF } from '@/lib/bill-invoice-generator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pagination } from '@/components/ui/pagination';
import { MobileDataCard, MobileDataRow } from '@/components/common/MobileDataCard';

interface BillItemInput {
  name: string;
  quantity: number;
  price: number;
}

function ClientBillsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [bills, setBills] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const initialStatus = searchParams.get('status') || 'all';
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const [currentPage, setCurrentPage] = useState(initialPage);
  
  const [settings, setSettings] = useState<any>(null);

  // Sync state changes to URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    } else {
      params.delete('page');
    }
    if (statusFilter !== 'all') {
      params.set('status', statusFilter);
    } else {
      params.delete('status');
    }
    router.push(`/admin/bills?${params.toString()}`);
  }, [currentPage, statusFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    router.push(`/admin/bills?${params.toString()}`);
  }, [searchTerm, statusFilter, dateFilter.from, dateFilter.to]);

  // Bill detail view state
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [editingBill, setEditingBill] = useState<any>(null);

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Form states
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [billItems, setBillItems] = useState<BillItemInput[]>([
    { name: '', quantity: 1, price: 0 }
  ]);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const [serviceFee, setServiceFee] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [prevDue, setPrevDue] = useState<number>(0);
  const [cashIn, setCashIn] = useState<number>(0);
  const [expectedReceivableDate, setExpectedReceivableDate] = useState('');

  // Product multi-select state
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedProductVariants, setSelectedProductVariants] = useState<Record<string, string | null>>({});
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  // Phone validation
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    fetchBills();
    fetchProducts();
    fetchSettings();
  }, [statusFilter]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/bills?filter=${statusFilter}&type=bill`);
      if (!res.ok) throw new Error('Failed to fetch bills');
      const data = await res.json();
      setBills(data);
    } catch (error) {
      toast.error('Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=100');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  // Calculations
  const subtotal = billItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = discountType === 'percentage'
    ? Math.round((subtotal * discountValue) / 100)
    : discountValue;
  const total = Math.max(0, subtotal + deliveryCharge + serviceFee - discount);
  const gTotal = total + prevDue;
  const currentBillDue = Math.max(0, gTotal - cashIn);
  const calculatedStatus = currentBillDue <= 0 ? 'Paid' : 'Due';

  const validatePhone = (phone: string) => {
    const bdPhoneRegex = /^(?:\+?88)?01[3-9]\d{8}$/;
    if (!phone.trim()) {
      setPhoneError('Phone number is required');
      return false;
    }
    if (!bdPhoneRegex.test(phone.replace(/\s/g, ''))) {
      setPhoneError('Enter a valid BD number (e.g. 017XXXXXXXX)');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const toggleProductVariant = (productId: string, variantId: string | null) => {
    setSelectedProductVariants(prev => {
      const current = prev[productId];
      if (current === variantId) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: variantId };
    });
  };

  const selectedCount = Object.keys(selectedProductVariants).length;

  const handleAddSelectedProducts = () => {
    const newItems: BillItemInput[] = [];

    Object.entries(selectedProductVariants).forEach(([productId, variantId]) => {
      const prod = products.find(p => p._id === productId);
      if (!prod) return;

      if (variantId === null) {
        newItems.push({ name: prod.name, price: prod.salePrice || prod.price || 0, quantity: 1 });
      } else {
        const variant = (prod.variants || []).find((v: any) => v._id === variantId);
        if (!variant) return;
        const label = [prod.name, variant.color, variant.size].filter(Boolean).join(' — ');
        newItems.push({ name: label, price: variant.salePrice || variant.price || 0, quantity: 1 });
      }
    });

    if (newItems.length === 0) return;

    if (billItems.length === 1 && billItems[0].name === '' && billItems[0].price === 0) {
      setBillItems(newItems);
    } else {
      setBillItems(prev => [...prev, ...newItems]);
    }
    setSelectedProductVariants({});
    setProductPickerOpen(false);
    setProductSearchTerm('');
  };

  const handleAddItemRow = () => {
    setBillItems([...billItems, { name: '', quantity: 1, price: 0 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (billItems.length === 1) {
      setBillItems([{ name: '', quantity: 1, price: 0 }]);
    } else {
      setBillItems(billItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof BillItemInput, value: any) => {
    const updated = [...billItems];
    if (field === 'quantity') {
      updated[index].quantity = Math.max(1, parseInt(value) || 1);
    } else if (field === 'price') {
      updated[index].price = Math.max(0, parseFloat(value) || 0);
    } else {
      updated[index].name = value;
    }
    setBillItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientAddress.trim()) {
      toast.error('Client details are required');
      return;
    }
    if (!validatePhone(clientPhone)) {
      toast.error('Please enter a valid Bangladesh phone number');
      return;
    }

    const validItems = billItems.filter(item => item.name.trim() !== '');
    if (validItems.length === 0) {
      toast.error('At least one item with a name is required');
      return;
    }

    if (calculatedStatus === 'Due' && !expectedReceivableDate) {
      toast.error('Expected receivable date is required for due bills');
      return;
    }

    try {
      setFormLoading(true);
      const billData = {
        clientName,
        clientPhone,
        clientAddress,
        items: validItems,
        subtotal,
        deliveryCharge,
        serviceFee,
        discountType,
        discountValue,
        discount,
        total,
        prevDue,
        gTotal,
        cashIn,
        currentBillDue,
        status: calculatedStatus,
        expectedReceivableDate: calculatedStatus === 'Due' ? expectedReceivableDate : undefined,
        documentType: 'bill'
      };

      const url = editingBill ? `/api/admin/bills/${editingBill._id}` : '/api/admin/bills';
      const method = editingBill ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to ${editingBill ? 'update' : 'create'} bill`);
      }

      toast.success(editingBill ? 'Bill updated successfully!' : 'Bill generated successfully!');

      setIsCreateOpen(false);
      resetForm();
      fetchBills();
    } catch (error: any) {
      toast.error(error.message || 'Error saving bill');
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setClientName('');
    setClientPhone('');
    setPhoneError('');
    setClientAddress('');
    setBillItems([{ name: '', quantity: 1, price: 0 }]);
    setDeliveryCharge(0);
    setServiceFee(0);
    setDiscountType('fixed');
    setDiscountValue(0);
    setPrevDue(0);
    setCashIn(0);
    setExpectedReceivableDate('');
    setSelectedProductVariants({});
    setProductSearchTerm('');
    setProductPickerOpen(false);
    setEditingBill(null);
  };

  const handleUpdateStatus = async (billId: string, currentDue: number) => {
    const { value: paidAmount } = await Swal.fire({
      title: 'Update Payment Cash-in',
      input: 'number',
      inputLabel: 'Amount Paid (৳)',
      inputValue: currentDue,
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value || isNaN(Number(value)) || Number(value) < 0) {
          return 'Please enter a valid positive amount';
        }
      }
    });

    if (paidAmount !== undefined) {
      try {
        const amount = Number(paidAmount);
        const bill = bills.find(b => b._id === billId);
        if (!bill) return;

        const newCashIn = (bill.cashIn || 0) + amount;
        const newDue = Math.max(0, bill.gTotal - newCashIn);
        const newStatus = newDue <= 0 ? 'Paid' : 'Due';

        const res = await fetch(`/api/admin/bills/${billId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cashIn: newCashIn,
            currentBillDue: newDue,
            status: newStatus
          })
        });

        if (!res.ok) throw new Error('Failed to update bill');
        toast.success('Payment updated successfully');
        fetchBills();
      } catch (error) {
        toast.error('Failed to update payment');
      }
    }
  };

  const handleDeleteBill = async (billId: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/bills/${billId}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete bill');
        toast.success('Bill deleted successfully');
        fetchBills();
      } catch (error) {
        toast.error('Failed to delete bill');
      }
    }
  };

  const filteredBills = bills.filter(b => {
    const matchesSearch = b.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.clientPhone.includes(searchTerm) ||
      b.invoiceNo.includes(searchTerm);
      
    let matchesDate = true;
    if (dateFilter.from) {
      matchesDate = matchesDate && new Date(b.date) >= new Date(dateFilter.from + 'T00:00:00');
    }
    if (dateFilter.to) {
      matchesDate = matchesDate && new Date(b.date) <= new Date(dateFilter.to + 'T23:59:59');
    }

    let matchesStatus = true;
    if (statusFilter !== 'all') {
      matchesStatus = b.status?.toLowerCase() === statusFilter.toLowerCase();
    }
    
    return matchesSearch && matchesDate && matchesStatus;
  });

  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(filteredBills.length / ITEMS_PER_PAGE);
  const paginatedBills = filteredBills.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Metrics
  const totalBilled = bills.reduce((sum, b) => sum + (b.gTotal || 0), 0);
  const totalCollected = bills.reduce((sum, b) => sum + (b.cashIn || 0), 0);
  const accountsReceivable = bills.reduce((sum, b) => sum + (b.currentBillDue || 0), 0);

  return (
    <div className="flex-1 space-y-4 md:space-y-6 px-0 py-2 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3">
        <div>
          <h2 className="text-xl md:text-3xl font-bold tracking-tight">Client Billing Manager</h2>
          <p className="text-muted-foreground text-xs md:text-sm mt-0.5">Create bills, offer discounts, manage collections & track receivables.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link href="/admin/ledger/receivable">
            <Button variant="outline" className="w-full sm:w-auto font-bold h-9 text-xs">
              <Users className="mr-1.5 h-4 w-4 text-orange-600" /> AR Ledger
            </Button>
          </Link>
          <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto font-bold bg-primary text-primary-foreground h-9 text-xs">
            <Plus className="mr-1.5 h-4 w-4" /> Create Bill
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 md:gap-4">
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 p-3 md:p-4">
            <CardTitle className="text-xs font-semibold">Total Invoiced (Billed)</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold">৳{totalBilled.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground">Cumulative billed amount</p>
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 p-3 md:p-4">
            <CardTitle className="text-xs font-semibold">Total Collected (Cash-in)</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-green-700">৳{totalCollected.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground">Payments received</p>
          </CardContent>
        </Card>
        <Link href="/admin/ledger/receivable" className="block group">
          <Card className="bg-orange-500/5 border-orange-500/20 shadow-xs group-hover:border-orange-500/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 p-3 md:p-4">
              <CardTitle className="text-xs font-semibold group-hover:text-orange-600 transition-colors">Accounts Receivable &rarr;</CardTitle>
              <Users className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0">
              <div className="text-xl md:text-2xl font-bold text-orange-700">৳{accountsReceivable.toLocaleString()}</div>
              <p className="text-[10px] text-muted-foreground">Outstanding due balances</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search name, phone or bill no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {['all', 'paid', 'due'].map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={statusFilter === filter ? 'default' : 'outline'}
                onClick={() => setStatusFilter(filter)}
                className="capitalize font-bold h-8 text-xs px-2.5"
              >
                {filter}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-md border text-xs">
            <Input
              type="date"
              className="h-7 w-28 border-none bg-transparent focus-visible:ring-0 text-xs px-1"
              value={dateFilter.from}
              onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
            />
            <span className="text-muted-foreground text-[10px]">to</span>
            <Input
              type="date"
              className="h-7 w-28 border-none bg-transparent focus-visible:ring-0 text-xs px-1"
              value={dateFilter.to}
              onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
            />
          </div>

          {(dateFilter.from || dateFilter.to) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDateFilter({ from: '', to: '' })}
              className="text-xs text-muted-foreground hover:text-primary h-7 px-2"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Bill List Table Card */}
      <Card className="shadow-xs overflow-hidden">
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client Details</TableHead>
                  <TableHead className="text-right">Grand Total</TableHead>
                  <TableHead className="text-right">Paid (Cash-in)</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Expected Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filteredBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No bills found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedBills.map((bill) => (
                    <TableRow key={bill._id}>
                      <TableCell>
                        <button
                          onClick={() => setSelectedBill(bill)}
                          className="font-bold text-primary hover:underline underline-offset-2 flex items-center gap-1 font-mono text-xs"
                          title="View Bill Details"
                        >
                          <Hash className="h-3 w-3" />
                          {bill.invoiceNo}
                        </button>
                      </TableCell>
                      <TableCell>{format(new Date(bill.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <div className="font-medium">{bill.clientName}</div>
                        <div className="text-xs text-muted-foreground">{bill.clientPhone}</div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">৳{bill.gTotal}</TableCell>
                      <TableCell className="text-right text-green-600">৳{bill.cashIn}</TableCell>
                      <TableCell className="text-right text-orange-600 font-semibold">৳{bill.currentBillDue}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={bill.status === 'Paid' ? 'default' : 'destructive'} className={bill.status === 'Paid' ? 'bg-green-600 text-white border-none' : ''}>
                          {bill.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {bill.expectedReceivableDate ? format(new Date(bill.expectedReceivableDate), 'dd MMM yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                            onClick={() => generateBillPDF(bill, settings, 'print')}
                            title="Print Bill"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          {bill.status === 'Due' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleUpdateStatus(bill._id, bill.currentBillDue)}
                              title="Collect Cash"
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedBill(bill)}>
                                <Eye className="mr-2 h-4 w-4" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingBill(bill);
                                  setClientName(bill.clientName);
                                  setClientPhone(bill.clientPhone);
                                  setClientAddress(bill.clientAddress);
                                  setBillItems(bill.items);
                                  setDeliveryCharge(bill.deliveryCharge);
                                  setServiceFee(bill.serviceFee || 0);
                                  setDiscountType(bill.discountType || 'fixed');
                                  setDiscountValue(bill.discountValue || 0);
                                  setPrevDue(bill.prevDue || 0);
                                  setCashIn(bill.cashIn || 0);
                                  setExpectedReceivableDate(bill.expectedReceivableDate ? format(new Date(bill.expectedReceivableDate), 'yyyy-MM-dd') : '');
                                  setIsCreateOpen(true);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" /> Edit Bill
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => generateBillPDF(bill, settings, 'download')}>
                                <Download className="mr-2 h-4 w-4 text-blue-600" /> Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => generateBillPDF(bill, settings, 'print')}>
                                <Printer className="mr-2 h-4 w-4 text-teal-600" /> Print Bill
                              </DropdownMenuItem>
                              {bill.status === 'Due' && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(bill._id, bill.currentBillDue)}>
                                  <CreditCard className="mr-2 h-4 w-4 text-green-600" /> Collect Cash
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteBill(bill._id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
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

          {/* Mobile Card List View */}
          <div className="block md:hidden p-2 space-y-2.5">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                <span>Loading bills...</span>
              </div>
            ) : filteredBills.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-xs">
                No bills found.
              </div>
            ) : (
              paginatedBills.map((bill) => (
                <MobileDataCard
                  key={bill._id}
                  title={bill.clientName}
                  badge={
                    <Badge variant={bill.status === 'Paid' ? 'default' : 'destructive'} className={`text-[10px] ${bill.status === 'Paid' ? 'bg-green-600 text-white border-none' : ''}`}>
                      {bill.status}
                    </Badge>
                  }
                  footer={
                    <div className="flex items-center justify-between w-full font-bold text-xs">
                      <span className="text-muted-foreground">Remaining Due:</span>
                      <span className="text-orange-600 text-sm font-black">৳{bill.currentBillDue.toLocaleString()}</span>
                    </div>
                  }
                >
                  <MobileDataRow label="Invoice No" value={<span className="font-mono text-xs text-primary font-bold">{bill.invoiceNo}</span>} />
                  <MobileDataRow label="Phone" value={bill.clientPhone} />
                  <MobileDataRow label="Date" value={format(new Date(bill.date), 'dd MMM yyyy')} />
                  <MobileDataRow label="Grand Total" value={<span className="font-bold">৳{bill.gTotal.toLocaleString()}</span>} />
                  <MobileDataRow label="Paid (Cash-in)" value={<span className="text-green-600 font-semibold">৳{bill.cashIn.toLocaleString()}</span>} />

                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2 text-teal-600"
                      onClick={() => generateBillPDF(bill, settings, 'print')}
                    >
                      <Printer className="h-3 w-3 mr-1" /> Print
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => setSelectedBill(bill)}
                    >
                      <Eye className="h-3 w-3 mr-1" /> View
                    </Button>
                    {bill.status === 'Due' && (
                      <Button
                        size="sm"
                        className="h-7 text-xs px-2 bg-green-600 hover:bg-green-700 text-white font-bold"
                        onClick={() => handleUpdateStatus(bill._id, bill.currentBillDue)}
                      >
                        <CreditCard className="h-3 w-3 mr-1" /> Pay
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingBill(bill);
                            setClientName(bill.clientName);
                            setClientPhone(bill.clientPhone);
                            setClientAddress(bill.clientAddress);
                            setBillItems(bill.items);
                            setDeliveryCharge(bill.deliveryCharge);
                            setServiceFee(bill.serviceFee || 0);
                            setDiscountType(bill.discountType || 'fixed');
                            setDiscountValue(bill.discountValue || 0);
                            setPrevDue(bill.prevDue || 0);
                            setCashIn(bill.cashIn || 0);
                            setExpectedReceivableDate(bill.expectedReceivableDate ? format(new Date(bill.expectedReceivableDate), 'yyyy-MM-dd') : '');
                            setIsCreateOpen(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" /> Edit Bill
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateBillPDF(bill, settings, 'download')}>
                          <Download className="mr-2 h-4 w-4 text-blue-600" /> Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteBill(bill._id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </MobileDataCard>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="py-3 border-t bg-background px-3">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Bill Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBill ? 'Edit' : 'Generate'} Client Bill</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Client Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="clientName" className="text-xs">Client Name *</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Rahim Khan"
                  className="h-8 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="clientPhone" className="text-xs">Client Phone *</Label>
                <Input
                  id="clientPhone"
                  value={clientPhone}
                  onChange={(e) => {
                    setClientPhone(e.target.value);
                    if (phoneError) validatePhone(e.target.value);
                  }}
                  onBlur={(e) => validatePhone(e.target.value)}
                  placeholder="e.g. 01712345678"
                  className={`h-8 text-xs ${phoneError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  required
                />
                {phoneError && <p className="text-[10px] text-destructive">{phoneError}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="clientAddress" className="text-xs">Client Address *</Label>
                <Input
                  id="clientAddress"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="e.g. Nawabpur, Dhaka"
                  className="h-8 text-xs"
                  required
                />
              </div>
            </div>

            {/* Bill Items header */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-xs">Bill Items</h4>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setProductPickerOpen(true)}
                    className="font-bold h-7 text-xs px-2"
                  >
                    <Plus className="mr-1 h-3 w-3" /> Select Products
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItemRow} className="font-bold h-7 text-xs px-2">
                    <Plus className="h-3 w-3 mr-1" /> Add Custom Item
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {billItems.map((item, index) => (
                  <div key={index} className="flex gap-1.5 items-center">
                    <Input
                      placeholder="Item Description"
                      value={item.name}
                      onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                      className="flex-1 h-8 text-xs"
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className="w-16 h-8 text-xs text-center"
                      min="1"
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Rate"
                      value={item.price || ''}
                      onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                      className="w-24 h-8 text-xs text-right"
                      min="0"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItemRow(index)}
                      className="text-destructive hover:bg-destructive/10 shrink-0 h-8 w-8"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals & Adjustments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t">
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="deliveryCharge" className="text-xs">Delivery Charge (৳)</Label>
                    <Input
                      id="deliveryCharge"
                      type="number"
                      value={deliveryCharge || ''}
                      onChange={(e) => setDeliveryCharge(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="prevDue" className="text-xs">Previous Due (৳)</Label>
                    <Input
                      id="prevDue"
                      type="number"
                      value={prevDue || ''}
                      onChange={(e) => setPrevDue(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="serviceFee" className="text-xs">Service Fee (৳) <span className="text-muted-foreground font-normal text-[10px]">— Optional</span></Label>
                  <Input
                    id="serviceFee"
                    type="number"
                    value={serviceFee || ''}
                    placeholder="0"
                    onChange={(e) => setServiceFee(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 items-end">
                  <div className="space-y-1 col-span-1">
                    <Label className="text-xs">Discount Type</Label>
                    <Select value={discountType} onValueChange={(val: any) => { setDiscountType(val); setDiscountValue(0); }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed" className="text-xs">Fixed (৳)</SelectItem>
                        <SelectItem value="percentage" className="text-xs">Percent (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">Discount Value</Label>
                    <Input
                      type="number"
                      value={discountValue || ''}
                      onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder={discountType === 'percentage' ? '%' : '৳'}
                      className="h-8 text-xs text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="cashIn" className="text-xs">Cash-in (Paid) (৳)</Label>
                    <Input
                      id="cashIn"
                      type="number"
                      value={cashIn || ''}
                      onChange={(e) => setCashIn(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="h-8 text-xs font-semibold text-emerald-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <div className="pt-1">
                      <Badge variant={calculatedStatus === 'Paid' ? 'default' : 'destructive'} className={calculatedStatus === 'Paid' ? 'bg-green-600 text-white border-none' : ''}>
                        {calculatedStatus}
                      </Badge>
                    </div>
                  </div>
                </div>

                {calculatedStatus === 'Due' && (
                  <div className="space-y-1">
                    <Label htmlFor="expectedReceivableDate" className="text-xs">Expected Receivable Date *</Label>
                    <Input
                      id="expectedReceivableDate"
                      type="date"
                      value={expectedReceivableDate}
                      onChange={(e) => setExpectedReceivableDate(e.target.value)}
                      required
                      className="h-8 text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Summary calculations view */}
              <div className="bg-muted/40 p-3 rounded-lg space-y-2 border h-fit text-xs">
                <h4 className="font-bold border-b pb-1 mb-1 text-sm">Bill Summary</h4>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">৳{subtotal.toLocaleString()}</span>
                </div>
                {deliveryCharge > 0 && (
                  <div className="flex justify-between">
                    <span>Delivery Charge:</span>
                    <span>+ ৳{deliveryCharge.toLocaleString()}</span>
                  </div>
                )}
                {serviceFee > 0 && (
                  <div className="flex justify-between">
                    <span>Service Fee:</span>
                    <span>+ ৳{serviceFee.toLocaleString()}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Discount {discountType === 'percentage' && `(${discountValue}%)`}:</span>
                    <span>- ৳{discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1 font-bold">
                  <span>Total Bill:</span>
                  <span>৳{total.toLocaleString()}</span>
                </div>
                {prevDue > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Previous Due:</span>
                    <span>+ ৳{prevDue.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1 font-bold text-sm text-primary">
                  <span>Grand Total:</span>
                  <span>৳{gTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-700 border-t pt-1">
                  <span>Cash-in:</span>
                  <span>৳{cashIn.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-bold text-sm text-destructive">
                  <span>Remaining Due:</span>
                  <span>৳{currentBillDue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={formLoading} className="font-bold">
                {formLoading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : (editingBill ? 'Update Bill' : 'Generate Bill')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product Selection Dialog */}
      <Dialog open={productPickerOpen} onOpenChange={setProductPickerOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Products</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-8 h-8 text-xs"
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
              />
            </div>
            <div className="border rounded-md overflow-hidden max-h-[50vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-xs">Select</TableHead>
                    <TableHead className="text-xs">Product</TableHead>
                    <TableHead className="text-xs">Options / Variants</TableHead>
                    <TableHead className="text-right text-xs">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products
                    .filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()))
                    .map((prod) => {
                      const hasVariants = prod.variants && prod.variants.length > 0;
                      return (
                        <TableRow key={prod._id}>
                          <TableCell>
                            {!hasVariants && (
                              <Checkbox
                                checked={selectedProductVariants[prod._id] === null}
                                onCheckedChange={() => toggleProductVariant(prod._id, null)}
                              />
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-xs">{prod.name}</TableCell>
                          <TableCell>
                            {hasVariants ? (
                              <div className="flex flex-wrap gap-1.5 py-1">
                                {prod.variants.map((v: any) => {
                                  const label = [v.color, v.size].filter(Boolean).join(' / ');
                                  const isSelected = selectedProductVariants[prod._id] === v._id;
                                  return (
                                    <Button
                                      key={v._id}
                                      type="button"
                                      variant={isSelected ? 'default' : 'outline'}
                                      size="sm"
                                      onClick={() => toggleProductVariant(prod._id, v._id)}
                                      className="text-[10px] py-0.5 px-2 h-6"
                                    >
                                      {label} (৳{v.salePrice || v.price})
                                    </Button>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Standard Item</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold">
                            {!hasVariants && `৳${prod.salePrice || prod.price}`}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-xs text-muted-foreground">{selectedCount} items selected</span>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={() => setProductPickerOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleAddSelectedProducts} className="bg-primary text-primary-foreground font-bold">Add Selected</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bill Detail View Dialog */}
      <Dialog open={!!selectedBill} onOpenChange={(open) => { if (!open) setSelectedBill(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedBill && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  Bill Invoice
                  <span className="text-primary font-black font-mono">#{selectedBill.invoiceNo}</span>
                  <Badge
                    variant={selectedBill.status === 'Paid' ? 'default' : 'destructive'}
                    className={`ml-auto text-[10px] ${selectedBill.status === 'Paid' ? 'bg-green-600 text-white border-none' : ''}`}
                  >
                    {selectedBill.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-2 text-xs">
                {/* Client + Bill Meta */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-muted/40 rounded-lg p-3 space-y-1.5 border">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Client Details</p>
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-semibold">{selectedBill.clientName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{selectedBill.clientPhone}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{selectedBill.clientAddress}</span>
                    </div>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3 space-y-1.5 border">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Bill Info</p>
                    <div className="flex items-center gap-2">
                      <Hash className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-mono font-bold">{selectedBill.invoiceNo}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{format(new Date(selectedBill.date), 'dd MMM yyyy, hh:mm a')}</span>
                    </div>
                    {selectedBill.expectedReceivableDate && (
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                        <span className="text-orange-600">Due by: {format(new Date(selectedBill.expectedReceivableDate), 'dd MMM yyyy')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Product / Order Items Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-primary px-3 py-2 flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 text-primary-foreground" />
                    <span className="text-xs font-bold text-primary-foreground">Order Items</span>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/60 border-b">
                        <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">#</th>
                        <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Product</th>
                        <th className="text-center px-3 py-1.5 font-semibold text-muted-foreground">Qty</th>
                        <th className="text-right px-3 py-1.5 font-semibold text-muted-foreground">Rate (৳)</th>
                        <th className="text-right px-3 py-1.5 font-semibold text-muted-foreground">Amount (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(selectedBill.items || []).map((item: any, idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                          <td className="px-3 py-1.5 text-muted-foreground">{idx + 1}</td>
                          <td className="px-3 py-1.5 font-medium">{item.name}</td>
                          <td className="px-3 py-1.5 text-center">{item.quantity}</td>
                          <td className="px-3 py-1.5 text-right">{Math.round(item.price).toLocaleString()}</td>
                          <td className="px-3 py-1.5 text-right font-semibold">{Math.round(item.price * item.quantity).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary */}
                <div className="bg-muted/30 border rounded-lg p-3 space-y-1.5 text-xs">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Financial Summary</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>৳{Math.round(selectedBill.subtotal || 0).toLocaleString()}</span>
                  </div>
                  {selectedBill.deliveryCharge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery Charge</span>
                      <span>+ ৳{Math.round(selectedBill.deliveryCharge).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedBill.serviceFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service Fee</span>
                      <span>+ ৳{Math.round(selectedBill.serviceFee).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedBill.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>
                        Discount
                        {selectedBill.discountType === 'percentage'
                          ? ` (${selectedBill.discountValue}%)`
                          : ''}
                      </span>
                      <span>- ৳{Math.round(selectedBill.discount).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1">
                    <span className="font-semibold">Total Bill</span>
                    <span className="font-semibold">৳{Math.round(selectedBill.total || 0).toLocaleString()}</span>
                  </div>
                  {selectedBill.prevDue > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Previous Due</span>
                      <span>+ ৳{Math.round(selectedBill.prevDue).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1">
                    <span className="font-bold text-sm">Grand Total</span>
                    <span className="font-bold text-sm text-primary">৳{Math.round(selectedBill.gTotal || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-green-700">
                    <span>Cash Received</span>
                    <span className="font-semibold">৳{Math.round(selectedBill.cashIn || 0).toLocaleString()}</span>
                  </div>
                  <div className={`flex justify-between border-t pt-1 font-bold text-sm ${
                    selectedBill.currentBillDue > 0 ? 'text-destructive' : 'text-green-600'
                  }`}>
                    <span>Remaining Due</span>
                    <span>৳{Math.round(selectedBill.currentBillDue || 0).toLocaleString()}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1">
                  <Button
                    className="flex-1 font-bold h-8 text-xs"
                    onClick={() => generateBillPDF(selectedBill, settings, 'download')}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" /> Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 font-bold h-8 text-xs"
                    onClick={() => generateBillPDF(selectedBill, settings, 'print')}
                  >
                    <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ClientBillsPage() {
  return (
    <Suspense fallback={<div className="flex h-32 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <ClientBillsContent />
    </Suspense>
  );
}

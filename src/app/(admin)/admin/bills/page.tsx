'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
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
  Check,
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
  Edit,
  History,
  Receipt,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { generateBillPDF, generatePaymentReceiptPDF } from '@/lib/bill-invoice-generator';
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
  description?: string;
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

  // Transaction history modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryBill, setSelectedHistoryBill] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any>(null);

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Form states
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [billItems, setBillItems] = useState<BillItemInput[]>([
    { name: '', description: '', quantity: 1, price: 0 }
  ]);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const [serviceFee, setServiceFee] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [prevDue, setPrevDue] = useState<number>(0);
  const [cashIn, setCashIn] = useState<number>(0);
  const [expectedReceivableDate, setExpectedReceivableDate] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [vatTaxIncluded, setVatTaxIncluded] = useState<boolean>(true);

  // Product multi-select state
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedProductVariants, setSelectedProductVariants] = useState<Record<string, string | null>>({});
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [inlineProductSearch, setInlineProductSearch] = useState('');
  const [showInlineSearchDropdown, setShowInlineSearchDropdown] = useState(false);

  // Phone validation
  const [phoneError, setPhoneError] = useState('');

  // Auto suggestion states
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeSuggestions, setActiveSuggestions] = useState<any[]>([]);
  const [showSuggestionsFor, setShowSuggestionsFor] = useState<'name' | 'email' | 'phone' | null>(null);

  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/suggest-clients');
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          setSuggestions(result.data || []);
        }
      }
    } catch (err) {
      console.error('Error fetching client suggestions:', err);
    }
  }, []);

  const handleNameChange = (val: string) => {
    setClientName(val);
    if (!val.trim()) {
      setActiveSuggestions([]);
      setShowSuggestionsFor(null);
      return;
    }
    const filtered = suggestions.filter(s =>
      s.name?.toLowerCase().includes(val.toLowerCase())
    );
    setActiveSuggestions(filtered);
    setShowSuggestionsFor('name');
  };

  const handlePhoneChange = (val: string) => {
    setClientPhone(val);
    if (phoneError) validatePhone(val);
    if (!val.trim()) {
      setActiveSuggestions([]);
      setShowSuggestionsFor(null);
      return;
    }
    const filtered = suggestions.filter(s =>
      s.phone?.includes(val)
    );
    setActiveSuggestions(filtered);
    setShowSuggestionsFor('phone');
  };

  const handleEmailChange = (val: string) => {
    setClientEmail(val);
    if (!val.trim()) {
      setActiveSuggestions([]);
      setShowSuggestionsFor(null);
      return;
    }
    const filtered = suggestions.filter(s =>
      s.email?.toLowerCase().includes(val.toLowerCase())
    );
    setActiveSuggestions(filtered);
    setShowSuggestionsFor('email');
  };

  const handleSelectSuggestion = (suggestion: any) => {
    setClientName(suggestion.name || '');
    setClientPhone(suggestion.phone || '');
    setClientEmail(suggestion.email || '');
    setClientAddress(suggestion.address || '');
    if (phoneError) setPhoneError('');
    setActiveSuggestions([]);
    setShowSuggestionsFor(null);
  };

  const fetchBills = useCallback(async () => {
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
  }, [statusFilter]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products?limit=100');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  }, []);

  useEffect(() => {
    fetchBills();
    fetchProducts();
    fetchSettings();
    fetchSuggestions();
  }, [fetchBills, fetchProducts, fetchSettings, fetchSuggestions]);

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
        newItems.push({ name: prod.name, description: '', price: prod.salePrice || prod.price || 0, quantity: 1 });
      } else {
        const variant = (prod.variants || []).find((v: any) => v._id === variantId);
        if (!variant) return;
        const label = [prod.name, variant.color, variant.size].filter(Boolean).join(' — ');
        newItems.push({ name: label, description: '', price: variant.salePrice || variant.price || 0, quantity: 1 });
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

  const handleAddProductDirect = (prod: any, variant?: any) => {
    let name = prod.name;
    let price = prod.salePrice || prod.price || 0;
    const description = prod.description || '';

    if (variant) {
      const vLabel = [variant.color, variant.size].filter(Boolean).join(' / ');
      if (vLabel) name = `${prod.name} (${vLabel})`;
      if (variant.salePrice || variant.price) {
        price = variant.salePrice || variant.price;
      }
    }

    const newItem: BillItemInput = {
      name,
      description,
      quantity: 1,
      price
    };

    if (billItems.length === 1 && !billItems[0].name.trim() && (billItems[0].price === 0 || !billItems[0].price)) {
      setBillItems([newItem]);
    } else {
      setBillItems(prev => [...prev, newItem]);
    }

    setInlineProductSearch('');
    setShowInlineSearchDropdown(false);
    toast.success(`Added "${name}"`);
  };

  const handleAddItemRow = () => {
    setBillItems([...billItems, { name: '', description: '', quantity: 1, price: 0 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (billItems.length === 1) {
      setBillItems([{ name: '', description: '', quantity: 1, price: 0 }]);
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
    } else if (field === 'description') {
      updated[index].description = value;
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
        clientEmail: clientEmail.trim() || undefined,
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
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        termsAndConditions: termsAndConditions.trim() || undefined,
        vatTaxIncluded: Boolean(vatTaxIncluded),
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
      fetchSuggestions();
    } catch (error: any) {
      toast.error(error.message || 'Error saving bill');
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setPhoneError('');
    setClientAddress('');
    setActiveSuggestions([]);
    setShowSuggestionsFor(null);
    setBillItems([{ name: '', description: '', quantity: 1, price: 0 }]);
    setDeliveryCharge(0);
    setServiceFee(0);
    setDiscountType('fixed');
    setDiscountValue(0);
    setPrevDue(0);
    setCashIn(0);
    setExpectedReceivableDate('');
    setExpectedDeliveryDate('');
    setTermsAndConditions('');
    setVatTaxIncluded(true);
    setSelectedProductVariants({});
    setProductSearchTerm('');
    setProductPickerOpen(false);
    setEditingBill(null);
  };

  const handleUpdateStatus = async (billId: string, currentDue: number) => {
    const { value: formValues } = await Swal.fire({
      title: 'Collect Payment',
      html: `
        <div style="text-align: left; font-size: 14px;">
          <label style="display:block; margin-bottom: 6px; font-weight: 600;">Amount Paid (৳):</label>
          <input id="swal-paid-amount" type="number" class="swal2-input" style="width: 100%; margin: 0 0 16px 0;" value="${currentDue}" min="1" />
          <label style="display:block; margin-bottom: 6px; font-weight: 600;">Payment Method / Deposit To:</label>
          <select id="swal-payment-method" class="swal2-select" style="width: 100%; margin: 0;">
            <option value="CASH">Cash in Hand (CASH)</option>
            <option value="BANK">Bank Account (BANK)</option>
          </select>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Record Payment',
      preConfirm: () => {
        const amountInput = (document.getElementById('swal-paid-amount') as HTMLInputElement)?.value;
        const methodSelect = (document.getElementById('swal-payment-method') as HTMLSelectElement)?.value || 'CASH';
        const num = Number(amountInput);
        if (!amountInput || isNaN(num) || num <= 0) {
          Swal.showValidationMessage('Please enter a valid positive amount');
          return false;
        }
        return { amount: num, accountCode: methodSelect };
      }
    });

    if (formValues) {
      try {
        const { amount, accountCode } = formValues;
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
            status: newStatus,
            accountCode
          })
        });

        if (!res.ok) throw new Error('Failed to update bill');
        toast.success('Payment updated successfully');
        fetchBills();
        if (selectedHistoryBill && selectedHistoryBill._id === billId) {
          handleOpenTransactionHistory({ ...bill, cashIn: newCashIn, currentBillDue: newDue, status: newStatus });
        }
      } catch (error) {
        toast.error('Failed to update payment');
      }
    }
  };

  const handleOpenTransactionHistory = async (bill: any) => {
    setSelectedHistoryBill(bill);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/bills/${bill._id}/transactions`);
      if (!res.ok) throw new Error('Failed to load transaction history');
      const data = await res.json();
      setHistoryData(data);
      if (data.bill) {
        setSelectedHistoryBill(data.bill);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading transaction history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDeleteBill = async (billId: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text:"You won't be able to revert this!",
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
    <div className="flex-1 space-y-4 md:space-y-6">
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
                                <Eye className="mr-2 h-4 w-4 text-indigo-600" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenTransactionHistory(bill)}>
                                <History className="mr-2 h-4 w-4 text-purple-600" /> Payment History
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingBill(bill);
                                  setClientName(bill.clientName);
                                  setClientPhone(bill.clientPhone);
                                  setClientEmail(bill.clientEmail || '');
                                  setClientAddress(bill.clientAddress);
                                  setBillItems(bill.items && bill.items.length > 0 ? bill.items : [{ name: '', description: '', quantity: 1, price: 0 }]);
                                  setDeliveryCharge(bill.deliveryCharge);
                                  setServiceFee(bill.serviceFee || 0);
                                  setDiscountType(bill.discountType || 'fixed');
                                  setDiscountValue(bill.discountValue || 0);
                                  setPrevDue(bill.prevDue || 0);
                                  setCashIn(bill.cashIn || 0);
                                  setExpectedReceivableDate(bill.expectedReceivableDate ? format(new Date(bill.expectedReceivableDate), 'yyyy-MM-dd') : '');
                                  setExpectedDeliveryDate(bill.expectedDeliveryDate ? format(new Date(bill.expectedDeliveryDate), 'yyyy-MM-dd') : '');
                                  setTermsAndConditions(bill.termsAndConditions || '');
                                  setVatTaxIncluded(bill.vatTaxIncluded !== undefined ? bill.vatTaxIncluded : true);
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
                        <DropdownMenuItem onClick={() => setSelectedBill(bill)}>
                          <Eye className="mr-2 h-4 w-4 text-indigo-600" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenTransactionHistory(bill)}>
                          <History className="mr-2 h-4 w-4 text-purple-600" /> Payment History
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingBill(bill);
                            setClientName(bill.clientName);
                            setClientPhone(bill.clientPhone);
                            setClientEmail(bill.clientEmail || '');
                            setClientAddress(bill.clientAddress);
                            setBillItems(bill.items && bill.items.length > 0 ? bill.items : [{ name: '', description: '', quantity: 1, price: 0 }]);
                            setDeliveryCharge(bill.deliveryCharge);
                            setServiceFee(bill.serviceFee || 0);
                            setDiscountType(bill.discountType || 'fixed');
                            setDiscountValue(bill.discountValue || 0);
                            setPrevDue(bill.prevDue || 0);
                            setCashIn(bill.cashIn || 0);
                            setExpectedReceivableDate(bill.expectedReceivableDate ? format(new Date(bill.expectedReceivableDate), 'yyyy-MM-dd') : '');
                            setExpectedDeliveryDate(bill.expectedDeliveryDate ? format(new Date(bill.expectedDeliveryDate), 'yyyy-MM-dd') : '');
                            setTermsAndConditions(bill.termsAndConditions || '');
                            setVatTaxIncluded(bill.vatTaxIncluded !== undefined ? bill.vatTaxIncluded : true);
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
            {/* Client Info with Auto Suggestion */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Client Name */}
              <div className="space-y-1 relative">
                <Label htmlFor="clientName" className="text-xs">Client Name *</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggestionsFor(null), 250)}
                  placeholder="e.g. Rahim Khan"
                  className="h-8 text-xs bg-background"
                  required
                  autoComplete="off"
                />
                {showSuggestionsFor === 'name' && activeSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-xl max-h-56 overflow-y-auto divide-y min-w-[240px]">
                    {activeSuggestions.map((s, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectSuggestion(s)}
                        className="p-2.5 text-xs hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                      >
                        <div className="font-bold">{s.name}</div>
                        <div className="text-muted-foreground text-[11px]">
                          {s.phone ? `Phone: ${s.phone}` : ''} {s.email ? `| Email: ${s.email}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Client Phone */}
              <div className="space-y-1 relative">
                <Label htmlFor="clientPhone" className="text-xs">Client Phone *</Label>
                <Input
                  id="clientPhone"
                  value={clientPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onBlur={(e) => {
                    validatePhone(e.target.value);
                    setTimeout(() => setShowSuggestionsFor(null), 250);
                  }}
                  placeholder="e.g. 01712345678"
                  className={`h-8 text-xs bg-background ${phoneError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  required
                  autoComplete="off"
                />
                {phoneError && <p className="text-[10px] text-destructive">{phoneError}</p>}
                {showSuggestionsFor === 'phone' && activeSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-xl max-h-56 overflow-y-auto divide-y min-w-[240px]">
                    {activeSuggestions.map((s, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectSuggestion(s)}
                        className="p-2.5 text-xs hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                      >
                        <div className="font-bold">{s.phone}</div>
                        <div className="text-muted-foreground text-[11px]">
                          {s.name} {s.email ? `| ${s.email}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Client Email */}
              <div className="space-y-1 relative">
                <Label htmlFor="clientEmail" className="text-xs">Client Email <span className="text-muted-foreground font-normal text-[10px]">— Optional</span></Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggestionsFor(null), 250)}
                  placeholder="e.g. client@example.com"
                  className="h-8 text-xs bg-background"
                  autoComplete="off"
                />
                {showSuggestionsFor === 'email' && activeSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-xl max-h-56 overflow-y-auto divide-y min-w-[240px]">
                    {activeSuggestions.map((s, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectSuggestion(s)}
                        className="p-2.5 text-xs hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                      >
                        <div className="font-bold">{s.email}</div>
                        <div className="text-muted-foreground text-[11px]">
                          {s.name} {s.phone ? `| ${s.phone}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Client Address */}
              <div className="space-y-1">
                <Label htmlFor="clientAddress" className="text-xs">Client Address *</Label>
                <Input
                  id="clientAddress"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="e.g. Nawabpur, Dhaka"
                  className="h-8 text-xs bg-background"
                  required
                />
              </div>
            </div>

            {/* Bill Items header & Smart Search */}
            <div className="space-y-2.5">
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

              {/* Smart Search & Add Product (Manual Order Style) */}
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search product by name or SKU to add..."
                    value={inlineProductSearch}
                    onChange={(e) => {
                      setInlineProductSearch(e.target.value);
                      setShowInlineSearchDropdown(true);
                    }}
                    onFocus={() => setShowInlineSearchDropdown(true)}
                    className="pl-8 h-8 text-xs bg-background"
                  />
                  {inlineProductSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setInlineProductSearch('');
                        setShowInlineSearchDropdown(false);
                      }}
                      className="absolute right-2 top-1.5 text-muted-foreground hover:text-foreground text-sm font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                {showInlineSearchDropdown && inlineProductSearch.trim() && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-popover text-popover-foreground border rounded-lg shadow-xl max-h-60 overflow-y-auto divide-y">
                    {products.filter(p =>
                      p.name?.toLowerCase().includes(inlineProductSearch.toLowerCase()) ||
                      p.sku?.toLowerCase().includes(inlineProductSearch.toLowerCase())
                    ).length === 0 ? (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        No products found matching &quot;{inlineProductSearch}&quot;
                      </div>
                    ) : (
                      products.filter(p =>
                        p.name?.toLowerCase().includes(inlineProductSearch.toLowerCase()) ||
                        p.sku?.toLowerCase().includes(inlineProductSearch.toLowerCase())
                      ).map((prod) => (
                        <div
                          key={prod._id}
                          className="p-2.5 hover:bg-accent/60 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-xs text-foreground truncate">{prod.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {prod.sku ? `SKU: ${prod.sku}` : ''} {prod.stock !== undefined ? `| Stock: ${prod.stock}` : ''}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-bold text-primary block">৳{prod.salePrice || prod.price || 0}</span>
                              {(!prod.variants || prod.variants.length === 0) && (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => {
                                    handleAddProductDirect(prod);
                                    setInlineProductSearch('');
                                    setShowInlineSearchDropdown(false);
                                  }}
                                  className="h-6 text-[10px] px-2 mt-1 bg-primary text-primary-foreground font-bold"
                                >
                                  <Plus className="h-3 w-3 mr-0.5" /> Add
                                </Button>
                              )}
                            </div>
                          </div>

                          {prod.variants && prod.variants.length > 0 && (
                            <div className="mt-2 pt-1.5 border-t border-border/40 flex flex-wrap gap-1 items-center">
                              <span className="text-[10px] text-muted-foreground mr-1">Variants:</span>
                              {prod.variants.map((v: any) => {
                                const vLabel = [v.color, v.size].filter(Boolean).join(' / ') || 'Option';
                                const vPrice = v.salePrice || v.price || prod.salePrice || prod.price || 0;
                                return (
                                  <Button
                                    key={v._id}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      handleAddProductDirect(prod, v);
                                      setInlineProductSearch('');
                                      setShowInlineSearchDropdown(false);
                                    }}
                                    className="h-6 text-[10px] px-2 hover:bg-primary hover:text-primary-foreground"
                                  >
                                    <Plus className="h-2.5 w-2.5 mr-0.5" />
                                    {vLabel} (৳{vPrice})
                                  </Button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {billItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center bg-muted/20 p-1.5 rounded-md border">
                    <div className="flex-1 space-y-1">
                      <Input
                        placeholder="Title"
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        className="h-8 text-xs font-medium"
                        required
                      />
                      <Input
                        placeholder="Description (Optional)"
                        value={item.description || ''}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="h-7 text-[11px] text-muted-foreground"
                      />
                    </div>
                    <div className="w-16">
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="h-8 text-xs text-center"
                        min="1"
                        required
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        placeholder="Rate"
                        value={item.price || ''}
                        onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                        className="h-8 text-xs text-right"
                        min="0"
                        required
                      />
                    </div>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
                  {calculatedStatus === 'Due' ? (
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
                  ) : <div />}
                  <div className={`flex items-center space-x-2 ${calculatedStatus === 'Due' ? 'pt-4' : 'pt-2'}`}>
                    <Checkbox
                      id="vatTaxIncluded"
                      checked={vatTaxIncluded}
                      onCheckedChange={(checked) => setVatTaxIncluded(checked === true)}
                    />
                    <Label htmlFor="vatTaxIncluded" className="text-xs font-medium leading-none cursor-pointer">
                      VAT &amp; Tax Included
                    </Label>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="space-y-1">
                    <Label htmlFor="expectedDeliveryDate" className="text-xs">Expected Delivery Date <span className="text-muted-foreground font-normal text-[10px]">— Optional</span></Label>
                    <Input
                      id="expectedDeliveryDate"
                      type="date"
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="termsAndConditions" className="text-xs">Terms &amp; Conditions <span className="text-muted-foreground font-normal text-[10px]">— Optional</span></Label>
                    <textarea
                      id="termsAndConditions"
                      placeholder="Enter terms and conditions (optional)..."
                      value={termsAndConditions}
                      onChange={(e) => setTermsAndConditions(e.target.value)}
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>
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

      {/* Product Selection Dialog - Card System (Fits inside modal) */}
      <Dialog open={productPickerOpen} onOpenChange={setProductPickerOpen}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span>Select Products</span>
              <span className="text-xs font-normal text-muted-foreground">
                {products.length} products available
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 space-y-3 flex-1 overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by title or SKU..."
                className="pl-9 h-9 text-xs"
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
              />
            </div>

            {/* Product Cards List - Fits 100% inside modal without horizontal scroll */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
              {products
                .filter(p =>
                  p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                  p.sku?.toLowerCase().includes(productSearchTerm.toLowerCase())
                )
                .length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs border rounded-lg bg-muted/10">
                  <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60 stroke-1" />
                  No products found matching &quot;{productSearchTerm}&quot;
                </div>
              ) : (
                products
                  .filter(p =>
                    p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                    p.sku?.toLowerCase().includes(productSearchTerm.toLowerCase())
                  )
                  .map((prod) => {
                    const hasVariants = prod.variants && prod.variants.length > 0;
                    const isBaseSelected = selectedProductVariants[prod._id] === null;
                    const selectedVariantId = selectedProductVariants[prod._id];
                    const isCardActive = isBaseSelected || (hasVariants && selectedVariantId);

                    return (
                      <div
                        key={prod._id}
                        className={`p-3 rounded-lg border transition-all text-xs ${
                          isCardActive
                            ? 'border-primary/60 bg-primary/5 shadow-xs'
                            : 'border-border bg-card hover:border-primary/30 hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground text-sm leading-tight break-words">
                              {prod.name}
                            </h4>
                            <div className="flex items-center gap-2 text-muted-foreground text-xs">
                              {prod.sku && <span>SKU: {prod.sku}</span>}
                              <span>Base Rate:</span>
                              <span className="font-bold text-foreground">৳{Math.round(prod.salePrice || prod.price || 0).toLocaleString()}</span>
                            </div>
                          </div>

                          {!hasVariants && (
                            <Button
                              type="button"
                              size="sm"
                              variant={isBaseSelected ? 'default' : 'outline'}
                              onClick={() => toggleProductVariant(prod._id, null)}
                              className={`h-8 text-xs font-semibold shrink-0 sm:self-center ${
                                isBaseSelected ? 'bg-primary text-primary-foreground' : ''
                              }`}
                            >
                              {isBaseSelected ? (
                                <>
                                  <Check className="h-3.5 w-3.5 mr-1" /> Selected
                                </>
                              ) : (
                                <>
                                  <Plus className="h-3.5 w-3.5 mr-1" /> Select (৳{Math.round(prod.salePrice || prod.price || 0)})
                                </>
                              )}
                            </Button>
                          )}
                        </div>

                        {hasVariants && (
                          <div className="mt-2.5 pt-2 border-t border-border/50">
                            <span className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                              Available Variants:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {prod.variants.map((v: any) => {
                                const variantSelected = selectedVariantId === v._id;
                                const label = [v.color, v.size].filter(Boolean).join(' / ') || 'Option';
                                const price = Math.round(v.salePrice || v.price || prod.salePrice || prod.price || 0);

                                return (
                                  <Button
                                    key={v._id}
                                    type="button"
                                    variant={variantSelected ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => toggleProductVariant(prod._id, v._id)}
                                    className={`h-7 text-xs px-2.5 font-medium transition-all ${
                                      variantSelected
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'bg-background hover:bg-muted text-foreground'
                                    }`}
                                  >
                                    {variantSelected && <Check className="h-3 w-3 mr-1" />}
                                    <span>{label}</span>
                                    <span className="ml-1.5 font-bold opacity-90">৳{price.toLocaleString()}</span>
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>

            {/* Bottom Footer Actions */}
            <div className="flex items-center justify-between border-t pt-3 mt-1">
              <span className="text-xs font-medium text-muted-foreground">
                <span className="font-bold text-foreground">{selectedCount}</span> item{selectedCount === 1 ? '' : 's'} selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setProductPickerOpen(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddSelectedProducts}
                  disabled={selectedCount === 0}
                  className="h-8 text-xs font-bold bg-primary text-primary-foreground"
                >
                  Add Selected ({selectedCount})
                </Button>
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
                    {selectedBill.expectedDeliveryDate && (
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                        <span className="text-teal-700">Delivery by: {format(new Date(selectedBill.expectedDeliveryDate), 'dd MMM yyyy')}</span>
                      </div>
                    )}
                    <div className="text-[11px] text-muted-foreground pt-0.5">
                      VAT &amp; Tax: <span className="font-semibold">{selectedBill.vatTaxIncluded !== false ? 'Included' : 'Excluded'}</span>
                    </div>
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
                          <td className="px-3 py-1.5 text-muted-foreground align-top">{idx + 1}</td>
                          <td className="px-3 py-1.5 align-top">
                            <div className="font-medium">{item.name}</div>
                            {item.description && (
                              <div className="text-[10px] text-muted-foreground mt-0.5 whitespace-pre-wrap">{item.description}</div>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-center align-top">{item.quantity}</td>
                          <td className="px-3 py-1.5 text-right align-top">{Math.round(item.price).toLocaleString()}</td>
                          <td className="px-3 py-1.5 text-right font-semibold align-top">{Math.round(item.price * item.quantity).toLocaleString()}</td>
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

                {selectedBill.termsAndConditions && (
                  <div className="bg-muted/20 border rounded-lg p-3 space-y-1 text-xs">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Terms &amp; Conditions</p>
                    <div className="text-muted-foreground whitespace-pre-wrap italic">{selectedBill.termsAndConditions}</div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1 font-bold h-8 text-xs text-purple-700 border-purple-200 hover:bg-purple-50"
                    onClick={() => {
                      setSelectedBill(null);
                      handleOpenTransactionHistory(selectedBill);
                    }}
                  >
                    <History className="h-3.5 w-3.5 mr-1.5" /> Payment History
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 font-bold h-8 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    onClick={() => generatePaymentReceiptPDF(selectedBill, settings)}
                  >
                    <Printer className="h-3.5 w-3.5 mr-1.5" /> Receipt
                  </Button>
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

      {/* ── Bill Payment & Transaction History Modal ── */}
      <Dialog open={historyModalOpen} onOpenChange={(open) => { setHistoryModalOpen(open); if (!open) { setHistoryData(null); setSelectedHistoryBill(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <History className="h-5 w-5 text-purple-600" />
              Payment & Transaction History
              {selectedHistoryBill && (
                <Badge variant="outline" className="font-mono text-sm bg-purple-50 text-purple-700 border-purple-200">
                  #{selectedHistoryBill.invoiceNo}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {historyLoading ? (
            <div className="flex flex-col items-center justify-center py-14 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <p className="text-sm text-muted-foreground">Loading transaction records...</p>
            </div>
          ) : selectedHistoryBill && (
            <div className="space-y-5 pt-1">
              {/* Client & Bill Info Card */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-4 rounded-xl border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-bold text-base">{selectedHistoryBill.clientName}</span>
                    <Badge variant={selectedHistoryBill.status === 'Paid' ? 'default' : 'destructive'} className={selectedHistoryBill.status === 'Paid' ? 'bg-green-600 text-white border-none' : ''}>
                      {selectedHistoryBill.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {selectedHistoryBill.clientPhone}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Bill Date: {format(new Date(selectedHistoryBill.date), 'dd MMM yyyy')}</span>
                  </div>
                </div>

                {selectedHistoryBill.status === 'Due' && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white font-bold"
                    onClick={() => {
                      handleUpdateStatus(selectedHistoryBill._id, selectedHistoryBill.currentBillDue);
                      setHistoryModalOpen(false);
                    }}
                  >
                    <CreditCard className="h-4 w-4 mr-1.5" /> Collect Next Payment
                  </Button>
                )}
              </div>

              {/* Financial Metrics Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg border bg-card space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Grand Total</p>
                  <p className="text-lg font-black text-foreground">৳{Math.round(selectedHistoryBill.gTotal || 0).toLocaleString()}</p>
                </div>
                <div className="p-3.5 rounded-lg border border-green-200 bg-green-50/50 dark:bg-green-950/20 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">Total Paid (Cash-in)</p>
                  <p className="text-lg font-black text-green-600">৳{Math.round(selectedHistoryBill.cashIn || 0).toLocaleString()}</p>
                </div>
                <div className={`p-3.5 rounded-lg border space-y-1 ${selectedHistoryBill.currentBillDue > 0 ? 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/20' : 'border-muted bg-muted/20'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${selectedHistoryBill.currentBillDue > 0 ? 'text-orange-700 dark:text-orange-400' : 'text-muted-foreground'}`}>Remaining Due</p>
                  <p className={`text-lg font-black ${selectedHistoryBill.currentBillDue > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>৳{Math.round(selectedHistoryBill.currentBillDue || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Payment Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Payment Progress</span>
                  <span className="font-bold text-primary">
                    {Math.min(100, Math.round(((selectedHistoryBill.cashIn || 0) / (selectedHistoryBill.gTotal || 1)) * 100))}%
                    {selectedHistoryBill.currentBillDue <= 0 ? ' (Fully Paid)' : ''}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-green-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, Math.round(((selectedHistoryBill.cashIn || 0) / (selectedHistoryBill.gTotal || 1)) * 100)))}%` }}
                  />
                </div>
              </div>

              {/* Installments Breakdown List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-purple-600" />
                    Payment Installments ({historyData?.installments?.length || 0})
                  </h4>
                  <span className="text-xs text-muted-foreground">Step-by-step transaction logs</span>
                </div>

                {(!historyData?.installments || historyData.installments.length === 0) ? (
                  <div className="text-center py-8 border rounded-lg bg-muted/20 text-muted-foreground text-sm">
                    No payment transactions recorded for this bill yet.
                  </div>
                ) : (
                  <div className="border rounded-xl divide-y overflow-hidden bg-card">
                    {historyData.installments.map((inst: any, idx: number) => (
                      <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            #{inst.installmentNo}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-foreground">{inst.description || `Payment Step #${inst.installmentNo}`}</span>
                              {idx === 0 && (
                                <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border-green-200 py-0 font-bold">
                                  Latest
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-[11px] bg-muted/50 py-0">
                                {inst.method || 'Cash'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                              <Clock className="h-3 w-3" />
                              <span>{format(new Date(inst.date), 'dd MMM yyyy, hh:mm a')}</span>
                              <span>•</span>
                              <span>Remaining Due: <strong className={inst.remainingDueAfter > 0 ? 'text-orange-600' : 'text-green-600'}>৳{Math.round(inst.remainingDueAfter).toLocaleString()}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-base font-black text-green-600">
                              + ৳{Math.round(inst.amount).toLocaleString()}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Total paid so far: ৳{Math.round(inst.cumulativePaid).toLocaleString()}
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-bold text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                            onClick={() => {
                              const chronologicalPayments = historyData?.installments
                                ? [...historyData.installments]
                                    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                    .map((i: any) => ({ _id: i.txId, amount: i.amount, date: i.date }))
                                : [];

                              generatePaymentReceiptPDF(
                                {
                                  ...selectedHistoryBill,
                                  payments: chronologicalPayments
                                },
                                settings,
                                inst.amount,
                                inst.date,
                                inst.txId,
                                false
                              );
                            }}
                            title="Print receipt for this installment"
                          >
                            <Printer className="h-3.5 w-3.5 mr-1" /> Receipt
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="flex justify-between items-center sm:justify-between pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => setHistoryModalOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedBill(selectedHistoryBill);
                    setHistoryModalOpen(false);
                  }}
                >
                  <Eye className="h-4 w-4 mr-1.5" /> View Full Bill
                </Button>
              </DialogFooter>
            </div>
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

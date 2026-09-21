'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Trash, Search, User, Phone, MapPin, Calendar, Download, RefreshCw, Loader2, ClipboardCheck, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

const resolveTrustedImage = (imagePath?: string): string | null => {
  if (!imagePath) return null;
  if (imagePath.startsWith('/') && !imagePath.startsWith('//')) {
    return imagePath;
  }
  try {
    const url = new URL(imagePath);
    const hostname = url.hostname;
    if (
      hostname === 'localhost' || 
      hostname === '127.0.0.1' || 
      hostname.endsWith('cloudinary.com') ||
      hostname.endsWith('amazonaws.com') ||
      hostname.endsWith('vercel.app')
    ) {
      return imagePath;
    }
  } catch (e) {
    // Ignore invalid url format
  }
  return null;
};

function AbandonedCartsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentPage, setCurrentPage] = useState(Math.max(1, parseInt(searchParams.get('page') || '1')));
  const [carts, setCarts] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFilter, setDateFilter] = useState({
    from: '',
    to: '',
  });

  // Manual Order states
  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);
  const [manualOrderLoading, setManualOrderLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<any[]>([]);
  const [manualCustomer, setManualCustomer] = useState({
    fullName: '',
    phone: '',
    email: '',
    street: '',
    city: '',
    state: '',
    division: '',
    zipCode: '',
    country: 'Bangladesh'
  });
  const [manualItems, setManualItems] = useState<any[]>([]);
  const [manualDeliveryCharge, setManualDeliveryCharge] = useState(120);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [manualPaymentMethod, setManualPaymentMethod] = useState('COD');
  const [manualPaymentStatus, setManualPaymentStatus] = useState('Pending');
  const [manualStatus, setManualStatus] = useState('Order Placed');
  const [manualInternalNote, setManualInternalNote] = useState('');
  const [currentConfirmingCartId, setCurrentConfirmingCartId] = useState<string | null>(null);
  const [confirmedCartIds, setConfirmedCartIds] = useState<string[]>([]);

  // Debounce product search inside manual order dialog
  useEffect(() => {
    if (!productSearch.trim()) {
      setProductSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(productSearch)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setProductSearchResults(data.products || []);
        }
      } catch (err) {
        console.error('Error searching products:', err);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [productSearch]);

  const handleAddProductToManualOrder = (product: any) => {
    const colors = Array.from(new Set(product.variants?.map((v: any) => v.color).filter(Boolean))) as string[];
    const sizes = Array.from(new Set(product.variants?.map((v: any) => v.size).filter(Boolean))) as string[];

    const defaultColor = colors[0] || '';
    const defaultSize = sizes[0] || '';

    let defaultPrice = product.salePrice || product.price;
    let defaultStock = product.stock || 0;

    if (product.variants && product.variants.length > 0) {
      const matchedVariant = product.variants.find(
        (v: any) =>
          (!defaultColor || v.color === defaultColor) &&
          (!defaultSize || v.size === defaultSize)
      );
      if (matchedVariant) {
        defaultPrice = matchedVariant.salePrice || matchedVariant.price || defaultPrice;
        defaultStock = matchedVariant.stock !== undefined ? matchedVariant.stock : defaultStock;
      }
    }

    const existingIndex = manualItems.findIndex(
      (item) =>
        item.product === product._id &&
        item.color === defaultColor &&
        item.size === defaultSize
    );

    if (existingIndex > -1) {
      const updated = [...manualItems];
      if (updated[existingIndex].quantity < defaultStock) {
        updated[existingIndex].quantity += 1;
        setManualItems(updated);
        toast.success(`Incremented quantity for ${product.name}`);
      } else {
        toast.error(`Cannot exceed available stock (${defaultStock})`);
      }
    } else {
      setManualItems(prev => [
        ...prev,
        {
          product: product._id,
          name: product.name,
          image: product.images?.[0] || '',
          quantity: 1,
          price: defaultPrice,
          color: defaultColor,
          size: defaultSize,
          stock: defaultStock,
          colorsList: colors,
          sizesList: sizes,
          allVariants: product.variants || []
        }
      ]);
      toast.success(`Added ${product.name} to order`);
    }

    setProductSearch('');
    setProductSearchResults([]);
  };

  const handleUpdateManualItem = (index: number, fields: Partial<any>) => {
    setManualItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], ...fields };

      if (fields.hasOwnProperty('color') || fields.hasOwnProperty('size')) {
        const variant = item.allVariants?.find(
          (v: any) =>
            (!item.color || v.color === item.color) &&
            (!item.size || v.size === item.size)
        );
        if (variant) {
          item.price = variant.salePrice || variant.price || item.price;
          item.stock = variant.stock !== undefined ? variant.stock : item.stock;
          if (item.quantity > item.stock) {
            item.quantity = Math.max(1, item.stock);
          }
        }
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleRemoveManualItem = (index: number) => {
    setManualItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualItems.length === 0) {
      toast.error('Please add at least one product.');
      return;
    }

    setManualOrderLoading(true);
    try {
      // Normalize Bangla digits to English digits and sanitize phone
      const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      let normalizedPhone = manualCustomer.phone || '';
      for (let i = 0; i < 10; i++) {
        normalizedPhone = normalizedPhone.replace(new RegExp(banglaDigits[i], 'g'), englishDigits[i]);
      }
      let cleanedPhone = normalizedPhone.replace(/[^0-9]/g, '');

      // Remove country prefixes (88, +88, 0088) if present
      if (cleanedPhone.startsWith('88')) {
        cleanedPhone = cleanedPhone.substring(2);
      } else if (cleanedPhone.startsWith('0088')) {
        cleanedPhone = cleanedPhone.substring(4);
      }

      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingAddress: {
            ...manualCustomer,
            phone: cleanedPhone || manualCustomer.phone,
            email: manualCustomer.email || `${cleanedPhone || Date.now()}@elyjen-guest.com`
          },
          items: manualItems.map(item => ({
            product: item.product,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            image: item.image,
            color: item.color || undefined,
            size: item.size || undefined
          })),
          paymentMethod: manualPaymentMethod,
          paymentStatus: manualPaymentStatus,
          status: manualStatus,
          deliveryCharge: Number(manualDeliveryCharge) || 0,
          couponDiscountAmount: Number(manualDiscount) || 0,
          internalNote: manualInternalNote
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Manual order created successfully!');
        if (currentConfirmingCartId) {
          setConfirmedCartIds(prev => [...prev, currentConfirmingCartId]);
        }
        setIsManualOrderOpen(false);
        setCurrentConfirmingCartId(null);
        setManualCustomer({
          fullName: '',
          phone: '',
          email: '',
          street: '',
          city: '',
          state: '',
          division: '',
          zipCode: '',
          country: 'Bangladesh'
        });
        setManualItems([]);
        setManualDeliveryCharge(120);
        setManualDiscount(0);
        setManualPaymentMethod('COD');
        setManualPaymentStatus('Pending');
        setManualStatus('Order Placed');
        setManualInternalNote('');
      } else {
        toast.error(data.message || 'Failed to create order');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error creating manual order');
    } finally {
      setManualOrderLoading(false);
    }
  };

  const openManualOrderWithCart = async (cart: any) => {
    // Set customer details
    setManualCustomer({
      fullName: cart.fullName || '',
      phone: cart.phone || '',
      email: cart.email || '',
      street: cart.street || '',
      city: cart.city || '',
      state: cart.state || '',
      division: cart.division || '',
      zipCode: cart.zipCode || '',
      country: cart.country || 'Bangladesh'
    });

    setManualDeliveryCharge(cart.deliveryArea === 'inside' ? 60 : 120); // Or whatever default charging rule is appropriate.
    setManualDiscount(0);
    setManualPaymentMethod('COD');
    setManualPaymentStatus('Pending');
    setManualStatus('Order Placed');
    setManualInternalNote(`Order created from Abandoned Cart ID: ${cart._id}`);

    // Map items. We need variants lists (colorsList, sizesList) for select boxes.
    // Let's fetch products details for each item to populate variants info.
    const populatedItems = await Promise.all(cart.items.map(async (item: any) => {
      try {
        // Find product by id (item.product is product ID)
        // Let's search using the API or /api/products/[slug] or a general product fetching method.
        // If not found, fallback to simple mapping.
        const res = await fetch(`/api/products?search=${encodeURIComponent(item.name)}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          const foundProduct = data.products?.find((p: any) => p._id === item.product || p.name === item.name);
          if (foundProduct) {
            const colors = Array.from(new Set(foundProduct.variants?.map((v: any) => v.color).filter(Boolean))) as string[];
            const sizes = Array.from(new Set(foundProduct.variants?.map((v: any) => v.size).filter(Boolean))) as string[];
            return {
              product: foundProduct._id,
              name: item.name,
              image: item.image || foundProduct.images?.[0] || '',
              quantity: item.quantity,
              price: item.price,
              color: item.color || colors[0] || '',
              size: item.size || sizes[0] || '',
              stock: foundProduct.stock || 100,
              colorsList: colors,
              sizesList: sizes,
              allVariants: foundProduct.variants || []
            };
          }
        }
      } catch (e) {
        console.error('Error fetching product variant list', e);
      }
      return {
        product: item.product,
        name: item.name,
        image: item.image || '',
        quantity: item.quantity,
        price: item.price,
        color: item.color || '',
        size: item.size || '',
        stock: 100,
        colorsList: item.color ? [item.color] : [],
        sizesList: item.size ? [item.size] : [],
        allVariants: []
      };
    }));

    setCurrentConfirmingCartId(cart._id);
    setManualItems(populatedItems);
    setIsManualOrderOpen(true);
  };

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset page to 1 when filters or search change
  useEffect(() => {
    if (currentPage > 1) {
      setCurrentPage(1);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('page');
      router.push(`/admin/abandoned-carts?${params.toString()}`);
    }
  }, [debouncedSearch, dateFilter.from, dateFilter.to]); // eslint-disable-line react-hooks/exhaustive-deps

  // Synchronize URL page param with state
  useEffect(() => {
    const pageFromParams = Math.max(1, parseInt(searchParams.get('page') || '1'));
    if (pageFromParams !== currentPage) {
      setCurrentPage(pageFromParams);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCarts = async (pageVal = currentPage) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pageVal.toString(),
        limit: '20',
        search: debouncedSearch,
        from: dateFilter.from,
        to: dateFilter.to
      });

      const res = await fetch(`/api/cart/abandoned?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch abandoned carts');
      const data = await res.json();
      
      setCarts(data.carts || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load abandoned carts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarts(currentPage);
  }, [currentPage, debouncedSearch, dateFilter.from, dateFilter.to]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams.toString());
    if (page > 1) {
      params.set('page', page.toString());
    } else {
      params.delete('page');
    }
    router.push(`/admin/abandoned-carts?${params.toString()}`);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Remove Abandoned Cart?',
      text: 'Are you sure you want to delete this abandoned cart session?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/cart/abandoned?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Abandoned cart removed');
        fetchCarts(currentPage);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to delete abandoned cart');
      }
    } catch (error) {
      toast.error('Failed to delete abandoned cart');
    }
  };

  const exportToCSV = async () => {
    try {
      toast.info('Preparing data for export...');
      const queryParams = new URLSearchParams({
        limit: 'all',
        search: debouncedSearch,
        from: dateFilter.from,
        to: dateFilter.to
      });

      const res = await fetch(`/api/cart/abandoned?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch data for export');
      const data = await res.json();
      const allCarts = data.carts || [];

      if (allCarts.length === 0) {
        toast.error('No abandoned carts to export');
        return;
      }

      const headers = [
        'Cart ID',
        'Date',
        'Customer Name',
        'Phone',
        'Email',
        'Address',
        'Area',
        'Items List',
        'Total Amount'
      ];

      const rows = allCarts.map((c: any) => {
        const itemsText = c.items.map((i: any) => {
          const variantDesc = [i.color, i.size].filter(Boolean).join('/');
          return `• ${i.quantity} x ${i.name}${variantDesc ? ` [${variantDesc}]` : ''} (@৳${i.price})`;
        }).join('\n');

        return [
          c._id.toUpperCase(),
          format(new Date(c.createdAt), 'yyyy-MM-dd HH:mm'),
          c.fullName,
          c.phone,
          c.email || 'N/A',
          c.street || 'N/A',
          c.deliveryArea === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka',
          itemsText,
          c.totalAmount
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map((row: any) => row.map((cell: any) => {
          let val = String(cell ?? '');
          if (val.startsWith('=') || val.startsWith('+') || val.startsWith('-') || val.startsWith('@')) {
            val = `'` + val;
          }
          return `"${val.replace(/"/g, '""')}"`;
        }).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `abandoned_carts_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Excel/CSV export completed');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export data');
    }
  };

  return (
    <div className="space-y-6 p-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Abandoned Carts</h1>
          <p className="text-muted-foreground text-sm">
            Track visitors who filled checkout info but left without completing order.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchCarts(currentPage)} className="h-9">
            <RefreshCw className="mr-2 h-4 w-4" /> Reload
          </Button>
          <Button variant="default" size="sm" onClick={exportToCSV} className="h-9 bg-primary text-primary-foreground hover:bg-primary/95">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Date Filters & Search */}
      <Card className="bg-card/50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5 col-span-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">From Date</label>
              <Input
                type="date"
                value={dateFilter.from}
                onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">To Date</label>
              <Input
                type="date"
                value={dateFilter.to}
                onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                className="h-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cart Sessions</CardTitle>
          <CardDescription>
            Showing {carts.length} of {totalCount} active abandoned cart sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center items-center text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Loading abandoned carts...
            </div>
          ) : carts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No abandoned carts found.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer Details</TableHead>
                      <TableHead>Cart Items</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carts.map((cart) => (
                      <TableRow key={cart._id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="max-w-[250px] align-top">
                          <div className="space-y-1">
                            <div className="font-semibold text-foreground flex items-center gap-1.5 w-full min-w-0">
                              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[120px] block" title={cart.fullName}>{cart.fullName}</span>
                              {confirmedCartIds.includes(cart._id) ? (
                                <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 border border-green-200 cursor-not-allowed shrink-0 select-none">
                                  <ClipboardCheck className="h-3 w-3" />
                                  Confirmed
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openManualOrderWithCart(cart)}
                                  className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all cursor-pointer shrink-0"
                                  title="Create manual order with customer details"
                                >
                                  <ClipboardCheck className="h-3 w-3" />
                                  Confirm
                                </button>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <a href={`tel:${cart.phone}`} className="hover:underline text-primary font-medium">
                                {cart.phone}
                              </a>
                            </div>
                            {cart.email && (
                              <div className="text-xs text-muted-foreground truncate ml-5">
                                {cart.email}
                              </div>
                            )}
                            {cart.street && (
                              <div className="text-xs text-muted-foreground flex items-start gap-1 mt-1 max-w-[220px] whitespace-normal">
                                <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                                <span>
                                  {cart.street} {cart.deliveryArea && `(${cart.deliveryArea === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka'})`}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px] align-top">
                          <div className="space-y-2">
                            {cart.items.map((item: any, idx: number) => {
                              const trustedImage = resolveTrustedImage(item.image);
                              return (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  {trustedImage && (
                                    <img
                                      src={trustedImage}
                                      alt={item.name}
                                      className="h-8 w-8 object-cover rounded bg-muted shrink-0"
                                    />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-foreground truncate">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {item.color && `Color: ${item.color} `}
                                      {item.size && `Size: ${item.size} `}
                                      Qty: {item.quantity} × ৳{item.price}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-primary align-top">
                          ৳{Math.round(cart.totalAmount)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground align-top">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>{format(new Date(cart.createdAt), 'dd MMM yyyy, hh:mm a')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right align-top">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(cart._id)}
                            className="hover:text-destructive hover:bg-destructive/10"
                            aria-label="Delete abandoned cart"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Component */}
              <div className="flex items-center justify-end">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  baseUrl="/admin/abandoned-carts"
                  query={{
                    search: debouncedSearch,
                    from: dateFilter.from,
                    to: dateFilter.to
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isManualOrderOpen} onOpenChange={setIsManualOrderOpen}>
        <DialogContent className="max-w-4xl sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-logo text-primary">Create Manual Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateManualOrder} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Customer Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm border-b pb-1 text-primary">Customer & Delivery Info</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="custName" className="text-xs">Full Name *</Label>
                    <Input
                      id="custName"
                      value={manualCustomer.fullName}
                      onChange={(e) => setManualCustomer(prev => ({ ...prev, fullName: e.target.value }))}
                      required
                      placeholder="John Doe"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="custPhone" className="text-xs">Phone *</Label>
                    <Input
                      id="custPhone"
                      value={manualCustomer.phone}
                      onChange={(e) => setManualCustomer(prev => ({ ...prev, phone: e.target.value }))}
                      required
                      placeholder="01712345678"
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="custStreet" className="text-xs">Street Address *</Label>
                  <Input
                    id="custStreet"
                    value={manualCustomer.street}
                    onChange={(e) => setManualCustomer(prev => ({ ...prev, street: e.target.value }))}
                    required
                    placeholder="123 Road, Area Name"
                    className="h-9"
                  />
                </div>

                <h3 className="font-semibold text-sm border-b pb-1 pt-2 text-primary">Payment & Order Settings</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Payment Method</Label>
                    <Select value={manualPaymentMethod} onValueChange={(val) => setManualPaymentMethod(val || '')}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COD" className="text-xs">COD</SelectItem>
                        <SelectItem value="Online" className="text-xs">Online</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Payment Status</Label>
                    <Select value={manualPaymentStatus} onValueChange={(val) => setManualPaymentStatus(val || '')}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending" className="text-xs">Pending</SelectItem>
                        <SelectItem value="Paid" className="text-xs">Paid</SelectItem>
                        <SelectItem value="Failed" className="text-xs">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Order Status</Label>
                    <Select value={manualStatus} onValueChange={(val) => setManualStatus(val || '')}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Order Placed" className="text-xs">Placed</SelectItem>
                        <SelectItem value="Confirmed" className="text-xs">Confirmed</SelectItem>
                        <SelectItem value="Paid" className="text-xs">Paid</SelectItem>
                        <SelectItem value="Hold" className="text-xs">Hold</SelectItem>
                        <SelectItem value="Ready for Delivery" className="text-xs">Ready</SelectItem>
                        <SelectItem value="Released for Delivery" className="text-xs">Released</SelectItem>
                        <SelectItem value="Delivered" className="text-xs">Delivered</SelectItem>
                        <SelectItem value="Cancelled" className="text-xs">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="delCharge" className="text-xs">Delivery Charge (৳)</Label>
                    <Input
                      id="delCharge"
                      type="number"
                      value={manualDeliveryCharge}
                      onChange={(e) => setManualDeliveryCharge(parseFloat(e.target.value) || 0)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="discountAmt" className="text-xs">Discount Amount (৳)</Label>
                    <Input
                      id="discountAmt"
                      type="number"
                      value={manualDiscount}
                      onChange={(e) => setManualDiscount(parseFloat(e.target.value) || 0)}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="manualNote" className="text-xs">Internal Note</Label>
                  <Input
                    id="manualNote"
                    value={manualInternalNote}
                    onChange={(e) => setManualInternalNote(e.target.value)}
                    placeholder="e.g. Customer requested urgent delivery"
                    className="h-9"
                  />
                </div>
              </div>

              {/* Right Column: Products */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm border-b pb-1 text-primary">Products & Pricing</h3>
                
                <div className="relative">
                  <Label className="text-xs">Search & Add Product</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search product by name or SKU..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                  
                  {productSearchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-950 border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {productSearchResults.map((prod) => (
                        <button
                          key={prod._id}
                          type="button"
                          onClick={() => handleAddProductToManualOrder(prod)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-zinc-900 border-b last:border-0 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-medium">{prod.name}</span>
                            <span className="text-[11px] text-muted-foreground ml-2">SKU: {prod.sku}</span>
                          </div>
                          <span className="text-primary font-bold">৳{prod.salePrice || prod.price}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {manualItems.length === 0 ? (
                    <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground text-sm">
                      No products added yet. Use the search bar above to add products.
                    </div>
                  ) : (
                    manualItems.map((item, idx) => (
                      <div key={idx} className="p-3 border rounded-lg space-y-3 bg-slate-50/50 dark:bg-zinc-900/30">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {item.image && (
                              <img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded border" />
                            )}
                            <div>
                              <p className="font-semibold text-sm leading-tight">{item.name}</p>
                              <span className="text-[10px] text-muted-foreground">Stock: {item.stock}</span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveManualItem(idx)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px]">Color</Label>
                            {item.colorsList?.length > 0 ? (
                              <Select
                                value={item.color}
                                onValueChange={(val) => handleUpdateManualItem(idx, { color: val })}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {item.colorsList.map((col: string) => (
                                    <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-[10px] text-muted-foreground block py-1">-</span>
                            )}
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px]">Size</Label>
                            {item.sizesList?.length > 0 ? (
                              <Select
                                value={item.size}
                                onValueChange={(val) => handleUpdateManualItem(idx, { size: val })}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {item.sizesList.map((sz: string) => (
                                    <SelectItem key={sz} value={sz} className="text-xs">{sz}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-[10px] text-muted-foreground block py-1">-</span>
                            )}
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px]">Price (৳)</Label>
                            <Input
                              type="number"
                              value={item.price}
                              onChange={(e) => handleUpdateManualItem(idx, { price: parseFloat(e.target.value) || 0 })}
                              className="h-7 text-xs px-1.5"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px]">Qty</Label>
                            <Input
                              type="number"
                              min="1"
                              max={item.stock}
                              value={item.quantity}
                              onChange={(e) => {
                                const qty = parseInt(e.target.value) || 1;
                                handleUpdateManualItem(idx, { quantity: Math.min(qty, item.stock) });
                              }}
                              className="h-7 text-xs px-1.5"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span>৳{manualItems.reduce((acc, i) => acc + (i.price * i.quantity), 0)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery Charge:</span>
                    <span>+ ৳{manualDeliveryCharge}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount:</span>
                    <span>- ৳{manualDiscount}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white pt-1.5 border-t">
                    <span>Grand Total:</span>
                    <span>৳{Math.max(0, manualItems.reduce((acc, i) => acc + (i.price * i.quantity), 0) + manualDeliveryCharge - manualDiscount)}</span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setIsManualOrderOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={manualOrderLoading} className="bg-primary text-primary-foreground">
                {manualOrderLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AbandonedCartsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <AbandonedCartsContent />
    </Suspense>
  );
}

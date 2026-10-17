/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Search, Trash2, Loader2, Plus, ShoppingBag } from 'lucide-react';
import { normalizePhoneNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { toast } from 'sonner';

interface StatusOption {
  value: string;
  label: string;
}

interface ManualOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  allowedStatuses?: StatusOption[];
}

const DEFAULT_STATUSES: StatusOption[] = [
  { value: 'Order Placed', label: 'Order Placed' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Hold', label: 'Hold' },
  { value: 'Ready for Delivery', label: 'Ready for Delivery' },
  { value: 'Released for Delivery', label: 'Released for Delivery' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Cancelled', label: 'Cancelled' },
];

function generateGuestEmail(phone: string) {
  const domain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_GUEST_EMAIL_DOMAIN || 'guest.com';
  return `${phone || Date.now()}@${domain}`;
}

export default function ManualOrderDialog({
  open,
  onOpenChange,
  onCreated,
  allowedStatuses = DEFAULT_STATUSES,
}: ManualOrderDialogProps) {
  const [manualOrderLoading, setManualOrderLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<any[]>([]);
  const [manualCustomer, setManualCustomer] = useState({
    fullName: '',
    phone: '',
    email: '',
    street: '',
    city: 'Dhaka',
    state: '',
    division: 'Dhaka',
    zipCode: '1200',
    country: 'Bangladesh',
  });
  const [manualItems, setManualItems] = useState<any[]>([]);
  const [manualDeliveryCharge, setManualDeliveryCharge] = useState(120);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [manualPaymentMethod, setManualPaymentMethod] = useState('COD');
  const [manualPaymentStatus, setManualPaymentStatus] = useState('Pending');
  const [manualStatus, setManualStatus] = useState('Order Placed');
  const [manualInternalNote, setManualInternalNote] = useState('');

  // Debounce product search inside manual order dialog
  useEffect(() => {
    if (!productSearch.trim()) {
      const delayClear = setTimeout(() => {
        setProductSearchResults([]);
      }, 0);
      return () => clearTimeout(delayClear);
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(productSearch.trim())}&limit=10`);
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

    let defaultColor = '';
    let defaultSize = '';
    let defaultPrice = product.salePrice || product.price || 0;
    let defaultStock = product.stock || 0;

    if (product.variants && product.variants.length > 0) {
      const defaultVariant = product.variants[0];
      defaultColor = defaultVariant.color || '';
      defaultSize = defaultVariant.size || '';
      defaultPrice = defaultVariant.salePrice || defaultVariant.price || defaultPrice;
      defaultStock = defaultVariant.stock !== undefined ? defaultVariant.stock : defaultStock;
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
      setManualItems((prev) => [
        ...prev,
        {
          product: product._id,
          name: product.name,
          image: product.images?.[0] || '',
          quantity: defaultStock <= 0 ? 0 : 1,
          price: defaultPrice,
          color: defaultColor,
          size: defaultSize,
          stock: defaultStock,
          colorsList: colors,
          sizesList: sizes,
          allVariants: product.variants || [],
        },
      ]);
      toast.success(`Added ${product.name} to order`);
    }

    setProductSearch('');
    setProductSearchResults([]);
  };

  const handleUpdateManualItem = (index: number, fields: Partial<any>) => {
    setManualItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], ...fields };

      if (Object.prototype.hasOwnProperty.call(fields, 'color') || Object.prototype.hasOwnProperty.call(fields, 'size')) {
        const variant = item.allVariants?.find(
          (v: any) =>
            (!item.color || v.color === item.color) &&
            (!item.size || v.size === item.size)
        );
        if (variant) {
          item.price = variant.salePrice || variant.price || item.price;
          item.stock = variant.stock !== undefined ? variant.stock : item.stock;
          if (item.quantity > item.stock) {
            item.quantity = Math.max(0, item.stock);
          }
        }
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleRemoveManualItem = (index: number) => {
    setManualItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCustomer.fullName.trim()) {
      toast.error('Customer name is required.');
      return;
    }
    if (!manualCustomer.phone.trim()) {
      toast.error('Customer phone number is required.');
      return;
    }
    if (!manualCustomer.street.trim()) {
      toast.error('Customer street/delivery address is required.');
      return;
    }
    if (manualItems.length === 0) {
      toast.error('Please add at least one product.');
      return;
    }

    setManualOrderLoading(true);
    try {
      const cleanedPhone = normalizePhoneNumber(manualCustomer.phone) || manualCustomer.phone.trim();

      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingAddress: {
            ...manualCustomer,
            fullName: manualCustomer.fullName.trim(),
            phone: cleanedPhone,
            street: manualCustomer.street.trim(),
            email: manualCustomer.email?.trim() || generateGuestEmail(cleanedPhone),
          },
          items: manualItems.map((item) => ({
            product: item.product,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            image: item.image,
            color: item.color || undefined,
            size: item.size || undefined,
          })),
          paymentMethod: manualPaymentMethod,
          paymentStatus: manualPaymentStatus,
          status: manualStatus,
          deliveryCharge: Number(manualDeliveryCharge) || 0,
          couponDiscountAmount: Number(manualDiscount) || 0,
          internalNote: manualInternalNote.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Manual order created successfully!');
        onOpenChange(false);
        setManualCustomer({
          fullName: '',
          phone: '',
          email: '',
          street: '',
          city: 'Dhaka',
          state: '',
          division: 'Dhaka',
          zipCode: '1200',
          country: 'Bangladesh',
        });
        setManualItems([]);
        setManualDeliveryCharge(120);
        setManualDiscount(0);
        setManualInternalNote('');
        onCreated();
      } else {
        toast.error(data.message || 'Failed to create manual order');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error creating manual order');
    } finally {
      setManualOrderLoading(false);
    }
  };

  const subtotal = manualItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const grandTotal = Math.max(0, subtotal + Number(manualDeliveryCharge || 0) - Number(manualDiscount || 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
            <Plus className="h-5 w-5" /> Create Manual Order
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleCreateManualOrder} className="space-y-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Customer & Delivery Info + Settings */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-primary mb-3">Customer &amp; Delivery Info</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Full Name *</Label>
                      <Input
                        placeholder="John Doe"
                        value={manualCustomer.fullName}
                        onChange={(e) => setManualCustomer({ ...manualCustomer, fullName: e.target.value })}
                        required
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Phone *</Label>
                      <Input
                        placeholder="01712345678"
                        value={manualCustomer.phone}
                        onChange={(e) => setManualCustomer({ ...manualCustomer, phone: e.target.value })}
                        required
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Street Address *</Label>
                    <Input
                      placeholder="House, Road, Area Name"
                      value={manualCustomer.street}
                      onChange={(e) => setManualCustomer({ ...manualCustomer, street: e.target.value })}
                      required
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">City / District</Label>
                      <Input
                        placeholder="Dhaka"
                        value={manualCustomer.city}
                        onChange={(e) => setManualCustomer({ ...manualCustomer, city: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Division</Label>
                      <Input
                        placeholder="Dhaka"
                        value={manualCustomer.division}
                        onChange={(e) => setManualCustomer({ ...manualCustomer, division: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t space-y-3">
                <h3 className="text-sm font-bold text-primary">Payment &amp; Order Settings</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Payment Method</Label>
                    <Select value={manualPaymentMethod} onValueChange={(val) => val && setManualPaymentMethod(val)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COD" className="text-xs">COD</SelectItem>
                        <SelectItem value="bKash" className="text-xs">bKash</SelectItem>
                        <SelectItem value="Nagad" className="text-xs">Nagad</SelectItem>
                        <SelectItem value="Bank" className="text-xs">Bank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Payment Status</Label>
                    <Select value={manualPaymentStatus} onValueChange={(val) => val && setManualPaymentStatus(val)}>
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
                    <Label className="text-xs font-semibold">Order Status</Label>
                    <Select value={manualStatus} onValueChange={(val) => val && setManualStatus(val)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedStatuses.map((st) => (
                          <SelectItem key={st.value} value={st.value} className="text-xs">
                            {st.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Delivery Charge (৳)</Label>
                    <Input
                      type="number"
                      value={manualDeliveryCharge}
                      onChange={(e) => setManualDeliveryCharge(parseFloat(e.target.value) || 0)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Discount Amount (৳)</Label>
                    <Input
                      type="number"
                      value={manualDiscount}
                      onChange={(e) => setManualDiscount(parseFloat(e.target.value) || 0)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Internal Note</Label>
                  <Input
                    placeholder="e.g. Customer requested urgent delivery"
                    value={manualInternalNote}
                    onChange={(e) => setManualInternalNote(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Products & Pricing */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-primary">Products &amp; Pricing</h3>

              {/* Product Search Input */}
              <div className="relative">
                <Label className="text-xs font-semibold block mb-1">Search &amp; Add Product</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search product by name or SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>

                {productSearchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {productSearchResults.map((prod) => (
                      <button
                        key={prod._id}
                        type="button"
                        onClick={() => handleAddProductToManualOrder(prod)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-muted border-b last:border-0 flex items-center justify-between transition-colors"
                      >
                        <div className="truncate mr-2">
                          <span className="font-semibold block truncate">{prod.name}</span>
                          <span className="text-[10px] text-muted-foreground">SKU: {prod.sku || 'N/A'} | Stock: {prod.stock || 0}</span>
                        </div>
                        <span className="text-primary font-bold shrink-0">৳{prod.salePrice || prod.price}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {manualItems.length === 0 ? (
                  <div className="text-center py-10 border border-dashed rounded-xl text-muted-foreground text-xs flex flex-col items-center justify-center gap-1.5 bg-muted/20">
                    <ShoppingBag className="h-6 w-6 opacity-40" />
                    <span>No products added yet. Use the search bar above to add products.</span>
                  </div>
                ) : (
                  manualItems.map((item, idx) => (
                    <div key={idx} className="p-2.5 border rounded-xl space-y-2.5 bg-card shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          {item.image ? (
                            <Image src={item.image} alt={item.name} width={36} height={36} className="w-9 h-9 object-cover rounded-md border shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center text-[10px] text-muted-foreground shrink-0">No img</div>
                          )}
                          <div className="overflow-hidden">
                            <p className="font-semibold text-xs leading-tight truncate">{item.name}</p>
                            <span className="text-[10px] text-muted-foreground">Available Stock: {item.stock}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveManualItem(idx)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-medium text-muted-foreground">Color</Label>
                          {item.colorsList?.length > 0 ? (
                            <Select
                              value={item.color}
                              onValueChange={(val) => handleUpdateManualItem(idx, { color: val })}
                            >
                              <SelectTrigger className="h-7 text-[11px] px-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {item.colorsList.map((col: string) => (
                                  <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-[11px] text-muted-foreground block py-1">-</span>
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-medium text-muted-foreground">Size</Label>
                          {item.sizesList?.length > 0 ? (
                            <Select
                              value={item.size}
                              onValueChange={(val) => handleUpdateManualItem(idx, { size: val })}
                            >
                              <SelectTrigger className="h-7 text-[11px] px-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {item.sizesList.map((sz: string) => (
                                  <SelectItem key={sz} value={sz} className="text-xs">{sz}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-[11px] text-muted-foreground block py-1">-</span>
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-medium text-muted-foreground">Price (৳)</Label>
                          <Input
                            type="number"
                            value={item.price}
                            onChange={(e) => handleUpdateManualItem(idx, { price: parseFloat(e.target.value) || 0 })}
                            className="h-7 text-xs px-2"
                          />
                        </div>

                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-medium text-muted-foreground">Qty</Label>
                          <Input
                            type="number"
                            min="1"
                            max={item.stock}
                            value={item.quantity}
                            onChange={(e) => {
                              const qty = parseInt(e.target.value) || 1;
                              handleUpdateManualItem(idx, { quantity: Math.min(qty, item.stock) });
                            }}
                            className="h-7 text-xs px-2"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pricing Summary */}
              <div className="pt-3 border-t space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>৳{subtotal}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery Charge:</span>
                  <span>+ ৳{manualDeliveryCharge}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount:</span>
                  <span>- ৳{manualDiscount}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-foreground pt-2 border-t">
                  <span>Grand Total:</span>
                  <span className="text-primary text-base">৳{grandTotal}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={manualOrderLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={manualOrderLoading} className="bg-primary text-primary-foreground font-bold">
              {manualOrderLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

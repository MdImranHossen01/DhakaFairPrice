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

interface ResellerManualOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const RESELLER_STATUSES = [
  { value: 'Order Placed', label: 'Order Placed' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Hold', label: 'Hold' },
];

export default function ResellerManualOrderDialog({
  open,
  onOpenChange,
  onCreated,
}: ResellerManualOrderDialogProps) {
  const [manualOrderLoading, setManualOrderLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<any[]>([]);
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    street: '',
    city: 'Dhaka',
    division: 'Dhaka',
    zipCode: '1200',
  });
  const [manualItems, setManualItems] = useState<any[]>([]);
  const [deliveryCharge, setDeliveryCharge] = useState(120);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [paymentStatus, setPaymentStatus] = useState('Pending');
  const [orderStatus, setOrderStatus] = useState('Order Placed');
  const [internalNote, setInternalNote] = useState('');

  // Debounce product search
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
        console.error('Error searching products for reseller:', err);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [productSearch]);

  const handleAddProduct = (product: any) => {
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
        item.productId === product._id &&
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
          productId: product._id,
          name: product.name,
          image: product.images?.[0] || '',
          quantity: defaultStock <= 0 ? 0 : 1,
          price: defaultPrice,
          purchasePrice: product.purchasePrice || 0,
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

  const handleUpdateItem = (index: number, fields: Partial<any>) => {
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

  const handleRemoveItem = (index: number) => {
    setManualItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer.name.trim()) {
      toast.error('Customer name is required.');
      return;
    }
    if (!customer.phone.trim()) {
      toast.error('Customer phone number is required.');
      return;
    }
    if (!customer.street.trim()) {
      toast.error('Customer street/delivery address is required.');
      return;
    }
    if (manualItems.length === 0) {
      toast.error('Please add at least one product.');
      return;
    }

    setManualOrderLoading(true);
    try {
      const cleanedPhone = normalizePhoneNumber(customer.phone) || customer.phone.trim();

      const res = await fetch('/api/reseller/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            name: customer.name.trim(),
            phone: cleanedPhone,
            email: customer.email?.trim() || `${cleanedPhone}@${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'guest.com'}`,
            address: {
              street: customer.street.trim(),
              city: customer.city.trim() || 'Dhaka',
              division: customer.division.trim() || 'Dhaka',
              zipCode: customer.zipCode.trim() || '1200',
            },
          },
          items: manualItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            purchasePrice: item.purchasePrice,
            image: item.image,
            color: item.color || undefined,
            size: item.size || undefined,
          })),
          deliveryCharge: Number(deliveryCharge) || 0,
          couponDiscount: Number(discount) || 0,
          paymentMethod,
          paymentStatus,
          status: orderStatus,
          internalNote: internalNote.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Manual order placed successfully!');
        onOpenChange(false);
        setCustomer({
          name: '',
          phone: '',
          email: '',
          street: '',
          city: 'Dhaka',
          division: 'Dhaka',
          zipCode: '1200',
        });
        setManualItems([]);
        setDeliveryCharge(120);
        setDiscount(0);
        setInternalNote('');
        onCreated();
      } else {
        toast.error(data.error || data.message || 'Failed to place manual order');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error creating order');
    } finally {
      setManualOrderLoading(false);
    }
  };

  const subtotal = manualItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const grandTotal = Math.max(0, subtotal + Number(deliveryCharge || 0) - Number(discount || 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
            <Plus className="h-5 w-5" /> Create Manual Order (Reseller)
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleCreateOrder} className="space-y-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Customer & Delivery Info */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-primary mb-3">Customer &amp; Delivery Info</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Full Name *</Label>
                      <Input
                        placeholder="Customer Name"
                        value={customer.name}
                        onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                        required
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Phone *</Label>
                      <Input
                        placeholder="01712345678"
                        value={customer.phone}
                        onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                        required
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Street Address *</Label>
                    <Input
                      placeholder="House, Road, Area Details"
                      value={customer.street}
                      onChange={(e) => setCustomer({ ...customer, street: e.target.value })}
                      required
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">City / District</Label>
                      <Input
                        placeholder="Dhaka"
                        value={customer.city}
                        onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Division</Label>
                      <Input
                        placeholder="Dhaka"
                        value={customer.division}
                        onChange={(e) => setCustomer({ ...customer, division: e.target.value })}
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
                    <Select value={paymentMethod} onValueChange={(val) => val && setPaymentMethod(val)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COD" className="text-xs">COD (Cash On Delivery)</SelectItem>
                        <SelectItem value="bKash" className="text-xs">bKash</SelectItem>
                        <SelectItem value="Nagad" className="text-xs">Nagad</SelectItem>
                        <SelectItem value="Bank" className="text-xs">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Payment Status</Label>
                    <Select value={paymentStatus} onValueChange={(val) => val && setPaymentStatus(val)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending" className="text-xs">Pending</SelectItem>
                        <SelectItem value="Paid" className="text-xs">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Order Status</Label>
                    <Select value={orderStatus} onValueChange={(val) => val && setOrderStatus(val)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESELLER_STATUSES.map((st) => (
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
                      value={deliveryCharge}
                      onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Discount Amount (৳)</Label>
                    <Input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Internal Note</Label>
                  <Input
                    placeholder="e.g. Customer order via WhatsApp, urgent deliver"
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Products & Pricing */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-primary">Products &amp; Pricing</h3>

              {/* Product Search */}
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
                        onClick={() => handleAddProduct(prod)}
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
                          onClick={() => handleRemoveItem(idx)}
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
                              onValueChange={(val) => handleUpdateItem(idx, { color: val })}
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
                              onValueChange={(val) => handleUpdateItem(idx, { size: val })}
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
                            onChange={(e) => handleUpdateItem(idx, { price: parseFloat(e.target.value) || 0 })}
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
                              handleUpdateItem(idx, { quantity: Math.min(qty, item.stock) });
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
                  <span>+ ৳{deliveryCharge}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount:</span>
                  <span>- ৳{discount}</span>
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

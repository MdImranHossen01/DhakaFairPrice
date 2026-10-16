'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  Loader2, Mail, Phone, MapPin, CreditCard, Calendar, Truck, 
  Printer, ExternalLink, Edit, X, MessageSquare, Lock, Tag, Trash2
} from 'lucide-react';
import { format, isValid } from 'date-fns';
import { toast } from 'sonner';
import Image from 'next/image';
import Swal from 'sweetalert2';

interface ResellerOrderDetailsDialogProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export default function ResellerOrderDetailsDialog({
  orderId,
  open,
  onOpenChange,
  onUpdate = () => {}
}: ResellerOrderDetailsDialogProps) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fraudData, setFraudData] = useState<any>(null);
  const [fraudLoading, setFraudLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  // Settings & Courier Selection States
  const [settings, setSettings] = useState<any>(null);
  const [selectedCourier, setSelectedCourier] = useState<'steadfast' | 'pathao' | 'redx'>('steadfast');
  const [cityId, setCityId] = useState('1');
  const [zoneId, setZoneId] = useState('1');
  const [areaId, setAreaId] = useState('');
  const [itemWeight, setItemWeight] = useState('0.5');
  const [shippingNote, setShippingNote] = useState('');

  // Pathao Locations
  const [pathaoStores, setPathaoStores] = useState<any[]>([]);
  const [storeId, setStoreId] = useState('');
  const [pathaoCities, setPathaoCities] = useState<any[]>([]);
  const [pathaoZones, setPathaoZones] = useState<any[]>([]);
  const [pathaoAreas, setPathaoAreas] = useState<any[]>([]);
  const [loadingPathaoLocations, setLoadingPathaoLocations] = useState(false);

  // RedX Areas
  const [redxAreas, setRedxAreas] = useState<any[]>([]);
  const [loadingRedxAreas, setLoadingRedxAreas] = useState(false);
  const [redxSearch, setRedxSearch] = useState('');

  const isSteadfastConfigured = Boolean(settings?.courierConfig?.steadfast?.apiKey && settings?.courierConfig?.steadfast?.secretKey);
  const isPathaoConfigured = Boolean(settings?.courierConfig?.pathao?.clientId && settings?.courierConfig?.pathao?.clientSecret);
  const isRedxConfigured = Boolean(settings?.courierConfig?.redx?.apiKey);
  const hasAnyCourier = isSteadfastConfigured || isPathaoConfigured || isRedxConfigured;

  // Auto-select first configured courier
  useEffect(() => {
    if (settings?.courierConfig) {
      if (isSteadfastConfigured && selectedCourier === 'steadfast') return;
      if (isPathaoConfigured && selectedCourier === 'pathao') return;
      if (isRedxConfigured && selectedCourier === 'redx') return;

      if (isSteadfastConfigured) setSelectedCourier('steadfast');
      else if (isPathaoConfigured) setSelectedCourier('pathao');
      else if (isRedxConfigured) setSelectedCourier('redx');
    }
  }, [settings, isSteadfastConfigured, isPathaoConfigured, isRedxConfigured]);

  // Load RedX areas when RedX is selected
  useEffect(() => {
    if (open && selectedCourier === 'redx' && isRedxConfigured) {
      if (redxAreas.length === 0) {
        setLoadingRedxAreas(true);
        const postCode = order?.customer?.address?.zipCode?.trim() || order?.shippingAddress?.zipCode?.trim() || '';
        const url = postCode ? `/api/admin/courier/redx?post_code=${encodeURIComponent(postCode)}` : '/api/admin/courier/redx';
        fetch(url)
          .then(res => res.json())
          .then(data => {
            if (data.areas && Array.isArray(data.areas) && data.areas.length > 0) {
              setRedxAreas(data.areas);
              const rawCity = (order?.customer?.address?.city || order?.shippingAddress?.city || '').toLowerCase();
              const matched = data.areas.find((a: any) => 
                (postCode && String(a.post_code) === postCode) ||
                (a.name && a.name.toLowerCase().includes(rawCity)) ||
                (a.district_name && a.district_name.toLowerCase().includes(rawCity))
              );
              if (matched) {
                setAreaId(String(matched.id));
              } else {
                setAreaId(String(data.areas[0].id));
              }
            } else {
              fetch('/api/admin/courier/redx')
                .then(r => r.json())
                .then(d => {
                  if (d.areas && Array.isArray(d.areas)) {
                    setRedxAreas(d.areas);
                    if (d.areas.length > 0) setAreaId(String(d.areas[0].id));
                  }
                })
                .catch(console.error);
            }
          })
          .catch(err => console.error('Failed to load RedX areas:', err))
          .finally(() => setLoadingRedxAreas(false));
      }
    }
  }, [open, selectedCourier, isRedxConfigured, redxAreas.length, order?.customer?.address?.zipCode, order?.customer?.address?.city]);

  // Load Pathao stores and cities when Pathao is selected
  useEffect(() => {
    if (open && selectedCourier === 'pathao' && isPathaoConfigured) {
      if (pathaoStores.length === 0) {
        fetch('/api/admin/courier/pathao?action=stores')
          .then(res => res.json())
          .then(data => {
            if (data.stores && Array.isArray(data.stores) && data.stores.length > 0) {
              setPathaoStores(data.stores);
              setStoreId(String(data.stores[0].store_id));
            }
          })
          .catch(console.error);
      }

      if (pathaoCities.length === 0) {
        setLoadingPathaoLocations(true);
        fetch('/api/admin/courier/pathao?action=cities')
          .then(res => res.json())
          .then(data => {
            if (data.cities && Array.isArray(data.cities)) {
              setPathaoCities(data.cities);
              const rawCity = (order?.customer?.address?.city || order?.customer?.address?.division || order?.shippingAddress?.city || '').toLowerCase();
              const matched = data.cities.find((c: any) => 
                c.city_name.toLowerCase().includes(rawCity) ||
                (rawCity && rawCity.includes(c.city_name.toLowerCase()))
              );
              if (matched) {
                setCityId(String(matched.city_id));
              } else if (data.cities.length > 0 && !cityId) {
                setCityId(String(data.cities[0].city_id));
              }
            }
          })
          .catch(err => console.error('Failed to load Pathao cities:', err))
          .finally(() => setLoadingPathaoLocations(false));
      }
    }
  }, [open, selectedCourier, isPathaoConfigured, pathaoStores.length, pathaoCities.length, order?.customer?.address?.city, order?.customer?.address?.division]);

  // Load Pathao zones when cityId changes
  useEffect(() => {
    if (selectedCourier === 'pathao' && isPathaoConfigured && cityId) {
      fetch(`/api/admin/courier/pathao?action=zones&city_id=${cityId}`)
        .then(res => res.json())
        .then(data => {
          if (data.zones && Array.isArray(data.zones)) {
            setPathaoZones(data.zones);
            const rawZone = (order?.customer?.address?.division || order?.customer?.address?.street || '').toLowerCase();
            const matchedZone = data.zones.find((z: any) =>
              rawZone.includes(z.zone_name.toLowerCase()) || z.zone_name.toLowerCase().includes(rawZone)
            );
            if (matchedZone) {
              setZoneId(String(matchedZone.zone_id));
            } else if (data.zones.length > 0) {
              setZoneId(String(data.zones[0].zone_id));
            } else {
              setZoneId('');
            }
          } else {
            setPathaoZones([]);
            setZoneId('');
          }
        })
        .catch(err => console.error('Failed to load Pathao zones:', err));
    }
  }, [selectedCourier, isPathaoConfigured, cityId, order?.customer?.address?.division, order?.customer?.address?.street]);

  // Load Pathao areas when zoneId changes
  useEffect(() => {
    if (selectedCourier === 'pathao' && isPathaoConfigured && zoneId) {
      fetch(`/api/admin/courier/pathao?action=areas&zone_id=${zoneId}`)
        .then(res => res.json())
        .then(data => {
          if (data.areas && Array.isArray(data.areas)) {
            setPathaoAreas(data.areas);
            if (data.areas.length > 0) {
              setAreaId(String(data.areas[0].area_id));
            } else {
              setAreaId('');
            }
          } else {
            setPathaoAreas([]);
            setAreaId('');
          }
        })
        .catch(err => console.error('Failed to load Pathao areas:', err));
    }
  }, [selectedCourier, isPathaoConfigured, zoneId]);

  const fetchFraudData = async (phone: string) => {
    setFraudLoading(true);
    try {
      const res = await fetch(`/api/admin/courier/fraud-check?phone=${phone}`);
      if (res.ok) {
        const json = await res.json();
        setFraudData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFraudLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      try {
        const [orderRes, settingsRes] = await Promise.all([
          fetch(`/api/reseller/orders/${orderId}`, { signal: controller.signal }),
          fetch(`/api/settings`, { signal: controller.signal })
        ]);

        if (!orderRes.ok) {
          const errData = await orderRes.json().catch(() => ({}));
          toast.error(errData.message || `Failed to load order`);
          return;
        }

        const orderData = await orderRes.json();
        setOrder(orderData);

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json().catch(() => null);
          setSettings(settingsData);
        }
        
        setEditForm({
          customer: {
            name: orderData.customer?.name || '',
            phone: orderData.customer?.phone || '',
            email: orderData.customer?.email || '',
            address: {
              street: orderData.customer?.address?.street || '',
              city: orderData.customer?.address?.city || '',
              division: orderData.customer?.address?.division || '',
              zipCode: orderData.customer?.address?.zipCode || '',
            }
          },
          internalNote: orderData.internalNote || '',
          customerNote: orderData.customerNote || '',
          status: orderData.status || 'Order Placed',
          paymentStatus: orderData.paymentStatus || 'Pending',
        });

        if (orderData?.customer?.phone) {
          fetchFraudData(orderData.customer.phone);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Fetch error:', error);
          toast.error('Error loading data');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    if (open && orderId) {
      fetchData();
    } else {
      setOrder(null);
      setFraudData(null);
      setFraudLoading(false);
      setIsEditing(false);
      setEditForm(null);
    }

    return () => controller.abort();
  }, [open, orderId]);

  const handleSaveChanges = async () => {
    if (!editForm || !editForm.customer) return;

    if (!editForm.customer.name || !editForm.customer.phone || !editForm.customer.address?.street) {
      toast.error('Customer name, phone, and street address are required');
      return;
    }

    if (editForm.status === 'Hold' && !editForm.internalNote?.trim()) {
      toast.error('Please provide a reason for holding this order');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/reseller/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        toast.success('Order details updated successfully');
        setIsEditing(false);
        onUpdate();
        const updateRes = await fetch(`/api/reseller/orders/${orderId}`);
        if (updateRes.ok) {
          const updatedData = await updateRes.json();
          setOrder(updatedData);
          setEditForm({
            customer: {
              name: updatedData.customer?.name || '',
              phone: updatedData.customer?.phone || '',
              email: updatedData.customer?.email || '',
              address: {
                street: updatedData.customer?.address?.street || '',
                city: updatedData.customer?.address?.city || '',
                division: updatedData.customer?.address?.division || '',
                zipCode: updatedData.customer?.address?.zipCode || '',
              }
            },
            internalNote: updatedData.internalNote || '',
            customerNote: updatedData.customerNote || '',
            status: updatedData.status || 'Order Placed',
            paymentStatus: updatedData.paymentStatus || 'Pending',
          });
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.message || 'Failed to update order');
      }
    } catch (error) {
      toast.error('Network error occurred while saving changes');
    } finally {
      setLoading(false);
    }
  };

  const handleLocalPrint = (type: 'invoice' | 'sticker') => {
    if (!order) return;
    const qs = `?id=${order._id}&type=${type}`;
    window.open(`/admin/orders/print${qs}`, '_blank');
  };

  const handleBookCourier = async () => {
    if (!order) return;
    const courierNameUpper = selectedCourier.toUpperCase();

    if (selectedCourier === 'pathao') {
      if (!cityId || !zoneId) {
        toast.error('Pathao requires both City ID and Zone ID to book a shipment.');
        return;
      }
    }

    const result = await Swal.fire({
      title: `Hand over to ${courierNameUpper}?`,
      text: `Are you sure you want to book Order #${order.shortId || String(order._id).slice(-8).toUpperCase()} with ${courierNameUpper}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      confirmButtonText: `Yes, send to ${courierNameUpper}!`
    });
    
    if (!result.isConfirmed) return;
    
    setBookingLoading(true);
    try {
      const payload: any = {
        courier: selectedCourier,
        note: shippingNote,
      };

      if (selectedCourier === 'pathao') {
        payload.store_id = storeId ? Number(storeId) : undefined;
        payload.city_id = Number(cityId) || 1;
        payload.zone_id = Number(zoneId) || 1;
        payload.area_id = areaId ? Number(areaId) : undefined;
        payload.item_weight = Number(itemWeight) || 0.5;
      } else if (selectedCourier === 'redx') {
        payload.area_id = areaId ? Number(areaId) : 1;
        payload.weight = Number(itemWeight) || 0.5;
      }

      const res = await fetch(`/api/reseller/orders/${order._id}/book-courier`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `${courierNameUpper} booked successfully!`);
        onUpdate();
        const updateRes = await fetch(`/api/reseller/orders/${order._id}`);
        if (updateRes.ok) setOrder(await updateRes.json());
      } else {
        toast.error(data.message || 'Courier booking failed');
      }
    } catch (e) {
      toast.error('Network error occurred during courier booking');
    } finally {
      setBookingLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-xl font-bold">
              {isEditing ? 'Edit Order Details' : 'Order Details'}
            </DialogTitle>
            {order && (
               <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1 px-2.5 py-1"
                    title={isEditing ? "Cancel Edit" : "Edit Order"}
                  >
                    {isEditing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                    <span className="text-[10px] font-bold">{isEditing ? 'Cancel' : 'Edit'}</span>
                  </button>

                  {!isEditing && (
                    <>
                      <Badge variant={order.status === 'Delivered' ? 'default' : 'secondary'}>
                        {order.status}
                      </Badge>
                      <button 
                        onClick={() => handleLocalPrint('invoice')}
                        className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        title="Print A4 Invoice"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleLocalPrint('sticker')}
                        className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1 px-2.5 py-1"
                        title="Print Sticker Invoice"
                      >
                        <Printer className="h-4 w-4" />
                        <span className="text-[10px] font-bold">Sticker</span>
                      </button>
                    </>
                  )}
               </div>
            )}
          </div>
          <DialogDescription>
            {order ? `Order ID: #${String(order.shortId || order._id).toUpperCase()}` : 'Loading order details...'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : order ? (
          isEditing && editForm ? (
            /* Edit Mode Form */
            <form onSubmit={(e) => { e.preventDefault(); handleSaveChanges(); }} className="space-y-5 pt-2">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase text-muted-foreground">Customer & Shipping Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Customer Full Name *</label>
                    <input 
                      type="text" 
                      value={editForm.customer?.name || ''} 
                      onChange={(e) => setEditForm({
                        ...editForm,
                        customer: { ...editForm.customer, name: e.target.value }
                      })}
                      className="w-full text-sm p-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Phone Number *</label>
                    <input 
                      type="text" 
                      value={editForm.customer?.phone || ''} 
                      onChange={(e) => setEditForm({
                        ...editForm,
                        customer: { ...editForm.customer, phone: e.target.value }
                      })}
                      className="w-full text-sm p-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Email Address</label>
                    <input 
                      type="email" 
                      value={editForm.customer?.email || ''} 
                      onChange={(e) => setEditForm({
                        ...editForm,
                        customer: { ...editForm.customer, email: e.target.value }
                      })}
                      className="w-full text-sm p-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Street / Delivery Address *</label>
                    <textarea 
                      value={editForm.customer?.address?.street || ''} 
                      onChange={(e) => setEditForm({
                        ...editForm,
                        customer: {
                          ...editForm.customer,
                          address: { ...editForm.customer?.address, street: e.target.value }
                        }
                      })}
                      className="w-full text-sm p-2 border rounded-lg h-16 resize-y"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">City / District</label>
                      <input 
                        type="text" 
                        value={editForm.customer?.address?.city || ''} 
                        onChange={(e) => setEditForm({
                          ...editForm,
                          customer: {
                            ...editForm.customer,
                            address: { ...editForm.customer?.address, city: e.target.value }
                          }
                        })}
                        className="w-full text-sm p-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Division</label>
                      <input 
                        type="text" 
                        value={editForm.customer?.address?.division || ''} 
                        onChange={(e) => setEditForm({
                          ...editForm,
                          customer: {
                            ...editForm.customer,
                            address: { ...editForm.customer?.address, division: e.target.value }
                          }
                        })}
                        className="w-full text-sm p-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Postal / Zip Code</label>
                      <input 
                        type="text" 
                        value={editForm.customer?.address?.zipCode || ''} 
                        onChange={(e) => setEditForm({
                          ...editForm,
                          customer: {
                            ...editForm.customer,
                            address: { ...editForm.customer?.address, zipCode: e.target.value }
                          }
                        })}
                        className="w-full text-sm p-2 border rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Order Status */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase text-muted-foreground">Order Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Order Status</label>
                    <select
                      value={editForm.status || 'Order Placed'}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full text-sm p-2 border rounded-lg bg-background"
                    >
                      <option value="Order Placed">Order Placed</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Hold">Hold</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Payment Status (Admin Managed)</label>
                    <div className="p-2 border rounded-lg bg-muted/40 text-sm font-medium text-muted-foreground flex items-center justify-between">
                      <span>{order?.paymentStatus || 'Pending'}</span>
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">Admin Only</span>
                    </div>
                  </div>
                </div>

                {/* Inline Hold Reason Field - Opens immediately when Hold is chosen */}
                {editForm.status === 'Hold' && (
                  <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-lg space-y-1.5 animate-in fade-in duration-200">
                    <label className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-amber-600" /> Hold Reason (Internal Note): <span className="text-red-600 font-bold">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={editForm.internalNote || ''}
                      onChange={(e) => setEditForm({ ...editForm, internalNote: e.target.value })}
                      placeholder="Enter hold reason (e.g. Customer requested delayed delivery, stock unavailable)..."
                      className="w-full text-sm p-2 border rounded-md bg-white dark:bg-zinc-900 border-amber-300 dark:border-amber-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Notes in Edit Mode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold uppercase text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4" /> Customer Note
                  </h3>
                  <textarea 
                    value={editForm.customerNote || ''} 
                    onChange={(e) => setEditForm({ ...editForm, customerNote: e.target.value })}
                    className="w-full text-sm p-2 border rounded-lg h-20 resize-y bg-sky-50/50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900" 
                    placeholder="Delivery instructions from customer..."
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-bold uppercase text-amber-700 dark:text-amber-400 flex items-center justify-between gap-1.5">
                    <span className="flex items-center gap-1.5">
                      <Lock className="h-4 w-4" /> Reseller Internal Note (Private)
                    </span>
                    {editForm.status === 'Hold' && (
                      <span className="text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded border border-red-200">
                        Required for Hold *
                      </span>
                    )}
                  </h3>
                  <textarea 
                    value={editForm.internalNote || ''} 
                    onChange={(e) => setEditForm({ ...editForm, internalNote: e.target.value })}
                    className={`w-full text-sm p-2 border rounded-lg h-20 resize-y bg-amber-50/50 dark:bg-amber-950/20 ${
                      editForm.status === 'Hold' && !editForm.internalNote?.trim()
                        ? 'border-red-400 ring-2 ring-red-400/20'
                        : 'border-amber-200 dark:border-amber-900'
                    }`} 
                    placeholder={
                      editForm.status === 'Hold'
                        ? 'Enter hold reason (required, e.g. Customer requested delivery after 3 days)...'
                        : 'Private notes for your shop/records...'
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* Form Actions */}
              <div className="flex gap-3 pt-2 justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-primary text-primary-foreground font-bold"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </div>
            </form>
          ) : (
            /* View Mode */
            <div className="space-y-6 pt-4">
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase text-muted-foreground">Customer</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {order.customer?.name?.[0]?.toUpperCase() || 'C'}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{order.customer?.name || 'Customer'}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {order.customer?.email || 'No Email'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase text-muted-foreground">Order Date</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {order.createdAt && isValid(new Date(order.createdAt)) 
                        ? format(new Date(order.createdAt), 'MMMM dd, yyyy p')
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Shipping & Payment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Shipping Address
                  </h4>
                  <div className="text-sm leading-relaxed">
                    {order.customer?.name && (
                      <p className="font-semibold">{order.customer?.name}</p>
                    )}
                    {order.customer?.address?.street && <p>{order.customer.address.street}</p>}
                    {(() => {
                      const city = order.customer?.address?.city || '';
                      const division = order.customer?.address?.division || '';
                      const zip = order.customer?.address?.zipCode || '';
                      
                      const isCityDefault = ['dhaka', 'outside dhaka'].includes(city.toLowerCase().trim());
                      const isDivisionDefault = ['dhaka', 'outside dhaka'].includes(division.toLowerCase().trim());
                      const isZipDefault = zip.trim() === '0000';

                      const cityDivParts = [];
                      if (!isCityDefault && city) cityDivParts.push(city);
                      if (!isDivisionDefault && division) cityDivParts.push(division);

                      return (
                        <>
                          {cityDivParts.length > 0 && (
                            <p>
                              {cityDivParts.join(', ')}
                              {!isZipDefault && zip ? ` ${zip}` : ''}
                            </p>
                          )}
                          {cityDivParts.length === 0 && !isZipDefault && zip && (
                            <p>{zip}</p>
                          )}
                          <p>Bangladesh</p>
                        </>
                      );
                    })()}
                    {order.customer?.phone && (
                      <div className="space-y-2 mt-1">
                        <p className="flex items-center gap-1 text-muted-foreground font-semibold">
                          <Phone className="h-3 w-3" /> {order.customer.phone}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Payment Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between font-medium">
                      <span>Method:</span>
                      <span>{order.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Status:</span>
                      <Badge variant={order.paymentStatus === 'Paid' ? 'default' : 'outline'} className={order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : ''}>
                        {order.paymentStatus}
                      </Badge>
                    </div>
                    {order.manualPaymentDetails?.transactionId && (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">Transaction ID:</span>
                        <code className="bg-muted px-2 py-1 rounded text-[10px] break-all">{order.manualPaymentDetails.transactionId}</code>
                      </div>
                    )}

                    {order.paymentMethod === 'Manual' && order.manualPaymentDetails && (
                      <div className="mt-3 p-3 bg-primary/5 rounded-xl border border-primary/20 space-y-2">
                         <p className="text-[10px] font-black uppercase text-primary tracking-widest">Manual Verification</p>
                         <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                               <span className="text-muted-foreground block">Method:</span>
                               <span className="font-bold uppercase">{order.manualPaymentDetails.methodName}</span>
                            </div>
                            <div>
                               <span className="text-muted-foreground block">Sender No:</span>
                               <span className="font-bold">{order.manualPaymentDetails.senderNumber}</span>
                            </div>
                            <div className="col-span-2">
                               <span className="text-muted-foreground block">TrxID:</span>
                               <code className="font-bold text-primary bg-white px-1.5 py-0.5 rounded border">{order.manualPaymentDetails.transactionId}</code>
                            </div>
                         </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* BD Courier Fraud Checker UI */}
              {order.customer?.phone && (
                <div className="mt-2 p-3 bg-muted/30 border rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">BD Courier Profile</span>
                    {fraudLoading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                  </div>

                  {fraudData?.status === 'success' && fraudData?.data?.summary ? (() => {
                    const s = fraudData.data.summary;
                    const total = Number(s.total_parcel) || 0;
                    const delivered = Number(s.success_parcel) || 0;
                    const successRate = total > 0 ? Math.round((delivered / total) * 1000) / 10 : (s.success_ratio || 0);
                    const colorClass = successRate >= 70 ? 'text-green-600' : successRate >= 50 ? 'text-yellow-600' : 'text-red-600';
                    return (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground text-[10px]">Success Rate:</span>
                            <span className={`font-black ${colorClass}`}>
                              {successRate}%
                            </span>
                          </div>
                          <span className="text-muted-foreground/35">|</span>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground text-[10px]">Total Parcels:</span>
                            <span className="font-bold text-slate-800 dark:text-zinc-200">{s.total_parcel}</span>
                          </div>
                          <span className="text-muted-foreground/35">|</span>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground text-[10px]">Delivered:</span>
                            <span className="font-bold text-green-600">{s.success_parcel}</span>
                          </div>
                          <span className="text-muted-foreground/35">|</span>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground text-[10px]">Cancelled:</span>
                            <span className="font-bold text-red-600">{s.cancelled_parcel}</span>
                          </div>
                        </div>

                        {/* Reports List */}
                        {fraudData.reports && fraudData.reports.length > 0 && (
                          <div className="border-t pt-2 mt-1">
                            <span className="text-[10px] font-bold text-red-600 block mb-1">⚠️ Merchant Fraud Reports ({fraudData.reports.length})</span>
                            <div className="space-y-1.5 max-h-[80px] overflow-y-auto">
                              {fraudData.reports.map((report: any, idx: number) => (
                                <div key={idx} className="bg-red-50 dark:bg-red-950/20 p-1.5 rounded text-[10px] border border-red-100 dark:border-red-900/50">
                                  <p className="font-semibold text-red-700 dark:text-red-400">{report.name || 'Anonymous'}: <span className="font-normal text-slate-700 dark:text-zinc-300">{report.details}</span></p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ); })() : !fraudLoading && (
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-muted-foreground">Click to fetch courier history</span>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="h-6 px-2 text-[10px]" 
                        onClick={() => fetchFraudData(order.customer.phone)}
                      >
                        Verify Number
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Note Sections: Customer Note, Internal Note, System Note */}
              {(order.customerNote || order.internalNote || order.systemNote) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    {order.customerNote && (
                      <div className="bg-sky-50 dark:bg-sky-950/30 p-3 rounded-lg border border-sky-200 dark:border-sky-900 space-y-1">
                        <h4 className="text-xs font-bold uppercase text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5" /> Customer Delivery Note
                        </h4>
                        <p className="text-sm text-sky-900 dark:text-sky-200 whitespace-pre-wrap">{order.customerNote}</p>
                      </div>
                    )}

                    {order.internalNote && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200/60 dark:border-amber-900 space-y-1">
                        <h4 className="text-xs font-bold uppercase text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5" /> Reseller Internal Note (Private)
                        </h4>
                        <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap">{order.internalNote}</p>
                      </div>
                    )}

                    {order.systemNote && (
                      <div className="bg-muted/40 p-2.5 rounded-lg border border-border flex items-center justify-between text-xs">
                        <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5" /> System Info:
                        </span>
                        <span className="font-mono font-medium text-foreground bg-background px-2 py-0.5 rounded border border-border">
                          {order.systemNote}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}

              <Separator />

              {/* Shipping Management */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase text-muted-foreground flex items-center justify-between">
                  <span>Shipping Management</span>
                </h3>
                
                {order.shippingDetails?.trackingId ? (
                  <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-muted-foreground">Courier Service</p>
                        <p className="font-bold text-sm">{order.shippingDetails.courierName}</p>
                      </div>
                      <Badge variant="outline" className="bg-white">
                        {order.shippingDetails.courierStatus || 'Processing'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Tracking ID</p>
                        <code className="text-sm font-mono font-bold">{order.shippingDetails.trackingId}</code>
                      </div>
                      {order.shippingDetails.trackingUrl && (
                        <a 
                          href={order.shippingDetails.trackingUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          Track Status <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {order.items?.every((i: any) => i.productId?.uploadedBy === order.resellerId) ? (
                      <>
                        {!hasAnyCourier ? (
                          <div className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 p-3 rounded-lg border border-amber-200 dark:border-amber-900">
                            <strong>Note:</strong> Courier service is not configured yet. Please configure Steadfast, Pathao, or RedX credentials to enable automated booking.
                          </div>
                        ) : (
                          <>
                            {/* Courier Selection Tabs */}
                            <div className="flex items-center gap-2 p-1 bg-muted/40 rounded-xl border border-border">
                              <button
                                type="button"
                                onClick={() => setSelectedCourier('steadfast')}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                  selectedCourier === 'steadfast'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                }`}
                              >
                                <Truck className="h-3.5 w-3.5" />
                                Steadfast
                                {!isSteadfastConfigured && (
                                  <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded-full font-normal">Unconfigured</span>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedCourier('pathao')}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                  selectedCourier === 'pathao'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                }`}
                              >
                                <Truck className="h-3.5 w-3.5 text-rose-500" />
                                Pathao
                                {!isPathaoConfigured && (
                                  <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded-full font-normal">Unconfigured</span>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedCourier('redx')}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                  selectedCourier === 'redx'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                }`}
                              >
                                <Truck className="h-3.5 w-3.5 text-red-500" />
                                RedX
                                {!isRedxConfigured && (
                                  <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded-full font-normal">Unconfigured</span>
                                )}
                              </button>
                            </div>

                            <div className="space-y-3 border rounded-xl p-3.5 bg-muted/20">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                  {selectedCourier === 'pathao' ? 'Pathao Courier Details' : selectedCourier === 'redx' ? 'RedX Courier Details' : 'Steadfast Courier Details'}
                                </span>
                                {selectedCourier === 'pathao' && loadingPathaoLocations && (
                                  <span className="text-[10px] text-primary flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Loading locations...
                                  </span>
                                )}
                              </div>

                              {/* Pathao Form Fields */}
                              {selectedCourier === 'pathao' && (
                                <div className="space-y-2.5">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {/* City Selection */}
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-muted-foreground">Pathao City (Delivery Destination)</label>
                                      {pathaoCities.length > 0 ? (
                                        <select
                                          value={cityId}
                                          onChange={(e) => setCityId(e.target.value)}
                                          className="w-full text-xs p-2 border rounded-lg bg-background"
                                        >
                                          <option value="">-- Select City --</option>
                                          {pathaoCities.map((c: any) => (
                                            <option key={c.city_id} value={c.city_id}>
                                              {c.city_name}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <input
                                          type="text"
                                          value={cityId}
                                          onChange={(e) => setCityId(e.target.value)}
                                          placeholder="City ID (e.g. 1 for Dhaka)"
                                          className="w-full text-xs p-2 border rounded-lg bg-background"
                                        />
                                      )}
                                    </div>

                                    {/* Zone Selection */}
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-muted-foreground">Pathao Zone</label>
                                      {pathaoZones.length > 0 ? (
                                        <select
                                          value={zoneId}
                                          onChange={(e) => setZoneId(e.target.value)}
                                          className="w-full text-xs p-2 border rounded-lg bg-background"
                                        >
                                          <option value="">-- Select Zone --</option>
                                          {pathaoZones.map((z: any) => (
                                            <option key={z.zone_id} value={z.zone_id}>
                                              {z.zone_name}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <input
                                          type="text"
                                          value={zoneId}
                                          onChange={(e) => setZoneId(e.target.value)}
                                          placeholder="Zone ID (e.g. 1)"
                                          className="w-full text-xs p-2 border rounded-lg bg-background"
                                        />
                                      )}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {/* Area Selection */}
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-muted-foreground">Pathao Area (Optional)</label>
                                      {pathaoAreas.length > 0 ? (
                                        <select
                                          value={areaId}
                                          onChange={(e) => setAreaId(e.target.value)}
                                          className="w-full text-xs p-2 border rounded-lg bg-background"
                                        >
                                          <option value="">-- Select Area (Optional) --</option>
                                          {pathaoAreas.map((a: any) => (
                                            <option key={a.area_id} value={a.area_id}>
                                              {a.area_name}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <input
                                          type="text"
                                          value={areaId}
                                          onChange={(e) => setAreaId(e.target.value)}
                                          placeholder="Area ID (e.g. 123)"
                                          className="w-full text-xs p-2 border rounded-lg bg-background"
                                        />
                                      )}
                                    </div>

                                    {/* Weight Selection */}
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-muted-foreground">Item Weight (kg)</label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        value={itemWeight}
                                        onChange={(e) => setItemWeight(e.target.value)}
                                        placeholder="0.5"
                                        className="w-full text-xs p-2 border rounded-lg bg-background"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* RedX Form Fields */}
                              {selectedCourier === 'redx' && (
                                <div className="space-y-2.5">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {/* RedX Area Selector */}
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-muted-foreground">RedX Area (Delivery Destination)</label>
                                        {loadingRedxAreas && (
                                          <span className="text-[9px] text-primary flex items-center gap-1">
                                            <Loader2 className="h-2.5 w-2.5 animate-spin" /> Loading...
                                          </span>
                                        )}
                                      </div>
                                      {redxAreas.length > 0 ? (
                                        <div className="space-y-1.5">
                                          <input
                                            type="text"
                                            value={redxSearch}
                                            onChange={(e) => setRedxSearch(e.target.value)}
                                            placeholder="🔍 Filter areas (e.g. Mirpur / 1216)..."
                                            className="w-full text-[11px] p-1.5 border rounded-lg bg-background"
                                          />
                                          <select
                                            value={areaId}
                                            onChange={(e) => setAreaId(e.target.value)}
                                            className="w-full text-xs p-2 border rounded-lg bg-background"
                                          >
                                            <option value="">-- Select RedX Area --</option>
                                            {redxAreas
                                              .filter((a: any) => {
                                                if (!redxSearch) return true;
                                                const s = redxSearch.toLowerCase();
                                                return (
                                                  (a.name && a.name.toLowerCase().includes(s)) ||
                                                  (a.post_code && String(a.post_code).includes(s)) ||
                                                  (a.district_name && a.district_name.toLowerCase().includes(s))
                                                );
                                              })
                                              .slice(0, 100)
                                              .map((a: any) => (
                                                <option key={a.id || a.area_id} value={a.id || a.area_id}>
                                                  {a.name} ({a.district_name || 'Area'}{a.post_code ? ` - ${a.post_code}` : ''})
                                                </option>
                                              ))}
                                          </select>
                                        </div>
                                      ) : (
                                        <input
                                          type="text"
                                          value={areaId}
                                          onChange={(e) => setAreaId(e.target.value)}
                                          placeholder="RedX Area ID (e.g. 1)"
                                          className="w-full text-xs p-2 border rounded-lg bg-background"
                                        />
                                      )}
                                    </div>

                                    {/* Weight Selection */}
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-muted-foreground">Item Weight (kg)</label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        value={itemWeight}
                                        onChange={(e) => setItemWeight(e.target.value)}
                                        placeholder="0.5"
                                        className="w-full text-xs p-2 border rounded-lg bg-background"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Common Shipping Note */}
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground">Shipping Note / Instruction</label>
                                <input
                                  type="text"
                                  value={shippingNote}
                                  onChange={(e) => setShippingNote(e.target.value)}
                                  placeholder="Package handle with care..."
                                  className="w-full text-xs p-2 border rounded-lg bg-background"
                                />
                              </div>
                            </div>

                            <button
                              disabled={
                                bookingLoading ||
                                order.shippingDetails?.courierStatus === 'BOOKING_IN_PROGRESS' ||
                                (selectedCourier === 'steadfast' && !isSteadfastConfigured) ||
                                (selectedCourier === 'pathao' && !isPathaoConfigured) ||
                                (selectedCourier === 'redx' && !isRedxConfigured)
                              }
                              onClick={handleBookCourier}
                              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
                            >
                              {bookingLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Truck className="h-4 w-4" />
                              )}
                              Hand over to {selectedCourier.toUpperCase()}
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="text-xs bg-yellow-50 text-yellow-700 p-3 rounded-lg border border-yellow-200">
                        <strong>Note:</strong> Courier booking will be managed by the main administrator.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator />
              
              {/* Items */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase text-muted-foreground">Order Items</h4>
                <div className="space-y-3">
                  {(order.items || []).map((item: any, i: number) => (
                    <div key={item._id || item.id || i} className="flex items-center justify-between text-sm gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-12 w-12 rounded border overflow-hidden bg-muted flex-shrink-0">
                           {item.image ? (
                               <Image src={item.image} alt={item.name} width={48} height={48} className="h-full w-full object-cover" />
                           ) : (
                               <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">No Img</div>
                           )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium whitespace-normal break-words leading-snug">{item.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.color && <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 bg-muted/50">{item.color}</Badge>}
                            {item.size && <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 bg-muted/50">Size: {item.size}</Badge>}
                            <span className="text-xs text-muted-foreground ml-1">৳{Math.round(Number(item.retailPrice) || 0)} × {item.quantity}</span>
                          </div>
                        </div>
                      </div>
                      <div className="font-bold">
                        ৳{Math.round(Number(item.retailPrice || 0) * (item.quantity || 0))}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="pt-4 border-t flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Subtotal:</span>
                    <span>৳{Math.round(Number(order.subtotal) || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Delivery Charge:</span>
                    <span>৳{Math.round(Number(order.deliveryCharge) || 0)}</span>
                  </div>
                  {order.couponDiscount > 0 && (
                    <div className="flex justify-between items-center text-sm text-destructive">
                      <span>Discount:</span>
                      <span>-৳{Math.round(Number(order.couponDiscount) || 0)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center text-lg mt-2 pt-2 border-t">
                    <span className="font-bold">Total Amount:</span>
                    <span className="font-black text-primary">৳{Math.round(Number(order.totalAmount) || 0)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="font-bold text-emerald-800">Your Commission:</span>
                    <div className="text-right">
                      <span className="font-black text-emerald-600 block">৳{Math.round(Number(order.resellerCommission) || 0)}</span>
                      <Badge variant="outline" className="text-[10px] bg-white border-emerald-300 text-emerald-700 capitalize">
                        {order.commissionStatus || 'Pending'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          )
        ) : (
          <div className="py-10 text-center text-muted-foreground">
            No details found for this order.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

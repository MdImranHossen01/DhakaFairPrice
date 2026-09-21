'use client';

import { useState } from 'react';
import { Truck, Search, Package, MapPin, CheckCircle2, Clock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';

interface Props {
  subdomain: string;
  storeName: string;
}

export function ResellerTrackOrder({ subdomain, storeName }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      toast.error('অর্ডার আইডি অথবা মোবাইল নম্বর দিন');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/store/${subdomain}/track-order/${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        const fetchedOrders = data.orders && data.orders.length > 0 ? data.orders : [data];
        setOrders(fetchedOrders);
        setSelectedOrder(fetchedOrders[0]);
        toast.success(fetchedOrders.length > 1 
          ? `${fetchedOrders.length}টি অর্ডার পাওয়া গেছে!` 
          : 'অর্ডার তথ্য পাওয়া গেছে!'
        );
      } else {
        setOrders([]);
        setSelectedOrder(null);
        const errorData = await res.json();
        toast.error(errorData.message || 'অর্ডার পাওয়া যায়নি। সঠিক আইডি বা মোবাইল নম্বর দিন।');
      }
    } catch {
      toast.error('অর্ডার ট্র্যাক করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'Order Placed':
        return 0;
      case 'Confirmed':
      case 'Paid':
      case 'Hold':
      case 'Processing':
      case 'Ready for Delivery':
        return 1;
      case 'Released for Delivery':
      case 'Shipped':
        return 2;
      case 'Delivered':
        return 3;
      case 'Cancelled':
      case 'Returned':
      default:
        return 0;
    }
  };

  const steps = [
    { label: 'অর্ডার প্লেসড', desc: 'অর্ডার সফলভাবে নেওয়া হয়েছে', icon: Clock },
    { label: 'কনফার্মড', desc: 'অর্ডার কনফার্ম করা হয়েছে', icon: CheckCircle2 },
    { label: 'ডেলিভারিতে আছে', desc: 'কুরিয়ারে পাঠানো হয়েছে', icon: Truck },
    { label: 'ডেলিভার্ড', desc: 'সফলভাবে ডেলিভারি হয়েছে', icon: MapPin },
  ];

  const currentStep = selectedOrder ? getStatusStep(selectedOrder.status) : -1;

  return (
    <div className="space-y-8">
      {/* Search Panel */}
      <Card className="border shadow-lg rounded-2xl overflow-hidden bg-card">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="অর্ডার আইডি বা মোবাইল নম্বর লিখুন (যেমন: 017XXXXXXXX বা #RS12345)"
                className="h-12 pl-12 rounded-xl border focus-visible:ring-primary bg-background font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="h-12 px-8 rounded-xl font-bold gap-2 text-sm"
            >
              {loading ? 'অনুসন্ধান হচ্ছে...' : 'অর্ডার ট্র্যাক করুন'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Multiple Orders Selector */}
      {orders.length > 1 && (
        <div className="space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm font-bold text-muted-foreground">
              এই নম্বরে {orders.length}টি অর্ডার পাওয়া গেছে:
            </p>
            <span className="text-xs text-primary font-semibold">অর্ডারটি সিলেক্ট করুন</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {orders.map((ord) => {
              const isSelected = selectedOrder?._id === ord._id;
              return (
                <button
                  key={ord._id}
                  onClick={() => setSelectedOrder(ord)}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 flex flex-col gap-1.5 ${
                    isSelected 
                      ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20' 
                      : 'border-border bg-card hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-black text-sm">#{ord.shortId}</span>
                    <Badge variant={isSelected ? 'default' : 'secondary'} className="text-[10px] px-2 py-0.5">
                      {ord.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <span>৳{ord.totalAmount?.toLocaleString()}</span>
                    <span>{new Date(ord.createdAt).toLocaleDateString('bn-BD')}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Result Panel */}
      {selectedOrder && (
        <Card className="border shadow-xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-primary text-primary-foreground p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/75">অর্ডার আইডি:</p>
              <h2 className="text-2xl font-black">#{selectedOrder.shortId}</h2>
            </div>
            <div className="flex gap-4 text-xs font-medium">
              <div>
                <p className="text-primary-foreground/75">তারিখ:</p>
                <p className="font-bold">{new Date(selectedOrder.createdAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div>
                <p className="text-primary-foreground/75">মোট মূল্য:</p>
                <p className="font-bold">৳{selectedOrder.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <CardContent className="p-6 md:p-8 space-y-8 bg-card">
            {/* Delivery Stepper */}
            <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              {/* Stepper bar (Desktop) */}
              <div className="absolute left-6 top-1/2 -translate-y-1/2 right-6 h-0.5 bg-muted hidden md:block -z-0" />
              <div
                className="absolute left-6 top-1/2 -translate-y-1/2 h-0.5 bg-primary hidden md:block -z-0 transition-all duration-500"
                style={{ width: `${Math.max(0, currentStep) * 33.33}%` }}
              />

              {steps.map((step, idx) => {
                const StepIcon = step.icon;
                const isCompleted = idx <= currentStep;
                const isActive = idx === currentStep;

                return (
                  <div
                    key={step.label}
                    className="flex md:flex-col items-center gap-4 md:gap-2.5 z-10 w-full md:w-auto relative"
                  >
                    {/* Stepper bar (Mobile) */}
                    {idx > 0 && (
                      <div className={`absolute left-5 -top-6 w-0.5 h-6 md:hidden -z-0 ${idx <= currentStep ? 'bg-primary' : 'bg-muted'}`} />
                    )}

                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                        isCompleted
                          ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20 scale-105'
                          : 'bg-background border-muted text-muted-foreground'
                      } ${isActive ? 'ring-4 ring-primary/20' : ''}`}
                    >
                      <StepIcon className="h-5 w-5" />
                    </div>
                    <div className="text-left md:text-center min-w-0">
                      <p className={`text-sm font-bold leading-tight ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Courier status info */}
            {selectedOrder.shippingDetails?.courierName && (
              <div className="rounded-xl border bg-muted/20 p-4 flex gap-3 items-start">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">শিপিং ইনফরমেশন:</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">
                    {selectedOrder.shippingDetails.courierName} কুরিয়ার সার্ভিসের মাধ্যমে আপনার অর্ডারটি পাঠানো হয়েছে।
                  </p>
                  {selectedOrder.shippingDetails.trackingUrl && (
                    <a
                      href={selectedOrder.shippingDetails.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1 mt-1.5"
                    >
                      কুরিয়ার ট্র্যাকিং লিঙ্ক →
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Order Items & Customer details */}
            <div className="grid md:grid-cols-2 gap-8 pt-4 border-t">
              {/* Product Details */}
              <div className="space-y-4">
                <h3 className="font-black text-sm text-foreground uppercase tracking-wider">পণ্যসমূহ</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item: any, i: number) => (
                    <div key={i} className="flex gap-3 items-center">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border bg-muted shrink-0 relative">
                        {item.image ? (
                          <Image src={item.image} alt={item.name} width={48} height={48} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          ৳{item.retailPrice} × {item.quantity}
                          {item.color || item.size ? ` | ${[item.color, item.size].filter(Boolean).join(' - ')}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-4">
                <h3 className="font-black text-sm text-foreground uppercase tracking-wider">ডেলিভারি ঠিকানা</h3>
                <div className="text-xs space-y-2 text-muted-foreground font-medium">
                  <div>
                    <span className="text-foreground font-bold">নাম: </span>
                    <span>{selectedOrder.shippingDetails.name}</span>
                  </div>
                  <div>
                    <span className="text-foreground font-bold">ফোন: </span>
                    <span>{selectedOrder.shippingDetails.phone}</span>
                  </div>
                  <div>
                    <span className="text-foreground font-bold">জেলা/শহর: </span>
                    <span>{selectedOrder.shippingDetails.address}</span>
                  </div>
                  <div>
                    <span className="text-foreground font-bold">পেমেন্ট পদ্ধতি: </span>
                    <span>{selectedOrder.paymentMethod === 'COD' ? 'ক্যাশ অন ডেলিভারি (COD)' : selectedOrder.paymentMethod}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

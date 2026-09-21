'use client';

import { useState } from 'react';
import { Truck, Search, Package, MapPin, CheckCircle2, Clock, AlertCircle, ExternalLink, Calendar, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Image from 'next/image';

export default function TrackOrderPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const handleTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        const query = searchQuery.trim();
        if (!query) {
            toast.error('Please enter your Order ID or Mobile Number');
            return;
        }

        setLoading(true);
        setHasSearched(true);
        try {
            const res = await fetch(`/api/track-order/${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                const fetchedOrders = data.orders && data.orders.length > 0 ? data.orders : [data];
                setOrders(fetchedOrders);
                setSelectedOrder(fetchedOrders[0]);
                toast.success(fetchedOrders.length > 1 
                    ? `Found ${fetchedOrders.length} orders for this search!` 
                    : 'Order found!'
                );
            } else {
                setOrders([]);
                setSelectedOrder(null);
                const errorData = await res.json();
                toast.error(errorData.message || 'No order found. Please check the Order ID or Mobile Number.');
            }
        } catch {
            toast.error('Failed to track order. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusStep = (status: string) => {
        const statuses = ['Order Placed', 'Confirmed', 'Processing', 'Ready for Delivery', 'Released for Delivery', 'Delivered'];
        if (status === 'Released for Delivery' || status === 'Shipped') return 3;
        if (status === 'Delivered') return 4;
        if (status === 'Processing' || status === 'Ready for Delivery') return 2;
        if (status === 'Confirmed' || status === 'Paid') return 1;
        return 0;
    };

    const steps = [
        { label: 'Order Placed', icon: Clock },
        { label: 'Confirmed', icon: CheckCircle2 },
        { label: 'Processing', icon: Package },
        { label: 'Out for Delivery', icon: Truck },
        { label: 'Delivered', icon: MapPin },
    ];

    const currentStep = selectedOrder ? getStatusStep(selectedOrder.status) : -1;

    return (
        <div className="min-h-screen bg-muted/30 py-12 md:py-20 px-4">
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-3 md:space-y-4">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-2 shadow-inner">
                        <Truck className="h-8 w-8" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">Track Your Order</h1>
                    <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
                        Enter your <strong>Order ID</strong> or <strong>Mobile Number</strong> to check real-time delivery status.
                    </p>
                </div>

                {/* Search Card */}
                <Card className="border shadow-xl shadow-primary/5 rounded-3xl overflow-hidden bg-card">
                    <CardContent className="p-6 sm:p-8">
                        <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input 
                                    placeholder="Enter Order ID or Mobile Number (e.g. 017XXXXXXXX)" 
                                    className="h-14 pl-12 rounded-2xl border-2 focus-visible:ring-primary bg-background text-base font-medium"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button 
                                type="submit" 
                                size="lg" 
                                disabled={loading}
                                className="h-14 px-8 sm:px-10 rounded-2xl font-bold gap-2 text-base shadow-md"
                            >
                                {loading ? 'Searching...' : 'Track Now'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Multi-Order Selector (When searched by Phone number) */}
                {orders.length > 1 && (
                    <div className="space-y-3 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between">
                            <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                {orders.length} Orders Found for this number:
                            </p>
                            <span className="text-xs text-primary font-semibold">Select an order to view details</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {orders.map((ord) => {
                                const isSelected = selectedOrder?._id === ord._id;
                                return (
                                    <button
                                        key={ord._id}
                                        onClick={() => setSelectedOrder(ord)}
                                        className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col gap-1.5 ${
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
                                            <span>{new Date(ord.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Tracking Result */}
                {selectedOrder && (
                    <Card className="border shadow-2xl rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 bg-card">
                        <CardHeader className="bg-primary text-primary-foreground p-6 sm:p-8">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <p className="text-primary-foreground/75 text-xs font-bold uppercase tracking-widest">Order ID</p>
                                    <CardTitle className="text-2xl sm:text-3xl font-black">#{selectedOrder.shortId}</CardTitle>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-primary-foreground/85">
                                        <Calendar className="h-3.5 w-3.5" />
                                        <span>Ordered on {new Date(selectedOrder.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="text-sm sm:text-base px-5 py-1.5 rounded-full font-black shadow-sm">
                                    {selectedOrder.status}
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="p-6 sm:p-8 space-y-10">
                            {/* Progress Tracker */}
                            <div className="relative">
                                <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -translate-y-1/2 hidden md:block" />
                                <div 
                                    className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 transition-all duration-700 hidden md:block" 
                                    style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                                />
                                
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
                                    {steps.map((step, index) => {
                                        const Icon = step.icon;
                                        const isCompleted = index <= currentStep;
                                        const isCurrent = index === currentStep;

                                        return (
                                            <div key={step.label} className="flex md:flex-col items-center gap-4 text-left md:text-center group">
                                                <div className={`
                                                    h-12 w-12 rounded-full flex items-center justify-center transition-all duration-500 z-10 border-2 shrink-0
                                                    ${isCompleted ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-105' : 'bg-background text-muted-foreground border-muted'}
                                                    ${isCurrent ? 'ring-4 ring-primary/20' : ''}
                                                `}>
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <div className="space-y-0.5 min-w-0">
                                                    <p className={`font-bold text-xs sm:text-sm ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                        {step.label}
                                                    </p>
                                                    {isCurrent && (
                                                        <p className="text-[10px] text-primary font-black uppercase tracking-tight animate-pulse">
                                                            Current Status
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Courier Information */}
                            {selectedOrder.shippingDetails?.courierName && (
                                <div className="rounded-2xl border bg-muted/30 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3.5">
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                            <Truck className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Courier Service</p>
                                            <p className="font-bold text-foreground text-sm">{selectedOrder.shippingDetails.courierName}</p>
                                        </div>
                                    </div>
                                    {selectedOrder.shippingDetails.trackingUrl && (
                                        <a
                                            href={selectedOrder.shippingDetails.trackingUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm"
                                        >
                                            Track via Courier <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* Order Details & Delivery Address */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t">
                                {/* Ordered Products */}
                                <div className="space-y-4">
                                    <h3 className="font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
                                        <Package className="h-4 w-4 text-primary" /> Ordered Items ({selectedOrder.items?.length || 0})
                                    </h3>
                                    <div className="space-y-3">
                                        {selectedOrder.items?.map((item: any, idx: number) => (
                                            <div key={idx} className="flex gap-3 items-center bg-muted/20 p-2.5 rounded-xl border border-border/50">
                                                <div className="w-12 h-12 rounded-lg overflow-hidden border bg-muted shrink-0 relative">
                                                    {item.image ? (
                                                        <Image src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-sm">📦</div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                                        ৳{item.price?.toLocaleString()} × {item.quantity}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="pt-2 flex justify-between items-center text-sm font-bold border-t">
                                        <span>Total Amount:</span>
                                        <span className="text-primary text-base font-black">৳{selectedOrder.totalAmount?.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Delivery Details */}
                                <div className="space-y-4">
                                    <h3 className="font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-primary" /> Delivery Details
                                    </h3>
                                    <div className="space-y-3 bg-muted/40 p-5 rounded-2xl border text-xs">
                                        <div>
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase">Recipient Name</p>
                                            <p className="font-bold text-foreground text-sm mt-0.5">{selectedOrder.shippingDetails?.name || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase">Phone Number</p>
                                            <p className="font-semibold text-foreground mt-0.5">{selectedOrder.shippingDetails?.phone || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase">Location / City</p>
                                            <p className="font-medium text-foreground mt-0.5 leading-relaxed">{selectedOrder.shippingDetails?.address || 'N/A'}</p>
                                        </div>
                                        {selectedOrder.paymentMethod && (
                                            <div>
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase">Payment Method</p>
                                                <p className="font-bold text-foreground mt-0.5 uppercase">{selectedOrder.paymentMethod}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Not Found state */}
                {!selectedOrder && !loading && hasSearched && (
                    <div className="bg-destructive/10 border-2 border-destructive/20 p-8 rounded-3xl text-center space-y-3 animate-in fade-in duration-300">
                        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
                        <h3 className="text-xl font-bold text-destructive">No Order Found</h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                            We could not find any order with the information you provided. Please double-check your Order ID or Mobile Number.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}


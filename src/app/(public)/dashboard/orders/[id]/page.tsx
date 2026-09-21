'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
    ArrowLeft, 
    Package, 
    Truck, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    Star, 
    Loader2, 
    MapPin, 
    FileText 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { generateInvoicePDF } from '@/lib/invoice-generator';

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: session, status } = useSession();
    const router = useRouter();
    const [order, setOrder] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [orderRes, settingsRes] = await Promise.all([
                    fetch(`/api/orders/${id}`),
                    fetch('/api/settings')
                ]);

                if (orderRes.ok) {
                    setOrder(await orderRes.json());
                } else {
                    toast.error('Failed to load order details');
                }

                if (settingsRes.ok) {
                    setSettings(await settingsRes.json());
                }
            } catch (error) {
                toast.error('An error occurred while loading data');
            } finally {
                setLoading(false);
            }
        }
        if (session?.user) {
            fetchData();
        } else if (status === 'unauthenticated') {
            setLoading(false);
        }
    }, [id, session, status]);

    const getStatusStep = (status: string) => {
        const statuses = ['Order Placed', 'Confirmed', 'Processing', 'Ready for Delivery', 'Released for Delivery', 'Delivered'];
        const idx = statuses.indexOf(status);
        return idx === -1 ? 0 : idx;
    };

    if (loading) {
        return (
            <div className="flex justify-center p-12 md:p-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="text-center p-8 md:p-20 space-y-4">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto opacity-20" />
                <h2 className="text-xl md:text-2xl font-bold">Order Not Found</h2>
                <Button onClick={() => router.push('/dashboard')}>Back to Orders</Button>
            </div>
        );
    }

    const currentStep = getStatusStep(order.status);
    const isReviewable = ['Delivered', 'Paid'].includes(order.status);

    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 rounded-xl p-3 md:p-4 shadow-xs">
                <div className="flex items-center gap-2.5">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => router.push('/dashboard')}
                        className="rounded-lg h-9 w-9 shrink-0"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-base sm:text-xl md:text-2xl font-black tracking-tight text-foreground truncate">
                          Order Details
                        </h1>
                        <p className="text-xs text-muted-foreground font-mono">#{order.shortId || order._id.slice(-8).toUpperCase()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                    {settings && (
                        <Button 
                            variant="outline" 
                            size="sm"
                            className="rounded-lg font-bold h-8 md:h-9 text-xs gap-1.5"
                            onClick={async () => {
                                try {
                                    await generateInvoicePDF(order, settings);
                                } catch (error) {
                                    console.error('Invoice Generation Error:', error);
                                    toast.error('Failed to generate invoice PDF. Please try again.');
                                }
                            }}
                        >
                            <FileText className="h-3.5 w-3.5" /> Invoice
                        </Button>
                    )}
                    <Badge className="text-xs md:text-sm px-3 py-1 rounded-lg font-bold">
                        {order.status}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Left Column: Order Info & Items */}
                <div className="lg:col-span-2 space-y-4 md:space-y-6">
                    {/* Status Tracker */}
                    <Card className="border border-border/80 shadow-xs rounded-xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b p-3 md:p-4">
                            <CardTitle className="text-sm md:text-base font-bold flex items-center gap-2">
                                <Truck className="h-4 w-4 text-primary" /> Tracking Progress
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 md:p-8 overflow-x-auto no-scrollbar">
                            <div className="min-w-[480px] relative flex justify-between items-start pt-2">
                                {/* Lines */}
                                <div className="absolute top-7 left-6 right-6 h-1 bg-muted -z-10" />
                                <div 
                                    className="absolute top-7 left-6 h-1 bg-primary -z-10 transition-all duration-1000" 
                                    style={{ width: `${(currentStep / 5) * 100}%` }}
                                />

                                {[
                                    { label: 'Placed', icon: Clock },
                                    { label: 'Confirmed', icon: CheckCircle2 },
                                    { label: 'Processing', icon: Package },
                                    { label: 'Ready', icon: Truck },
                                    { label: 'Delivery', icon: MapPin },
                                    { label: 'Delivered', icon: CheckCircle2 },
                                ].map((step, idx) => (
                                    <div key={idx} className="flex flex-col items-center gap-1.5">
                                        <div className={`
                                            h-10 w-10 md:h-12 md:w-12 rounded-full flex items-center justify-center border-2 md:border-4 transition-all duration-500
                                            ${idx <= currentStep ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-background border-muted text-muted-foreground'}
                                        `}>
                                            <step.icon className="h-4 w-4 md:h-5 md:w-5" />
                                        </div>
                                        <span className={`text-[10px] md:text-xs font-bold uppercase tracking-tight text-center ${idx <= currentStep ? 'text-foreground' : 'text-muted-foreground'}`}>
                                            {step.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Order Items */}
                    <Card className="border border-border/80 shadow-xs rounded-xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b p-3 md:p-4">
                            <CardTitle className="text-sm md:text-base font-bold flex items-center gap-2">
                                <Package className="h-4 w-4 text-primary" /> Order Items ({Array.isArray(order?.items) ? order.items.length : 0})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border/60">
                                {(Array.isArray(order?.items) ? order.items : []).map((item: any, idx: number) => (
                                    <div key={idx} className="p-3 md:p-4 flex items-center gap-3 hover:bg-muted/20 transition-colors">
                                        <div className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-lg bg-muted overflow-hidden shrink-0 border border-border/60">
                                            <Image 
                                                src={item.image || '/placeholder.png'} 
                                                alt={item.name} 
                                                width={80}
                                                height={80}
                                                className="h-full w-full object-cover" 
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-xs sm:text-sm md:text-base truncate text-foreground">{item.name}</h4>
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                <span>Qty: {item.quantity}</span>
                                                {item.size && <span>• Size: {item.size}</span>}
                                                {item.color && <span>• Color: {item.color}</span>}
                                            </div>
                                            <p className="font-black text-primary text-xs sm:text-sm mt-1">৳{item.price}</p>
                                        </div>
                                        <div className="shrink-0">
                                            {isReviewable ? (
                                                <Button 
                                                    size="sm" 
                                                    className="rounded-lg font-bold gap-1 text-xs h-7 sm:h-8 px-2.5 sm:px-3"
                                                    onClick={() => {
                                                        const slug = item.product?.slug || item.product?._id || item.product;
                                                        router.push(`/product/${slug}?review=true`);
                                                    }}
                                                >
                                                    <Star className="h-3 w-3 fill-current" /> Review
                                                </Button>
                                            ) : (
                                                <Badge variant="outline" className="text-[9px] uppercase font-semibold opacity-60">
                                                    Pending
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Summaries & Shipping */}
                <div className="space-y-4 md:space-y-6">
                    {/* Summary */}
                    <Card className="border border-border/80 shadow-xs rounded-xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b p-3 md:p-4">
                            <CardTitle className="text-sm md:text-base font-bold">Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 md:p-5 space-y-3">
                            <div className="space-y-2 text-xs sm:text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span className="font-bold">৳{order.totalAmount - (order.deliveryCharge || 0) + (order.couponDiscountAmount || 0)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Delivery Charge</span>
                                    <span className="font-bold">৳{order.deliveryCharge || 0}</span>
                                </div>
                                {order.couponDiscountAmount > 0 && (
                                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                                        <span>Discount ({order.couponCode})</span>
                                        <span>-৳{order.couponDiscountAmount}</span>
                                    </div>
                                )}
                                <Separator className="my-1.5" />
                                <div className="flex justify-between text-sm sm:text-base">
                                    <span className="font-black">Total</span>
                                    <span className="font-black text-primary">৳{order.totalAmount}</span>
                                </div>
                            </div>
                            <Badge variant="secondary" className="w-full justify-center h-8 rounded-lg font-bold uppercase tracking-wider text-[10px]">
                                Paid via {order.paymentMethod || 'Cash on Delivery'}
                            </Badge>
                        </CardContent>
                    </Card>

                    {/* Shipping */}
                    <Card className="border border-border/80 shadow-xs rounded-xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b p-3 md:p-4">
                            <CardTitle className="text-sm md:text-base font-bold">Shipping Details</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 md:p-5 space-y-3 text-xs sm:text-sm">
                            <div className="space-y-0.5">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Recipient</p>
                                <p className="font-bold text-sm text-foreground">{order.shippingAddress?.fullName || 'N/A'}</p>
                                <p className="text-xs font-medium text-muted-foreground">{order.shippingAddress?.phone || 'N/A'}</p>
                            </div>
                            <div className="space-y-0.5 pt-2 border-t border-border/60">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Address</p>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    {order.shippingAddress?.street ? `${order.shippingAddress.street}, ` : ''}
                                    {order.shippingAddress?.city ? `${order.shippingAddress.city}, ` : ''}
                                    {order.shippingAddress?.state ? `${order.shippingAddress.state}, ` : ''}
                                    {order.shippingAddress?.zipCode || ''}
                                </p>
                            </div>
                            {order.shippingDetails?.courierName && (
                                <div className="pt-2 border-t border-border/60 space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Courier Service</p>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs text-primary">{order.shippingDetails.courierName}</span>
                                        {order.shippingDetails.trackingUrl && (
                                            <a 
                                                href={order.shippingDetails.trackingUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-xs font-bold underline text-primary"
                                            >
                                                Track External
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

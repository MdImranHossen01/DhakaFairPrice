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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { generateInvoicePDF } from '@/lib/invoice-generator';

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: session, status } = useSession();
    const router = useRouter();
    const [order, setOrder] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Review Modal State
    const [reviewItem, setReviewItem] = useState<any>(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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

    const openReviewDialog = (item: any) => {
        setReviewItem(item);
        setRating(5);
        setHoverRating(0);
        setComment('');
        setIsReviewModalOpen(true);
    };

    const handleReviewSubmit = async () => {
        if (!reviewItem) return;
        if (comment.trim().length < 5) {
            toast.error('Comment must be at least 5 characters long');
            return;
        }

        const productId = reviewItem.product?._id || reviewItem.product;
        if (!productId) {
            toast.error('Product not found for review');
            return;
        }

        setIsSubmittingReview(true);
        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: productId.toString(),
                    rating,
                    comment: comment.trim(),
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to submit review');
            }

            toast.success('Thank you! Review submitted successfully.');

            // Update item in local order state
            setOrder((prev: any) => {
                if (!prev || !Array.isArray(prev.items)) return prev;
                const updatedItems = prev.items.map((it: any) => {
                    const itPid = (it.product?._id || it.product)?.toString();
                    if (itPid === productId.toString()) {
                        return {
                            ...it,
                            isReviewed: true,
                            userReview: { rating, comment: comment.trim() },
                        };
                    }
                    return it;
                });
                return { ...prev, items: updatedItems };
            });

            setIsReviewModalOpen(false);
            setReviewItem(null);
            setComment('');
        } catch (err: any) {
            toast.error(err.message || 'Failed to submit review');
        } finally {
            setIsSubmittingReview(false);
        }
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
                    <Card className="border border-border/80 shadow-xs rounded-xl overflow-hidden" id="order-items-card">
                        <CardHeader className="bg-muted/30 border-b p-3 md:p-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm md:text-base font-bold flex items-center gap-2">
                                <Package className="h-4 w-4 text-primary" /> Order Items ({Array.isArray(order?.items) ? order.items.length : 0})
                            </CardTitle>
                            {isReviewable && (
                                <span className="text-[11px] text-muted-foreground hidden sm:inline-block">
                                    Click &quot;Write Review&quot; on any item to review separately
                                </span>
                            )}
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border/60">
                                {(Array.isArray(order?.items) ? order.items : []).map((item: any, idx: number) => (
                                    <div key={idx} className="p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
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
                                        </div>

                                        {/* Action / Review Status */}
                                        <div className="shrink-0 flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                                            {isReviewable ? (
                                                item.isReviewed ? (
                                                    <div className="flex flex-col sm:items-end gap-0.5">
                                                        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold gap-1 py-1 px-2.5 rounded-lg text-xs">
                                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Rated {item.userReview?.rating || 5}★
                                                        </Badge>
                                                        {item.userReview?.comment && (
                                                            <p className="text-[11px] text-muted-foreground italic max-w-[200px] truncate">
                                                                &quot;{item.userReview.comment}&quot;
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <Button 
                                                        size="sm" 
                                                        className="rounded-lg font-bold gap-1.5 text-xs h-8 px-3 shadow-xs bg-amber-500 hover:bg-amber-600 text-white cursor-pointer"
                                                        onClick={() => openReviewDialog(item)}
                                                    >
                                                        <Star className="h-3.5 w-3.5 fill-white text-white" /> Write Review
                                                    </Button>
                                                )
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] uppercase font-semibold opacity-60">
                                                    {order.status}
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
                                        <span>Coupon Discount</span>
                                        <span>-৳{order.couponDiscountAmount}</span>
                                    </div>
                                )}
                                {order.walletAmountUsed > 0 && (
                                    <div className="flex justify-between text-amber-600 dark:text-amber-400 font-semibold">
                                        <span>Wallet Applied</span>
                                        <span>-৳{order.walletAmountUsed}</span>
                                    </div>
                                )}
                                <Separator />
                                <div className="flex justify-between text-sm sm:text-base font-black">
                                    <span>Total Amount</span>
                                    <span className="text-primary">৳{order.totalAmount - (order.walletAmountUsed || 0)}</span>
                                </div>
                            </div>

                            <div className="pt-2">
                                <Badge variant="outline" className="w-full justify-center py-1.5 text-xs font-semibold">
                                    Payment Method: {order.paymentMethod} ({order.paymentStatus || 'Pending'})
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Shipping Address */}
                    <Card className="border border-border/80 shadow-xs rounded-xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b p-3 md:p-4">
                            <CardTitle className="text-sm md:text-base font-bold flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" /> Delivery Address
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 md:p-5 space-y-1.5 text-xs sm:text-sm">
                            <p className="font-bold text-foreground">{order.shippingAddress?.fullName}</p>
                            <p className="text-muted-foreground">{order.shippingAddress?.phone}</p>
                            <p className="text-muted-foreground">{order.shippingAddress?.street}</p>
                            <p className="text-muted-foreground">
                                {[order.shippingAddress?.city, order.shippingAddress?.division, order.shippingAddress?.country].filter(Boolean).join(', ')}
                            </p>

                            {order.shippingDetails?.courierName && (
                                <div className="mt-4 pt-3 border-t space-y-1">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Assigned Courier</span>
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

            {/* Individual Product Review Modal */}
            <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl p-5 md:p-6">
                    <DialogHeader>
                        <DialogTitle className="text-base md:text-lg font-bold flex items-center gap-2">
                            <Star className="h-5 w-5 fill-amber-400 text-amber-500" /> Write a Product Review
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Share your verified experience to help other customers.
                        </DialogDescription>
                    </DialogHeader>

                    {reviewItem && (
                        <div className="space-y-4 py-2">
                            {/* Product Info Preview */}
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
                                <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden shrink-0 border border-border/60">
                                    <Image
                                        src={reviewItem.image || '/placeholder.png'}
                                        alt={reviewItem.name}
                                        width={48}
                                        height={48}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-xs sm:text-sm truncate text-foreground">{reviewItem.name}</h4>
                                    <p className="text-xs text-primary font-bold">৳{reviewItem.price}</p>
                                </div>
                            </div>

                            {/* 5-Star Interactive Selector */}
                            <div className="space-y-1 text-center py-1">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                                    Your Rating
                                </label>
                                <div className="flex items-center justify-center gap-1.5 pt-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            className="p-1 rounded-md transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            onClick={() => setRating(star)}
                                        >
                                            <Star
                                                className={`h-7 w-7 transition-colors ${
                                                    (hoverRating || rating) >= star
                                                        ? 'fill-amber-400 text-amber-500'
                                                        : 'text-muted-foreground/30 stroke-muted-foreground'
                                                }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 h-4">
                                    {['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][(hoverRating || rating) - 1]}
                                </p>
                            </div>

                            {/* Feedback Textarea */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground">Your Review & Experience</label>
                                <Textarea
                                    rows={4}
                                    placeholder="Write your honest thoughts about product quality, size, delivery, etc..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    className="text-xs sm:text-sm rounded-xl resize-none"
                                />
                                <p className="text-[11px] text-muted-foreground">Minimum 5 characters required.</p>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex sm:justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isSubmittingReview}
                            onClick={() => setIsReviewModalOpen(false)}
                            className="rounded-xl font-medium"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={isSubmittingReview || comment.trim().length < 5}
                            onClick={handleReviewSubmit}
                            className="rounded-xl font-bold bg-primary text-primary-foreground gap-1.5 px-4 cursor-pointer"
                        >
                            {isSubmittingReview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4 fill-current" />}
                            Submit Review
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

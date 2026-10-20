'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter
} from '@/components/ui/card';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2, ShoppingBag, CheckCircle2, Truck, CreditCard,
  Plus, Minus, X, ArrowRight, PartyPopper, XCircle, Award, AlertTriangle, Globe
} from 'lucide-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { normalizePhoneNumber } from '@/lib/utils';
import { resellerFbEvent, resellerTtEvent, waitForResellerPixel } from '@/lib/reseller-pixel';

const checkoutSchema = z.object({
  fullName: z.string().min(2, 'নাম আবশ্যক'),
  phone: z.string().regex(/^(?:\+88|88|\+৮৮|৮৮|0088|০০৮৮)?(?:01|০১)[3-9৩-৯][\d০-৯]{8}$/, 'সঠিক মোবাইল নম্বর দিন (যেমন: 01XXXXXXXXX)'),
  street: z.string().min(5, 'ঠিকানা আবশ্যক'),
  deliveryArea: z.enum(['inside', 'outside']),
  paymentMethod: z.string().min(1),
  notes: z.string().optional(),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

interface CartItem {
  productId: string;
  resellerProductId: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  quantity: number;
  color?: string;
  size?: string;
  uploadedBy?: string | null;
  sellerName?: string;
}

interface Props {
  subdomain: string;
  storeInfo: {
    storeName: string;
    deliveryInside: number;
    deliveryOutside: number;
    freeDeliveryThreshold?: number;
    loyaltyConfig?: {
      isEnabled: boolean;
      activationThreshold: number;
      rewardPercentage: number;
    };
    paymentConfig?: {
      bkash?: { number: string; active: boolean; qrCode?: string };
      nagad?: { number: string; active: boolean; qrCode?: string };
      rocket?: { number: string; active: boolean; qrCode?: string };
      banglaQr?: { qrCode?: string; active: boolean };
      instructions?: string;
    };
    cashOnDeliveryActive?: boolean;
    sslcommerzActive?: boolean;
    stripeActive?: boolean;
    metaPixelId?: string;
    tiktokPixelId?: string;
  };
  resellerId: string;
}

export function ResellerCheckout({ subdomain, storeInfo, resellerId }: Props) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailModal, setShowFailModal] = useState(false);
  const [orderId, setOrderId] = useState('');

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Manual Payment Verification Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [manualDetails, setManualDetails] = useState({
    senderNumber: '',
    transactionId: '',
  });
  const [paymentDetailTab, setPaymentDetailTab] = useState<'phone' | 'trx'>('phone');

  // Loyalty & Wallet state
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const [useWallet, setUseWallet] = useState(false);

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onChange',
    defaultValues: { deliveryArea: 'outside', paymentMethod: 'COD', notes: '' },
  });

  const deliveryArea = form.watch('deliveryArea');
  const paymentMethod = form.watch('paymentMethod');
  const watchedPhone = form.watch('phone');
  const watchedFullName = form.watch('fullName');
  const watchedStreet = form.watch('street');

  const hasManualPayment = Boolean(
    storeInfo.paymentConfig?.bkash?.active ||
    storeInfo.paymentConfig?.nagad?.active ||
    storeInfo.paymentConfig?.rocket?.active ||
    storeInfo.paymentConfig?.banglaQr?.active
  );

  useEffect(() => {
    if (storeInfo.cashOnDeliveryActive === false && form.getValues('paymentMethod') === 'COD') {
      if (storeInfo.sslcommerzActive) {
        form.setValue('paymentMethod', 'sslcommerz');
      } else if (hasManualPayment) {
        form.setValue('paymentMethod', 'Manual');
      }
    }
  }, [storeInfo, hasManualPayment]);

  // Reset manual payment details if payment method changes away from Manual
  useEffect(() => {
    if (paymentMethod !== 'Manual') {
      setSelectedMethod(null);
      setManualDetails({ senderNumber: '', transactionId: '' });
    }
  }, [paymentMethod]);

  useEffect(() => {
    const cartKey = `rscart_${subdomain}`;
    const loadCart = () => {
      try {
        const raw = localStorage.getItem(cartKey);
        const data = raw ? JSON.parse(raw) : [];
        if (Array.isArray(data)) setCart(data);
        else setCart([]);
      } catch {
        setCart([]);
      }
    };
    loadCart();
    window.addEventListener('reseller-cart-updated', loadCart);
    return () => window.removeEventListener('reseller-cart-updated', loadCart);
  }, [subdomain]);

  // Fetch customer loyalty and profile when phone number is entered
  useEffect(() => {
    if (!watchedPhone || watchedPhone.trim().length < 11) {
      setCustomerProfile(null);
      return;
    }

    const fetchLoyalty = async () => {
      try {
        const res = await fetch(`/api/store/${subdomain}/customer-loyalty?phone=${encodeURIComponent(watchedPhone.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (data.customer) {
            setCustomerProfile(data.customer);
          } else {
            setCustomerProfile(null);
          }
        }
      } catch (err) {
        console.error('Error fetching loyalty details:', err);
      }
    };

    const timer = setTimeout(fetchLoyalty, 600);
    return () => clearTimeout(timer);
  }, [watchedPhone, subdomain]);

  // Fire InitiateCheckout when cart loads.
  // Mirrors mother shop's pattern exactly:
  //   waitForResellerPixel().then(() => resellerFbEvent(...))
  //   ↕ same as mother's:
  //   waitForFbq().then(() => fbEvent(...))
  // resellerFbEvent handles both CAPI and browser pixel internally.
  const hasTrackedInitiate = useRef(false);
  useEffect(() => {
    if (cart.length === 0 || hasTrackedInitiate.current) return;

    const validItems = cart.filter(i => i.resellerProductId || i.productId);
    if (validItems.length === 0) return;

    hasTrackedInitiate.current = true;

    const total = validItems.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
    const checkoutPayload = {
      content_ids: validItems.map(i => i.resellerProductId || i.productId),
      content_type: 'product',
      value: total,
      currency: 'BDT',
      num_items: validItems.reduce((s, i) => s + (Number(i.quantity) || 1), 0),
      contents: validItems.map(i => ({
        id: i.resellerProductId || i.productId,
        quantity: Number(i.quantity) || 1,
        item_price: Number(i.price) || 0,
        price: Number(i.price) || 0,
      })),
    };

    const normalizedPhone = watchedPhone ? normalizePhoneNumber(watchedPhone) || watchedPhone : undefined;
    const initiateUserData = {
      ph: normalizedPhone,
      em: customerProfile?.email || undefined,
      country: 'bd',
    };

    // Wait for reseller pixel then fire — resellerFbEvent handles CAPI + browser internally
    waitForResellerPixel(storeInfo.metaPixelId || '').then(() => {
      resellerFbEvent(subdomain, 'InitiateCheckout', checkoutPayload, initiateUserData, undefined, storeInfo.metaPixelId);
      resellerTtEvent(subdomain, 'InitiateCheckout', checkoutPayload, initiateUserData);
    });
  }, [cart, subdomain, watchedPhone, customerProfile?.email]);

  // Pricing calculations
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const freeDeliveryThreshold = storeInfo.freeDeliveryThreshold || 0;
  const isFreeDelivery = freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold;
  const deliveryCharge = isFreeDelivery
    ? 0
    : (deliveryArea === 'inside' ? storeInfo.deliveryInside : storeInfo.deliveryOutside);

  const totalProductDiscount = cart.reduce((s, i) => {
    if (i.originalPrice && i.originalPrice > i.price) {
      return s + (i.originalPrice - i.price) * i.quantity;
    }
    return s;
  }, 0);

  const baseTotal = subtotal + deliveryCharge;
  const totalAfterCoupon = Math.max(0, baseTotal - couponDiscount);

  // Loyalty calculations
  const loyaltyConfig = storeInfo.loyaltyConfig || { isEnabled: false, activationThreshold: 5000, rewardPercentage: 5 };
  const walletBalance = customerProfile?.walletBalance || 0;
  const walletAmountToUse = (useWallet && walletBalance > 0) ? Math.min(walletBalance, totalAfterCoupon) : 0;
  const finalTotal = Math.max(0, totalAfterCoupon - walletAmountToUse);

  // Seller isolation calculations
  const sellerOrigins = Array.from(new Set(cart.map(i => (i as any).uploadedBy ? String((i as any).uploadedBy) : 'mother')));
  const hasMultipleSellers = sellerOrigins.length > 1;

  const keepOnlySeller = (targetSellerId: string) => {
    const updated = cart.filter(item => {
      const sId = (item as any).uploadedBy ? String((item as any).uploadedBy) : 'mother';
      return sId === targetSellerId;
    });
    setCart(updated);
    try {
      localStorage.setItem(`rscart_${subdomain}`, JSON.stringify(updated));
      window.dispatchEvent(new Event('reseller-cart-updated'));
      toast.success('কার্ট ফিল্টার করা হয়েছে');
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate potential reward
  let potentialReward = 0;
  if (loyaltyConfig.isEnabled) {
    const isAlreadyActive = customerProfile?.isLoyaltyActive;
    const willBeActive = isAlreadyActive || (totalAfterCoupon >= (loyaltyConfig.activationThreshold || 5000));
    if (willBeActive) {
      const payableAmount = totalAfterCoupon - walletAmountToUse;
      potentialReward = Math.floor(payableAmount * ((loyaltyConfig.rewardPercentage || 5) / 100));
    }
  }

  // Handle Coupon Apply
  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('দয়া করে একটি কুপন কোড লিখুন');
      return;
    }
    setApplyingCoupon(true);
    try {
      const res = await fetch(`/api/store/${subdomain}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.trim(),
          totalAmount: subtotal
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCouponDiscount(data.discountAmount);
        setAppliedCoupon(data.code);
        toast.success(`কুপন "${data.code}" সফলভাবে যুক্ত হয়েছে! ৳${data.discountAmount} ছাড় পেয়েছেন`);
      } else {
        toast.error(data.message || 'ভুল বা মেয়াদোত্তীর্ণ কুপন কোড');
      }
    } catch (err: any) {
      toast.error(err.message || 'কুপন যাচাই করতে সমস্যা হয়েছে');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponCode('');
    toast.info('কুপন সরানো হয়েছে');
  };

  const updateQuantity = (item: CartItem, delta: number) => {
    const cartKey = `rscart_${subdomain}`;
    const existing = [...cart];
    const idx = existing.findIndex(
      i => i.resellerProductId === item.resellerProductId && i.color === item.color && i.size === item.size
    );
    if (idx < 0) return;
    const newQty = existing[idx].quantity + delta;
    if (newQty <= 0) {
      existing.splice(idx, 1);
    } else {
      existing[idx] = { ...existing[idx], quantity: newQty };
    }
    setCart(existing);
    localStorage.setItem(cartKey, JSON.stringify(existing));
    window.dispatchEvent(new Event('reseller-cart-updated'));
  };

  const removeItem = (item: CartItem) => {
    const cartKey = `rscart_${subdomain}`;
    const updated = cart.filter(
      i => !(i.resellerProductId === item.resellerProductId && i.color === item.color && i.size === item.size)
    );
    setCart(updated);
    localStorage.setItem(cartKey, JSON.stringify(updated));
    window.dispatchEvent(new Event('reseller-cart-updated'));
    toast.info(`${item.name} সরানো হয়েছে`);
  };

  // Abandoned Carts Tracking
  useEffect(() => {
    if (cart.length === 0 || submitting || showSuccessModal) return;
    if (!watchedPhone || watchedPhone.trim().length < 11 || !watchedFullName || watchedFullName.trim().length < 2) return;

    const syncAbandonedCart = async () => {
      try {
        await fetch('/api/cart/abandoned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: watchedFullName,
            phone: watchedPhone,
            street: watchedStreet,
            deliveryArea: deliveryArea,
            resellerId: resellerId,
            items: cart.map(item => ({
              product: item.resellerProductId,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              image: item.image,
              color: item.color,
              size: item.size
            })),
            totalAmount: finalTotal
          })
        });
      } catch (error) {
        console.error('Failed to sync abandoned cart:', error);
      }
    };

    const timer = setTimeout(syncAbandonedCart, 2000);
    return () => clearTimeout(timer);
  }, [watchedFullName, watchedPhone, watchedStreet, deliveryArea, cart, finalTotal, submitting, showSuccessModal, resellerId]);

  const onSubmit = async (values: CheckoutValues) => {
    if (cart.length === 0) return toast.error('কার্টে কোনো পণ্য নেই');
    if (hasMultipleSellers) {
      Swal.fire({
        title: 'ভিন্ন শপের পণ্য!',
        text: 'আপনার কার্টে একাধিক শপ বা বিক্রেতার পণ্য রয়েছে। প্রতিটি শপের পণ্য আলাদা ডেলিভারি লোকেশন থেকে পাঠানো হয়, তাই একসাথে অর্ডার সম্পন্ন করা সম্ভব নয়। অনুগ্রহ করে আলাদাভাবে অর্ডার করুন।',
        icon: 'warning',
        confirmButtonText: 'ঠিক আছে',
        confirmButtonColor: '#f97316'
      });
      return;
    }
    if (values.paymentMethod === 'Manual') {
      if (!selectedMethod?.id) {
        toast.error('দয়া করে পেমেন্ট মেথড নির্বাচন করুন এবং ভেরিফিকেশন তথ্য দিন');
        setShowPaymentModal(true);
        return;
      }
      if (!manualDetails.senderNumber.trim() && !manualDetails.transactionId.trim()) {
        toast.error('দয়া করে আপনার প্রেরক নম্বর বা TrxID দিন');
        setShowPaymentModal(true);
        return;
      }
    }
    setSubmitting(true);
    try {
      const normalizedPhone = normalizePhoneNumber(values.phone) || values.phone;
      const res = await fetch(`/api/store/${subdomain}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            name: values.fullName,
            phone: normalizedPhone,
            email: customerProfile?.email || `${normalizedPhone}@store.com`,
            address: { street: values.street, city: values.deliveryArea === 'inside' ? 'Dhaka' : 'Outside Dhaka' },
          },
          items: cart,
          deliveryArea: values.deliveryArea,
          deliveryCharge,
          subtotal,
          couponCode: appliedCoupon || undefined,
          couponDiscountAmount: couponDiscount,
          useWallet,
          walletAmountUsed: walletAmountToUse,
          totalAmount: finalTotal,
          paymentMethod: values.paymentMethod,
          manualPaymentDetails: values.paymentMethod === 'Manual' ? {
            methodName: selectedMethod?.id,
            senderNumber: manualDetails.senderNumber,
            transactionId: manualDetails.transactionId,
          } : undefined,
          notes: values.notes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const orderShortId = data.shortId || data.orderId;
        const nameParts = (values.fullName || '').trim().split(/\s+/);
        const validItems = cart.filter(i => i.resellerProductId || i.productId);

        const purchaseEventData = {
          value: data.totalAmount ?? finalTotal,
          currency: 'BDT',
          content_ids: validItems.map(i => i.resellerProductId || i.productId),
          content_type: 'product',
          num_items: validItems.reduce((s, i) => s + (Number(i.quantity) || 1), 0),
          contents: validItems.map(i => ({
            id: i.resellerProductId || i.productId,
            quantity: Number(i.quantity) || 1,
            item_price: Number(i.price) || 0,
            price: Number(i.price) || 0,
          })),
        };

        const purchaseUserData: any = {
          em: customerProfile?.email || '',
          ph: values.phone,
          fn: nameParts[0] || '',
          ln: nameParts.slice(1).join(' ') || '',
          country: 'bd',
        };

        if (values.deliveryArea === 'inside') {
          purchaseUserData.ct = 'Dhaka';
          purchaseUserData.st = 'Dhaka';
        }

        // Fire Purchase — same pattern as mother shop's onSubmit tracking:
        //   resellerFbEvent handles CAPI + browser pixel internally
        try {
          resellerFbEvent(subdomain, 'Purchase', purchaseEventData, purchaseUserData, orderShortId, storeInfo.metaPixelId);
          resellerTtEvent(subdomain, 'Purchase', purchaseEventData, purchaseUserData, orderShortId);
        } catch (trackingErr) {
          console.error('[Reseller Tracking Error]', trackingErr);
        }

        if (values.paymentMethod === 'stripe') {
          const stripeRes = await fetch('/api/payment/stripe/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: data.orderId, subdomain }),
          });
          const stripeData = await stripeRes.json();
          if (stripeRes.ok && stripeData.url) {
            localStorage.removeItem(`rscart_${subdomain}`);
            setCart([]);
            window.location.href = stripeData.url;
            return;
          } else {
            toast.error(stripeData.error || 'স্ট্রাইপ পেমেন্ট শুরু করতে ব্যর্থ হয়েছে');
          }
        } else {
          localStorage.removeItem(`rscart_${subdomain}`);
          setCart([]);
          setOrderId(orderShortId);
          setShowSuccessModal(true);
        }
      } else {
        toast.error(data.error || 'অর্ডার করতে সমস্যা হয়েছে');
        setShowFailModal(true);
      }
    } catch {
      toast.error('নেটওয়ার্ক সমস্যা হয়েছে');
      setShowFailModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.length === 0 && !showSuccessModal) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold mb-2">আপনার কার্ট খালি</h2>
        <p className="text-muted-foreground text-sm mb-6">চেকআউট করতে প্রথমে কার্টে কিছু পণ্য যোগ করুন।</p>
        <Button asChild className="w-full">
          <Link href="/">শপিং শুরু করুন</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      {hasMultipleSellers && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-900 text-sm">ভিন্ন ভিন্ন বিক্রেতার পণ্য কার্টে রয়েছে</h4>
              <p className="text-xs text-amber-800 text-muted-foreground mt-0.5">
                আপনার কার্টে একাধিক শপ বা বিক্রেতার পণ্য রয়েছে। প্রতিটি শপের পণ্য আলাদা ডেলিভারি লোকেশন থেকে পাঠানো হয়, তাই একসাথে অর্ডার সম্পন্ন করা যাবে না। অনুগ্রহ করে আলাদাভাবে অর্ডার করুন।
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {sellerOrigins.map((sId, sIdx) => {
              const count = cart.filter(i => ((i as any).uploadedBy ? String((i as any).uploadedBy) : 'mother') === sId).length;
              return (
                <Button
                  key={sId}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-xs border-amber-500/40 hover:bg-amber-500/20 text-amber-950 font-semibold"
                  onClick={() => keepOnlySeller(sId)}
                >
                  শুধুমাত্র প্যাকেজ {sIdx + 1} ({count}টি পণ্য) রাখুন
                </Button>
              );
            })}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
        {/* Left Column: Cart Items (Desktop Sticky) */}
        <div className="block lg:sticky lg:top-24 self-start space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                আপনার অর্ডারকৃত পণ্যসমূহ ({cart.reduce((s, i) => s + i.quantity, 0)})
              </CardTitle>
              <CardDescription>যে পণ্যগুলো আপনি কিনতে যাচ্ছেন।</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.map((item, idx) => (
                <div key={idx} className="flex gap-3 py-2 border-b last:border-0 items-center">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">ছবি নেই</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    {(item.color || item.size) && (
                      <p className="text-xs text-muted-foreground">
                        {[item.color, item.size].filter(Boolean).join(' / ')}
                      </p>
                    )}
                    <p className="text-sm font-bold text-primary mt-0.5">৳{item.price}</p>
                  </div>
                  <div className="flex items-center gap-1 border rounded-lg p-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => updateQuantity(item, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => updateQuantity(item, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(item)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </CardContent>
            <CardFooter className="pt-2 border-t flex justify-between">
              <span className="text-sm text-muted-foreground">আইটেম সাবটোটাল</span>
              <span className="font-bold text-base">৳{subtotal}</span>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column: Checkout Form & Pricing Summary */}
        <div className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Customer Info Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    ডেলিভারি তথ্য
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>পূর্ণ নাম</FormLabel>
                        <FormControl>
                          <Input placeholder="আপনার পূর্ণ নাম লিখুন" {...field} className="h-11 focus-visible:ring-primary/20" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>মোবাইল নম্বর</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="যেমন: 017XXXXXXXX" 
                            {...field} 
                            onChange={(e) => {
                              const sanitized = e.target.value.replace(/[^\d০-৯+]/g, '');
                              field.onChange(sanitized);
                            }}
                            onBlur={(e) => {
                              field.onBlur();
                              const norm = normalizePhoneNumber(e.target.value);
                              if (norm) {
                                form.setValue('phone', norm, { shouldValidate: true });
                              }
                            }}
                            className="h-11 focus-visible:ring-primary/20" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deliveryArea"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>ডেলিভারি এলাকা</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col sm:flex-row gap-3"
                          >
                            <FormItem className="flex items-center space-x-2 space-y-0 border rounded-lg p-3 flex-1 cursor-pointer hover:bg-muted/50 transition-colors">
                              <FormControl>
                                <RadioGroupItem value="inside" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer text-xs sm:text-sm">
                                ঢাকার ভিতরে — {isFreeDelivery ? <span className="text-green-600 font-bold">ফ্রি</span> : `৳${storeInfo.deliveryInside}`}
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0 border rounded-lg p-3 flex-1 cursor-pointer hover:bg-muted/50 transition-colors">
                              <FormControl>
                                <RadioGroupItem value="outside" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer text-xs sm:text-sm">
                                ঢাকার বাইরে — {isFreeDelivery ? <span className="text-green-600 font-bold">ফ্রি</span> : `৳${storeInfo.deliveryOutside}`}
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>সম্পূর্ণ ঠিকানা</FormLabel>
                        <FormControl>
                          <Input placeholder="গ্রাম/বাসা নং, রোড নং, এলাকা, থানা, জেলা" {...field} className="h-11 focus-visible:ring-primary/20" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>বিশেষ নির্দেশনা (ঐচ্ছিক)</FormLabel>
                        <FormControl>
                          <Input placeholder="ডেলিভারি সংক্রান্ত কোনো নির্দেশনা থাকলে লিখুন" {...field} className="h-11 focus-visible:ring-primary/20" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Order Details Breakdown Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Order Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Coupon Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Coupon Code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        disabled={!!appliedCoupon || applyingCoupon}
                        className="h-10 text-xs uppercase"
                      />
                      {appliedCoupon ? (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={removeCoupon}
                          className="h-10 px-3"
                        >
                          Remove
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => applyCoupon()}
                          disabled={applyingCoupon || !couponCode}
                          className="h-10 px-4"
                        >
                          {applyingCoupon ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Apply'}
                        </Button>
                      )}
                    </div>
                    {appliedCoupon && (
                      <p className="text-[11px] text-green-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Coupon "{appliedCoupon}" active!
                      </p>
                    )}
                  </div>

                  {/* Loyalty / Customer Token Application */}
                  {loyaltyConfig.isEnabled && customerProfile && walletBalance > 0 && (
                    <div className="p-3 rounded-lg border bg-primary/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="reseller-wallet-use"
                            checked={useWallet}
                            onChange={(e) => setUseWallet(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <label htmlFor="reseller-wallet-use" className="text-xs font-bold cursor-pointer">
                            লয়্যালটি রিওয়ার্ড ব্যালেন্স ব্যবহার করুন
                          </label>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-bold text-green-600 bg-green-50">
                          উপলব্ধ: ৳{walletBalance}
                        </Badge>
                      </div>
                      {useWallet && (
                        <p className="text-[10px] text-muted-foreground pl-6">
                          অর্ডারে ৳{walletAmountToUse} টোকেন ডিসকাউন্ট হিসেবে অ্যাডজাস্ট করা হয়েছে।
                        </p>
                      )}
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>৳{Math.round(subtotal + totalProductDiscount)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Product Discount</span>
                      <span>- ৳{Math.round(totalProductDiscount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Coupon Discount</span>
                      <span className={couponDiscount > 0 ? "text-green-600 font-bold" : ""}>
                        - ৳{Math.round(couponDiscount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className={isFreeDelivery ? "text-green-600 font-black" : "text-primary font-bold"}>
                        {isFreeDelivery ? 'FREE' : `৳${deliveryCharge}`}
                      </span>
                    </div>
                    {isFreeDelivery && (
                      <p className="text-[10px] text-green-600 font-bold text-right -mt-1">
                        Free shipping applied (Order ≥ ৳{freeDeliveryThreshold})
                      </p>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Loyalty Discount</span>
                      <span className={walletAmountToUse > 0 ? "text-primary font-bold" : ""}>
                        - ৳{Math.round(walletAmountToUse)}
                      </span>
                    </div>

                    <Separator className="mt-4" />

                    <div className="flex justify-between text-lg font-black pt-2">
                      <span>Final Total</span>
                      <span className="text-primary">৳{Math.round(finalTotal)}</span>
                    </div>

                    {potentialReward > 0 && (
                      <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                          <Award className="h-3.5 w-3.5" /> Loyalty Perk
                        </p>
                        <p className="text-xs font-bold">
                          এই অর্ডার সম্পন্ন হলে আপনি <span className="text-primary font-black">৳{potentialReward}</span> রিওয়ার্ড টোকেন পাবেন!
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method Card */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-2"
                          >
                            {storeInfo.cashOnDeliveryActive !== false && (
                              <FormItem className="flex items-center space-x-3 space-y-0 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                                <FormControl>
                                  <RadioGroupItem value="COD" />
                                </FormControl>
                                <FormLabel className="font-bold flex-1 cursor-pointer">
                                  Cash on Delivery (COD)
                                  <p className="text-xs font-normal text-muted-foreground mt-1">পণ্য পাওয়ার পর টাকা দিন।</p>
                                </FormLabel>
                              </FormItem>
                            )}
                            {storeInfo.sslcommerzActive && (
                              <FormItem className="flex items-center space-x-3 space-y-0 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                                <FormControl>
                                  <RadioGroupItem value="sslcommerz" />
                                </FormControl>
                                <FormLabel className="font-bold flex-1 cursor-pointer">
                                  Online Payment (SSLCommerz)
                                  <p className="text-xs font-normal text-muted-foreground mt-1">কার্ড, নেট ব্যাংকিং বা এমএফএস দিয়ে তাৎক্ষণিক পেমেন্ট করুন।</p>
                                  <Badge variant="secondary" className="mt-2 text-[10px] block w-fit">Recommended</Badge>
                                </FormLabel>
                              </FormItem>
                            )}
                            {hasManualPayment && (
                              <FormItem className="flex items-center space-x-3 space-y-0 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                                <FormControl>
                                  <RadioGroupItem value="Manual" />
                                </FormControl>
                                <FormLabel className="font-bold flex-1 cursor-pointer">
                                  Manual Payment (MFS / Bangla QR)
                                  <p className="text-xs font-normal text-muted-foreground mt-1">ম্যানুয়ালি টাকা পাঠিয়ে অথবা কিউআর স্ক্যান করে পেমেন্ট ভেরিফাই করুন।</p>
                                </FormLabel>
                              </FormItem>
                            )}
                            {storeInfo.stripeActive && (
                              <FormItem className="flex items-center space-x-3 space-y-0 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                                <FormControl>
                                  <RadioGroupItem value="stripe" />
                                </FormControl>
                                <FormLabel className="font-bold flex-1 cursor-pointer">
                                  Stripe (Card / Mobile Payment)
                                  <Badge variant="secondary" className="mt-2 text-[10px] block w-fit">Recommended</Badge>
                                </FormLabel>
                              </FormItem>
                            )}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Manual Payment Option Selection (Cards) - Exact same as Mother Shop */}
                  {paymentMethod === 'Manual' && storeInfo.paymentConfig && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top duration-300">
                      {['bkash', 'nagad', 'rocket', 'banglaQr'].map((method) => {
                        const config = (storeInfo.paymentConfig as any)?.[method];
                        if (!config?.active) return null;
                        const isSelected = selectedMethod?.id === method;
                        return (
                          <div
                            key={method}
                            onClick={() => {
                              setSelectedMethod({ id: method, ...config });
                              setShowPaymentModal(true);
                            }}
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center gap-2 hover:bg-muted/50 ${
                              isSelected ? 'border-primary bg-primary/5' : 'border-muted'
                            }`}
                          >
                            <div className="h-10 w-10 flex items-center justify-center">
                              {method === 'banglaQr' ? (
                                <Globe className="h-8 w-8 text-primary" />
                              ) : (
                                <Image
                                  src={`/assets/${method}logo.webp`}
                                  alt={method || "Payment MFS Logo"}
                                  width={40}
                                  height={40}
                                  className="h-full w-auto object-contain"
                                />
                              )}
                            </div>
                            <p className="text-[10px] font-bold uppercase">{method === 'banglaQr' ? 'Bangla QR' : method}</p>
                            {isSelected && (
                              <div className="text-[8px] font-bold text-primary flex items-center gap-1 mt-1">
                                <CheckCircle2 className="h-2 w-2" /> Details Added
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Validation Message for Manual Payment */}
                  {paymentMethod === 'Manual' && !selectedMethod?.id && (
                    <p className="text-[10px] text-destructive font-bold text-center mt-2 animate-pulse">
                      দয়া করে একটি মেথড সিলেক্ট করে পেমেন্ট ভেরিফিকেশন তথ্য দিন!
                    </p>
                  )}
                </CardContent>
                <CardFooter className="pt-2 border-t flex flex-col gap-3">
                  <Button
                    type="submit"
                    className="w-full text-base py-6 font-bold"
                    disabled={submitting || hasMultipleSellers}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        অর্ডার প্রসেস হচ্ছে...
                      </>
                    ) : hasMultipleSellers ? (
                      <>
                        <AlertTriangle className="mr-2 h-5 w-5 text-amber-300" />
                        ভিন্ন শপের পণ্য রয়েছে — আলাদা অর্ডার করুন
                      </>
                    ) : (
                      <>
                        অর্ডার সম্পন্ন করুন — ৳{Math.round(finalTotal)}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </div>
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <PartyPopper className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-xl font-bold text-center">
              অর্ডার সফলভাবে গৃহীত হয়েছে!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm text-muted-foreground">
            <p>আপনার অর্ডারের জন্য ধন্যবাদ। আমাদের টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে।</p>
            {orderId && (
              <div className="bg-muted p-3 rounded-lg font-mono font-bold text-foreground text-base">
                অর্ডার আইডি: #{orderId}
              </div>
            )}
            {potentialReward > 0 && (
              <p className="text-xs text-green-600 font-bold">
                🎉 এই অর্ডার ডেলিভারি সম্পন্ন হলে আপনার একাউন্টে ৳{potentialReward} লয়্যালটি টোকেন জমা হবে!
              </p>
            )}
          </div>
          <DialogFooter className="sm:justify-center">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/">আরও শপিং করুন</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fail Modal */}
      <Dialog open={showFailModal} onOpenChange={setShowFailModal}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <DialogTitle className="text-xl font-bold text-center text-destructive">
              অর্ডার সম্পন্ন করা যায়নি
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            <p>একটি সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন অথবা সরাসরি আমাদের সাথে যোগাযোগ করুন।</p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button variant="outline" onClick={() => setShowFailModal(false)}>
              আবার চেষ্টা করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Payment Verification Modal - Identical to Mother Shop */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[90vh]">
          <DialogHeader className="py-4 px-6 bg-gradient-to-br from-primary to-primary/80 text-white relative shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-white rounded-xl p-1.5 shadow-md shrink-0 flex items-center justify-center">
                {selectedMethod?.id === 'banglaQr' ? (
                  <Globe className="h-6 w-6 text-primary" />
                ) : (
                  <Image
                    src={`/assets/${selectedMethod?.id}logo.webp`}
                    alt={selectedMethod?.id || "Payment Method Logo"}
                    width={40}
                    height={40}
                    className="h-full w-auto object-contain"
                  />
                )}
              </div>
              <div className="text-left">
                <DialogTitle className="text-base md:text-lg font-black uppercase tracking-tight">
                  {selectedMethod?.id === 'banglaQr' ? 'Pay via Bangla QR' : `Pay via ${selectedMethod?.id}`}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-h-[60vh] pr-2">
            {/* Payment Info */}
            {selectedMethod?.id === 'banglaQr' ? (
              <div className="relative bg-gradient-to-b from-primary/10 via-primary/5 to-transparent rounded-3xl p-4 border-2 border-primary/20 flex flex-col items-center text-center shadow-inner">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary">Interoperable Universal QR</span>
                </div>

                {/* QR Frame with stylish scanner corners */}
                <div className="relative p-2.5 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border-2 border-primary/20">
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br" />

                  <Image
                    src={selectedMethod?.qrCode || '/assets/placeholder-qr.png'}
                    alt="Bangla QR"
                    width={180}
                    height={180}
                    className="h-44 w-44 object-contain rounded-lg"
                  />
                </div>

                {/* Supported apps badges */}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-1 max-w-[320px]">
                  <Badge variant="outline" className="text-[9px] font-bold bg-white/70 dark:bg-zinc-800 border-primary/20">bKash</Badge>
                  <Badge variant="outline" className="text-[9px] font-bold bg-white/70 dark:bg-zinc-800 border-primary/20">Nagad</Badge>
                  <Badge variant="outline" className="text-[9px] font-bold bg-white/70 dark:bg-zinc-800 border-primary/20">Rocket</Badge>
                  <Badge variant="outline" className="text-[9px] font-bold bg-white/70 dark:bg-zinc-800 border-primary/20">Citytouch</Badge>
                  <Badge variant="outline" className="text-[9px] font-bold bg-white/70 dark:bg-zinc-800 border-primary/20">Cellfin</Badge>
                  <Badge variant="outline" className="text-[9px] font-bold bg-white/70 dark:bg-zinc-800 border-primary/20">যেকোনো ব্যাংক</Badge>
                </div>

                <div className="mt-2.5 py-1 px-4 bg-primary/10 rounded-full border border-primary/20">
                  <span className="text-xs font-black text-primary">
                    মোট প্রদেয়: ৳{Math.round(finalTotal)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Send Money To</span>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold text-[9px] py-0.5 px-1.5">
                    Personal Number
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-3 mt-1">
                  <p className="text-lg font-black tracking-widest text-slate-900 dark:text-zinc-50 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-primary/10 flex-1 text-center select-all">
                    {selectedMethod?.number}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-lg text-[10px] font-bold border hover:bg-primary hover:text-white transition-all shrink-0"
                    onClick={() => {
                      if (selectedMethod?.number) {
                        navigator.clipboard.writeText(selectedMethod.number);
                        toast.success('Number copied to clipboard!');
                      }
                    }}
                  >
                    Copy
                  </Button>
                </div>

                {selectedMethod?.qrCode && (
                  <div className="flex flex-col items-center gap-1.5 pt-2 border-t border-primary/10">
                    <p className="text-[9px] font-bold uppercase opacity-40">Scan QR Code to Pay</p>
                    <div className="p-1.5 bg-white rounded-lg shadow-sm border border-primary/10">
                      <Image
                        src={selectedMethod?.qrCode || '/assets/placeholder-qr.png'}
                        alt="QR"
                        width={128}
                        height={128}
                        className="h-32 w-32 object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Instruction Panel */}
            <div className="bg-slate-50 dark:bg-zinc-950 rounded-xl p-3 border border-slate-200 dark:border-zinc-800 space-y-1.5">
              <p className="text-[10px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider">পেমেন্ট নির্দেশিকা (পড়ুন):</p>
              <div className="max-h-24 overflow-y-auto pr-1 space-y-1 text-[9px] leading-relaxed text-slate-600 dark:text-zinc-400 font-medium">
                {selectedMethod?.id === 'banglaQr' ? (
                  <>
                    <p>১. আপনার ব্যাংক (Citytouch, EBL, ইত্যাদি) বা MFS (বিকাশ, নগদ, রকেট) অ্যাপ ওপেন করুন।</p>
                    <p>২. অ্যাপের <strong>"QR Pay"</strong> বা <strong>"Scan QR"</strong> অপশন সিলেক্ট করে ওপরের কোডটি স্ক্যান করুন।</p>
                    <p>৩. মোট পেমেন্ট অ্যামাউন্ট <strong>৳{Math.round(finalTotal)}</strong> নিশ্চিত করে সেন্ড/পে সম্পন্ন করুন।</p>
                    <p>৪. সফলভাবে পেমেন্টের পর নিচের ঘরে <strong>TrxID</strong> বা <strong>মোবাইল নম্বর</strong> প্রদান করুন।</p>
                  </>
                ) : (
                  <>
                    <p>
                      ১. আপনার <strong>{selectedMethod?.id === 'bkash' ? 'বিকাশ' : selectedMethod?.id === 'nagad' ? 'নগদ' : selectedMethod?.id === 'rocket' ? 'রকেট' : 'মোবাইল'}</strong> অ্যাপে যান অথবা USSD ডায়াল করে <strong>"Send Money"</strong> অপশন সিলেক্ট করুন।
                    </p>
                    <p>২. উপরে দেওয়া <strong>Personal</strong> নম্বরটি কপি করে প্রাপক হিসেবে দিন।</p>
                    <p>৩. মোট পেমেন্ট অ্যামাউন্ট <strong>৳{Math.round(finalTotal)}</strong> সেন্ড মানি করুন।</p>
                    <p>৪. সফলভাবে টাকা পাঠানোর পর নিচের ট্যাব থেকে <strong>মোবাইল নম্বর</strong> অথবা <strong>TrxID</strong> যেকোনো একটি তথ্য দিয়ে পেমেন্ট নিশ্চিত করুন।</p>
                  </>
                )}
              </div>
            </div>

            {/* Selection Tabs */}
            <div className="flex border-b border-slate-200 dark:border-zinc-800 mt-2">
              <button
                type="button"
                onClick={() => setPaymentDetailTab('phone')}
                className={`flex-1 pb-1.5 text-[11px] font-bold text-center border-b-2 transition-all ${
                  paymentDetailTab === 'phone'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                {selectedMethod?.id === 'bkash' ? 'বিকাশ' : selectedMethod?.id === 'nagad' ? 'নগদ' : selectedMethod?.id === 'rocket' ? 'রকেট' : 'মোবাইল'} নম্বর দিয়ে
              </button>
              <button
                type="button"
                onClick={() => setPaymentDetailTab('trx')}
                className={`flex-1 pb-1.5 text-[11px] font-bold text-center border-b-2 transition-all ${
                  paymentDetailTab === 'trx'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                ট্রানজেকশন আইডি (TrxID) দিয়ে
              </button>
            </div>

            {/* Verification Field based on active tab */}
            <div className="space-y-3 pt-1">
              {paymentDetailTab === 'phone' ? (
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase opacity-60">
                    আপনার {selectedMethod?.id === 'bkash' ? 'বিকাশ' : selectedMethod?.id === 'nagad' ? 'নগদ' : selectedMethod?.id === 'rocket' ? 'রকেট' : 'মোবাইল'} নম্বর
                  </Label>
                  <Input
                    placeholder="যে নম্বর থেকে টাকা পাঠিয়েছেন (যেমন: 017XXXXXXXX)"
                    value={manualDetails.senderNumber}
                    onChange={(e) => setManualDetails({ ...manualDetails, senderNumber: e.target.value })}
                    className="h-10 rounded-lg text-xs focus:ring-primary/20 bg-background"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase opacity-60">ট্রানজেকশন আইডি (TrxID)</Label>
                  <Input
                    placeholder="যেমন: 8N7A6D5C"
                    value={manualDetails.transactionId}
                    onChange={(e) => setManualDetails({ ...manualDetails, transactionId: e.target.value.toUpperCase() })}
                    className="h-10 rounded-lg text-xs focus:ring-primary/20 bg-background"
                  />
                </div>
              )}
            </div>

            {storeInfo.paymentConfig?.instructions && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-[9px] leading-relaxed text-muted-foreground italic">
                  <strong>নির্দেশনা:</strong> {storeInfo.paymentConfig.instructions}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 bg-muted/20 border-t flex flex-row gap-3 shrink-0">
            <Button variant="outline" onClick={() => setShowPaymentModal(false)} className="rounded-full h-10 flex-1 font-bold text-xs bg-background">
              বাতিল করুন
            </Button>
            <Button
              disabled={
                paymentDetailTab === 'phone'
                  ? !manualDetails.senderNumber.trim()
                  : !manualDetails.transactionId.trim()
              }
              onClick={async () => {
                const isValid = await form.trigger();
                if (isValid) {
                  setShowPaymentModal(false);
                  toast.success(`${selectedMethod?.id.toUpperCase()} details saved!`);
                  await form.handleSubmit(onSubmit)();
                } else {
                  setShowPaymentModal(false);
                  toast.error('দয়া করে ডেলিভারি তথ্য সম্পূর্ণ করুন!');
                }
              }}
              className="rounded-full h-10 flex-1 font-black uppercase tracking-widest text-xs shadow-md shadow-primary/10"
            >
              পেমেন্ট নিশ্চিত করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

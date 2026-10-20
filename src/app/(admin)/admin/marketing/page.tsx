'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ui/image-upload';
import { Loader2, Truck, CreditCard, BarChart3, Settings2, Zap, ShieldCheck, CheckCircle2, XCircle, AlertCircle, RefreshCcw, ExternalLink, Globe, X, Wallet, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const marketingSettingsSchema = z.object({
  subscriptionConfig: z.object({
    activationThreshold: z.number().min(0, 'Threshold cannot be negative'),
    rewardPercentage: z.number().min(0, 'Percentage cannot be negative').max(100, 'Cannot exceed 100%'),
  }).optional(),
  deliveryChargeInsideDhaka: z.number().min(0, 'Charge cannot be negative').optional(),
  deliveryChargeOutsideDhaka: z.number().min(0, 'Charge cannot be negative').optional(),
  paymentConfig: z.object({
    activeMethod: z.string().default('none'),
    activeMethods: z.array(z.string()).optional(),
    cashOnDelivery: z.boolean().default(true),
    sslcommerz: z.object({
      storeId: z.string().nullish().transform(val => val ?? ''),
      storePassword: z.string().nullish().transform(val => val ?? ''),
      isSandbox: z.boolean().default(true),
      active: z.boolean().default(false),
    }).nullable().optional(),
  }).optional(),
  manualPaymentConfig: z.object({
    bkash: z.object({
      number: z.string().default(''),
      qrCode: z.string().nullish().transform(val => val ?? ''),
      active: z.boolean().default(false),
    }).nullable().optional(),
    nagad: z.object({
      number: z.string().default(''),
      qrCode: z.string().nullish().transform(val => val ?? ''),
      active: z.boolean().default(false),
    }).nullable().optional(),
    rocket: z.object({
      number: z.string().default(''),
      qrCode: z.string().nullish().transform(val => val ?? ''),
      active: z.boolean().default(false),
    }).nullable().optional(),
    banglaQr: z.object({
      qrCode: z.string().nullish().transform(val => val ?? ''),
      active: z.boolean().default(false),
    }).nullable().optional(),
    instructions: z.string().nullish().transform(val => val ?? ''),
  }).optional(),
  courierConfig: z.object({
    activeProvider: z.string().default('steadfast'),
    steadfast: z.object({
      apiKey: z.string().nullish().transform(val => val ?? ''),
      secretKey: z.string().nullish().transform(val => val ?? ''),
    }).nullable().optional(),
    pathao: z.object({
      clientId: z.string().nullish().transform(val => val ?? ''),
      clientSecret: z.string().nullish().transform(val => val ?? ''),
      storeId: z.string().nullish().transform(val => val ?? ''),
      username: z.string().nullish().transform(val => val ?? ''),
      password: z.string().nullish().transform(val => val ?? ''),
      isSandbox: z.boolean().default(false),
    }).nullable().optional(),
    redx: z.object({
      apiKey: z.string().nullish().transform(val => val ?? ''),
      isSandbox: z.boolean().default(false),
    }).nullable().optional(),
    bdCourier: z.object({
      apiKey: z.string().nullish().transform(val => val ?? ''),
    }).nullable().optional(),
  }).optional(),
  facebookDomainVerification: z.string().nullish().transform(val => val ?? ''),
  metaPixelId: z.string().nullish().transform(val => val ?? ''),
  facebookAccessToken: z.string().nullish().transform(val => val ?? ''),
  facebookTestEventCode: z.string().nullish().transform(val => val ?? ''),
  googleTagManagerId: z.string().nullish().transform(val => val ?? ''),
  tiktokPixelId: z.string().nullish().transform(val => val ?? ''),
  tiktokAccessToken: z.string().nullish().transform(val => val ?? ''),
});

type MarketingSettingsFormValues = z.infer<typeof marketingSettingsSchema>;

// ── Server Tracking State ──────────────────────────────────────────────────
type TrackingStatus = {
  facebook: { configured: boolean; pixelId: string | null; testEventCode: string | null; hasAccessToken: boolean };
  tiktok: { configured: boolean; pixelId: string | null; hasAccessToken: boolean };
  gtm: { configured: boolean; gtmId: string | null };
  ga: { configured: boolean; gaId: string | null };
} | null;

export default function MarketingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>(null);
  const [trackingStatusLoading, setTrackingStatusLoading] = useState(false);

  const form = useForm<MarketingSettingsFormValues>({
    resolver: zodResolver(marketingSettingsSchema) as any,
    defaultValues: {
      subscriptionConfig: {
        activationThreshold: 5000,
        rewardPercentage: 5,
      },
      deliveryChargeInsideDhaka: 60,
      deliveryChargeOutsideDhaka: 120,
      paymentConfig: {
        activeMethod: 'none',
        cashOnDelivery: true,
        activeMethods: ['cod'],
        sslcommerz: {
          storeId: '',
          storePassword: '',
          isSandbox: true,
          active: false,
        },
      },
      manualPaymentConfig: {
        bkash: { number: '', qrCode: '', active: false },
        nagad: { number: '', qrCode: '', active: false },
        rocket: { number: '', qrCode: '', active: false },
        banglaQr: { qrCode: '', active: false },
        instructions: '',
      },
      courierConfig: {
        activeProvider: 'steadfast',
        steadfast: { apiKey: '', secretKey: '' },
        pathao: { clientId: '', clientSecret: '', storeId: '', username: '', password: '', isSandbox: false },
        redx: { apiKey: '', isSandbox: false },
        bdCourier: { apiKey: '' },
      },
      facebookDomainVerification: '',
      metaPixelId: '',
      facebookAccessToken: '',
      facebookTestEventCode: '',
      googleTagManagerId: '',
      tiktokPixelId: '',
      tiktokAccessToken: '',
    },
  });

  useEffect(() => {
    const controller = new AbortController();

    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings', { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();

          const result = marketingSettingsSchema.safeParse(data);
          if (result.success) {
            if (!controller.signal.aborted) {
              const sanitizedData: MarketingSettingsFormValues = {
                subscriptionConfig: {
                  activationThreshold: result.data.subscriptionConfig?.activationThreshold ?? 5000,
                  rewardPercentage: result.data.subscriptionConfig?.rewardPercentage ?? 5,
                },
                deliveryChargeInsideDhaka: result.data.deliveryChargeInsideDhaka ?? 60,
                deliveryChargeOutsideDhaka: result.data.deliveryChargeOutsideDhaka ?? 120,
                paymentConfig: {
                  activeMethod: result.data.paymentConfig?.activeMethod || 'none',
                  activeMethods: result.data.paymentConfig?.activeMethods || (result.data.paymentConfig?.cashOnDelivery !== false ? ['cod'] : []),
                  cashOnDelivery: result.data.paymentConfig?.cashOnDelivery ?? true,
                  sslcommerz: {
                    storeId: result.data.paymentConfig?.sslcommerz?.storeId || '',
                    storePassword: result.data.paymentConfig?.sslcommerz?.storePassword || '',
                    isSandbox: result.data.paymentConfig?.sslcommerz?.isSandbox ?? true,
                    active: result.data.paymentConfig?.sslcommerz?.active ?? (result.data.paymentConfig?.activeMethod === 'sslcommerz'),
                  },
                },
                manualPaymentConfig: {
                  bkash: {
                    number: result.data.manualPaymentConfig?.bkash?.number || '',
                    qrCode: result.data.manualPaymentConfig?.bkash?.qrCode || '',
                    active: result.data.manualPaymentConfig?.bkash?.active ?? false,
                  },
                  nagad: {
                    number: result.data.manualPaymentConfig?.nagad?.number || '',
                    qrCode: result.data.manualPaymentConfig?.nagad?.qrCode || '',
                    active: result.data.manualPaymentConfig?.nagad?.active ?? false,
                  },
                  rocket: {
                    number: result.data.manualPaymentConfig?.rocket?.number || '',
                    qrCode: result.data.manualPaymentConfig?.rocket?.qrCode || '',
                    active: result.data.manualPaymentConfig?.rocket?.active ?? false,
                  },
                  banglaQr: {
                    qrCode: result.data.manualPaymentConfig?.banglaQr?.qrCode || '',
                    active: result.data.manualPaymentConfig?.banglaQr?.active ?? false,
                  },
                  instructions: result.data.manualPaymentConfig?.instructions || '',
                },
                courierConfig: {
                  activeProvider: result.data.courierConfig?.activeProvider || 'none',
                  steadfast: {
                    apiKey: result.data.courierConfig?.steadfast?.apiKey || '',
                    secretKey: result.data.courierConfig?.steadfast?.secretKey || '',
                  },
                  pathao: {
                    clientId: result.data.courierConfig?.pathao?.clientId || '',
                    clientSecret: result.data.courierConfig?.pathao?.clientSecret || '',
                    storeId: result.data.courierConfig?.pathao?.storeId || '',
                    username: result.data.courierConfig?.pathao?.username || '',
                    password: result.data.courierConfig?.pathao?.password || '',
                    isSandbox: result.data.courierConfig?.pathao?.isSandbox ?? false,
                  },
                  redx: {
                    apiKey: result.data.courierConfig?.redx?.apiKey || '',
                    isSandbox: result.data.courierConfig?.redx?.isSandbox ?? false,
                  },
                  bdCourier: {
                    apiKey: result.data.courierConfig?.bdCourier?.apiKey || '',
                  },
                },
                facebookDomainVerification: result.data.facebookDomainVerification || '',
                metaPixelId: result.data.metaPixelId || '',
                facebookAccessToken: result.data.facebookAccessToken || '',
                facebookTestEventCode: result.data.facebookTestEventCode || '',
                googleTagManagerId: result.data.googleTagManagerId || '',
                tiktokPixelId: result.data.tiktokPixelId || '',
                tiktokAccessToken: result.data.tiktokAccessToken || '',
              };
              form.reset(sanitizedData);
            }
          } else {
            console.error('Settings validation failed:', result.error);
            toast.error('Received invalid settings from server');
          }
        } else {
          if (!controller.signal.aborted) {
            toast.error(`Failed to load settings: ${res.status} ${res.statusText}`);
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        if (!controller.signal.aborted) {
          toast.error('Failed to load settings');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchSettings();
    return () => controller.abort();
  }, [form]);

  // Fetch tracking configuration status
  const fetchTrackingStatus = useCallback(async () => {
    setTrackingStatusLoading(true);
    try {
      const res = await fetch('/api/admin/marketing/server-tracking');
      if (res.ok) {
        setTrackingStatus(await res.json());
      } else {
        setTrackingStatus(null);
        toast.error('Failed to fetch tracking status');
      }
    } catch {
      setTrackingStatus(null);
      toast.error('Failed to fetch tracking status');
    } finally {
      setTrackingStatusLoading(false);
    }
  }, []);


  const onSubmit = async (values: MarketingSettingsFormValues) => {
    setSubmitting(true);
    try {
      // Sync payment methods
      const isSslActive = Boolean(values.paymentConfig?.sslcommerz?.active);
      if (values.paymentConfig) {
        values.paymentConfig.activeMethod = isSslActive ? 'sslcommerz' : 'none';
        const activeMethods: string[] = [];
        if (values.paymentConfig.cashOnDelivery) activeMethods.push('cod');
        if (isSslActive) activeMethods.push('sslcommerz');
        if (values.manualPaymentConfig?.bkash?.active) activeMethods.push('bkash');
        if (values.manualPaymentConfig?.nagad?.active) activeMethods.push('nagad');
        if (values.manualPaymentConfig?.rocket?.active) activeMethods.push('rocket');
        if (values.manualPaymentConfig?.banglaQr?.active) activeMethods.push('banglaQr');
        values.paymentConfig.activeMethods = activeMethods;
      }

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        toast.success('Marketing & Integration settings updated successfully');
      } else {
        toast.error('Failed to update settings');
      }
    } catch (error) {
      toast.error('Error updating settings');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Marketing & Integration Settings</h1>
        <Button type="submit" form="marketing-settings-form" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>

      <Form {...form}>
        <form id="marketing-settings-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs defaultValue="loyalty" className="w-full">
            <TabsList className="flex flex-wrap h-auto gap-1 w-full">
              <TabsTrigger value="loyalty" className="flex-1 min-w-[90px]">Loyalty</TabsTrigger>
              <TabsTrigger value="payment" className="flex-1 min-w-[90px]">Payment</TabsTrigger>
              <TabsTrigger value="courier" className="flex-1 min-w-[90px]">Courier</TabsTrigger>
              <TabsTrigger value="marketing" className="flex-1 min-w-[150px]" onClick={fetchTrackingStatus}>
                <Zap className="h-3 w-3 mr-1" />Meta Pixel & Server Track
              </TabsTrigger>
            </TabsList>

            {/* 1. Loyalty Tab */}
            <TabsContent value="loyalty" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Loyalty & Rewards System</CardTitle>
                  <CardDescription>Configure how customers activate their lifetime rewards and the percentage they earn.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="subscriptionConfig.activationThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Activation Threshold (TK)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="5000"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>Minimum single order amount to activate lifetime rewards for a user.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subscriptionConfig.rewardPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reward Percentage (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="5"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>Percentage of purchase total awarded as tokens to active users.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="rounded-lg border p-4 bg-primary/5">
                    <h4 className="text-sm font-bold mb-2">How it works:</h4>
                    <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                      <li>All registered users are enrolled in the loyalty program automatically.</li>
                      <li>Users become <strong>Active</strong> after a single purchase ≥ {form.watch('subscriptionConfig.activationThreshold')} TK.</li>
                      <li>Active users earn <strong>{form.watch('subscriptionConfig.rewardPercentage')}%</strong> of every purchase as wallet tokens.</li>
                      <li>Tokens can be used for discounts on any future purchase.</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 2. Payment Gateway Tab */}
            <TabsContent value="payment" className="space-y-6">
              {/* Master Active Payment Methods Card */}
              <Card className="border-2 border-primary/20 shadow-sm overflow-hidden">
                <CardHeader className="bg-primary/5 border-b">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" /> Active Payment Methods (Multiple Selectable)
                      </CardTitle>
                      <CardDescription>
                        চেকআউট পেজে কাস্টমারদের জন্য কোন কোন পেমেন্ট মেথড সক্রিয় থাকবে তা সিলেক্ট করুন (এক বা একাধিক সিলেক্ট করা যাবে)।
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 font-semibold gap-1 py-1 w-fit">
                      <CheckCircle2 className="h-3 w-3" /> Multi-Gateway Support
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* 1. Cash on Delivery (COD) */}
                    <FormField
                      control={form.control}
                      name="paymentConfig.cashOnDelivery"
                      render={({ field }) => (
                        <div
                          onClick={() => field.onChange(!field.value)}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                            field.value ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                                <Truck className="h-4 w-4" />
                              </div>
                              <span className="font-bold text-sm">Cash on Delivery</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={field.value ?? true}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">পণ্য হাতে পেয়ে মূল্য পরিশোধ (ডিফল্ট অ্যাক্টিভ)</p>
                          <Badge variant="secondary" className={`text-[10px] w-fit ${field.value ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : ''}`}>
                            {field.value ? '● Active' : 'Off'}
                          </Badge>
                        </div>
                      )}
                    />

                    {/* 2. SSLCommerz */}
                    <FormField
                      control={form.control}
                      name="paymentConfig.sslcommerz.active"
                      render={({ field }) => (
                        <div
                          onClick={() => field.onChange(!field.value)}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                            field.value ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                                <CreditCard className="h-4 w-4" />
                              </div>
                              <span className="font-bold text-sm">SSLCommerz</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={field.value ?? false}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">কার্ড, বিকাশ, নগদ অনলাইন গেটওয়ে</p>
                          <Badge variant="secondary" className={`text-[10px] w-fit ${field.value ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : ''}`}>
                            {field.value ? '● Active' : 'Off'}
                          </Badge>
                        </div>
                      )}
                    />

                    {/* 3. Manual bKash */}
                    <FormField
                      control={form.control}
                      name="manualPaymentConfig.bkash.active"
                      render={({ field }) => (
                        <div
                          onClick={() => field.onChange(!field.value)}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                            field.value ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <Image src="/assets/bkashlogo.webp" alt="bKash" width={28} height={28} className="h-7 w-7 object-contain" />
                              <span className="font-bold text-sm">Manual bKash</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={field.value ?? false}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">বিকাশ পার্সোনাল/মার্চেন্ট ম্যানুয়াল সেন্ড মানি</p>
                          <Badge variant="secondary" className={`text-[10px] w-fit ${field.value ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : ''}`}>
                            {field.value ? '● Active' : 'Off'}
                          </Badge>
                        </div>
                      )}
                    />

                    {/* 4. Manual Nagad */}
                    <FormField
                      control={form.control}
                      name="manualPaymentConfig.nagad.active"
                      render={({ field }) => (
                        <div
                          onClick={() => field.onChange(!field.value)}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                            field.value ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <Image src="/assets/nagadlogo.webp" alt="Nagad" width={28} height={28} className="h-7 w-7 object-contain" />
                              <span className="font-bold text-sm">Manual Nagad</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={field.value ?? false}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">নগদ পার্সোনাল/মার্চেন্ট ম্যানুয়াল সেন্ড মানি</p>
                          <Badge variant="secondary" className={`text-[10px] w-fit ${field.value ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : ''}`}>
                            {field.value ? '● Active' : 'Off'}
                          </Badge>
                        </div>
                      )}
                    />

                    {/* 5. Manual Rocket */}
                    <FormField
                      control={form.control}
                      name="manualPaymentConfig.rocket.active"
                      render={({ field }) => (
                        <div
                          onClick={() => field.onChange(!field.value)}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                            field.value ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <Image src="/assets/rocketlogo.webp" alt="Rocket" width={28} height={28} className="h-7 w-7 object-contain" />
                              <span className="font-bold text-sm">Manual Rocket</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={field.value ?? false}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">রকেট পার্সোনাল/মার্চেন্ট ম্যানুয়াল সেন্ড মানি</p>
                          <Badge variant="secondary" className={`text-[10px] w-fit ${field.value ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : ''}`}>
                            {field.value ? '● Active' : 'Off'}
                          </Badge>
                        </div>
                      )}
                    />

                    {/* 6. Bangla QR */}
                    <FormField
                      control={form.control}
                      name="manualPaymentConfig.banglaQr.active"
                      render={({ field }) => (
                        <div
                          onClick={() => field.onChange(!field.value)}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                            field.value ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                                <Globe className="h-4 w-4" />
                              </div>
                              <span className="font-bold text-sm">Bangla QR</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={field.value ?? false}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">সার্বজনীন বাংলা কিউআর পেমেন্ট</p>
                          <Badge variant="secondary" className={`text-[10px] w-fit ${field.value ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : ''}`}>
                            {field.value ? '● Active' : 'Off'}
                          </Badge>
                        </div>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* SSLCommerz Credentials Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" /> SSLCommerz Credentials
                  </CardTitle>
                  <CardDescription>Configure SSLCommerz Store ID and Password for automated online transactions</CardDescription>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="paymentConfig.sslcommerz.storeId"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold text-xs">Store ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Store ID" {...field} className="h-10 rounded-lg border px-3 text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="paymentConfig.sslcommerz.storePassword"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold text-xs">Store Password</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="Enter Password" {...field} className="h-10 rounded-lg border px-3 text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex items-center">
                    <FormField
                      control={form.control}
                      name="paymentConfig.sslcommerz.isSandbox"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0 p-4 border rounded-xl w-full bg-muted/20">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value ?? true}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </FormControl>
                          <div className="space-y-0.5">
                            <FormLabel className="font-bold text-sm cursor-pointer">Enable Sandbox Mode</FormLabel>
                            <p className="text-xs text-muted-foreground">টেস্টিংয়ের জন্য স্যান্ডবক্স মোড অন রাখুন</p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Manual Mobile Banking Numbers Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" /> Manual Payment Numbers (Mobile Banking)
                  </CardTitle>
                  <CardDescription>গ্রাহক যে একাউন্ট নাম্বারে টাকা পাঠাবে তা নিচে প্রদান করুন</CardDescription>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* bKash */}
                  <div className="space-y-3 p-4 rounded-xl border bg-muted/10">
                    <div className="flex items-center gap-2">
                      <Image src="/assets/bkashlogo.webp" alt="bKash" width={24} height={24} className="h-6 w-6 object-contain" />
                      <span className="font-bold text-sm">bKash Number</span>
                    </div>
                    <FormField
                      control={form.control}
                      name="manualPaymentConfig.bkash.number"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormControl>
                            <Input placeholder="01XXXXXXXXX" {...field} className="h-10 rounded-lg border px-3 text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Nagad */}
                  <div className="space-y-3 p-4 rounded-xl border bg-muted/10">
                    <div className="flex items-center gap-2">
                      <Image src="/assets/nagadlogo.webp" alt="Nagad" width={24} height={24} className="h-6 w-6 object-contain" />
                      <span className="font-bold text-sm">Nagad Number</span>
                    </div>
                    <FormField
                      control={form.control}
                      name="manualPaymentConfig.nagad.number"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormControl>
                            <Input placeholder="01XXXXXXXXX" {...field} className="h-10 rounded-lg border px-3 text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Rocket */}
                  <div className="space-y-3 p-4 rounded-xl border bg-muted/10">
                    <div className="flex items-center gap-2">
                      <Image src="/assets/rocketlogo.webp" alt="Rocket" width={24} height={24} className="h-6 w-6 object-contain" />
                      <span className="font-bold text-sm">Rocket Number</span>
                    </div>
                    <FormField
                      control={form.control}
                      name="manualPaymentConfig.rocket.number"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormControl>
                            <Input placeholder="01XXXXXXXXX" {...field} className="h-10 rounded-lg border px-3 text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Bangla QR (Universal Pay) Card */}
              <Card className="border-2 border-dashed border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" /> Bangla QR (Universal Pay)
                  </CardTitle>
                  <CardDescription>
                    Accept payment from any bank app via Bangla QR (কাস্টমার যেকোনো ব্যাংক বা এমএফএস অ্যাপ থেকে কিউআর স্ক্যান করে পে করতে পারবে)
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Upload Bangla QR Image</Label>
                      <FormField
                        control={form.control}
                        name="manualPaymentConfig.banglaQr.qrCode"
                        render={({ field }) => (
                          <div className="flex items-center gap-4">
                            {field.value && (
                              <div className="h-20 w-20 rounded-xl border bg-white p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative group">
                                <Image src={field.value} alt="Bangla QR" width={80} height={80} className="max-h-full max-w-full object-contain" />
                                <button
                                  type="button"
                                  onClick={() => field.onChange('')}
                                  className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg"
                                >
                                  <X className="h-5 w-5" />
                                </button>
                              </div>
                            )}
                            <div className="flex-1">
                              <ImageUpload
                                onUpload={(url) => field.onChange(url)}
                                className="h-20 rounded-xl border-2 border-dashed border-primary/20 hover:border-primary transition-all bg-card"
                              />
                            </div>
                          </div>
                        )}
                      />
                    </div>
                    <div className="p-4 bg-card rounded-2xl border border-primary/10">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <strong>Tip:</strong> আপনার ব্যাংক বা মোবাইল ফাইন্যান্সিয়াল অ্যাপ (যেমন: Citytouch, bKash Merchant, ইত্যাদি) থেকে ডাউনলোডকৃত বাংলা কিউআর কোডের ছবিটি এখানে আপলোড করুন।
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Instructions Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-bold">Payment Instructions (ম্যানুয়াল পেমেন্ট নির্দেশনা)</CardTitle>
                  <CardDescription>
                    চেকআউট পেজে ম্যানুয়াল পেমেন্ট বা বাংলা কিউআর নির্বাচন করলে গ্রাহককে যে নির্দেশনা প্রদর্শন করতে চান
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <FormField
                    control={form.control}
                    name="manualPaymentConfig.instructions"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormControl>
                          <textarea
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-full h-24 rounded-xl border p-4 text-sm resize-none bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="যেমন: অনুগ্রহ করে উপরোক্ত নম্বরে সেন্ড মানি করে ট্রানজেকশন আইডি প্রদান করুন।"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* 3. Courier Tab */}
            <TabsContent value="courier" className="space-y-6">
              {/* Delivery Charges Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" /> Delivery Charge Rules
                  </CardTitle>
                  <CardDescription>Configure standard customer delivery fees for storefront checkouts.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="deliveryChargeInsideDhaka"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold">Inside Dhaka (TK)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="h-11 rounded-xl font-semibold"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deliveryChargeOutsideDhaka"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold">Outside Dhaka (TK)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="h-11 rounded-xl font-semibold"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Courier Providers Credentials */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5 text-primary" /> Multi-Courier API Integrations
                      </CardTitle>
                      <CardDescription>
                        Configure API credentials for couriers you use. During order booking, you can choose any configured courier.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Steadfast Courier */}
                  <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">🚚 Steadfast Courier</span>
                        <span className="text-[10px] bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400 font-semibold px-2 py-0.5 rounded-full">
                          Steadfast API
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="courierConfig.steadfast.apiKey"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="font-bold text-xs">Steadfast API Key</FormLabel>
                            <FormControl>
                              <Input type="text" placeholder="e.g. Okblxdrgj9qqzyzajhvmc3is3nnaxcd8" {...field} className="h-10 rounded-lg text-xs font-mono" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="courierConfig.steadfast.secretKey"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="font-bold text-xs">Steadfast Secret Key</FormLabel>
                            <FormControl>
                              <Input type="text" placeholder="e.g. yq25rvb2a1iajxoznxtvofem" {...field} className="h-10 rounded-lg text-xs font-mono" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Pathao Courier */}
                  <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">📦 Pathao Courier</span>
                        <span className="text-[10px] bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 font-semibold px-2 py-0.5 rounded-full">
                          Pathao Aladdin v1 API
                        </span>
                      </div>
                      <FormField
                        control={form.control}
                        name="courierConfig.pathao.isSandbox"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value ?? false}
                                onChange={(e) => field.onChange(e.target.checked)}
                                className="h-3.5 w-3.5 rounded"
                              />
                            </FormControl>
                            <FormLabel className="text-xs cursor-pointer font-medium">Sandbox Mode</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <FormField
                        control={form.control}
                        name="courierConfig.pathao.clientId"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="font-bold text-xs">Pathao Client ID <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="Client ID from Developer Portal" {...field} className="h-10 rounded-lg text-xs font-mono" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="courierConfig.pathao.clientSecret"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="font-bold text-xs">Pathao Client Secret <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="Client Secret" {...field} className="h-10 rounded-lg text-xs font-mono" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="courierConfig.pathao.username"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="font-bold text-xs">Merchant Email / Username <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="merchant@email.com" {...field} className="h-10 rounded-lg text-xs" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="courierConfig.pathao.password"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="font-bold text-xs">Merchant Password <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} className="h-10 rounded-lg text-xs" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-lg text-[11px] text-blue-800 dark:text-blue-300 flex items-center gap-2">
                      <span>💡 <strong>পিকআপ পয়েন্ট অটোমেশন:</strong> Store ID আলাদা করে দেওয়ার প্রয়োজন নেই। রিসেলারদের পণ্যের ডেলিভারি রিসেলারের নিজস্ব রেজিস্টার্ড পিকআপ পয়েন্ট থেকে এবং মাদার শপের পণ্য মাদার ওয়্যারহাউস থেকে সিস্টেম স্বয়ংক্রিয়ভাবে ডিটেক্ট করবে।</span>
                    </div>
                  </div>

                  {/* RedX Courier & BD Courier Checker */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* RedX */}
                    <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">📮 RedX Logistics</span>
                        <FormField
                          control={form.control}
                          name="courierConfig.redx.isSandbox"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value ?? false}
                                  onChange={(e) => field.onChange(e.target.checked)}
                                  className="h-3.5 w-3.5 rounded"
                                />
                              </FormControl>
                              <FormLabel className="text-xs cursor-pointer font-medium">Sandbox</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="courierConfig.redx.apiKey"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="font-bold text-xs">RedX API Key</FormLabel>
                            <FormControl>
                              <Input placeholder="RedX API Key" {...field} className="h-10 rounded-lg text-xs font-mono" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* BD Courier Fraud Checker */}
                    <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">🛡️ BD Courier Fraud Checker</span>
                      </div>
                      <FormField
                        control={form.control}
                        name="courierConfig.bdCourier.apiKey"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="font-bold text-xs">BD Courier API Key</FormLabel>
                            <FormControl>
                              <Input placeholder="BD Courier Fraud API Key" {...field} className="h-10 rounded-lg text-xs font-mono" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 4. Marketing Tab */}
            <TabsContent value="marketing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" /> Marketing & Meta Pixel
                  </CardTitle>
                  <CardDescription>Configure Meta Pixel and tracking integrations.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <FormField
                    control={form.control}
                    name="googleTagManagerId"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="font-bold text-xs">GTM ID (Tag Manager)</FormLabel>
                        <FormControl>
                          <Input placeholder="GTM-XXXXXXX" {...field} className="h-12 rounded-xl" />
                        </FormControl>
                        <FormDescription>
                          Container ID for GA, Ads, and other tags.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="metaPixelId"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="font-bold text-xs">Meta Pixel ID</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter Meta Pixel ID" {...field} className="h-12 rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="facebookAccessToken"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="font-bold text-xs">Facebook Access Token</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder="Enter Access Token" {...field} className="h-12 rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="facebookDomainVerification"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold text-xs">FB Domain Verification</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter FB Domain Verification Key" {...field} className="h-12 rounded-xl" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="facebookTestEventCode"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold text-xs">FB Test Event Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter FB Test Event Code" {...field} className="h-12 rounded-xl" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="border-t pt-6 mt-6">
                    <h4 className="font-black text-xs uppercase opacity-50 mb-4">TikTok Pixel & Events API</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="tiktokPixelId"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="font-bold text-xs">TikTok Pixel ID</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter TikTok Pixel ID" {...field} className="h-12 rounded-xl" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tiktokAccessToken"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="font-bold text-xs">TikTok Access Token</FormLabel>
                            <FormControl>
                              <Input type="text" placeholder="Enter Access Token" {...field} className="h-12 rounded-xl" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Overview & Event Testing */}
              <div className="space-y-6 mt-6">
                {/* Status Overview Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {([
                    { key: 'facebook', label: 'Meta CAPI', icon: <BarChart3 className="h-4 w-4" /> },
                    { key: 'tiktok', label: 'TikTok API', icon: <BarChart3 className="h-4 w-4" /> },
                    { key: 'gtm', label: 'GTM', icon: <Settings2 className="h-4 w-4" /> },
                    { key: 'ga', label: 'GA4', icon: <BarChart3 className="h-4 w-4" /> },
                  ] as const).map(({ key, label, icon }) => {
                    const platform = trackingStatus?.[key];
                    const isConfigured = platform?.configured ?? false;
                    return (
                      <Card key={key} className={`border-2 ${trackingStatus === null ? 'border-muted' :
                          isConfigured ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5'
                        }`}>
                        <CardContent className="pt-4 pb-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wide opacity-60">{label}</span>
                            {trackingStatusLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : trackingStatus === null ? (
                              <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            ) : isConfigured ? (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                          <p className={`text-sm font-bold ${trackingStatus === null ? 'text-muted-foreground' :
                              isConfigured ? 'text-primary' : 'text-destructive'
                            }`}>
                            {trackingStatus === null ? '—' : isConfigured ? 'Connected' : 'Not Set'}
                          </p>
                          {platform && 'pixelId' in platform && platform.pixelId && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{platform.pixelId}</p>
                          )}
                          {platform && 'gtmId' in platform && platform.gtmId && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{platform.gtmId}</p>
                          )}
                          {platform && 'gaId' in platform && platform.gaId && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{platform.gaId}</p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Refresh status button */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={fetchTrackingStatus}
                    disabled={trackingStatusLoading}
                  >
                    {trackingStatusLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCcw className="h-4 w-4 mr-2" />
                    )}
                    Refresh Status
                  </Button>
                  {!trackingStatus && !trackingStatusLoading && (
                    <p className="text-xs text-muted-foreground">Click the tab or Refresh Status to load configuration.</p>
                  )}
                </div>

                {/* Security notice */}
                <Card className="border-amber-500/20 bg-amber-500/5">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="text-xs">
                        <p className="font-bold mb-1">Security: Credentials are stored encrypted</p>
                        <p className="text-muted-foreground">
                          Facebook and TikTok Access Tokens are stored with field-level encryption in MongoDB.
                          They are never exposed in frontend responses — only masked IDs are returned to the client.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

          </Tabs>
        </form>
      </Form>
    </div>
  );
}

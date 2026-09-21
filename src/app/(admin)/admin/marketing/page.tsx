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
import { Loader2, Truck, CreditCard, BarChart3, Settings2, Zap, ShieldCheck, CheckCircle2, XCircle, AlertCircle, RefreshCcw, ExternalLink } from 'lucide-react';
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
    sslcommerz: z.object({
      storeId: z.string().nullish().transform(val => val ?? ''),
      storePassword: z.string().nullish().transform(val => val ?? ''),
      isSandbox: z.boolean().default(true),
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
    activeProvider: z.string().default('none'),
    steadfast: z.object({
      apiKey: z.string().nullish().transform(val => val ?? ''),
      secretKey: z.string().nullish().transform(val => val ?? ''),
    }).nullable().optional(),
    pathao: z.object({
      clientId: z.string().nullish().transform(val => val ?? ''),
      clientSecret: z.string().nullish().transform(val => val ?? ''),
      storeId: z.string().nullish().transform(val => val ?? ''),
    }).nullable().optional(),
    redx: z.object({
      apiKey: z.string().nullish().transform(val => val ?? ''),
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
        sslcommerz: {
          storeId: '',
          storePassword: '',
          isSandbox: true,
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
        activeProvider: 'none',
        steadfast: { apiKey: '', secretKey: '' },
        pathao: { clientId: '', clientSecret: '', storeId: '' },
        redx: { apiKey: '' },
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
                  sslcommerz: {
                    storeId: result.data.paymentConfig?.sslcommerz?.storeId || '',
                    storePassword: result.data.paymentConfig?.sslcommerz?.storePassword || '',
                    isSandbox: result.data.paymentConfig?.sslcommerz?.isSandbox ?? true,
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
                  },
                  redx: {
                    apiKey: result.data.courierConfig?.redx?.apiKey || '',
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
    <div className="flex-1 space-y-4 px-0 py-4 md:p-8">
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

            {/* 2. Payment Tab */}
            <TabsContent value="payment" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" /> Payment Gateway (SSLCommerz)
                  </CardTitle>
                  <CardDescription>Configure SSLCommerz active payment gateway settings.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1 space-y-4">
                    <FormField
                      control={form.control}
                      name="paymentConfig.activeMethod"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold">Active Payment Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-xl">
                                <SelectValue placeholder="Select active method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None (Cash on Delivery Only)</SelectItem>
                              <SelectItem value="sslcommerz">SSLCommerz</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="paymentConfig.sslcommerz.isSandbox"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 pt-4 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value ?? true}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </FormControl>
                          <FormLabel className="font-bold text-sm cursor-pointer">Enable Sandbox Mode</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-2xl border">
                    <div className="md:col-span-2 font-black text-xs uppercase opacity-50 mb-2">SSLCommerz Credentials</div>
                    <FormField
                      control={form.control}
                      name="paymentConfig.sslcommerz.storeId"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold text-xs">Store ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Store ID" {...field} className="h-10 rounded-lg border px-3 text-xs" />
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
                            <Input type="text" placeholder="Enter Password" {...field} className="h-10 rounded-lg border px-3 text-xs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" /> Manual Payment (Mobile Banking)
                  </CardTitle>
                  <CardDescription>Configure manual mobile banking account details.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {(['bkash', 'nagad', 'rocket'] as const).map((method) => (
                      <div key={method} className="space-y-4 p-4 rounded-2xl border bg-muted/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Image src={`/assets/${method}logo.webp`} alt={method} width={24} height={24} className="h-6 w-6 object-contain" />
                            <span className="font-bold capitalize">{method}</span>
                          </div>
                          <FormField
                            control={form.control}
                            name={`manualPaymentConfig.${method}.active`}
                            render={({ field }) => (
                              <FormItem className="space-y-0">
                                <FormControl>
                                  <input
                                    type="checkbox"
                                    checked={field.value ?? false}
                                    onChange={(e) => field.onChange(e.target.checked)}
                                    className="h-4 w-4"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name={`manualPaymentConfig.${method}.number`}
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-[10px] uppercase opacity-60">Number</FormLabel>
                              <FormControl>
                                <Input placeholder="017XXXXXXXX" {...field} className="h-10 rounded-lg border px-3 text-sm" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </div>

                </CardContent>
              </Card>
            </TabsContent>

            {/* 3. Courier Tab */}
            <TabsContent value="courier" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" /> Courier & Shipping Rules
                  </CardTitle>
                  <CardDescription>Configure courier logistics and delivery charge parameters.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1 space-y-4">
                    <FormField
                      control={form.control}
                      name="courierConfig.activeProvider"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold">Active Provider</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-xl">
                                <SelectValue placeholder="Select provider" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="steadfast">Steadfast</SelectItem>
                              <SelectItem value="pathao">Pathao</SelectItem>
                              <SelectItem value="redx">RedX</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                              className="h-12 rounded-xl"
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
                              className="h-12 rounded-xl"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-2xl border">
                    <div className="md:col-span-2 font-black text-xs uppercase opacity-50 mb-2">Provider Credentials</div>
                    <FormField
                      control={form.control}
                      name="courierConfig.steadfast.apiKey"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold text-xs">Steadfast API Key</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="Steadfast API Key" {...field} className="h-10 rounded-lg border px-3 text-xs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="courierConfig.steadfast.secretKey"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold text-xs">Steadfast Secret Key</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="Steadfast Secret Key" {...field} className="h-10 rounded-lg border px-3 text-xs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="courierConfig.pathao.storeId"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold text-xs">Pathao Store ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Pathao Store ID" {...field} className="h-10 rounded-lg border px-3 text-xs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="courierConfig.redx.apiKey"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold text-xs">RedX API Key</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="RedX API Key" {...field} className="h-10 rounded-lg border px-3 text-xs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="courierConfig.bdCourier.apiKey"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold text-xs">BD Courier Fraud Check API Key</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="BD Courier API Key" {...field} className="h-10 rounded-lg border px-3 text-xs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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

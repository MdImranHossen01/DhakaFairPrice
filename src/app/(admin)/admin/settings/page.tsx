'use client';

import { useState, useEffect } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CreditCard, Globe, X, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/image-upload';
import { PasswordChangeForm } from '@/components/user/PasswordChangeForm';

const settingsSchema = z.object({
  brandName: z.string().min(2, 'Brand Name is required'),
  contact: z.object({
    email: z.string().email('Invalid email'),
    phone: z.string().min(10, 'Invalid phone number'),
    address: z.string().min(5, 'Address is required'),
  }),
  socialLinks: z.object({
    facebook: z.string().nullish().transform(v => v ?? ''),
    twitter: z.string().nullish().transform(v => v ?? ''),
    instagram: z.string().nullish().transform(v => v ?? ''),
    youtube: z.string().nullish().transform(v => v ?? ''),
    linkedin: z.string().nullish().transform(v => v ?? ''),
    tiktok: z.string().nullish().transform(v => v ?? ''),
    whatsapp: z.string().nullish().transform(v => v ?? ''),
  }),
  marqueeText: z.string().nullish().transform(val => val ?? ''),
  platformCommissionRate: z.number().min(0, 'Commission cannot be negative').max(100, 'Cannot exceed 100%').optional(),
  metaTitle: z.string().nullish().transform(val => val ?? ''),
  metaDescription: z.string().nullish().transform(val => val ?? ''),
  subscriptionConfig: z.object({
    activationThreshold: z.number().min(0, 'Threshold cannot be negative'),
    rewardPercentage: z.number().min(0, 'Percentage cannot be negative').max(100, 'Cannot exceed 100%'),
  }).optional(),
  freeDeliveryThreshold: z.number().min(0, 'Threshold cannot be negative').optional(),
  deliveryChargeInsideDhaka: z.number().min(0, 'Charge cannot be negative').optional(),
  deliveryChargeOutsideDhaka: z.number().min(0, 'Charge cannot be negative').optional(),
  logoUrl: z.string().nullish().transform(val => val ?? ''),
  uiTemplates: z.object({
    theme: z.string().default('green'),
    logoFont: z.string().default('orbitron'),
    bodyFont: z.string().default('inter'),
    layout: z.string().default('v1'),
  }).optional(),
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
  }).optional(),
  facebookDomainVerification: z.string().nullish().transform(val => val ?? ''),
  metaPixelId: z.string().nullish().transform(val => val ?? ''),
  facebookAccessToken: z.string().nullish().transform(val => val ?? ''),
  facebookTestEventCode: z.string().nullish().transform(val => val ?? ''),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema) as any,
    defaultValues: {
      brandName: '',
      contact: { email: '', phone: '', address: '' },
      socialLinks: {
        facebook: '',
        twitter: '',
        instagram: '',
        youtube: '',
        linkedin: '',
        tiktok: '',
        whatsapp: ''
      },
      marqueeText: '',
      platformCommissionRate: 10,
      metaTitle: '',
      metaDescription: '',
      subscriptionConfig: {
        activationThreshold: 5000,
        rewardPercentage: 5,
      },
      freeDeliveryThreshold: 0,
      deliveryChargeInsideDhaka: 60,
      deliveryChargeOutsideDhaka: 120,
      logoUrl: '',
      uiTemplates: {
        theme: 'green',
        logoFont: 'orbitron',
        bodyFont: 'inter',
        layout: 'v1',
      },
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
      },
      facebookDomainVerification: '',
      metaPixelId: '',
      facebookAccessToken: '',
      facebookTestEventCode: '',
    },
  });

  useEffect(() => {
    const controller = new AbortController();

    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings', { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();

          const result = settingsSchema.safeParse(data);
          if (result.success) {
            if (!controller.signal.aborted) {
              const sanitizedData: SettingsFormValues = {
                brandName: result.data.brandName || '',
                contact: {
                  email: result.data.contact?.email || '',
                  phone: result.data.contact?.phone || '',
                  address: result.data.contact?.address || '',
                },
                marqueeText: result.data.marqueeText || '',
                platformCommissionRate: result.data.platformCommissionRate ?? 10,
                socialLinks: {
                  facebook: result.data.socialLinks?.facebook || '',
                  twitter: result.data.socialLinks?.twitter || '',
                  instagram: result.data.socialLinks?.instagram || '',
                  youtube: result.data.socialLinks?.youtube || '',
                  linkedin: result.data.socialLinks?.linkedin || '',
                  tiktok: result.data.socialLinks?.tiktok || '',
                  whatsapp: result.data.socialLinks?.whatsapp || '',
                },
                metaTitle: result.data.metaTitle || '',
                metaDescription: result.data.metaDescription || '',
                freeDeliveryThreshold: result.data.freeDeliveryThreshold ?? 0,
                deliveryChargeInsideDhaka: result.data.deliveryChargeInsideDhaka ?? 60,
                deliveryChargeOutsideDhaka: result.data.deliveryChargeOutsideDhaka ?? 120,
                subscriptionConfig: {
                  activationThreshold: result.data.subscriptionConfig?.activationThreshold ?? 5000,
                  rewardPercentage: result.data.subscriptionConfig?.rewardPercentage ?? 5,
                },
                logoUrl: result.data.logoUrl || '',
                uiTemplates: {
                  theme: result.data.uiTemplates?.theme || 'green',
                  logoFont: result.data.uiTemplates?.logoFont || 'orbitron',
                  bodyFont: result.data.uiTemplates?.bodyFont || 'inter',
                  layout: result.data.uiTemplates?.layout || 'v1',
                },
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
                },
                facebookDomainVerification: result.data.facebookDomainVerification || '',
                metaPixelId: result.data.metaPixelId || '',
                facebookAccessToken: result.data.facebookAccessToken || '',
                facebookTestEventCode: result.data.facebookTestEventCode || '',
              };
              form.reset(sanitizedData);
            }
          } else {
            console.error('Settings validation failed:', result.error);
            console.log('Raw settings data received:', data);
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

  const onSubmit = async (values: SettingsFormValues) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        toast.success('Settings updated successfully');
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
        <h1 className="text-2xl font-bold tracking-tight">Global Settings</h1>
        <Button type="submit" form="settings-form" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <Form {...form}>
          <form id="settings-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-4">
            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Branding</CardTitle>
                  <CardDescription>Manage your store's identity and visibility.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="brandName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">Brand Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Swapnobaz" {...field} className="h-12 rounded-xl bg-gray-50 border-2 border-gray-100 focus:border-primary transition-all" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="logoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">Store Logo</FormLabel>
                        <FormControl>
                          <ImageUpload
                            value={field.value}
                            onUpload={(url) => field.onChange(url)}
                            className="bg-white border-2 border-gray-100"
                            aspect="square"
                          />
                        </FormControl>
                        <FormDescription>Professional high-resolution logo (PNG, JPG, or WEBP)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch('uiTemplates.layout') !== 'v2' && (
                    <FormField
                      control={form.control}
                      name="marqueeText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marquee/Ticker Text</FormLabel>
                          <FormControl>
                            <Input placeholder="Announcements, offers, promotions..." {...field} />
                          </FormControl>
                          <FormDescription>This text will display as a scrolling marquee at the top of the site.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="platformCommissionRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">Platform System Commission Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            placeholder="10"
                            {...field}
                            value={field.value ?? 10}
                            onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                            className="h-12 rounded-xl bg-gray-50 border-2 border-gray-100 focus:border-primary transition-all font-semibold"
                          />
                        </FormControl>
                        <FormDescription>
                          Global percentage fee added on top of reseller base price when shared across the system / other resellers (e.g. 10%).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="metaTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Global Meta Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Swapnobaz | Best Ecommerce in BD" {...field} />
                          </FormControl>
                          <FormDescription>Used as the primary browser title for the home page.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="metaDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Global Meta Description</FormLabel>
                          <FormControl>
                            <Input placeholder="Shop the best products at Swapnobaz..." {...field} />
                          </FormControl>
                          <FormDescription>Used for search engine snippets and social sharing.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                  <CardDescription>Update how customers can reach you.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="contact.email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input placeholder="support@shop.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact.phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+880 1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact.address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Store Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Building name, Street, City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="social" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Social Media Links</CardTitle>
                  <CardDescription>Add links to your social media profiles.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="socialLinks.facebook"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Facebook URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://facebook.com/your-page" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="socialLinks.twitter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>X (Twitter) URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://twitter.com/your-handle" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="socialLinks.instagram"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instagram URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://instagram.com/your-handle" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="socialLinks.youtube"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>YouTube URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://youtube.com/@your-channel" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="socialLinks.linkedin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>LinkedIn URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://linkedin.com/in/your-profile" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="socialLinks.tiktok"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>TikTok URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://tiktok.com/@your-handle" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="socialLinks.whatsapp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WhatsApp URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://wa.me/your-number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </form>
        </Form>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Update your password and manage account security.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <PasswordChangeForm hideHeader={true} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


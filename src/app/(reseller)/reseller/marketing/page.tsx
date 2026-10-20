'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, Award, Wallet, Save, Lock, Truck, ShieldCheck, CheckCircle2, QrCode, CreditCard, Banknote } from 'lucide-react';
import { toast } from 'sonner';

export default function ResellerMarketingPage() {
  const [reseller, setReseller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [motherPayment, setMotherPayment] = useState<any>(null);
  const [motherGateway, setMotherGateway] = useState<any>(null);

  // Tracking form state
  const [tracking, setTracking] = useState({
    metaPixelId: '', facebookAccessToken: '', facebookTestEventCode: '',
    facebookDomainVerification: '', tiktokPixelId: '', tiktokAccessToken: '',
  });

  // Payment form state
  const [payment, setPayment] = useState({
    bkashNumber: '', bkashActive: true,
    nagadNumber: '', nagadActive: true,
    rocketNumber: '', rocketActive: false,
    insideDhaka: 60, outsideDhaka: 120,
    paymentInstructions: '',
  });

  // Loyalty form state
  const [loyalty, setLoyalty] = useState({
    isEnabled: false, activationThreshold: 5000, rewardPercentage: 5,
  });

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch('/api/reseller/settings');
    if (res.ok) {
      const d = await res.json();
      const r = d.reseller;
      setReseller(r);
      setMotherPayment(d.motherPaymentConfig || null);
      setMotherGateway(d.motherPaymentGateway || null);
      setTracking({
        metaPixelId: r.seoConfig?.metaPixelId || '',
        facebookAccessToken: r.seoConfig?.facebookAccessToken || '',
        facebookTestEventCode: r.seoConfig?.facebookTestEventCode || '',
        facebookDomainVerification: r.seoConfig?.facebookDomainVerification || '',
        tiktokPixelId: r.seoConfig?.tiktokPixelId || '',
        tiktokAccessToken: r.seoConfig?.tiktokAccessToken || '',
      });
      setPayment({
        bkashNumber: r.paymentConfig?.bkash?.number || '',
        bkashActive: r.paymentConfig?.bkash?.active ?? true,
        nagadNumber: r.paymentConfig?.nagad?.number || '',
        nagadActive: r.paymentConfig?.nagad?.active ?? true,
        rocketNumber: r.paymentConfig?.rocket?.number || '',
        rocketActive: r.paymentConfig?.rocket?.active ?? false,
        insideDhaka: r.deliveryConfig?.insideDhaka ?? 60,
        outsideDhaka: r.deliveryConfig?.outsideDhaka ?? 120,
        paymentInstructions: r.paymentConfig?.instructions || '',
      });
      setLoyalty({
        isEnabled: r.loyaltyConfig?.isEnabled ?? false,
        activationThreshold: r.loyaltyConfig?.activationThreshold ?? 5000,
        rewardPercentage: r.loyaltyConfig?.rewardPercentage ?? 5,
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const save = async (payload: Record<string, any>) => {
    setSaving(true);
    const res = await fetch('/api/reseller/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resellerId: reseller._id, ...payload }),
    });
    if (res.ok) { toast.success('Settings saved successfully'); fetchData(); }
    else toast.error('Failed to save settings');
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Marketing & Integration Settings</h2>
          <p className="text-muted-foreground">Configure tracking pixels, payment methods, couriers, and loyalty rewards</p>
        </div>
      </div>

      <Tabs defaultValue="loyalty">
        <TabsList className="flex flex-wrap h-auto gap-1 w-full">
          <TabsTrigger value="loyalty" className="flex-1 min-w-[120px]">
            <Award className="h-4 w-4 mr-1.5 text-primary" /> Loyalty & Rewards
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex-1 min-w-[120px]">
            <Wallet className="h-4 w-4 mr-1.5 text-primary" /> Payment & Delivery Charge
          </TabsTrigger>
          <TabsTrigger value="meta" className="flex-1 min-w-[150px]">
            <Zap className="h-4 w-4 mr-1.5 text-primary" /> Meta Pixel & Analytics
          </TabsTrigger>
        </TabsList>

        {/* LOYALTY TAB */}
        <TabsContent value="loyalty" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" /> Loyalty & Rewards System
              </CardTitle>
              <CardDescription>Configure how customers activate their lifetime rewards and the percentage they earn.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between border rounded-xl p-4 bg-muted/20">
                <div>
                  <p className="font-bold text-sm">Loyalty Program Status</p>
                  <p className="text-xs text-muted-foreground">When enabled, customers earn reward points on every purchase</p>
                </div>
                <Button variant={loyalty.isEnabled ? 'default' : 'outline'} onClick={() => setLoyalty(l => ({ ...l, isEnabled: !l.isEnabled }))}>
                  {loyalty.isEnabled ? '● Enabled' : 'Disabled'}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Activation Threshold (TK)</Label>
                  <Input type="number" value={loyalty.activationThreshold}
                    onChange={e => setLoyalty(l => ({ ...l, activationThreshold: Number(e.target.value) }))} placeholder="5000" />
                  <p className="text-xs text-muted-foreground">Minimum single order amount to activate lifetime rewards for a user.</p>
                </div>
                <div className="space-y-2">
                  <Label>Reward Percentage (%)</Label>
                  <Input type="number" value={loyalty.rewardPercentage}
                    onChange={e => setLoyalty(l => ({ ...l, rewardPercentage: Number(e.target.value) }))} placeholder="5" />
                  <p className="text-xs text-muted-foreground">Percentage of purchase total awarded as tokens to active users.</p>
                </div>
              </div>
              <div className="rounded-xl border p-4 bg-muted/30 text-sm space-y-2">
                <p className="font-bold">How it works:</p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-xs">
                  <li>All registered users of your store are enrolled automatically.</li>
                  <li>Users become <strong>Active</strong> after a single purchase ≥ {loyalty.activationThreshold} TK.</li>
                  <li>Active users earn <strong>{loyalty.rewardPercentage}%</strong> of every purchase as wallet tokens.</li>
                  <li>Tokens can be used for discounts on any future purchase.</li>
                </ul>
              </div>
              <Button onClick={() => save({ loyaltyConfig: loyalty })} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAYMENT & DELIVERY TAB */}
        <TabsContent value="payment" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" /> Payment & Delivery Policy
                  </CardTitle>
                  <CardDescription>
                    গ্রাহকদের পেমেন্ট ও ডেলিভারি সংক্রান্ত নীতি ও মাদার শপের কেন্দ্রীয় কনফিগারেশন
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/40 font-semibold gap-1 py-1 w-fit">
                  <Lock className="h-3 w-3" /> Mother Shop Managed
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Payment Policy & Official Accounts */}
              <div className="rounded-xl border p-4 bg-muted/20 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="text-sm font-bold text-foreground">সেন্ট্রাল পেমেন্ট কালেকশন (Centralized Payment)</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      অর্ডার করার সময় গ্রাহক ম্যানুয়াল পেমেন্ট (bKash / Nagad / Rocket) নির্বাচন করলে সরাসরি মাদার শপের অফিসিয়াল ভেরিফাইড একাউন্টেই পেমেন্ট গৃহীত হয়। রিসেলারকে আলাদা করে কোনো ব্যক্তিগত একাউন্ট নাম্বার যুক্ত করতে হবে না। প্রতিটি ডেলিভারি সফল হলে আপনার কমিশন স্বয়ংক্রিয়ভাবে আপনার ওয়ালেটে জমা হবে।
                    </p>
                  </div>
                </div>

                {/* Active Gateways Display */}
                <div className="pt-3 border-t space-y-3">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    মাদার শপ থেকে কনফিগারকৃত পেমেন্ট মেথড (Read Only):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Cash on Delivery */}
                    <div className="border rounded-lg p-3 bg-card flex flex-col justify-between gap-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                          <Banknote className="h-3.5 w-3.5 text-primary" /> Cash on Delivery (COD)
                        </span>
                        <Badge
                          variant="secondary"
                          className={motherGateway?.cashOnDelivery !== false
                            ? "text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "text-[10px] bg-muted text-muted-foreground"
                          }
                        >
                          {motherGateway?.cashOnDelivery !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <span className="font-bold text-sm text-foreground">ক্যাশ অন ডেলিভারি</span>
                      <p className="text-[10px] text-muted-foreground">পণ্য হাতে পাওয়ার পর পেমেন্ট</p>
                    </div>

                    {/* SSLCommerz Gateway */}
                    <div className="border rounded-lg p-3 bg-card flex flex-col justify-between gap-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                          <CreditCard className="h-3.5 w-3.5 text-primary" /> SSLCommerz Gateway
                        </span>
                        <Badge
                          variant="secondary"
                          className={motherGateway?.sslcommerz?.active
                            ? "text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "text-[10px] bg-muted text-muted-foreground"
                          }
                        >
                          {motherGateway?.sslcommerz?.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <span className="font-bold text-sm text-foreground">অনলাইন পেমেন্ট গেটওয়ে</span>
                      <p className="text-[10px] text-muted-foreground">কার্ড / নেট ব্যাংকিং / অটো পেমেন্ট</p>
                    </div>

                    {/* bKash */}
                    <div className="border rounded-lg p-3 bg-card flex flex-col justify-between gap-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground">bKash (মাদার শপ)</span>
                        <Badge
                          variant="secondary"
                          className={motherPayment?.bkash?.active && motherPayment?.bkash?.number
                            ? "text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "text-[10px] bg-muted text-muted-foreground"
                          }
                        >
                          {motherPayment?.bkash?.active && motherPayment?.bkash?.number ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <span className="font-mono font-bold text-sm text-foreground">
                        {motherPayment?.bkash?.number || 'Not Configured'}
                      </span>
                      <p className="text-[10px] text-muted-foreground">ম্যানুয়াল সেন্ড মানি / ক্যাশ ইন</p>
                    </div>

                    {/* Nagad */}
                    <div className="border rounded-lg p-3 bg-card flex flex-col justify-between gap-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground">Nagad (মাদার শপ)</span>
                        <Badge
                          variant="secondary"
                          className={motherPayment?.nagad?.active && motherPayment?.nagad?.number
                            ? "text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "text-[10px] bg-muted text-muted-foreground"
                          }
                        >
                          {motherPayment?.nagad?.active && motherPayment?.nagad?.number ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <span className="font-mono font-bold text-sm text-foreground">
                        {motherPayment?.nagad?.number || 'Not Configured'}
                      </span>
                      <p className="text-[10px] text-muted-foreground">ম্যানুয়াল সেন্ড মানি / ক্যাশ ইন</p>
                    </div>

                    {/* Rocket */}
                    <div className="border rounded-lg p-3 bg-card flex flex-col justify-between gap-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground">Rocket (মাদার শপ)</span>
                        <Badge
                          variant="secondary"
                          className={motherPayment?.rocket?.active && motherPayment?.rocket?.number
                            ? "text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "text-[10px] bg-muted text-muted-foreground"
                          }
                        >
                          {motherPayment?.rocket?.active && motherPayment?.rocket?.number ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <span className="font-mono font-bold text-sm text-foreground">
                        {motherPayment?.rocket?.number || 'Not Configured'}
                      </span>
                      <p className="text-[10px] text-muted-foreground">ম্যানুয়াল সেন্ড মানি / ক্যাশ ইন</p>
                    </div>

                    {/* Bangla QR */}
                    <div className="border rounded-lg p-3 bg-card flex flex-col justify-between gap-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                          <Image src="/qrlogo.jpg" alt="Bangla QR" width={16} height={16} className="h-3.5 w-3.5 object-contain rounded" /> Bangla QR (Universal Pay)
                        </span>
                        <Badge
                          variant="secondary"
                          className={motherPayment?.banglaQr?.active && motherPayment?.banglaQr?.qrCode
                            ? "text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "text-[10px] bg-muted text-muted-foreground"
                          }
                        >
                          {motherPayment?.banglaQr?.active && motherPayment?.banglaQr?.qrCode ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {motherPayment?.banglaQr?.qrCode ? (
                        <div className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={motherPayment.banglaQr.qrCode}
                            alt="Bangla QR Preview"
                            className="h-10 w-10 rounded border object-contain bg-white p-0.5"
                          />
                          <span className="text-xs font-semibold text-foreground">QR কোড সক্রিয় রয়েছে</span>
                        </div>
                      ) : (
                        <span className="font-semibold text-xs text-muted-foreground">QR নট কনফিগারড</span>
                      )}
                      <p className="text-[10px] text-muted-foreground">যেকোনো ব্যাংক বা এমএফএস অ্যাপ থেকে স্ক্যান</p>
                    </div>
                  </div>

                  {/* Payment Instructions if present */}
                  {motherPayment?.instructions && (
                    <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                      <span className="font-bold text-foreground">মাদার শপের পেমেন্ট নির্দেশনা:</span>
                      <p className="whitespace-pre-line">{motherPayment.instructions}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Charges Section */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                      <Truck className="h-4 w-4 text-primary" /> Delivery Charges (Fixed by Mother Shop)
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      সব ডেলিভারি মাদার শপের কেন্দ্রীয় হাব ও কুরিয়ার সার্ভিসের মাধ্যমে সম্পন্ন হওয়ায় এই চার্জ কেন্দ্রীয়ভাবে নির্ধারিত এবং অপরিবর্তনযোগ্য।
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Inside Dhaka Delivery (৳)</Label>
                    <Input type="number" value={payment.insideDhaka} disabled className="bg-muted font-bold cursor-not-allowed opacity-90" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Outside Dhaka Delivery (৳)</Label>
                    <Input type="number" value={payment.outsideDhaka} disabled className="bg-muted font-bold cursor-not-allowed opacity-90" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>



        {/* META & ANALYTICS TAB */}
        <TabsContent value="meta" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" /> Tracking Pixels & Analytics
              </CardTitle>
              <CardDescription>
                Configure Meta Pixel, Facebook Conversions API (CAPI), and TikTok Events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Meta Pixel Section */}
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    Meta (Facebook) Pixel & Domain Verification
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Meta Pixel ID</Label>
                    <Input
                      value={tracking.metaPixelId}
                      onChange={e => setTracking(t => ({ ...t, metaPixelId: e.target.value }))}
                      placeholder="1403937488264485"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Domain Verification Code</Label>
                    <Input
                      value={tracking.facebookDomainVerification}
                      onChange={e => setTracking(t => ({ ...t, facebookDomainVerification: e.target.value }))}
                      placeholder="abc123xyz..."
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Server-Side Tracking Section */}
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h3 className="font-semibold text-sm">Server-Side Tracking & Conversions API (CAPI)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Facebook Access Token (CAPI)</Label>
                    <Input
                      type="text"
                      value={tracking.facebookAccessToken}
                      onChange={e => setTracking(t => ({ ...t, facebookAccessToken: e.target.value }))}
                      placeholder="EAA..."
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Facebook Test Event Code</Label>
                    <Input
                      value={tracking.facebookTestEventCode}
                      onChange={e => setTracking(t => ({ ...t, facebookTestEventCode: e.target.value }))}
                      placeholder="TEST12345"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">TikTok Pixel ID</Label>
                    <Input
                      value={tracking.tiktokPixelId}
                      onChange={e => setTracking(t => ({ ...t, tiktokPixelId: e.target.value }))}
                      placeholder="CXXXXXXXX"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">TikTok Access Token</Label>
                    <Input
                      type="text"
                      value={tracking.tiktokAccessToken}
                      onChange={e => setTracking(t => ({ ...t, tiktokAccessToken: e.target.value }))}
                      placeholder="tok..."
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Single Save Button */}
              <div className="pt-2">
                <Button onClick={() => save({ seoConfig: { ...reseller?.seoConfig, ...tracking } })} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" /> Save All Tracking Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Zap, Award, Wallet, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function ResellerMarketingPage() {
  const [reseller, setReseller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    <div className="flex-1 space-y-4 px-0 py-4 md:p-8">
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

        {/* PAYMENT TAB */}
        <TabsContent value="payment" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" /> Manual Payment & Delivery
              </CardTitle>
              <CardDescription>Configure bKash, Nagad numbers and delivery charges for your store</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label className="font-semibold">bKash</Label>
                <div className="flex items-center gap-3">
                  <Input value={payment.bkashNumber} onChange={e => setPayment(p => ({ ...p, bkashNumber: e.target.value }))} placeholder="01XXXXXXXXX" className="flex-1" />
                  <Button size="sm" variant={payment.bkashActive ? 'default' : 'outline'} onClick={() => setPayment(p => ({ ...p, bkashActive: !p.bkashActive }))}>
                    {payment.bkashActive ? 'Active' : 'Off'}
                  </Button>
                </div>
                <Label className="font-semibold">Nagad</Label>
                <div className="flex items-center gap-3">
                  <Input value={payment.nagadNumber} onChange={e => setPayment(p => ({ ...p, nagadNumber: e.target.value }))} placeholder="01XXXXXXXXX" className="flex-1" />
                  <Button size="sm" variant={payment.nagadActive ? 'default' : 'outline'} onClick={() => setPayment(p => ({ ...p, nagadActive: !p.nagadActive }))}>
                    {payment.nagadActive ? 'Active' : 'Off'}
                  </Button>
                </div>
              </div>
              <div className="border-t pt-4 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Inside Dhaka Delivery (৳)</Label>
                  <Input type="number" value={payment.insideDhaka} onChange={e => setPayment(p => ({ ...p, insideDhaka: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1">
                  <Label>Outside Dhaka Delivery (৳)</Label>
                  <Input type="number" value={payment.outsideDhaka} onChange={e => setPayment(p => ({ ...p, outsideDhaka: Number(e.target.value) }))} />
                </div>
              </div>
              <Button onClick={() => save({
                paymentConfig: { bkash: { number: payment.bkashNumber, active: payment.bkashActive }, nagad: { number: payment.nagadNumber, active: payment.nagadActive }, rocket: { number: payment.rocketNumber, active: payment.rocketActive }, instructions: payment.paymentInstructions },
                deliveryConfig: { insideDhaka: payment.insideDhaka, outsideDhaka: payment.outsideDhaka },
              })} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </Button>
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

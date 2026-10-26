/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Store, Save, ShieldCheck, Truck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/image-upload';
import { PasswordChangeForm } from '@/components/user/PasswordChangeForm';
import { divisions, getDistrictsByDivision, getThanasByDistrict, findDivisionByDistrict } from '@/lib/bd-locations';

export default function ResellerSettingsPage() {
  const { update: updateSession } = useSession();
  const [reseller, setReseller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [general, setGeneral] = useState({
    storeName: '', description: '', logoUrl: '', faviconUrl: '', marqueeText: '',
    metaTitle: '', metaDescription: '',
  });
  const [delivery, setDelivery] = useState({
    insideDhaka: 60,
    outsideDhaka: 120,
    freeDeliveryThreshold: 0,
  });
  const [contact, setContact] = useState({ email: '', phone: '', address: '' });
  const [pickup, setPickup] = useState({
    hubName: '', contactPerson: '', phone: '', address: '', division: '', district: '', thana: '',
  });
  const [social, setSocial] = useState({
    facebook: '', instagram: '', tiktok: '', whatsapp: '', youtube: '', twitter: '', linkedin: '',
  });

  const fetchSettings = async () => {
    setLoading(true);
    const res = await fetch('/api/reseller/settings');
    if (res.ok) {
      const d = await res.json();
      const r = d.reseller;
      setReseller(r);
      setGeneral({
        storeName: r.storeName || '',
        description: r.description || '',
        logoUrl: r.logoUrl || '',
        faviconUrl: r.faviconUrl || '',
        marqueeText: r.marqueeText || '',
        metaTitle: r.seoConfig?.metaTitle || '',
        metaDescription: r.seoConfig?.metaDescription || '',
      });
      setDelivery({
        insideDhaka: r.deliveryConfig?.insideDhaka ?? 60,
        outsideDhaka: r.deliveryConfig?.outsideDhaka ?? 120,
        freeDeliveryThreshold: r.deliveryConfig?.freeDeliveryThreshold ?? 0,
      });
      setContact({ email: r.contact?.email || '', phone: r.contact?.phone || '', address: r.contact?.address || '' });
      const dist = r.pickupAddress?.district || '';
      const div = r.pickupAddress?.division || (dist ? findDivisionByDistrict(dist) : '');
      setPickup({
        hubName: r.pickupAddress?.hubName || '',
        contactPerson: r.pickupAddress?.contactPerson || '',
        phone: r.pickupAddress?.phone || '',
        address: r.pickupAddress?.address || '',
        division: div,
        district: dist,
        thana: r.pickupAddress?.thana || '',
      });
      setSocial({
        facebook: r.socialLinks?.facebook || '',
        instagram: r.socialLinks?.instagram || '',
        tiktok: r.socialLinks?.tiktok || '',
        whatsapp: r.socialLinks?.whatsapp || '',
        youtube: r.socialLinks?.youtube || '',
        twitter: r.socialLinks?.twitter || '',
        linkedin: r.socialLinks?.linkedin || '',
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  const save = async (payload: Record<string, any>) => {
    setSaving(true);
    const res = await fetch('/api/reseller/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resellerId: reseller._id, ...payload }),
    });
    if (res.ok) {
      toast.success('Settings saved successfully');
      if (payload.logoUrl !== undefined) {
        try {
          await updateSession({ image: payload.logoUrl });
        } catch (e) {
          console.error(e);
        }
      }
      fetchSettings();
    }
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
    <div className="flex-1 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Store Settings</h2>
          <p className="text-xs md:text-sm text-muted-foreground">Configure your store branding, contact details, and account security</p>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="flex flex-wrap h-auto gap-1 w-full">
          <TabsTrigger value="general" className="flex-1 min-w-[90px]">General</TabsTrigger>
          <TabsTrigger value="delivery" className="flex-1 min-w-[90px]">Delivery & Free Shipping</TabsTrigger>
          <TabsTrigger value="contact" className="flex-1 min-w-[90px]">Contact</TabsTrigger>
          <TabsTrigger value="pickup" className="flex-1 min-w-[90px]">Warehouse / Pickup</TabsTrigger>
          <TabsTrigger value="social" className="flex-1 min-w-[90px]">Social</TabsTrigger>
          <TabsTrigger value="security" className="flex-1 min-w-[90px]">Security</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Store className="h-4 w-4 text-primary" /> Branding</CardTitle>
              <CardDescription>Manage your store's identity and visibility</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Brand Name (Store Name)</Label>
                <Input value={general.storeName} onChange={e => setGeneral(g => ({ ...g, storeName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Store Description</Label>
                <Textarea value={general.description} onChange={e => setGeneral(g => ({ ...g, description: e.target.value }))} rows={3} />
              </div>
              <div className="space-y-1">
                <Label>Marquee / Announcement Text</Label>
                <Input value={general.marqueeText} onChange={e => setGeneral(g => ({ ...g, marqueeText: e.target.value }))} placeholder="Free delivery on orders over ৳1000!" />
              </div>
              <div className="border-t pt-4 space-y-2">
                <Label className="font-semibold">Store Logo</Label>
                <ImageUpload value={general.logoUrl} onUpload={url => setGeneral(g => ({ ...g, logoUrl: url }))} aspect="square" />
              </div>
              <div className="border-t pt-4 space-y-2">
                <Label className="font-semibold">Store Favicon</Label>
                <ImageUpload value={general.faviconUrl} onUpload={url => setGeneral(g => ({ ...g, faviconUrl: url }))} aspect="square" />
              </div>
              <div className="border-t pt-4 space-y-3">
                <Label className="font-semibold">SEO / Meta Tags</Label>
                <div className="space-y-1">
                  <Label>Meta Title</Label>
                  <Input value={general.metaTitle} onChange={e => setGeneral(g => ({ ...g, metaTitle: e.target.value }))} placeholder="My Store - Best Online Shop" />
                </div>
                <div className="space-y-1">
                  <Label>Meta Description</Label>
                  <Textarea value={general.metaDescription} onChange={e => setGeneral(g => ({ ...g, metaDescription: e.target.value }))} rows={2} />
                </div>
              </div>
              <Button onClick={() => save({
                storeName: general.storeName, description: general.description,
                logoUrl: general.logoUrl, faviconUrl: general.faviconUrl,
                marqueeText: general.marqueeText,
                seoConfig: { ...reseller?.seoConfig, metaTitle: general.metaTitle, metaDescription: general.metaDescription },
              })} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery & Free Shipping Tab */}
        <TabsContent value="delivery" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" /> Delivery & Free Shipping Promo
              </CardTitle>
              <CardDescription>
                Configure free shipping thresholds for your storefront customers and view courier logistics rates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mother Shop Standard Rates (Read-only) */}
              <div className="rounded-xl border bg-slate-50/50 dark:bg-zinc-900/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <span>📦</span> Platform Standard Courier Delivery Charges
                  </span>
                  <span className="text-xs bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 px-2 py-0.5 rounded font-medium">
                    Managed by Mother Shop Logistics
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white dark:bg-zinc-950 border">
                    <span className="text-muted-foreground">Inside Dhaka:</span>
                    <span className="font-bold text-foreground font-mono">৳{delivery.insideDhaka}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white dark:bg-zinc-950 border">
                    <span className="text-muted-foreground">Outside Dhaka:</span>
                    <span className="font-bold text-foreground font-mono">৳{delivery.outsideDhaka}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  * ডেলিভারি পার্টনার (Steadfast / Pathao) মারফত পার্সেল ডেলিভারি দেওয়ার চার্জ মাদার শপ কর্তৃক সরাসরি পরিচালিত।
                </p>
              </div>

              {/* Free Delivery Threshold Configuration */}
              <div className="space-y-3">
                <div>
                  <Label className="text-base font-semibold">Storefront Free Delivery Threshold (৳)</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    আপনার স্টোরে কাস্টমার কত টাকার অর্ডার করলে সম্পূর্ণ ফ্রি ডেলিভারি পাবে তা নির্ধারণ করুন। অফারটি বন্ধ রাখতে ০ (শূন্য) দিন।
                  </p>
                </div>
                <div className="max-w-xs space-y-1">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground font-bold">৳</span>
                    <Input
                      type="number"
                      min={0}
                      value={delivery.freeDeliveryThreshold}
                      onChange={e => setDelivery(d => ({ ...d, freeDeliveryThreshold: Math.max(0, Number(e.target.value) || 0) }))}
                      className="pl-8 text-base font-bold font-mono"
                      placeholder="e.g. 1500"
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {delivery.freeDeliveryThreshold > 0
                      ? `৳${delivery.freeDeliveryThreshold} বা তার বেশি টাকার অর্ডারে কাস্টমার ফ্রি ডেলিভারি পাবে।`
                      : 'বর্তমানে ফ্রি ডেলিভারি অফারটি নিষ্ক্রিয় রয়েছে (Standard চার্জ প্রযোজ্য)।'}
                  </span>
                </div>
              </div>

              {/* Live Banner Preview */}
              {delivery.freeDeliveryThreshold > 0 && (
                <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Customer Storefront Live Banner Preview
                  </span>
                  <div className="p-3 bg-primary text-primary-foreground rounded-lg flex items-center justify-center gap-2 text-sm md:text-base font-extrabold shadow-sm">
                    <Truck className="h-4 w-4" />
                    <span>Free Shipping Alert! Get FREE DELIVERY on all orders over ৳{delivery.freeDeliveryThreshold}!</span>
                  </div>
                </div>
              )}

              {/* Financial Settlement & Deduction Rule Notice */}
              <div className="rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 p-4 space-y-2 text-xs md:text-sm text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                  <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>হিসাব ও আর্থিক নীতিমালা (Accounting & Settlement Rule):</span>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-xs text-amber-800/90 dark:text-amber-300/90 pl-1">
                  <li>
                    <strong>কাস্টমারের জন্য সুবিধা:</strong> কাস্টমার আপনার স্টোরে নির্ধারিত টাকার (যেমন ৳{delivery.freeDeliveryThreshold || 1500}) অর্ডার করলে ডেলিভারি চার্জ সম্পূর্ণ ফ্রি (৳০) হিসেবে অর্ডার সম্পন্ন করতে পারবে।
                  </li>
                  <li>
                    <strong>কুরিয়ার পার্টনার পেমেন্ট:</strong> কুরিয়ার সার্ভিস (Steadfast / Pathao)-কে পার্সেল পৌঁছানোর জন্য মাদার শপকে নির্ধারিত কুরিয়ার চার্জ পরিশোধ করতে হয়।
                  </li>
                  <li>
                    <strong>প্রোডাক্ট সোর্স পেমেন্ট:</strong> পণ্যের মূল মালিক/সাপ্লায়ার তার নির্ধারিত বেস প্রাইস (Purchase Price) সম্পূর্ণ পাবেন।
                  </li>
                  <li>
                    <strong>মার্জিন কর্তন:</strong> কুরিয়ার ডেলিভারি চার্জটি (ভেতরে ৳{delivery.insideDhaka} / বাইরে ৳{delivery.outsideDhaka}) আপনার বিক্রিত পণ্যের লাভ/মার্জিন (Reseller Commission) থেকে কর্তন করে বাকি লাভ আপনার রিসেলার অ্যাকাউন্টের ওয়ালেটে যুক্ত হবে।
                  </li>
                </ul>
              </div>

              <Button
                onClick={() => save({
                  deliveryConfig: {
                    ...reseller?.deliveryConfig,
                    freeDeliveryThreshold: Number(delivery.freeDeliveryThreshold) || 0,
                  }
                })}
                disabled={saving}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> Save Delivery Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact Details</CardTitle>
              <CardDescription>How customers can reach you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Phone Number</Label>
                  <Input value={contact.phone} onChange={e => setContact(c => ({ ...c, phone: e.target.value }))} placeholder="01XXXXXXXXX" />
                </div>
                <div className="space-y-1">
                  <Label>Support Email</Label>
                  <Input value={contact.email} onChange={e => setContact(c => ({ ...c, email: e.target.value }))} placeholder="support@mystore.com" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Store Address</Label>
                <Textarea value={contact.address} onChange={e => setContact(c => ({ ...c, address: e.target.value }))} rows={2} />
              </div>
              <Button onClick={() => save({ contact })} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> Save Contact
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warehouse / Pickup Point Tab */}
        <TabsContent value="pickup" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">🚚 Warehouse & Courier Pickup Point</CardTitle>
              <CardDescription>
                Where Steadfast / Pathao courier delivery riders will pick up your sold products or return parcels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Hub / Shop Name</Label>
                  <Input
                    value={pickup.hubName}
                    onChange={e => setPickup(p => ({ ...p, hubName: e.target.value }))}
                    placeholder="e.g. Barishal Main Warehouse / Outlet"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Contact Person Name</Label>
                  <Input
                    value={pickup.contactPerson}
                    onChange={e => setPickup(p => ({ ...p, contactPerson: e.target.value }))}
                    placeholder="e.g. Md. Imran"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Pickup Contact Phone (Courier Rider Calls here)</Label>
                  <Input
                    value={pickup.phone}
                    onChange={e => setPickup(p => ({ ...p, phone: e.target.value }))}
                    placeholder="017XXXXXXXX"
                  />
                </div>
              </div>

              {/* Cascading Location Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Division Dropdown */}
                <div className="space-y-1">
                  <Label>Division</Label>
                  <select
                    value={pickup.division}
                    onChange={e => {
                      const newDiv = e.target.value;
                      setPickup(p => ({ ...p, division: newDiv, district: '', thana: '' }));
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">-- Select Division --</option>
                    {divisions.map(div => (
                      <option key={div} value={div}>{div}</option>
                    ))}
                  </select>
                </div>

                {/* District Dropdown */}
                <div className="space-y-1">
                  <Label>District</Label>
                  <select
                    value={pickup.district}
                    disabled={!pickup.division}
                    onChange={e => {
                      const newDist = e.target.value;
                      setPickup(p => ({ ...p, district: newDist, thana: '' }));
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">{pickup.division ? '-- Select District --' : '-- Select Division First --'}</option>
                    {(pickup.division ? getDistrictsByDivision(pickup.division) : []).map(dist => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </select>
                </div>

                {/* Thana Dropdown */}
                <div className="space-y-1">
                  <Label>Thana / Upazila</Label>
                  <select
                    value={pickup.thana}
                    disabled={!pickup.district}
                    onChange={e => setPickup(p => ({ ...p, thana: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">{pickup.district ? '-- Select Thana --' : '-- Select District First --'}</option>
                    {(pickup.district ? getThanasByDistrict(pickup.district) : []).map(th => (
                      <option key={th} value={th}>{th}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Full Pickup Address (Road, House, Landmark)</Label>
                <Textarea
                  value={pickup.address}
                  onChange={e => setPickup(p => ({ ...p, address: e.target.value }))}
                  rows={2}
                  placeholder="e.g. Holding 124, Rupatoli Bus Stand, Barishal Sadar"
                />
              </div>

              <Button onClick={() => save({ pickupAddress: pickup })} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> Save Pickup Point
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Tab */}
        <TabsContent value="social" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Social Media Links</CardTitle>
              <CardDescription>Connect your social media profiles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'facebook', label: 'Facebook URL', placeholder: 'https://facebook.com/your-page' },
                  { key: 'twitter', label: 'X (Twitter) URL', placeholder: 'https://twitter.com/your-handle' },
                  { key: 'instagram', label: 'Instagram URL', placeholder: 'https://instagram.com/your-handle' },
                  { key: 'youtube', label: 'YouTube URL', placeholder: 'https://youtube.com/@your-channel' },
                  { key: 'linkedin', label: 'LinkedIn URL', placeholder: 'https://linkedin.com/in/your-profile' },
                  { key: 'tiktok', label: 'TikTok URL', placeholder: 'https://tiktok.com/@your-handle' },
                  { key: 'whatsapp', label: 'WhatsApp URL', placeholder: 'https://wa.me/your-number' },
                ].map(field => (
                  <div key={field.key} className="space-y-1">
                    <Label>{field.label}</Label>
                    <Input value={(social as any)[field.key]} onChange={e => setSocial(s => ({ ...s, [field.key]: e.target.value }))} placeholder={field.placeholder} />
                  </div>
                ))}
              </div>
              <Button onClick={() => save({ socialLinks: social })} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> Save Social Links
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab (Password Change) */}
        <TabsContent value="security" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Account Security
              </CardTitle>
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

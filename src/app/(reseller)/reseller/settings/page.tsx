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
import { Loader2, Store, Globe, Save, ShieldCheck } from 'lucide-react';
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
    <div className="flex-1 space-y-4 px-0 py-2 md:p-8 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 md:px-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Store Settings</h2>
          <p className="text-xs md:text-sm text-muted-foreground">Configure your store branding, contact details, domain, and account security</p>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="flex flex-wrap h-auto gap-1 w-full">
          <TabsTrigger value="general" className="flex-1 min-w-[90px]">General</TabsTrigger>
          <TabsTrigger value="contact" className="flex-1 min-w-[90px]">Contact</TabsTrigger>
          <TabsTrigger value="pickup" className="flex-1 min-w-[90px]">Warehouse / Pickup</TabsTrigger>
          <TabsTrigger value="social" className="flex-1 min-w-[90px]">Social</TabsTrigger>
          <TabsTrigger value="domain" className="flex-1 min-w-[90px]">Domain</TabsTrigger>
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
                  <Label>Division / বিভাগ</Label>
                  <select
                    value={pickup.division}
                    onChange={e => {
                      const newDiv = e.target.value;
                      setPickup(p => ({ ...p, division: newDiv, district: '', thana: '' }));
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">-- বিভাগ নির্বাচন করুন --</option>
                    {divisions.map(div => (
                      <option key={div} value={div}>{div}</option>
                    ))}
                  </select>
                </div>

                {/* District Dropdown */}
                <div className="space-y-1">
                  <Label>District / জেলা</Label>
                  <select
                    value={pickup.district}
                    disabled={!pickup.division}
                    onChange={e => {
                      const newDist = e.target.value;
                      setPickup(p => ({ ...p, district: newDist, thana: '' }));
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">{pickup.division ? '-- জেলা নির্বাচন করুন --' : '-- আগে বিভাগ বাছুন --'}</option>
                    {(pickup.division ? getDistrictsByDivision(pickup.division) : []).map(dist => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </select>
                </div>

                {/* Thana Dropdown */}
                <div className="space-y-1">
                  <Label>Thana / থানা / উপজেলা</Label>
                  <select
                    value={pickup.thana}
                    disabled={!pickup.district}
                    onChange={e => setPickup(p => ({ ...p, thana: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">{pickup.district ? '-- থানা বাছুন --' : '-- আগে জেলা বাছুন --'}</option>
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

        {/* Domain Tab */}
        <TabsContent value="domain" className="space-y-4 mt-4">
          <DomainTab reseller={reseller} onSave={save} saving={saving} />
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

function DomainTab({ reseller, onSave, saving }: { reseller: any; onSave: (p: any) => void; saving: boolean }) {
  const [subdomain, setSubdomain] = useState(reseller?.subdomain || '');
  const [customDomain, setCustomDomain] = useState(reseller?.customDomain || '');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Domain Configuration & Setup</CardTitle>
        <CardDescription>
          Connect your free subdomain or link your own custom branded domain (e.g. www.yourbrand.com)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Free Subdomain Section */}
        <div className="space-y-2 p-4 rounded-xl border bg-muted/20">
          <Label className="font-bold text-base flex items-center gap-1.5">
            1. Free Store Subdomain (ফ্রি সাবডোমেন)
          </Label>
          <p className="text-xs text-muted-foreground">
            আপনার পছন্দের যেকোনো ইউনিক নাম লিখুন, এটি ইনস্ট্যান্ট কাজ করবে:
          </p>
          <div className="flex items-center gap-2 max-w-md">
            <Input value={subdomain} onChange={e => setSubdomain(e.target.value)} placeholder="mystore" className="font-mono text-sm" />
            <span className="text-sm font-bold text-primary whitespace-nowrap">.swapnobaz.com</span>
          </div>
          {subdomain && (
            <p className="text-xs text-muted-foreground pt-1">
              🔗 আপনার লাইভ স্টোর লিংক: <a href={`https://${subdomain}.swapnobaz.com`} target="_blank" rel="noreferrer" className="text-primary font-semibold underline underline-offset-2">https://{subdomain}.swapnobaz.com</a>
            </p>
          )}
        </div>

        {/* Custom Domain Section */}
        <div className="space-y-4 p-4 rounded-xl border bg-background">
          <div>
            <Label className="font-bold text-base flex items-center gap-1.5">
              2. Custom Branded Domain (কাস্টম নিজস্ব ডোমেন)
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              যদি আপনার নিজস্ব কেনা ডোমেন থাকে (যেমন: Namecheap, GoDaddy, Cloudflare, DianaHost থেকে কেনা):
            </p>
          </div>

          <div className="space-y-1.5 max-w-md">
            <Label className="text-xs font-semibold">আপনার ডোমেন নাম লিখুন:</Label>
            <Input value={customDomain} onChange={e => setCustomDomain(e.target.value)} placeholder="www.yourbrand.com" className="font-mono" />
          </div>

          {/* Step-by-step Setup Guideline Box */}
          <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">📖</span>
              <h4 className="font-bold text-sm text-foreground">ডোমেন কানেক্ট করার সহজ ৩টি ধাপ (Step-by-Step Guide):</h4>
            </div>

            <ol className="text-xs space-y-2.5 list-decimal list-inside text-muted-foreground leading-relaxed">
              <li className="pl-1">
                <strong className="text-foreground">ডোমেন ম্যানেজমেন্টে লগইন করুন:</strong> আপনি যে কোম্পানি থেকে ডোমেন কিনেছেন (যেমন: Namecheap, GoDaddy, Cloudflare) সেখানে লগইন করে <strong className="text-foreground">DNS Management / DNS Records</strong> পেজে যান।
              </li>
              <li className="pl-1">
                <strong className="text-foreground">নিচের A Record দুটি যুক্ত করুন:</strong>
              </li>
            </ol>

            {/* A Record Setup Card */}
            <div className="p-3.5 rounded-lg border bg-background space-y-2 shadow-sm max-w-xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">A Record Setup</span>
              </div>

              {/* Record 1: Root domain */}
              <div className="grid grid-cols-3 gap-2 font-mono text-xs bg-muted/30 p-2.5 rounded border">
                <div>
                  <p className="text-[10px] text-muted-foreground font-sans font-bold">TYPE</p>
                  <p className="font-bold text-foreground">A</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-sans font-bold">NAME / HOST</p>
                  <p className="font-bold text-foreground">@ <span className="text-[10px] text-muted-foreground font-sans">(root domain)</span></p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-sans font-bold">VALUE / IP</p>
                  <p className="font-bold text-primary">68.183.191.215</p>
                </div>
              </div>

              {/* Record 2: www */}
              <div className="grid grid-cols-3 gap-2 font-mono text-xs bg-muted/30 p-2.5 rounded border">
                <div>
                  <p className="text-[10px] text-muted-foreground font-sans font-bold">TYPE</p>
                  <p className="font-bold text-foreground">A</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-sans font-bold">NAME / HOST</p>
                  <p className="font-bold text-foreground">www</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-sans font-bold">VALUE / IP</p>
                  <p className="font-bold text-primary">68.183.191.215</p>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground italic">
                💡 Cloudflare ব্যবহার করলে Proxy status <strong>Proxied (🟠 Orange Cloud)</strong> রাখুন।
              </p>
            </div>

            <div className="text-[11px] text-muted-foreground space-y-1 bg-background/60 p-2.5 rounded-lg border">
              <p>
                <strong>ধাপ ৩:</strong> DNS রেকর্ড যোগ করার পর উপরের বক্সে আপনার ডোমেন নামটি লিখে নিচের <strong>"Save Domain Settings"</strong> বাটনে ক্লিক করুন।
              </p>
              <p className="text-[10px] text-muted-foreground italic">
                ℹ️ DNS আপডেট গ্লোবালি অ্যাক্টিভ হতে সাধারণত ৫ থেকে ১৫ মিনিট সময় লাগে।
              </p>
            </div>
          </div>
        </div>

        <Button onClick={() => onSave({ subdomain, customDomain })} disabled={saving} className="font-bold">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" /> Save Domain Settings
        </Button>
      </CardContent>
    </Card>
  );
}

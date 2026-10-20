'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Layout, 
  Palette, 
  Monitor, 
  Save, 
  ShieldCheck,
  ChevronRight,
  Eye,
  Globe,
  BarChart3,
  Settings2,
  Code,
  X,
  Database
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from"@/components/ui/select";
import { ImageUpload } from '@/components/ui/image-upload';

const TEMPLATE_OPTIONS = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7'];
const THEME_OPTIONS = ['default', 'emerald', 'black', 'caffeine', 'claude', 'elegant', 'marvel', 'material', 'midnight', 'nature', 'perplexity', 'slack', 'summer', 'sunset', 'valorant', 'supabase', 'amber', 'catppuccin', 'clay', 'cyberpunk', 'darkmatter', 'ocean', 'quantum', 't3', 'tangerine', 'vintage', 'green', 'red', 'rose', 'orange', 'blue', 'yellow', 'violet'];

const TEMPLATE_CONFIG = [
  { id: 'layout', label: 'Primary Layout' },
  { id: 'navbar', label: 'Navbar' },
  { id: 'hero', label: 'Hero Section' },
  { id: 'productCard', label: 'Product Card' },
  { id: 'productDetail', label: 'Product Detail' },
  { id: 'categories', label: 'Category View' },
  { id: 'footer', label: 'Footer' },
  { id: 'shopListing', label: 'Shop Page' },
  { id: 'blogListing', label: 'Blog Listing' },
  { id: 'blogDetail', label: 'Blog Detail' },
];

const FONT_OPTIONS = [
  { id: 'inter', label: 'Inter (Modern Sans)' },
  { id: 'poppins', label: 'Poppins (Round Sans)' },
  { id: 'roboto', label: 'Roboto (Clean Sans)' },
  { id: 'montserrat', label: 'Montserrat (Elegant Sans)' },
  { id: 'playfair', label: 'Playfair Display (Serif)' },
  { id: 'lora', label: 'Lora (Classic Serif)' },
  { id: 'outfit', label: 'Outfit (Contemporary Sans)' },
  { id: 'urbanist', label: 'Urbanist (Geometric Sans)' },
  { id: 'manrope', label: 'Manrope (Modern Humanist)' },
  { id: 'open-sans', label: 'Open Sans (Neutral Sans)' },
  { id: 'lato', label: 'Lato (Friendly Sans)' },
  { id: 'oswald', label: 'Oswald (Strong/Logo)' },
  { id: 'raleway', label: 'Raleway (Elegant Sans)' },
  { id: 'nunito', label: 'Nunito (Soft Round)' },
  { id: 'ubuntu', label: 'Ubuntu (Technical Sans)' },
  { id: 'merriweather', label: 'Merriweather (Bold Serif)' },
  { id: 'kanit', label: 'Kanit (Modern Thai/Bold)' },
  { id: 'quicksand', label: 'Quicksand (Playful Round)' },
  { id: 'josefin-sans', label: 'Josefin Sans (Geometric/Logo)' },
  { id: 'syne', label: 'Syne (Artistic/Trendy)' },
  { id: 'space-grotesk', label: 'Space Grotesk (Futuristic/Tech)' },
  { id: 'orbitron', label: 'Orbitron (Futuristic)' },
  { id: 'jost', label: 'Jost (Sporty/Clean)' },
  { id: 'geist', label: 'Geist (Next.js Default)' },
];

export default function SuperConfigPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to load settings: ${res.status}`);
      }
      const data = await res.json();
      setSettings(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!settings) {
      toast.error('No settings data available to save');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast.success('System Infrastructure Configured Successfully!');
        router.refresh();
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Update failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateTemplate = (key: string, value: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      uiTemplates: {
        ...(settings.uiTemplates || {}),
        [key]: value
      }
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
    </div>
  );

  const ui = settings?.uiTemplates || {};

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px] md:text-xs">
            <ShieldCheck className="h-4 w-4" /> System Infrastructure Control
          </div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tighter">Global Config</h1>
          <p className="text-muted-foreground text-sm">Manage keys, tracking, and design orchestration for the entire platform.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button 
            onClick={handleUpdate} 
            disabled={saving || !settings}
            className="h-11 md:h-12 px-6 md:px-8 rounded-xl font-bold gap-2 shadow-lg shadow-primary/20 text-sm"
          >
            {saving ? 'Applying...' : <><Save className="h-5 w-5" /> Save Configuration</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Brand Identity */}
        <Card className="lg:col-span-3 border-none shadow-2xl bg-white/80 backdrop-blur-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-5 md:p-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg shrink-0">
                <Settings2 className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <CardTitle className="text-xl md:text-2xl font-bold leading-tight">Brand Identity & Typography</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo Font */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Code className="w-4 h-4 text-orange-500" />
                  Logo Typography
                </Label>
                <Select 
                  value={settings?.uiTemplates?.logoFont || 'orbitron'} 
                  onValueChange={(v) => updateTemplate('logoFont', v)}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-2 border-gray-100 focus:border-orange-500 transition-all">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl min-w-[300px] max-h-[450px] shadow-2xl border-2 border-orange-500/10">
                    {FONT_OPTIONS.map(f => (
                      <SelectItem key={f.id} value={f.id} className="rounded-xl py-3 focus:bg-orange-50 transition-colors">
                        <span className="font-medium text-sm">{f.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Body Font */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Layout className="w-4 h-4 text-orange-500" />
                  Body Typography
                </Label>
                <Select 
                  value={settings?.uiTemplates?.bodyFont || 'inter'} 
                  onValueChange={(v) => updateTemplate('bodyFont', v)}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-2 border-gray-100 focus:border-orange-500 transition-all">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl min-w-[300px] max-h-[450px] shadow-2xl border-2 border-orange-500/10">
                    {FONT_OPTIONS.map(f => (
                      <SelectItem key={f.id} value={f.id} className="rounded-xl py-3 focus:bg-orange-50 transition-colors">
                        <span className="font-medium text-sm">{f.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

        {/* 1. System Identification */}
        <Card className="lg:col-span-3 border-2 border-primary/20 shadow-none overflow-hidden rounded-3xl">
            <CardHeader className="bg-primary/5 border-b p-5 md:px-6">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                 <Globe className="h-5 w-5 text-primary" /> Tracking & SEO Core
              </CardTitle>
           </CardHeader>
           <CardContent className="p-5 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="gtm-id" className="font-bold">GTM ID (Tag Manager)</Label>
                <input 
                  id="gtm-id"
                  value={settings?.googleTagManagerId || ''} 
                  onChange={(e) => setSettings({...(settings ?? {}), googleTagManagerId: e.target.value})}
                  placeholder="GTM-XXXXXXX"
                  className="w-full h-12 rounded-xl border px-4 focus:ring-2 focus:ring-primary outline-none text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ga4-id" className="font-bold text-xs uppercase tracking-tight opacity-70">GA4 Measurement ID (G-XXXX)</Label>
                <input 
                  id="ga4-id"
                  value={settings?.googleAnalyticsId || ''} 
                  onChange={(e) => setSettings({...(settings ?? {}), googleAnalyticsId: e.target.value})}
                  placeholder="G-XXXXXXXXXX"
                  className="w-full h-12 rounded-xl border px-4 focus:ring-2 focus:ring-primary outline-none text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ga4-property-id" className="font-bold text-xs uppercase tracking-tight opacity-70">GA4 Property ID (Analytics)</Label>
                <input 
                  id="ga4-property-id"
                  value={settings?.googleAnalyticsPropertyId || ''} 
                  onChange={(e) => setSettings({...(settings ?? {}), googleAnalyticsPropertyId: e.target.value})}
                  placeholder="e.g. 534447077"
                  className="w-full h-12 rounded-xl border px-4 focus:ring-2 focus:ring-primary outline-none text-sm"
                />
              </div>
           </CardContent>
        </Card>

        {/* 2. Advanced Tracking */}
        <Card className="lg:col-span-3 border-2 shadow-none overflow-hidden rounded-3xl">
           <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="flex items-center gap-2">
                 <BarChart3 className="h-5 w-5 text-primary" /> Marketing & Meta Pixel
              </CardTitle>
           </CardHeader>
           <CardContent className="p-6 space-y-6">
               <div className="space-y-2">
                <Label htmlFor="meta-pixel-id" className="font-bold text-xs">Meta Pixel ID</Label>
                <input id="meta-pixel-id" value={settings?.metaPixelId || ''} onChange={(e) => setSettings({...settings, metaPixelId: e.target.value})} className="w-full h-12 rounded-xl border px-4 text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fb-access-token" className="font-bold text-xs">Facebook Access Token</Label>
                <input id="fb-access-token" type="text" value={settings?.facebookAccessToken || ''} onChange={(e) => setSettings({...settings, facebookAccessToken: e.target.value})} className="w-full h-12 rounded-xl border px-4 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fb-domain-verify" className="font-bold text-xs">FB Domain Verification</Label>
                  <input id="fb-domain-verify" value={settings?.facebookDomainVerification || ''} onChange={(e) => setSettings({...settings, facebookDomainVerification: e.target.value})} className="w-full h-12 rounded-xl border px-4 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fb-test-code" className="font-bold text-xs">FB Test Event Code</Label>
                  <input id="fb-test-code" value={settings?.facebookTestEventCode || ''} onChange={(e) => setSettings({...settings, facebookTestEventCode: e.target.value})} className="w-full h-12 rounded-xl border px-4 text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sc-api-url" className="font-bold text-xs">Search Console ID / URL (for Analytics)</Label>
                <input id="sc-api-url" value={settings?.googleSearchConsoleId || ''} onChange={(e) => setSettings({...settings, googleSearchConsoleId: e.target.value})} placeholder="e.g. https://www.example.com/ or sc-domain:example.com" className="w-full h-12 rounded-xl border px-4 text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="search-console-meta" className="font-bold text-xs">Search Console Meta Tag (for Verification)</Label>
                <input id="search-console-meta" value={settings?.searchConsoleMeta || ''} onChange={(e) => setSettings({...settings, searchConsoleMeta: e.target.value})} className="w-full h-12 rounded-xl border px-4 text-sm" />
              </div>
           </CardContent>
        </Card>

        {/* 3. AI Intelligence */}
        <Card className="lg:col-span-3 border-2 border-purple-500/20 shadow-none overflow-hidden rounded-3xl">
           <CardHeader className="bg-purple-500/5 border-b">
              <CardTitle className="flex items-center gap-2">
                 <Settings2 className="h-5 w-5 text-purple-600" /> AI Bot Configuration
              </CardTitle>
           </CardHeader>
           <CardContent className="p-6 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <Label htmlFor="gemini-api-key" className="font-bold text-xs">Gemini API Key</Label>
                   <input id="gemini-api-key" type="text" placeholder="AIzaSy... (কমা দিয়ে একাধিক কি যোগ করতে পারেন)" value={settings?.aiConfig?.geminiApiKey || ''} onChange={(e) => setSettings({...settings, aiConfig: {...(settings?.aiConfig || {}), geminiApiKey: e.target.value}})} className="w-full h-12 rounded-xl border px-4 text-sm" />
                   <p className="text-[11px] text-muted-foreground">গুগল জেমিনির প্রাইমারি এপিআই কি। একাধিক কি দিলে স্বয়ংক্রিয়ভাবে লোড-ব্যালেন্স হবে।</p>
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="openrouter-api-key" className="font-bold text-xs">OpenRouter API Key (Fallback)</Label>
                   <input id="openrouter-api-key" type="text" placeholder="sk-or-v1-..." value={settings?.aiConfig?.openRouterApiKey || ''} onChange={(e) => setSettings({...settings, aiConfig: {...(settings?.aiConfig || {}), openRouterApiKey: e.target.value}})} className="w-full h-12 rounded-xl border px-4 text-sm" />
                   <p className="text-[11px] text-muted-foreground">জেমিনির কোটা শেষ বা ওভারলোড হলে স্বয়ংক্রিয়ভাবে OpenRouter থেকে রেসপন্স আনবে।</p>
                 </div>
               </div>
           </CardContent>
        </Card>






        {/* Design Templates */}
        <Card className="lg:col-span-3 border-2 border-primary/10 shadow-none overflow-hidden rounded-3xl">
           <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="flex items-center gap-2 text-primary">
                 <Layout className="h-5 w-5" /> Design Orchestration
              </CardTitle>
              <CardDescription>Select the active version for each UI component across the platform.</CardDescription>
           </CardHeader>
           <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
               {TEMPLATE_CONFIG.map((template) => (
                 <div key={template.id} className="space-y-2">
                   <Label className="font-bold text-[10px] uppercase tracking-wider opacity-60">{template.label}</Label>
                   <Select 
                     value={ui[template.id] === 'aarong' ? (template.id === 'productCard' ? 'v7' : 'v6') : (ui[template.id] ?? 'v1')} 
                     onValueChange={(v) => updateTemplate(template.id, v)}
                   >
                     <SelectTrigger className="h-12 rounded-xl bg-background border-2 border-muted hover:border-primary/50 transition-colors">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent className="rounded-xl">
                       {TEMPLATE_OPTIONS.map(o => (
                         <SelectItem key={o} value={o} className="rounded-lg">
                           {`Version ${o.toUpperCase()}`}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
               ))}
               
                {/* Theme Selector */}
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase tracking-wider opacity-60 text-primary">Active Brand Theme</Label>
                  <Select 
                    value={ui.theme ?? 'default'} 
                    onValueChange={(v) => updateTemplate('theme', v)}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-background border-2 border-muted hover:border-primary/50 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {THEME_OPTIONS.map(o => (
                        <SelectItem key={o} value={o} className="rounded-lg capitalize">
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}

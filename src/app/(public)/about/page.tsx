import { Metadata } from 'next';
import Link from 'next/link';
import { 
  Store, 
  ShieldCheck, 
  TrendingUp, 
  Sparkles, 
  Truck, 
  Wallet, 
  Layers, 
  ArrowRight, 
  Cpu, 
  Globe, 
  CheckCircle2,
  Users
} from 'lucide-react';
import connectToDatabase from '@/lib/db';
import GlobalSettings from '@/models/GlobalSettings';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'About Us | Swapnobaz',
  description: 'Swapnobaz is Bangladesh\'s leading B2B + B2C Multi-Vendor Dropshipping Platform & SaaS, empowering resellers and entrepreneurs to launch branded online stores with zero inventory capital.',
};

async function getSettings() {
  try {
    await connectToDatabase();
    const settings = await GlobalSettings.findOne().lean();
    if (!settings) {
      return {
        brandName: "Swapnobaz",
        siteDescription: "Premium B2B + B2C Multi-Vendor Dropshipping Platform & SaaS",
        contact: {
          email: "support@swapnobaz.com",
          phone: "+8801234567890",
          address: "Dhaka, Bangladesh"
        }
      };
    }
    return JSON.parse(JSON.stringify(settings));
  } catch (error) {
    console.error('Error fetching settings for about page:', error);
    return null;
  }
}

export default async function AboutPage() {
  const settings = await getSettings();
  const brandName = settings?.brandName || "Swapnobaz";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ── 1. Hero Section ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background py-20 md:py-28 border-b border-border/60">
        <div className="absolute top-0 right-1/4 -mt-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="container mx-auto px-4 max-w-5xl text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide">
            <Sparkles className="h-4 w-4" />
            Next-Gen E-Commerce & Dropshipping Ecosystem
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-foreground leading-tight">
            Powering Independent Retailers & <span className="text-primary">Entrepreneurs</span>
          </h1>

          <p className="text-muted-foreground text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
            <strong className="text-foreground">{brandName}</strong> is an advanced B2B + B2C multi-tenant dropshipping and retail platform in Bangladesh. We combine a unified master inventory, automated courier pipelines, and customizable reseller storefronts to help anyone launch a profitable e-commerce brand with zero upfront capital.
          </p>

          <div className="flex flex-wrap gap-4 justify-center pt-2">
            <Button asChild size="lg" className="font-bold rounded-xl shadow-lg hover:shadow-xl">
              <Link href="/reseller/register" className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Join Reseller Program
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl">
              <Link href="/shop">
                Explore Catalog
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── 2. Platform Stats ── */}
      <section className="py-12 bg-card/60 backdrop-blur-sm border-b border-border/60">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 space-y-1">
              <p className="text-3xl md:text-4xl font-black text-primary">0 ৳</p>
              <p className="text-xs md:text-sm text-muted-foreground font-semibold">Inventory Capital Required</p>
            </div>
            <div className="p-4 space-y-1">
              <p className="text-3xl md:text-4xl font-black text-primary">64</p>
              <p className="text-xs md:text-sm text-muted-foreground font-semibold">Districts Courier Coverage</p>
            </div>
            <div className="p-4 space-y-1">
              <p className="text-3xl md:text-4xl font-black text-primary">100%</p>
              <p className="text-xs md:text-sm text-muted-foreground font-semibold">Automated Order Routing</p>
            </div>
            <div className="p-4 space-y-1">
              <p className="text-3xl md:text-4xl font-black text-primary">24/7</p>
              <p className="text-xs md:text-sm text-muted-foreground font-semibold">Instant Wallet Settlement</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Mission & Vision ── */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
                <TrendingUp className="h-3.5 w-3.5" />
                Our Vision & Mission
              </div>

              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground leading-tight">
                Democratizing E-Commerce for Every Dreamer
              </h2>

              <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                Traditional retail requires massive upfront capital for inventory stocking, warehouse rent, packaging, and delivery partnerships. {brandName} eliminates these barriers by providing a complete end-to-end dropshipping engine.
              </p>

              <div className="space-y-4 pt-2">
                <div className="p-5 rounded-2xl bg-card border border-border/70 space-y-2">
                  <h4 className="font-bold text-foreground text-base flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" /> Our Mission
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-7">
                    To connect verified suppliers and manufacturers with ambitious digital retailers, providing cutting-edge multi-tenant storefront technology and automated logistics to build successful e-commerce businesses.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-card border border-border/70 space-y-2">
                  <h4 className="font-bold text-foreground text-base flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" /> Our Vision
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-7">
                    To become the premier B2B + B2C dropshipping SaaS platform in South Asia, fostering a vibrant ecosystem of self-reliant entrepreneurs and reliable consumer shopping.
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Feature Card */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-card via-background to-primary/10 p-8 border border-border/80 shadow-xl space-y-6">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-black text-foreground">How Swapnobaz Works</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Our platform operates on a reverse order pipeline:
              </p>
              <div className="space-y-3 font-mono text-xs text-foreground/90">
                <div className="p-3 bg-muted/40 rounded-xl border border-border/60 flex items-center gap-3">
                  <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-[11px] shrink-0">1</span>
                  <span><strong>Storefront:</strong> Reseller showcases products under their brand & pricing.</span>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border/60 flex items-center gap-3">
                  <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-[11px] shrink-0">2</span>
                  <span><strong>Mother Hub:</strong> Orders sync automatically to the central warehouse.</span>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border/60 flex items-center gap-3">
                  <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-[11px] shrink-0">3</span>
                  <span><strong>Courier API:</strong> Packaged & dispatched with reseller branding.</span>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border/60 flex items-center gap-3">
                  <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-[11px] shrink-0">4</span>
                  <span><strong>Settlement:</strong> Delivered orders credit profit instantly to wallet.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Core Pillars ── */}
      <section className="py-16 md:py-24 bg-card/40 border-y border-border/60">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl md:text-4xl font-black text-foreground">
              Core Platform <span className="text-primary">Architecture</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Engineered with enterprise-grade modularity and performance in mind
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card p-8 rounded-2xl border border-border hover:border-primary/40 transition-all shadow-sm space-y-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Multi-Tenant SaaS</h3>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                Dynamic subdomain generation and custom domain mapping (CNAME) with isolated tenant data scoping in MongoDB.
              </p>
            </div>

            <div className="bg-card p-8 rounded-2xl border border-border hover:border-primary/40 transition-all shadow-sm space-y-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Real-Time Inventory Sync</h3>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                Master product catalog with instant multi-store stock, pricing, image, and category synchronization.
              </p>
            </div>

            <div className="bg-card p-8 rounded-2xl border border-border hover:border-primary/40 transition-all shadow-sm space-y-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Truck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Integrated Logistics</h3>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                Direct integration with leading national couriers (Steadfast, Pathao, RedX) for automated booking and live parcel tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Developer & Technology Section ── */}
      <section className="py-16 bg-gradient-to-b from-card to-background border-b border-border/60 relative overflow-hidden">
        <div className="container mx-auto px-4 max-w-3xl text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-widest uppercase">
            <span>Engineering & Development</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
            Crafted with Modern Next.js Architecture
          </h3>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            {brandName} is powered by a high-performance technology stack utilizing Next.js App Router, Tailwind CSS design system, MongoDB, and Redis caching. Designed for lightning-fast speeds, dynamic themes, and enterprise scalability by <a href="https://www.jiapixel.com" target="_blank" rel="noopener" className="text-primary font-semibold hover:underline">Jia Pixel</a>.
          </p>
        </div>
      </section>
    </div>
  );
}

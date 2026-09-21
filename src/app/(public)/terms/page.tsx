import { Metadata } from 'next';
import Link from 'next/link';
import connectToDatabase from '@/lib/db';
import GlobalSettings from '@/models/GlobalSettings';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Scale, 
  Store, 
  Truck, 
  Wallet, 
  Layers, 
  ShieldCheck, 
  AlertTriangle, 
  HelpCircle, 
  RefreshCw, 
  CheckCircle2, 
  Ban, 
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Terms of Service | Swapnobaz',
  description: 'Terms and conditions governing the use of the Swapnobaz B2B + B2C Multi-Vendor Dropshipping Platform & SaaS.',
};

async function getSettings() {
  try {
    await connectToDatabase();
    const settings = await GlobalSettings.findOne().lean();
    if (!settings) {
      return {
        brandName: "Swapnobaz",
        contact: {
          email: "support@swapnobaz.com",
          phone: "+8801234567890",
          address: "Dhaka, Bangladesh"
        }
      };
    }
    return JSON.parse(JSON.stringify(settings));
  } catch (error) {
    console.error('Error fetching settings for terms page:', error);
    return {
      brandName: "Swapnobaz",
      contact: {
        email: "support@swapnobaz.com",
        phone: "+8801234567890",
        address: "Dhaka, Bangladesh"
      }
    };
  }
}

export default async function TermsPage() {
  const settings = await getSettings();
  const brandName = settings?.brandName || "Swapnobaz";
  const contactEmail = settings?.contact?.email || "support@swapnobaz.com";
  const contactPhone = settings?.contact?.phone || "+880 1234-567890";
  const effectiveDate = "July 19, 2026";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ── 1. Hero Header ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background py-16 md:py-24 border-b border-border/60">
        <div className="absolute top-0 right-1/4 -mt-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="container mx-auto px-4 max-w-4xl text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide">
            <Scale className="h-4 w-4" />
            Legal Agreement & Policies
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
            Terms & <span className="text-primary">Conditions</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Welcome to <strong className="text-foreground">{brandName}</strong>. These terms govern the use of our multi-vendor dropshipping platform, reseller SaaS services, and retail marketplace.
          </p>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pt-2">
            Effective Date: {effectiveDate}
          </p>
        </div>
      </section>

      {/* ── 2. Table of Contents / Quick Links ── */}
      <section className="py-8 bg-card/50 border-b border-border/60">
        <div className="container mx-auto px-4 max-w-4xl">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Key Sections:</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <a href="#platform-overview" className="px-3 py-1.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors">1. Platform Overview</a>
            <a href="#account-roles" className="px-3 py-1.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors">2. User Roles & Accounts</a>
            <a href="#reseller-storefronts" className="px-3 py-1.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors">3. Reseller SaaS & Multi-Tenancy</a>
            <a href="#order-pipeline" className="px-3 py-1.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors">4. Order Pipeline & Fulfillment</a>
            <a href="#wallets-payouts" className="px-3 py-1.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors">5. Wallets, Pricing & Settlements</a>
            <a href="#delivery-returns" className="px-3 py-1.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors">6. Delivery, Returns & Refunds</a>
            <a href="#prohibited" className="px-3 py-1.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors">7. Prohibited Conduct</a>
            <a href="#liability" className="px-3 py-1.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors">8. Liability & Warranty</a>
          </div>
        </div>
      </section>

      {/* ── 3. Content Section ── */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="space-y-12">

            {/* 1. Platform Overview */}
            <div id="platform-overview" className="space-y-4 scroll-mt-20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">1. Platform Overview & Agreement</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                {brandName} operates a specialized B2B + B2C multi-vendor dropshipping platform and Software-as-a-Service (SaaS) architecture. By registering an account, accessing our website, creating a reseller storefront, placing an order, or utilizing our APIs, you accept and agree to comply with all terms, guidelines, and operating policies set forth herein.
              </p>
              <div className="p-4 rounded-xl bg-card border border-border/80 text-sm text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Scope of Services
                </p>
                <p>
                  The platform provides central catalog management, real-time inventory synchronization, dynamic reseller storefronts, reverse order routing, automated courier integration, virtual wallet tracking, and automated payout settlements.
                </p>
              </div>
            </div>

            <Separator />

            {/* 2. User Roles & Accounts */}
            <div id="account-roles" className="space-y-4 scroll-mt-20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">2. User Roles & Account Security</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                Our ecosystem serves four distinct participant tiers:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-card border border-border space-y-1.5">
                  <h4 className="font-bold text-foreground text-sm">Retail Customers (B2C)</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    End consumers purchasing directly from {brandName} or authorized reseller storefronts with Cash on Delivery (COD) or online payment options.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border space-y-1.5">
                  <h4 className="font-bold text-foreground text-sm">Resellers & Store Owners</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Independent business operators managing dedicated subdomains/custom domains, marketing catalog items, and earning profit margins without stocking inventory.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border space-y-1.5">
                  <h4 className="font-bold text-foreground text-sm">Suppliers & Manufacturers</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Verified product suppliers supplying wholesale merchandise into the Mother Inventory and fulfilling verified dispatch orders.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border space-y-1.5">
                  <h4 className="font-bold text-foreground text-sm">Administrators</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Platform managers overseeing system design, tenant lifecycles, courier connections, fraud verification, and financial payouts.
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                You are responsible for safeguarding your login credentials. Any activity conducted under your account or API key is solely your legal responsibility.
              </p>
            </div>

            <Separator />

            {/* 3. Reseller SaaS & Multi-Tenancy */}
            <div id="reseller-storefronts" className="space-y-4 scroll-mt-20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Store className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">3. Reseller SaaS & Multi-Tenant Storefronts</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                Resellers on {brandName} receive access to our proprietary multi-tenant e-commerce technology:
              </p>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Subdomains & Custom Domains:</strong> Resellers may operate under auto-generated subdomains or map their own custom domains via DNS CNAME configuration.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Catalog Synchronization:</strong> Resellers can select and publish products from the Mother Database. Inventory stocks, media assets, and product specs update in real time via our Redis/BullMQ background queue.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Personal Products & Shared Catalog:</strong> Resellers may upload proprietary items to their store. If marked public for the community catalog, other resellers can sell them, with fulfillment routed to the item owner.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Brand Independence:</strong> Resellers are responsible for customer-facing communication, promotions, and honest advertising of product specifications.</span>
                </li>
              </ul>
            </div>

            <Separator />

            {/* 4. Order Pipeline & Fulfillment */}
            <div id="order-pipeline" className="space-y-4 scroll-mt-20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">4. Reverse Order Pipeline & Fulfillment</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                All order processing operates via our automated <strong>Reverse Order Pipeline</strong>:
              </p>
              <div className="p-5 bg-card rounded-2xl border border-border/80 space-y-3">
                <div className="flex items-center gap-2 font-bold text-foreground text-sm">
                  <Layers className="h-4 w-4 text-primary" /> Automated Workflow
                </div>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  <strong>Customer $\rightarrow$ Reseller Store $\rightarrow$ Mother System $\rightarrow$ Supplier/Hub $\rightarrow$ Courier API $\rightarrow$ Delivery $\rightarrow$ Wallet Settlement.</strong>
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  When a customer places an order on a reseller website, the order is validated against inventory, assigned a tracking code, and booked automatically with integrated couriers (Steadfast, Pathao, RedX). Packaging labels and thermal sticker invoices are produced directly from the central hub.
                </p>
              </div>
            </div>

            <Separator />

            {/* 5. Wallets, Pricing & Settlements */}
            <div id="wallets-payouts" className="space-y-4 scroll-mt-20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Wallet className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">5. Wallets, Pricing Engine & Payout Settlements</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                Our multi-level pricing engine calculates Supplier Base Price, Platform Cost, Reseller Margin, and Retail Price automatically.
              </p>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Virtual Wallets:</strong> Every reseller and supplier has an atomic virtual wallet tracking pending balances, cleared earnings, and payout logs.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Profit Crediting:</strong> Net profit margins are credited to the reseller's wallet immediately upon successful courier delivery confirmation.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Payout Methods:</strong> Payout withdrawals can be requested to verified bKash, Nagad, or Bangladeshi Bank Accounts, processed on standard settlement schedules.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Delivery Failure & Courier Costs:</strong> In case of customer return or delivery refusal, courier return charges are adjusted in accordance with platform return guidelines.</span>
                </li>
              </ul>
            </div>

            <Separator />

            {/* 6. Delivery, Returns & Refunds */}
            <div id="delivery-returns" className="space-y-4 scroll-mt-20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Truck className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">6. Delivery, Returns & 7-Day Replacement Policy</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                We provide nationwide delivery across all 64 districts of Bangladesh through certified logistics partners.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-xl bg-card border border-border/70 space-y-2">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> Eligible for Return
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                    <li>Manufacturing defect or broken item upon delivery</li>
                    <li>Incorrect size, color, or wrong product received</li>
                    <li>Reported within 7 calendar days with unboxing video/photo</li>
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border/70 space-y-2">
                  <h4 className="font-bold text-foreground flex items-center gap-2 text-destructive">
                    <Ban className="h-4 w-4" /> Ineligible for Return
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                    <li>Items damaged by misuse, wear, or physical modification</li>
                    <li>Missing original tags, accessories, or original packaging</li>
                    <li>Requests submitted after the 7-day warranty window</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* 7. Prohibited Conduct */}
            <div id="prohibited" className="space-y-4 scroll-mt-20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
                  <Ban className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">7. Prohibited Conduct & Fraud Prevention</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                To protect our ecosystem, {brandName} actively enforces fraud detection (analyzing return ratios and fake orders). The following activities result in immediate account termination and forfeiture of wallet balances:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-bold">•</span>
                  <span>Generating fake COD orders or intentional delivery sabotages.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-bold">•</span>
                  <span>Listing prohibited, counterfeit, or deceptive merchandise.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-bold">•</span>
                  <span>Attempting unauthorized API exploitation or security breaches.</span>
                </li>
              </ul>
            </div>

            <Separator />

            {/* 8. Limitation of Liability */}
            <div id="liability" className="p-6 bg-card border border-border/80 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">8. Limitation of Liability & Warranty</h3>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                {brandName} provides its multi-tenant platform and catalog services on an "as is" and "as available" basis. While we strive for 99.9% uptime, we shall not be liable for indirect, incidental, or third-party courier delays resulting from force majeure events, natural disasters, or temporary carrier network disruptions.
              </p>
            </div>

            {/* Contact Card */}
            <div className="bg-primary/5 p-8 md:p-10 rounded-3xl text-center border border-primary/20 space-y-4">
              <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary mx-auto">
                <HelpCircle className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">Questions Regarding Terms?</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Our support team is available 24/7 to assist with legal questions, reseller agreements, or order clarifications.
              </p>
              <div className="flex flex-wrap gap-4 justify-center pt-2">
                <Button asChild className="rounded-xl font-bold">
                  <a href={`mailto:${contactEmail}`}>
                    Email Legal Team
                  </a>
                </Button>
                <Button asChild variant="outline" className="rounded-xl">
                  <Link href="/faq">
                    Visit FAQ Center
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Support Line: <strong className="text-foreground">{contactPhone}</strong> | Location: {settings?.contact?.address || "Dhaka, Bangladesh"}
              </p>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}

import { Metadata } from 'next';
import Link from 'next/link';
import connectToDatabase from '@/lib/db';
import GlobalSettings from '@/models/GlobalSettings';
import { Separator } from '@/components/ui/separator';
import { 
  ShieldCheck, 
  Lock, 
  Eye, 
  Server, 
  CreditCard, 
  Truck, 
  Database, 
  UserCheck, 
  HelpCircle, 
  CheckCircle2, 
  FileLock2,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Privacy Policy | Swapnobaz',
  description: 'Learn how Swapnobaz protects your personal data, enforces multi-tenant database isolation, and secures e-commerce transactions.',
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
    console.error('Error fetching settings for privacy page:', error);
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

export default async function PrivacyPage() {
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
            <ShieldCheck className="h-4 w-4" />
            Data Protection & Privacy Commitment
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
            Privacy <span className="text-primary">Policy</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Your trust is our utmost priority. Learn how <strong className="text-foreground">{brandName}</strong> handles, secures, and isolates customer, reseller, and supplier data across our SaaS ecosystem.
          </p>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pt-2">
            Last Updated: {effectiveDate}
          </p>
        </div>
      </section>

      {/* ── 2. Content Section ── */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="space-y-12">

            {/* 1. Introduction & Multi-Tenant Scope */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Database className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">1. Introduction & Multi-Tenant Architecture</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                {brandName} is a multi-tenant B2B + B2C dropshipping platform. This privacy policy applies to all users: retail buyers purchasing items on our main marketplace or partner reseller storefronts, resellers operating independent subdomains/custom domains, and wholesale suppliers.
              </p>
              <div className="p-5 rounded-2xl bg-card border border-primary/20 space-y-2">
                <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <FileLock2 className="h-4 w-4 text-primary" /> Logical Database Isolation (Tenant Security)
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  In compliance with our SaaS architectural standards, every reseller storefront operates with strict <strong>logical data isolation</strong> in MongoDB. Queries and order logs are isolated with strict tenant identifiers (<code className="text-primary font-mono text-xs">tenantId / resellerId</code>), ensuring that reseller client lists, margins, and financial records are completely inaccessible to other resellers.
                </p>
              </div>
            </div>

            <Separator />

            {/* 2. Information We Collect */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Eye className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">2. Information We Collect</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                We gather necessary information to fulfill orders, facilitate wallet settlements, and deliver seamless logistics:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary" /> Customer Data
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Full Name, Delivery Address & Phone Number</li>
                    <li>Order history, parcel tracking & purchased items</li>
                    <li>Delivery status & optional product reviews</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" /> Reseller & Financial Data
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Store Name, Custom Subdomain / Domain mapping</li>
                    <li>Pickup address & contact details</li>
                    <li>Payout accounts (bKash, Nagad, Bank account numbers)</li>
                    <li>Virtual wallet balance, earnings & commission ledgers</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <Server className="h-4 w-4 text-primary" /> Supplier & Product Data
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Company information & warehouse address</li>
                    <li>Product catalogs, SKUs, inventory levels & cost sheets</li>
                    <li>Settlement invoices & dispatch records</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" /> Technical & Security Data
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>IP address, browser type & device identifiers</li>
                    <li>Login activity logs & Email OTP verification sessions</li>
                    <li>Server-side tracking & anonymized analytics</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* 3. How We Use Data */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Lock className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">3. How We Process & Utilize Data</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                Your data is processed strictly to support the dropshipping pipeline:
              </p>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Reverse Order Fulfillment:</strong> Routing order details from customer checkouts directly to the warehouse and courier systems for dispatch.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Wallet Settlement:</strong> Calculating gross margins, reseller profits, supplier dues, and automated payout disbursements.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Fraud Prevention:</strong> Validating customer phone numbers and cross-referencing courier return histories to shield resellers from fraudulent orders.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Catalog & Webhook Sync:</strong> Pushing live stock updates, price changes, and new product data to connected storefronts.</span>
                </li>
              </ul>
            </div>

            <Separator />

            {/* 4. Third-Party Service Providers */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Truck className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">4. Trusted Third-Party Integrations</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                To execute logistics and payment processing, we securely share minimal necessary data with authorized providers:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" /> Courier APIs
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Customer delivery addresses and phone numbers are transmitted via encrypted API to our courier partners (<strong>Steadfast Courier, Pathao, RedX</strong>) strictly for parcel transport and live tracking updates.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" /> Payment Gateways & MFS
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Online transactions and reseller payouts are executed via PCI-compliant payment gateways and Mobile Financial Services (<strong>bKash, Nagad, SSLCommerz, Stripe</strong>). We never store raw card numbers.
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground">
                <strong className="text-foreground font-semibold">Zero Data Selling Guarantee:</strong> {brandName} will NEVER sell, lease, or monetize customer or reseller personal information to third-party advertisers or brokers.
              </div>
            </div>

            <Separator />

            {/* 5. Security & Account Controls */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">5. Data Security & Your Rights</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                We implement industry-standard safeguards including HTTPS/TLS encryption, Role-Based Access Control (RBAC), and automated activity logs.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>Your Rights Include:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-xs pl-2">
                  <li>Accessing and reviewing your account profile and transaction ledgers at any time.</li>
                  <li>Requesting updates or corrections to your delivery address, store configurations, or payment channels.</li>
                  <li>Requesting permanent account deactivation and data purging, subject to statutory financial recordkeeping laws.</li>
                </ul>
              </div>
            </div>

            {/* Contact Support Box */}
            <div className="bg-primary/5 p-8 md:p-10 rounded-3xl text-center border border-primary/20 space-y-4">
              <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary mx-auto">
                <HelpCircle className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">Privacy Questions or Data Requests?</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Reach out to our Data Protection Officer for any inquiries concerning data privacy, security, or compliance.
              </p>
              <div className="flex flex-wrap gap-4 justify-center pt-2">
                <Button asChild className="rounded-xl font-bold">
                  <a href={`mailto:${contactEmail}`}>
                    Email Privacy Officer
                  </a>
                </Button>
                <Button asChild variant="outline" className="rounded-xl">
                  <Link href="/terms">
                    View Terms of Service
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Support: <strong className="text-foreground">{contactPhone}</strong> | Location: {settings?.contact?.address || "Dhaka, Bangladesh"}
              </p>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}

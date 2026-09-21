import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Store, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  TrendingUp, 
  Truck, 
  Wallet, 
  Laptop, 
  CheckCircle2, 
  HelpCircle,
  Users,
  DollarSign,
  PackageCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Reseller Program | Swapnobaz',
  description: 'Swapnobaz Reseller Program - Launch your branded e-commerce business with zero upfront capital. Sell quality products at your own prices and earn high profit margins.',
};

const steps = [
  {
    step: '01',
    title: 'Free Registration & Store Setup',
    desc: 'Register in minutes with your store name and custom subdomain to get your free storefront.',
    icon: Store,
  },
  {
    step: '02',
    title: 'Pick Products & Set Profit Margins',
    desc: 'Choose from thousands of catalog products and set your desired selling price and markup.',
    icon: PackageCheck,
  },
  {
    step: '03',
    title: 'Promote & Receive Orders',
    desc: 'Promote products to customers via your storefront, social media, or marketing channels.',
    icon: Laptop,
  },
  {
    step: '04',
    title: 'Automated Delivery & Fast Payouts',
    desc: 'We pack and ship the products to your customers. Once delivered, your profit is credited instantly to your wallet.',
    icon: Wallet,
  },
];

const features = [
  {
    icon: DollarSign,
    title: 'Zero Capital Investment',
    desc: 'No warehouse or inventory stocking fees. Start selling without any upfront capital.',
  },
  {
    icon: Laptop,
    title: 'Dedicated Custom Website',
    desc: 'A ready-to-use e-commerce website under your brand name with custom domain support.',
  },
  {
    icon: Truck,
    title: 'Nationwide Courier Delivery',
    desc: 'Fast Cash on Delivery across the entire country with automated live parcel tracking.',
  },
  {
    icon: Wallet,
    title: 'Easy & Fast Profit Withdrawals',
    desc: 'Withdraw your accumulated earnings directly to bKash, Nagad, or Bank account anytime.',
  },
  {
    icon: ShieldCheck,
    title: 'Quality Control & Return Handling',
    desc: 'Every item passes rigorous quality checks, and we handle legitimate customer returns seamlessly.',
  },
  {
    icon: Users,
    title: 'Dedicated Reseller Support',
    desc: 'Get access to hands-on support from our dedicated reseller and operations team.',
  },
];

const faqs = [
  {
    q: 'Are there any registration or membership fees to join?',
    a: 'No, joining the Swapnobaz Reseller Program is 100% free with no hidden charges or subscription fees.',
  },
  {
    q: 'Under whose brand name are the parcels delivered?',
    a: 'Parcels are delivered to your customers with your store/brand name on the packaging to preserve your brand identity.',
  },
  {
    q: 'How and when do I receive my profits?',
    a: 'As soon as an order is marked delivered, your profit margin is automatically credited to your Swapnobaz wallet, which you can withdraw anytime.',
  },
  {
    q: 'What happens if a customer returns a parcel?',
    a: 'For legitimate customer returns and cancellations, resellers do not bear any product inventory costs.',
  },
];

export default function ResellerProgramPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ── 1. Hero Section ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background py-16 md:py-24 border-b border-border/60">
        <div className="absolute top-0 right-1/4 -mt-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            <div className="space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-primary/15 text-primary border border-primary/20 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold tracking-wide">
                <Sparkles className="h-4 w-4" />
                Reseller Partnership Program
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight leading-tight">
                Launch Your Own{' '}
                <span className="text-primary underline decoration-primary/30 decoration-wavy underline-offset-8">
                  E-Commerce Brand
                </span>{' '}
                with Zero Risk
              </h1>

              <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
                Source thousands of quality products at wholesale rates, set your prices, and earn instant profits. We handle sourcing, storage, packaging, and door-to-door delivery!
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Button asChild size="lg" className="w-full sm:w-auto font-bold text-base px-8 py-6 rounded-xl shadow-lg hover:shadow-xl">
                  <Link href="/reseller/register" className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Register Free as Reseller
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto font-semibold px-6 py-6 rounded-xl">
                  <Link href="#how-it-works">
                    How It Works
                  </Link>
                </Button>
              </div>
            </div>

            <div className="relative flex justify-center">
              <div className="relative w-full max-w-md lg:max-w-lg aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border border-border bg-card">
                <Image
                  src="/assets/images/sectionbanner/reseller-section.webp"
                  alt="Reseller Program"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 2. How it works ── */}
      <section id="how-it-works" className="py-16 md:py-24 bg-card/40 border-b border-border/60">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground">
              How Does <span className="text-primary">Swapnobaz Reselling</span> Work?
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Run your automated e-commerce business in 4 simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="relative p-6 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-3xl font-black text-muted-foreground/30 font-mono">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 3. Features & Benefits ── */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
              <TrendingUp className="h-3.5 w-3.5" />
              Empowering Entrepreneurs
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground">
              Why Choose the <span className="text-primary">Swapnobaz Platform?</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              We provide you with complete e-commerce technology, inventory, and logistics support
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div key={i} className="p-6 rounded-2xl bg-card border border-border flex items-start gap-4">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-foreground">{feat.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4. FAQ Section ── */}
      <section className="py-16 md:py-20 bg-muted/30 border-y border-border/60">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
              <HelpCircle className="h-3.5 w-3.5" />
              Frequently Asked Questions
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">
              Got Questions? We’ve Got Answers
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="p-5 rounded-xl bg-card border border-border/80 space-y-2">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  {faq.q}
                </h3>
                <p className="text-sm text-muted-foreground pl-6 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Bottom CTA Banner ── */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-primary/15 via-primary/5 to-card">
        <div className="container mx-auto px-4 max-w-4xl text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black text-foreground">
            Start Your E-Commerce Journey Today
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Join thousands of successful business owners and build your brand with freedom and ease.
          </p>
          <div className="pt-2">
            <Button asChild size="lg" className="font-bold text-base px-10 py-6 rounded-xl shadow-xl hover:scale-105 transition-all">
              <Link href="/reseller/register" className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Register as a Reseller
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

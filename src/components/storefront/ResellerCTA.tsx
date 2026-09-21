import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Store, Sparkles } from 'lucide-react';

const resellerBenefits = [
  'No upfront inventory or warehouse costs',
  'Sell under your own brand, logo, and pricing',
  'Fully branded online store with custom domain support',
  'Instant profits and commission on every delivered order',
  'Automated courier management and hassle-free payouts',
];

export function ResellerCTA() {
  return (
    <section className="container px-4 mx-auto my-8">
      {/* ── Reseller Card ── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-background to-primary/5 shadow-lg p-6 sm:p-8 md:p-12">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10">

          {/* Left: Text Content */}
          <div className="space-y-6 order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3.5 py-1.5 rounded-full text-xs md:text-sm font-semibold tracking-wide border border-primary/20">
              <Store className="h-4 w-4" />
              Reseller Partnership
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight leading-tight">
                Launch Your Own{' '}
                <span className="text-primary underline decoration-primary/30 decoration-wavy underline-offset-4">
                  E-Commerce Business
                </span>{' '}
                with Zero Capital
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                We handle product sourcing, packaging, and doorstep delivery. You focus on branding, marketing, and earning profits!
              </p>
            </div>

            <ul className="space-y-2.5">
              {resellerBenefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground/90 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/reseller/register"
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm sm:text-base py-3 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              >
                <Sparkles className="h-4 w-4" />
                Join as a Reseller
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/reseller-program"
                className="inline-flex items-center justify-center gap-2 border border-border bg-card/60 hover:bg-accent hover:text-accent-foreground text-foreground font-semibold text-sm sm:text-base py-3 px-5 rounded-xl transition-all duration-200"
              >
                Learn More
              </Link>
            </div>
          </div>

          {/* Right: Image */}
          <div className="relative order-1 lg:order-2 flex justify-center">
            <div className="relative w-full aspect-[16/10] sm:aspect-[4/3] rounded-2xl overflow-hidden shadow-xl border border-border/80 bg-muted">
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
  );
}

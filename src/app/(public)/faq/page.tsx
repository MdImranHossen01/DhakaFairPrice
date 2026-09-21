import { Metadata } from 'next';
import { getCachedFAQs } from '@/lib/data-fetching';
import { FAQSection } from '@/components/storefront/FAQSection';
import { HelpCircle, MessageSquare, ArrowRight, PhoneCall } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions (FAQ) | Swapnobaz',
  description: 'Find answers to commonly asked questions regarding orders, shipping, delivery, payments, returns, and reseller program at Swapnobaz.',
};

export const revalidate = 60; // Revalidate every 60 seconds

export default async function FAQPage() {
  const faqs = await getCachedFAQs();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ── Page Hero Header ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background py-12 md:py-16 border-b border-border/60">
        <div className="container mx-auto px-4 max-w-5xl text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide">
            <HelpCircle className="h-4 w-4" />
            Help & Support Center
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight">
            Frequently Asked <span className="text-primary">Questions</span>
          </h1>

          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Need help with your order, shipping, returns, or our reseller platform? Browse through our most common questions and answers below.
          </p>
        </div>
      </section>

      {/* ── FAQ Interactive Section ── */}
      <main className="flex-1 py-4">
        <FAQSection faqs={faqs} />
      </main>

      {/* ── Still Have Questions CTA ── */}
      <section className="py-12 md:py-16 bg-card border-t border-border/60">
        <div className="container mx-auto px-4 max-w-4xl text-center space-y-6">
          <div className="h-12 w-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">
              Still Can't Find What You're Looking For?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
              Our customer support team is available to assist you with any questions or issues.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Button asChild size="lg" className="font-bold rounded-xl shadow-md">
              <Link href="/contact" className="flex items-center gap-2">
                <PhoneCall className="h-4 w-4" />
                Contact Customer Support
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl">
              <Link href="/track-order">
                Track Your Order
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

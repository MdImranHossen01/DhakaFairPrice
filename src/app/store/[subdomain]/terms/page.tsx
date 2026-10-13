import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import { SettingsProvider } from '@/components/SettingsProvider';
import { NavbarSelector } from '@/components/templates/Registry';
import { FooterSelector } from '@/components/templates/ServerRegistry';
import { ResellerPixels } from '@/components/reseller/ResellerPixels';
import { FreeDeliveryBanner } from '@/components/storefront/FreeDeliveryBanner';
import { Scale, Truck, ShieldCheck, RefreshCw, Phone, Mail } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ subdomain: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { subdomain } = await params;
  await dbConnect();
  const reseller = await Reseller.findOne({ subdomain, status: 'active' }).lean();
  if (!reseller) return { title: 'Terms & Conditions' };

  return {
    title: `শর্তাবলী ও নিয়মাবলী | ${reseller.storeName}`,
    description: `${reseller.storeName}-এর ব্যবহারের নিয়ম ও শর্তাবলী।`,
  };
}

export default async function StoreTermsPage({ params }: PageProps) {
  const { subdomain } = await params;
  await dbConnect();

  const reseller = await Reseller.findOne({ subdomain, status: 'active' }).lean();
  if (!reseller) notFound();

  const storeName = reseller.storeName || 'Online Shop';
  const logo = reseller.logoUrl;
  const deliveryInside = reseller.deliveryConfig?.insideDhaka ?? 60;
  const deliveryOutside = reseller.deliveryConfig?.outsideDhaka ?? 120;
  const freeDeliveryThreshold = reseller.deliveryConfig?.freeDeliveryThreshold || 0;

  const phone = reseller.contact?.phone || '';
  const email = reseller.contact?.email || '';
  const address = reseller.contact?.address || '';

  const settingsData = {
    isReseller: true,
    brandName: storeName,
    logoUrl: logo,
    freeDeliveryThreshold,
    contact: {
      email,
      phone,
      address,
    },
    socialLinks: {
      facebook: reseller.socialLinks?.facebook,
      whatsapp: reseller.socialLinks?.whatsapp,
    }
  };

  const themeOverrides = (reseller.themeOverrides as any) || {};
  const navStyle = themeOverrides.navbar || 'v1';
  const footerStyle = themeOverrides.footer || 'v1';

  return (
    <SettingsProvider settings={settingsData}>
      <div className="min-h-screen bg-background font-sans flex flex-col">
        <FreeDeliveryBanner settings={settingsData} />
        <ResellerPixels
          subdomain={subdomain}
          metaPixelId={reseller.seoConfig?.metaPixelId}
          tiktokPixelId={reseller.seoConfig?.tiktokPixelId}
        />
        <NavbarSelector style={navStyle} />

        <main className="flex-1 py-8 md:py-14">
          <div className="container mx-auto px-4 max-w-4xl space-y-10">
            {/* Header */}
            <div className="text-center space-y-3 border-b border-border pb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                <Scale className="w-3.5 h-3.5" />
                নীতিমালা ও ব্যবহারের শর্তাবলী
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground">
                {storeName} - শর্তাবলী (Terms &amp; Conditions)
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                আমাদের ওয়েবসাইট থেকে কেনাকাটা করার পূর্বে অনুগ্রহ করে নিম্নবর্ণিত শর্তাবলী সতর্কতার সাথে পড়ে নিন।
              </p>
            </div>

            {/* Terms Content */}
            <div className="space-y-8 text-foreground/90 leading-relaxed text-sm md:text-base">
              {/* Section 1 */}
              <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-3 shadow-sm">
                <div className="flex items-center gap-3 text-primary font-bold text-lg">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <h2>১. সাধারণ নিয়ম ও গ্রহণযোগ্যতা</h2>
                </div>
                <p className="text-muted-foreground text-sm">
                  <span className="font-semibold text-foreground">{storeName}</span>-এ অর্ডার প্লেস করার মাধ্যমে আপনি আমাদের শর্তাবলীর সাথে সম্মতি প্রকাশ করছেন। আমরা সময়ে সময়ে নীতিমালায় পরিবর্তন আনার অধিকার সংরক্ষণ করি।
                </p>
              </section>

              {/* Section 2 */}
              <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-3 shadow-sm">
                <div className="flex items-center gap-3 text-primary font-bold text-lg">
                  <Truck className="w-5 h-5 shrink-0" />
                  <h2>২. ডেলিভারি ও শিপিং চার্জ</h2>
                </div>
                <div className="text-muted-foreground text-sm space-y-2">
                  <p>
                    আমরা বাংলাদেশের যেকোনো প্রান্তে নির্ভরযোগ্য কুরিয়ার সার্ভিসের মাধ্যমে পণ্য ডেলিভারি দিয়ে থাকি:
                  </p>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>ঢাকার ভেতরে ডেলিভারি চার্জ: <strong className="text-foreground">৳{deliveryInside}</strong></li>
                    <li>ঢাকার বাইরে ডেলিভারি চার্জ: <strong className="text-foreground">৳{deliveryOutside}</strong></li>
                    {freeDeliveryThreshold > 0 && (
                      <li><strong className="text-foreground">৳{freeDeliveryThreshold}</strong> বা তার বেশি মূল্যের অর্ডারে সম্পূর্ণ ফ্রি ডেলিভারি প্রযোজ্য।</li>
                    )}
                  </ul>
                  <p className="pt-1">
                    ঢাকার ভেতরে সাধারণত ২৪-৪৮ ঘণ্টা এবং ঢাকার বাইরে ২-৪ কার্যদিবসের মধ্যে ডেলিভারি সম্পন্ন হয়।
                  </p>
                </div>
              </section>

              {/* Section 3 */}
              <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-3 shadow-sm">
                <div className="flex items-center gap-3 text-primary font-bold text-lg">
                  <RefreshCw className="w-5 h-5 shrink-0" />
                  <h2>৩. রিটার্ন, রিফান্ড ও এক্সচেঞ্জ পলিসি</h2>
                </div>
                <div className="text-muted-foreground text-sm space-y-2">
                  <p>
                    ডেলিভারিম্যানের উপস্থিতিতে পণ্যটি চেক করে রিসিভ করার জন্য বিশেষভাবে অনুরোধ করা হচ্ছে:
                  </p>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>ত্রুটিযুক্ত, ছেঁড়া বা ভুল সাইজের পণ্য প্রাপ্ত হলে তাৎক্ষণিকভাবে ডেলিভারিম্যানের সামনে ফেরত দিন অথবা কাস্টমার সার্ভিসে জানান।</li>
                    <li>পণ্য অক্ষত এবং অব্যবহৃত অবস্থায় থাকলে ৩ দিনের মধ্যে এক্সচেঞ্জের সুযোগ থাকবে।</li>
                  </ul>
                </div>
              </section>

              {/* Section 4 */}
              <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-3 shadow-sm">
                <div className="flex items-center gap-3 text-primary font-bold text-lg">
                  <Phone className="w-5 h-5 shrink-0" />
                  <h2>৪. কাস্টমার সাপোর্ট ও অভিযোগ</h2>
                </div>
                <p className="text-muted-foreground text-sm">
                  অর্ডার বা কোনো সেবার বিষয়ে সহায়তার জন্য সরাসরি আমাদের সাথে যোগাযোগ করুন:
                </p>
                <div className="pt-2 flex flex-wrap gap-4 text-xs md:text-sm">
                  {phone && (
                    <div className="flex items-center gap-1.5 text-foreground">
                      <Phone className="w-4 h-4 text-primary" />
                      <Link href={`tel:${phone}`} className="font-semibold hover:underline">{phone}</Link>
                    </div>
                  )}
                  {email && (
                    <div className="flex items-center gap-1.5 text-foreground">
                      <Mail className="w-4 h-4 text-primary" />
                      <Link href={`mailto:${email}`} className="font-semibold hover:underline">{email}</Link>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </main>

        <FooterSelector style={footerStyle} />
      </div>
    </SettingsProvider>
  );
}

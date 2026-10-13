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
import { Lock, ShieldCheck, Eye, Database, Phone, Mail } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ subdomain: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { subdomain } = await params;
  await dbConnect();
  const reseller = await Reseller.findOne({ subdomain, status: 'active' }).lean();
  if (!reseller) return { title: 'Privacy Policy' };

  return {
    title: `গোপনীয়তা নীতি | ${reseller.storeName}`,
    description: `${reseller.storeName}-এর গ্রাহকদের তথ্যের গোপনীয়তা ও সুরক্ষা নীতিমালা।`,
  };
}

export default async function StorePrivacyPage({ params }: PageProps) {
  const { subdomain } = await params;
  await dbConnect();

  const reseller = await Reseller.findOne({ subdomain, status: 'active' }).lean();
  if (!reseller) notFound();

  const storeName = reseller.storeName || 'Online Shop';
  const logo = reseller.logoUrl;
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
                <Lock className="w-3.5 h-3.5" />
                তথ্য সুরক্ষা ও গোপনীয়তা
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground">
                {storeName} - প্রাইভেসি পলিসি (Privacy Policy)
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                <span className="font-semibold text-foreground">{storeName}</span> গ্রাহকদের ব্যক্তিগত তথ্যের সর্বোচ্চ নিরাপত্তা বজায় রাখতে প্রতিশ্রুতিবদ্ধ।
              </p>
            </div>

            {/* Privacy Sections */}
            <div className="space-y-8 text-foreground/90 leading-relaxed text-sm md:text-base">
              {/* Section 1 */}
              <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-3 shadow-sm">
                <div className="flex items-center gap-3 text-primary font-bold text-lg">
                  <Database className="w-5 h-5 shrink-0" />
                  <h2>১. আমরা যেসব তথ্য সংগ্রহ করি</h2>
                </div>
                <p className="text-muted-foreground text-sm">
                  অর্ডার সঠিকভাবে প্রসেস এবং ডেলিভারি সম্পন্ন করার স্বার্থে আমরা আপনার নাম, ডেলিভারি ঠিকানা, মোবাইল নম্বর এবং অর্ডারের বিস্তারিত তথ্য সংগ্রহ করে থাকি।
                </p>
              </section>

              {/* Section 2 */}
              <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-3 shadow-sm">
                <div className="flex items-center gap-3 text-primary font-bold text-lg">
                  <Eye className="w-5 h-5 shrink-0" />
                  <h2>২. তথ্যের ব্যবহার</h2>
                </div>
                <div className="text-muted-foreground text-sm space-y-2">
                  <p>সংগৃহীত তথ্য শুধুমাত্র নিম্নলিখিত উদ্দেশ্যে ব্যবহৃত হয়:</p>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>অর্ডার কনফার্মেশন ও পার্সেল প্যাকিং সম্পন্ন করতে।</li>
                    <li>কুরিয়ার সার্ভিস পার্টনারের মাধ্যমে সঠিক ঠিকানায় হোম ডেলিভারি পৌঁছে দিতে।</li>
                    <li>অর্ডার ও ডেলিভারির স্ট্যাটাস সম্পর্কে গ্রাহককে ফোন বা এসএমএস/WhatsApp মারফত অবগত রাখতে।</li>
                  </ul>
                </div>
              </section>

              {/* Section 3 */}
              <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-3 shadow-sm">
                <div className="flex items-center gap-3 text-primary font-bold text-lg">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <h2>৩. তথ্যের গোপনীয়তা ও নিরাপত্তা</h2>
                </div>
                <p className="text-muted-foreground text-sm">
                  <span className="font-semibold text-foreground">{storeName}</span> গ্রাহকের কোনো তথ্য তৃতীয় কোনো ব্যক্তি বা বাণিজ্যিক পক্ষের কাছে বিক্রি বা অপব্যবহার করে না। শুধুমাত্র অনুমোদিত কুরিয়ার ডেলিভারি রাইডারের সাথে ডেলিভারির জন্য প্রয়োজনীয় ফোন নম্বর ও ঠিকানা শেয়ার করা হয়।
                </p>
              </section>

              {/* Section 4 */}
              <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-3 shadow-sm">
                <div className="flex items-center gap-3 text-primary font-bold text-lg">
                  <Phone className="w-5 h-5 shrink-0" />
                  <h2>৪. যোগাযোগ ও তথ্য হালনাগাদ</h2>
                </div>
                <p className="text-muted-foreground text-sm">
                  আপনার তথ্যের সুরক্ষা সম্পর্কিত যেকোনো প্রশ্ন বা সংশোধনের জন্য সরাসরি আমাদের সাপোর্টে যোগাযোগ করতে পারেন:
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

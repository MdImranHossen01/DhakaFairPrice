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
import { ResellerContactForm } from './ResellerContactForm';
import { Phone, Mail, MapPin, MessageCircle, Clock, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ subdomain: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { subdomain } = await params;
  await dbConnect();
  const reseller = await Reseller.findOne({ subdomain, status: 'active' }).lean();
  if (!reseller) return { title: 'Contact Us' };

  return {
    title: `যোগাযোগ | ${reseller.storeName}`,
    description: `Contact ${reseller.storeName}. Phone: ${reseller.contact?.phone || 'N/A'}, Email: ${reseller.contact?.email || 'N/A'}.`,
  };
}

export default async function StoreContactPage({ params }: PageProps) {
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
  const whatsapp = reseller.socialLinks?.whatsapp || phone;
  const cleanWaNumber = whatsapp ? String(whatsapp).replace(/\D/g, '') : '';

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
          <div className="container mx-auto px-4 max-w-5xl space-y-10">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground">
                যোগাযোগ ও সহায়তা
              </h1>
              <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
                <span className="font-semibold text-foreground">{storeName}</span>-এর সাথে যোগাযোগের বিস্তারিত তথ্য নিচে দেওয়া হলো।
              </p>
            </div>

            {/* Contact Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Phone Card */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-3 shadow-sm hover:border-primary/50 transition-all">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">হটলাইন / মোবাইল</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">সরাসরি কথা বলুন</p>
                </div>
                {phone ? (
                  <Link
                    href={`tel:${phone}`}
                    className="block font-bold text-primary hover:underline text-sm truncate"
                  >
                    {phone}
                  </Link>
                ) : (
                  <p className="text-xs text-muted-foreground italic">নম্বর প্রদান করা হয়নি</p>
                )}
              </div>

              {/* Email Card */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-3 shadow-sm hover:border-primary/50 transition-all">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">ইমেইল সহায়তা</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">লিখিত অনুসন্ধানের জন্য</p>
                </div>
                {email ? (
                  <Link
                    href={`mailto:${email}`}
                    className="block font-bold text-primary hover:underline text-sm truncate"
                  >
                    {email}
                  </Link>
                ) : (
                  <p className="text-xs text-muted-foreground italic">ইমেইল প্রদান করা হয়নি</p>
                )}
              </div>

              {/* Address / WhatsApp Card */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-3 shadow-sm hover:border-primary/50 transition-all sm:col-span-2 lg:col-span-1">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  {cleanWaNumber ? <MessageCircle className="w-5 h-5 text-emerald-600" /> : <MapPin className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">
                    {cleanWaNumber ? 'WhatsApp সাপোর্ট' : 'ঠিকানা'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {cleanWaNumber ? 'তাৎক্ষণিক চ্যাট' : 'দোকানের অবস্থান'}
                  </p>
                </div>
                {cleanWaNumber ? (
                  <Link
                    href={`https://wa.me/${cleanWaNumber}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 font-bold text-emerald-600 hover:underline text-sm"
                  >
                    <MessageCircle className="w-4 h-4" /> চ্যাট শুরু করুন
                  </Link>
                ) : address ? (
                  <p className="text-xs text-muted-foreground line-clamp-2">{address}</p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">অনলাইন স্টোর</p>
                )}
              </div>
            </div>

            {/* Form + Store Info Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7">
                <ResellerContactForm
                  storeName={storeName}
                  whatsappPhone={cleanWaNumber}
                  supportEmail={email}
                />
              </div>

              <div className="lg:col-span-5 space-y-6">
                {/* Store Profile Box */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
                  <h3 className="font-bold text-foreground text-base border-b border-border pb-3">
                    দোকানের তথ্য
                  </h3>

                  <div className="space-y-3 text-sm">
                    {address && (
                      <div className="flex items-start gap-3 text-muted-foreground">
                        <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{address}</span>
                      </div>
                    )}

                    <div className="flex items-start gap-3 text-muted-foreground">
                      <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-foreground text-xs">অর্ডার সেবা</p>
                        <p className="text-xs">২৪ ঘণ্টা অনলাইন অর্ডার সুবিধা</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 text-muted-foreground">
                      <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-foreground text-xs">নিরাপদ কেনাকাটা</p>
                        <p className="text-xs">ক্যাশ অন ডেলিভারি এবং দ্রুততম হোম ডেলিভারি</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <FooterSelector style={footerStyle} />
      </div>
    </SettingsProvider>
  );
}

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
import {
  Phone,
  Mail,
  MapPin,
  MessageCircleMore,
  Clock,
  CheckCircle2,
  ExternalLink,
  Headphones,
  ShieldCheck,
  Truck
} from 'lucide-react';
import { Facebook, X, Instagram, Youtube, Linkedin, Whatsapp } from '@/components/ui/social-icons';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface PageProps {
  params: Promise<{ subdomain: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { subdomain } = await params;
  await dbConnect();
  const reseller = await Reseller.findOne({ subdomain, status: 'active' }).lean();
  if (!reseller) return { title: 'Contact Us' };

  return {
    title: `Contact Us | ${reseller.storeName}`,
    description: `Get in touch with ${reseller.storeName}. Phone: ${reseller.contact?.phone || 'N/A'}, Email: ${reseller.contact?.email || 'N/A'}.`,
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
      instagram: reseller.socialLinks?.instagram,
      twitter: reseller.socialLinks?.twitter,
      youtube: reseller.socialLinks?.youtube,
      linkedin: reseller.socialLinks?.linkedin,
      whatsapp: reseller.socialLinks?.whatsapp || (phone ? `https://wa.me/${String(phone).replace(/\D/g, '')}` : undefined),
    }
  };

  const themeOverrides = (reseller.themeOverrides as any) || {};
  const navStyle = themeOverrides.navbar || 'v1';
  const footerStyle = themeOverrides.footer || 'v1';

  const contactItems = [
    {
      icon: <Phone className="h-6 w-6 text-primary" />,
      title: "Call Hotline",
      subtitle: "General Inquiries & Support",
      value: phone || "Not Provided",
      href: phone ? `tel:${phone}` : undefined,
      label: "Call Now",
      isExternal: false,
    },
    {
      icon: <Mail className="h-6 w-6 text-primary" />,
      title: "Email Support",
      subtitle: "Order & Product Inquiries",
      value: email || "Not Provided",
      href: email ? `mailto:${email}` : undefined,
      label: "Send Email",
      isExternal: false,
    },
    {
      icon: <MessageCircleMore className="h-6 w-6 text-primary" />,
      title: "WhatsApp Chat",
      subtitle: "Instant Customer Assistance",
      value: cleanWaNumber ? (phone || cleanWaNumber) : "Chat Available",
      href: cleanWaNumber ? `https://wa.me/${cleanWaNumber}` : undefined,
      label: "Start Chat",
      isExternal: true,
    },
    {
      icon: <MapPin className="h-6 w-6 text-primary" />,
      title: "Store Location & Hub",
      subtitle: "Visit Or Pickup Point",
      value: address || "Online Store",
      href: address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : undefined,
      label: "Get Directions",
      isExternal: true,
    },
  ];

  const socialItems = [
    { name: 'Facebook', icon: <Facebook className="h-5 w-5" />, url: reseller.socialLinks?.facebook },
    { name: 'X', icon: <X className="h-5 w-5" />, url: reseller.socialLinks?.twitter },
    { name: 'Instagram', icon: <Instagram className="h-5 w-5" />, url: reseller.socialLinks?.instagram },
    { name: 'Youtube', icon: <Youtube className="h-5 w-5" />, url: reseller.socialLinks?.youtube },
    { name: 'Linkedin', icon: <Linkedin className="h-5 w-5" />, url: reseller.socialLinks?.linkedin },
    {
      name: 'Whatsapp',
      icon: <Whatsapp className="h-5 w-5" />,
      url: reseller.socialLinks?.whatsapp || (cleanWaNumber ? `https://wa.me/${cleanWaNumber}` : undefined),
    },
  ].filter((item) => Boolean(item.url));

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

        {/* ── 1. Hero Section ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background py-14 md:py-20 border-b border-border/60">
          <div className="absolute top-0 right-1/4 -mt-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="container mx-auto px-4 max-w-4xl text-center relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide">
              <Headphones className="h-4 w-4" />
              Dedicated Customer & Order Support
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">
              Contact <span className="text-primary">{storeName}</span>
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
              Have questions about our catalog, want to check the status of your order, or need personalized support? Our customer care team is here to assist you.
            </p>
          </div>
        </section>

        {/* ── 2. Contact Channels & Details (Matching Mother Shop 4-Card Grid) ── */}
        <main className="flex-1 py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-6xl space-y-14">
            {/* 4 Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {contactItems.map((item, idx) => (
                <Card
                  key={idx}
                  className="border border-border/80 shadow-sm hover:shadow-md hover:border-primary/40 transition-all bg-card/60 backdrop-blur-sm rounded-2xl"
                >
                  <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-2">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                      {item.icon}
                    </div>
                    <h3 className="text-base font-bold text-foreground">{item.title}</h3>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      {item.subtitle}
                    </p>
                    <p className="text-xs text-foreground font-semibold break-all pt-1 max-w-[200px]">
                      {item.value}
                    </p>
                    {item.href ? (
                      <a
                        href={item.href}
                        target={item.isExternal ? "_blank" : undefined}
                        rel={item.isExternal ? "noopener noreferrer" : undefined}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline pt-2"
                      >
                        {item.label} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground italic pt-2">Available online</span>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Separator />

            {/* ── 3. Main Content: Form + Map & Store Details ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              {/* Form & Map Column */}
              <div className="lg:col-span-7 space-y-8">
                <ResellerContactForm
                  storeName={storeName}
                  whatsappPhone={cleanWaNumber}
                  supportEmail={email}
                />

                {address && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">Store & Fulfillment Location</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Find our location or visit for local pickups and returns.
                      </p>
                    </div>

                    <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-sm border border-border bg-muted">
                      <iframe
                        title={`${storeName} Location`}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-card border border-border/80 text-xs text-muted-foreground flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <span className="font-semibold text-foreground">Physical Store Address: </span>
                        <span>{address}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar: Social Channels & Hours */}
              <div className="lg:col-span-5 space-y-6">
                {/* Social Channels */}
                <div className="bg-card border border-border/80 rounded-2xl p-6 md:p-7 space-y-4 shadow-sm">
                  <h3 className="text-xl font-bold text-foreground">Connect On Social Channels</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Follow us on social media for new product drops, festive flash sales, and customer announcements.
                  </p>

                  {socialItems.length > 0 ? (
                    <div className="flex flex-wrap gap-3 pt-2">
                      {socialItems.map((social, idx) => (
                        <a
                          key={idx}
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-11 w-11 rounded-xl border border-border/80 bg-background flex items-center justify-center text-foreground/80 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 shadow-sm"
                          title={social.name}
                        >
                          {social.icon}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs italic text-muted-foreground">Follow our store updates online.</p>
                  )}
                </div>

                {/* Operating Schedule */}
                <div className="bg-primary/5 p-6 md:p-7 rounded-2xl border border-primary/20 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <Clock className="h-5 w-5 text-primary" />
                    <h4 className="font-bold text-base text-foreground">Customer Support & Operating Hours</h4>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">Saturday - Thursday:</span>
                      <span className="font-bold text-foreground">10:00 AM - 10:00 PM</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">Friday:</span>
                      <span className="font-bold text-primary">Express Dispatch & Urgent Support</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground font-medium">Online Storefront:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">24/7 Ordering Available</span>
                    </div>
                  </div>
                </div>

                {/* Store Guarantees */}
                <div className="bg-card border border-border/80 rounded-2xl p-6 space-y-3.5 shadow-sm text-xs">
                  <h4 className="font-bold text-sm text-foreground mb-1">Shopping Assurances</h4>
                  <div className="flex items-start gap-2.5 text-muted-foreground">
                    <Truck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Nationwide delivery with fast doorstep tracking.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Cash on Delivery (COD) supported nationwide.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Verified authentic products with hassle-free replacements.</span>
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

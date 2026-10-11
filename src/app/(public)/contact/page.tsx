import { Metadata } from 'next';
import Link from 'next/link';
import { 
  Mail, 
  Phone, 
  MapPin, 
  ExternalLink, 
  MessageCircleMore, 
  Store, 
  Truck, 
  Layers, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  Headphones
} from 'lucide-react';
import { Facebook, X, Instagram, Youtube, Linkedin, Whatsapp } from '@/components/ui/social-icons';
import connectToDatabase from '@/lib/db';
import GlobalSettings from '@/models/GlobalSettings';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Contact Us | Swapnobaz',
  description: 'Get in touch with Swapnobaz for reseller onboarding, supplier partnerships, customer support, and dropshipping platform inquiries.',
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
        },
        socialLinks: {}
      };
    }
    return JSON.parse(JSON.stringify(settings));
  } catch (error) {
    console.error('Error fetching settings for contact page:', error);
    return {
      brandName: "Swapnobaz",
      contact: {
        email: "support@swapnobaz.com",
        phone: "+8801234567890",
        address: "Dhaka, Bangladesh"
      },
      socialLinks: {}
    };
  }
}

export default async function ContactPage() {
  const settings = await getSettings();

  const { contact = {}, socialLinks, brandName = "Swapnobaz" } = settings as {
    contact?: { email?: string; phone?: string; address?: string };
    socialLinks?: { 
      facebook?: string; 
      twitter?: string; 
      instagram?: string; 
      youtube?: string; 
      linkedin?: string; 
      whatsapp?: string; 
    };
    brandName?: string;
  };

  const contactEmail = contact?.email || "support@swapnobaz.com";
  const contactPhone = contact?.phone || "+8801234567890";
  const contactAddress = contact?.address || "Dhaka, Bangladesh";

  const contactItems = [
    {
      icon: <Phone className="h-6 w-6 text-primary" />,
      title: "Call Hotline",
      subtitle: "General Inquiries & Support",
      value: contactPhone,
      href: `tel:${contactPhone}`,
      label: "Call Now",
      isExternal: false
    },
    {
      icon: <Mail className="h-6 w-6 text-primary" />,
      title: "Email Support",
      subtitle: "Technical & Reseller Inquiries",
      value: contactEmail,
      href: `mailto:${contactEmail}`,
      label: "Send Email",
      isExternal: false
    },
    {
      icon: <MessageCircleMore className="h-6 w-6 text-primary" />,
      title: "WhatsApp Chat",
      subtitle: "Instant Reseller Assistance",
      value: contactPhone,
      href: `https://wa.me/${String(contactPhone).replace(/\D/g, '')}`,
      label: "Start Chat",
      isExternal: true
    },
    {
      icon: <MapPin className="h-6 w-6 text-primary" />,
      title: "Headquarters & Hub",
      subtitle: "Central Distribution Center",
      value: contactAddress,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactAddress)}`,
      label: "Get Directions",
      isExternal: true
    }
  ];

  const socialItems = [
    { name: 'Facebook', icon: <Facebook className="h-5 w-5" />, url: socialLinks?.facebook },
    { name: 'X', icon: <X className="h-5 w-5" />, url: socialLinks?.twitter },
    { name: 'Instagram', icon: <Instagram className="h-5 w-5" />, url: socialLinks?.instagram },
    { name: 'Youtube', icon: <Youtube className="h-5 w-5" />, url: socialLinks?.youtube },
    { name: 'Linkedin', icon: <Linkedin className="h-5 w-5" />, url: socialLinks?.linkedin },
    { name: 'Whatsapp', icon: <Whatsapp className="h-5 w-5" />, url: socialLinks?.whatsapp || `https://wa.me/${String(contactPhone).replace(/\D/g, '')}` },
  ].filter(item => item.url);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ── 1. Hero Section ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background py-16 md:py-24 border-b border-border/60">
        <div className="absolute top-0 right-1/4 -mt-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="container mx-auto px-4 max-w-4xl text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide">
            <Headphones className="h-4 w-4" />
            24/7 Platform & Merchant Support
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
            Contact <span className="text-primary">{brandName}</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Whether you are launching your reseller storefront, supplying products as a manufacturer, or tracking a retail order, our dedicated team is here to assist you.
          </p>
        </div>
      </section>

      {/* ── 2. Department Quick Action Cards ── */}
      <section className="py-12 bg-card/40 border-b border-border/60">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <h2 className="text-2xl md:text-3xl font-black text-foreground">
              How Can We Help You Today?
            </h2>
            <p className="text-muted-foreground text-sm">
              Connect directly with the specialized department tailored to your needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Reseller Support */}
            <div className="bg-card p-6 rounded-2xl border border-border/80 hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Store className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Reseller & SaaS Support</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Assistance with store onboarding, custom domain mapping, catalog sync, and virtual wallet payout settlements.
                </p>
              </div>
              <Button asChild size="sm" className="w-full font-bold rounded-xl">
                <Link href="/reseller/register" className="flex items-center justify-center gap-1.5">
                  Launch Reseller Store <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            {/* Supplier & Wholesale */}
            <div className="bg-card p-6 rounded-2xl border border-border/80 hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Layers className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Supplier & Wholesale Inquiries</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Manufacturers and verified suppliers looking to integrate inventories with our nationwide distribution engine.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full font-bold rounded-xl">
                <a href={`mailto:${contactEmail}?subject=Supplier Partnership Inquiry`}>
                  Partner as Supplier
                </a>
              </Button>
            </div>

            {/* Customer Care & Courier */}
            <div className="bg-card p-6 rounded-2xl border border-border/80 hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Truck className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Customer Care & Tracking</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Support with retail order tracking across Steadfast, Pathao, RedX, and 7-day replacement claims.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full font-bold rounded-xl">
                <Link href="/faq">
                  Visit FAQ Center
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Contact Channels & Details ── */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Contact Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {contactItems.map((item, idx) => (
              <Card key={idx} className="border border-border/80 shadow-sm hover:shadow-md transition-all bg-card/60 backdrop-blur-sm rounded-2xl">
                <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-2">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                    {item.icon}
                  </div>
                  <h3 className="text-base font-bold text-foreground">{item.title}</h3>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    {item.subtitle}
                  </p>
                  <p className="text-xs text-foreground font-semibold break-all pt-1 max-w-[200px]">
                    {item.value}
                  </p>
                  <a
                    href={item.href || "#"}
                    target={item.isExternal ? "_blank" : undefined}
                    rel={item.isExternal ? "noopener noreferrer" : undefined}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline pt-2"
                  >
                    {item.label} <ExternalLink className="h-3 w-3" />
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator className="mb-16" />

          {/* Map, Socials & Hours */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Location Map */}
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Central Distribution & Office</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Our central logistics hub handles master inventory storage, quality control inspection, automated sticker invoicing, and nationwide courier handovers.
                </p>
              </div>

              <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-md border border-border bg-muted">
                <iframe
                  title="Swapnobaz Hub Location"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(contactAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  allowFullScreen
                  loading="lazy"
                ></iframe>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border/80 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Verified Physical Hub
                </p>
                <p>{contactAddress}</p>
              </div>
            </div>

            {/* Social Channels & Support Schedule */}
            <div className="space-y-8 lg:pl-6">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-foreground">Connect On Social Channels</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Stay updated on new product arrivals, dropshipping masterclasses, system updates, and merchant notices.
                </p>

                {socialItems.length > 0 ? (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {socialItems.map((social, idx) => (
                      <a
                        key={idx}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-11 w-11 rounded-xl border border-border/80 bg-card flex items-center justify-center text-foreground/80 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 shadow-sm"
                        title={social.name}
                      >
                        {social.icon}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-muted-foreground">Social links available soon...</p>
                )}
              </div>

              {/* Operating Schedule */}
              <div className="bg-primary/5 p-6 md:p-8 rounded-2xl border border-primary/20 space-y-4">
                <div className="flex items-center gap-2.5">
                  <Clock className="h-5 w-5 text-primary" />
                  <h4 className="font-bold text-base text-foreground">Hub & Support Operating Hours</h4>
                </div>
                <div className="space-y-2 text-xs md:text-sm">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground font-medium">Saturday - Thursday:</span>
                    <span className="font-bold text-foreground">10:00 AM - 9:00 PM</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground font-medium">Friday:</span>
                    <span className="font-bold text-primary">Emergency Support & Express Dispatch</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground font-medium">Automated Order Routing:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">24/7 Continuous API</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

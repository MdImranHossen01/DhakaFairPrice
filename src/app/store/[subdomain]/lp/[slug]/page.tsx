import { Metadata } from 'next';
import { headers } from 'next/headers';
import { resolveRequestHost } from '@/lib/seo';
import { notFound } from 'next/navigation';
import connectToDatabase from '@/lib/db';
import LandingPage from '@/models/LandingPage';
import Reseller from '@/models/Reseller';
import { ResellerPixels } from '@/components/reseller/ResellerPixels';

import HeroSection from '@/app/(public)/lp/[slug]/_components/HeroSection';
import ProductShowcase from '@/app/(public)/lp/[slug]/_components/ProductShowcase';
import FeaturesGrid from '@/app/(public)/lp/[slug]/_components/FeaturesGrid';
import OrderForm from '@/app/(public)/lp/[slug]/_components/OrderForm';
import TestimonialsSection from '@/app/(public)/lp/[slug]/_components/TestimonialsSection';
import VideoSection from '@/app/(public)/lp/[slug]/_components/VideoSection';
import FAQSection from '@/app/(public)/lp/[slug]/_components/FAQSection';
import ContentBlock from '@/app/(public)/lp/[slug]/_components/ContentBlock';
import FloatingLPBar from '@/app/(public)/lp/[slug]/_components/FloatingLPBar';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ subdomain: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connectToDatabase();
  const { subdomain, slug } = await params;
  
  const reseller = await Reseller.findOne({ subdomain }).lean() as any;
  if (!reseller) return { title: 'Store Not Found' };

  const page = await LandingPage.findOne({ slug, resellerId: reseller._id }).lean() as any;
  if (!page) return { title: 'Page Not Found' };

  const headersList = await headers();
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dhakafairprice.com';
  const defaultSubdomainHost = `${reseller.subdomain || subdomain}.${rootDomain}`;
  const incomingHost = resolveRequestHost(headersList, defaultSubdomainHost);
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const canonicalUrl = `${protocol}://${incomingHost}/lp/${slug}`;

  const title = page.seoConfig?.metaTitle || `${page.title} | ${reseller.storeName}`;
  const description = page.seoConfig?.metaDescription || page.description || `Special offer on ${reseller.storeName}`;

  return {
    title: {
      absolute: title,
    },
    description: description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: title,
      description: description,
      url: canonicalUrl,
      images: page.seoConfig?.ogImage ? [{ url: page.seoConfig.ogImage }] : [],
    }
  };
}

export default async function ResellerStoreLandingPage({ params }: Props) {
  await connectToDatabase();
  const { subdomain, slug } = await params;

  const reseller = await Reseller.findOne({ subdomain }).lean() as any;
  if (!reseller) {
    notFound();
  }

  const page = await LandingPage.findOne({ slug, resellerId: reseller._id });
  if (!page || !page.isActive) {
    notFound();
  }

  // Increment view count asynchronously
  LandingPage.updateOne({ _id: page._id }, { $inc: { viewCount: 1 } })
    .catch(err => console.error('Failed to track reseller LP view:', err));

  // Settings tailored to this reseller's storefront
  const resellerSettings = {
    deliveryConfig: reseller.deliveryConfig,
    deliveryChargeInsideDhaka: reseller.deliveryConfig?.insideDhaka ?? 60,
    deliveryChargeOutsideDhaka: reseller.deliveryConfig?.outsideDhaka ?? 120,
    freeDeliveryThreshold: reseller.deliveryConfig?.freeDeliveryThreshold ?? 0,
    socialLinks: {
      whatsapp: reseller.whatsappNumber || reseller.phone || '',
    },
    storeName: reseller.storeName,
    manualPaymentMethods: reseller.paymentMethods || [],
  };

  // Ensure there is always a Direct Order Form on the page
  const sections = [...(page.sections || [])];
  const hasOrderForm = sections.some((s: any) => s.type === 'order_form');
  
  if (!hasOrderForm) {
    const productShowcase = sections.find((s: any) => s.type === 'product_showcase');
    const productDetails = productShowcase?.content ? {
      productId: productShowcase.content.productId || '',
      productName: productShowcase.content.title || '',
      price: productShowcase.content.salePrice || productShowcase.content.price || 0,
      productImage: productShowcase.content.image || '',
    } : {};

    sections.push({
      id: 'default-order-form-section',
      type: 'order_form',
      content: {
        title: 'অর্ডার করতে নিচের ফর্মটি পূরণ করুন',
        buttonText: 'অর্ডার নিশ্চিত করুন',
        showQuantity: true,
        defaultQuantity: 1,
        paymentInstructions: 'ডেলিভারি ম্যানের কাছে টাকা পেমেন্ট করুন।',
        ...productDetails
      },
      styles: {
        paddingTop: 'py-12',
        paddingBottom: 'py-24',
      }
    });
  } else {
    const idx = sections.findIndex((s: any) => s.type === 'order_form');
    if (idx !== -1 && !sections[idx].content?.productId) {
      const productShowcase = sections.find((s: any) => s.type === 'product_showcase');
      if (productShowcase?.content) {
        sections[idx] = {
          ...sections[idx],
          content: {
            ...sections[idx].content,
            productId: productShowcase.content.productId || '',
            productName: productShowcase.content.title || '',
            price: productShowcase.content.salePrice || productShowcase.content.price || 0,
            productImage: productShowcase.content.image || '',
          }
        };
      }
    }
  }

  const productShowcaseCount = sections.filter((s: any) => s.type === 'product_showcase').length;

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-24">
      {/* Reseller-specific tracking pixels (Facebook & TikTok) */}
      <ResellerPixels subdomain={subdomain} />

      {sections.map((section: any) => {
        const SectionComponent = getComponent(section.type);
        if (!SectionComponent) return null;

        return (
          <section 
            key={section.id} 
            style={{ backgroundColor: section.styles?.backgroundColor }}
            className={section.styles?.paddingTop || 'py-12'}
          >
            <SectionComponent 
              {...({
                content: section.content,
                styles: section.styles,
                settings: resellerSettings,
                productShowcaseCount,
                resellerSubdomain: subdomain
              } as any)}
            />
          </section>
        );
      })}

      <FloatingLPBar 
        whatsappNumber={resellerSettings.socialLinks.whatsapp} 
        productShowcaseCount={productShowcaseCount}
      />
    </div>
  );
}

function getComponent(type: string) {
  switch (type) {
    case 'hero': return HeroSection;
    case 'product_showcase': return ProductShowcase;
    case 'features': return FeaturesGrid;
    case 'order_form': return OrderForm;
    case 'testimonials': return TestimonialsSection;
    case 'video': return VideoSection;
    case 'faq': return FAQSection;
    case 'content_block': return ContentBlock;
    default: return null;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Metadata } from 'next';
import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { headers } from 'next/headers';
import Script from 'next/script';

import { HeroSlider } from '@/components/storefront/HeroSlider';
import { FreeDeliveryBanner } from '@/components/storefront/FreeDeliveryBanner';
import { ResellerCTA } from '@/components/storefront/ResellerCTA';
import {
  StreamedCategoryShowcase,
  StreamedFeaturedProducts,
  StreamedFlashSale,
  StreamedComboOffer,
  StreamedTrending,
  StreamedRootCategorySections,
  StreamedBlogRecent,
  StreamedNewArrivals,
  StreamedNewsletter,
} from '@/components/storefront/HomePageSections';

import {
  getCachedBanners,
  getCachedSettings,
  getCachedCategories,
} from '@/lib/data-fetching';
import { generateOrganizationSchema } from '@/lib/seo';

const sanitizeForScript = (json: any) => {
  return JSON.stringify(json).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
};

export async function generateMetadata(): Promise<Metadata> {
  const [settings, banners] = await Promise.all([
    getCachedSettings(),
    getCachedBanners()
  ]);

  const brandName = settings?.brandName || 'Swapnobaz';
  const metaTitle = settings?.metaTitle || brandName;
  const description = settings?.metaDescription || settings?.siteDescription || 'Your ultimate destination for quality products.';
  const ogImage = banners?.[0]?.image || settings?.logoUrl || '';

  const headersList = await headers();
  const hostname = headersList.get('host') || 'localhost';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const baseUrl = `${protocol}://${hostname}`;

  return {
    title: {
      default: metaTitle,
      template: `%s | ${brandName}`,
    },
    description,
    openGraph: {
      title: brandName,
      description,
      url: baseUrl,
      siteName: brandName,
      images: ogImage ? [ogImage] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: brandName,
      description,
      images: ogImage ? [ogImage] : [],
    },
    metadataBase: new URL(baseUrl),
  };
}

export default async function Home() {
  // Only fetch above-the-fold critical data upfront.
  // All other sections stream in independently via Suspense.
  const [banners, settings, categories] = await Promise.all([
    getCachedBanners(),
    getCachedSettings(),
    getCachedCategories(),
  ]);

  const ui = {
    hero: settings?.uiTemplates?.hero || 'v1',
    categories: settings?.uiTemplates?.categories || 'v1',
    productCard: settings?.uiTemplates?.productCard || 'v1',
    layout: settings?.uiTemplates?.layout || 'v1',
  };

  const orgSchema = settings ? await generateOrganizationSchema(settings) : null;
  const isLayoutV3 = ui.layout === 'v3';

  return (
    <div className="flex flex-col min-h-screen">
      {orgSchema && (
        <Script
          id="organization-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: sanitizeForScript(orgSchema) }}
        />
      )}

      {/* 0. Free Delivery Announcement Bar */}
      <FreeDeliveryBanner settings={settings} />

      {isLayoutV3 ? (
        <>
          <div className="container mx-auto max-w-[1400px] px-0 py-0 lg:px-4 lg:py-4 flex gap-6 items-start">
            {/* Left Sticky Sidebar — uses already-fetched categories */}
            <aside className="w-64 shrink-0 hidden lg:block sticky top-14 bg-card rounded-xl border border-border/80 shadow-sm p-4 overflow-y-auto max-h-[calc(100vh-80px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex flex-col gap-1.5">
                {categories.map((category: any) => (
                  <Link
                    key={category._id}
                    href={`/shop?category=${encodeURIComponent(category.slug)}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent text-sm font-medium transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {category.image ? (
                        <div className="relative w-6 h-6 flex-shrink-0">
                          <Image
                            src={category.image}
                            alt={category.name}
                            fill
                            sizes="24px"
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold uppercase">
                          {category.name.slice(0, 2)}
                        </span>
                      )}
                      <span className="text-foreground text-[13px] font-bold">{category.name}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                  </Link>
                ))}
              </div>
            </aside>

            {/* Right Content Area — streamed sections */}
            <div className="flex-1 min-w-0 flex flex-col gap-6">
              {/* 1. Hero (above-fold, instant) */}
              <HeroSlider banners={banners} style={ui.hero} layout={ui.layout} />

              {/* 2. Categories Showcase */}
              <StreamedCategoryShowcase style={ui.categories} />

              {/* 3. New Arrivals */}
              <StreamedNewArrivals cardStyle={ui.productCard} layout={ui.layout} />

              {/* 4. Featured Products */}
              <StreamedFeaturedProducts cardStyle={ui.productCard} layout={ui.layout} />

              {/* 5. Flash Sale */}
              <StreamedFlashSale cardStyle={ui.productCard} layout={ui.layout} />

              {/* 6. Combo Offer Banner */}
              <StreamedComboOffer settings={settings} layout={ui.layout} />

              {/* 7. Trending Products */}
              <StreamedTrending cardStyle={ui.productCard} layout={ui.layout} />

              {/* 8. Root Category Sections (Women, Men, Kids, etc.) */}
              <StreamedRootCategorySections cardStyle={ui.productCard} layout={ui.layout} />

              {/* 9. Recent Blogs */}
              <StreamedBlogRecent />

              {/* 10. Newsletter */}
              <StreamedNewsletter layout={ui.layout} />
            </div>
          </div>

          {/* Reseller CTA */}
          <ResellerCTA />
        </>
      ) : (
        <>
          {/* 1. Hero (above-fold, instant) */}
          <HeroSlider banners={banners} style={ui.hero} layout={ui.layout} />

          {/* 2. Categories Showcase */}
          <StreamedCategoryShowcase style={ui.categories} />

          {/* 3. New Arrivals */}
          <StreamedNewArrivals cardStyle={ui.productCard} layout={ui.layout} />

          {/* 4. Featured Products */}
          <StreamedFeaturedProducts cardStyle={ui.productCard} layout={ui.layout} />

          {/* 5. Flash Sale */}
          <StreamedFlashSale cardStyle={ui.productCard} layout={ui.layout} />

          {/* 6. Combo Offer Banner */}
          <StreamedComboOffer settings={settings} layout={ui.layout} />

          {/* 7. Trending Products */}
          <StreamedTrending cardStyle={ui.productCard} layout={ui.layout} />

          {/* 8. Root Category Sections (Women, Men, Kids, etc.) */}
          <StreamedRootCategorySections cardStyle={ui.productCard} layout={ui.layout} />

          {/* 9. Recent Blogs */}
          <StreamedBlogRecent />

          {/* 10. Newsletter */}
          <StreamedNewsletter layout={ui.layout} />

          {/* Reseller CTA */}
          <ResellerCTA />
        </>
      )}
    </div>
  );
}

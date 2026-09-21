/**
 * Async Server Components for Home Page Sections.
 * Each component fetches its own data independently,
 * enabling React Suspense streaming — above-fold content
 * appears instantly while below-fold sections load in parallel.
 */
import { Suspense } from 'react';
import {
  getCachedCategories,
  getCachedProducts,
  getTrendingProducts,
  getCachedBlogs,
  getCachedActiveCoupon,
  getCachedRootCategoriesWithProducts,
} from '@/lib/data-fetching';
import { CategoryShowcase } from '@/components/storefront/CategoryShowcase';
import { ProductCarouselSection } from '@/components/storefront/ProductCarouselSection';
import { BlogRecent } from '@/components/storefront/BlogRecent';
import { ComboOfferBanner } from '@/components/storefront/ComboOfferBanner';
import { NewsletterV2 } from '@/components/storefront/NewsletterV2';
import {
  SectionSkeleton,
  CategoryShowcaseSkeleton,
  BannerSkeleton,
  BlogRecentSkeleton,
} from '@/components/storefront/Skeletons';

// ─── Category Showcase ───────────────────────────────────────────────────────

async function CategoryShowcaseSection({ style }: { style: string }) {
  const categories = await getCachedCategories();
  return <CategoryShowcase categories={categories} style={style} />;
}

// ─── Featured Products ───────────────────────────────────────────────────────

async function FeaturedProductsSection({
  cardStyle,
  layout,
}: {
  cardStyle: string;
  layout: string;
}) {
  const products = await getCachedProducts({ isFeatured: true }, 10);
  if (!products.length) return null;
  return (
    <ProductCarouselSection
      title="Featured Collections"
      description="Explore our best-selling and most popular products hand-picked just for you."
      products={products}
      viewAllLink="/shop?filter=featured"
      bgColor="bg-background"
      cardStyle={cardStyle}
      layout={layout}
    />
  );
}

// ─── Flash Sale ──────────────────────────────────────────────────────────────

async function FlashSaleSection({
  cardStyle,
  layout,
}: {
  cardStyle: string;
  layout: string;
}) {
  const products = await getCachedProducts(
    { salePrice: { $exists: true, $ne: null } },
    10,
    { salePrice: 1 }
  );
  if (!products.length) return null;
  return (
    <ProductCarouselSection
      title="Flash Sale"
      products={products}
      viewAllLink="/shop?filter=sale"
      isFlashSale={true}
      bgColor="bg-primary/5"
      cardStyle={cardStyle}
      layout={layout}
    />
  );
}

// ─── Combo Offer Banner ──────────────────────────────────────────────────────

async function ComboOfferSection({
  settings,
  layout,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: any;
  layout: string;
}) {
  const activeCoupon = await getCachedActiveCoupon();
  return <ComboOfferBanner activeCoupon={activeCoupon} settings={settings} layout={layout} />;
}

// ─── Trending Products ───────────────────────────────────────────────────────

async function TrendingSection({
  cardStyle,
  layout,
}: {
  cardStyle: string;
  layout: string;
}) {
  const products = await getTrendingProducts(10);
  if (!products.length) return null;
  return (
    <ProductCarouselSection
      title="Trending Now"
      description="The most popular items according to our community ratings and reviews."
      products={products}
      viewAllLink="/shop?filter=trending"
      bgColor="bg-muted/20"
      cardStyle={cardStyle}
      layout={layout}
    />
  );
}

// ─── Root Category Sections ──────────────────────────────────────────────────

async function RootCategorySections({
  cardStyle,
  layout,
}: {
  cardStyle: string;
  layout: string;
}) {
  const sections = await getCachedRootCategoriesWithProducts(10);
  if (!sections?.length) return null;
  return (
    <>
      {sections.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (section: any, idx: number) =>
          section.products.length > 0 && (
            <ProductCarouselSection
              key={section.category._id}
              title={section.category.name}
              description={`Explore our curated collection of ${section.category.name} products.`}
              products={section.products}
              viewAllLink={`/shop?category=${encodeURIComponent(section.category.slug)}`}
              bgColor={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
              cardStyle={cardStyle}
              layout={layout}
            />
          )
      )}
    </>
  );
}

// ─── New Arrivals ────────────────────────────────────────────────────────────

async function NewArrivalsSection({
  cardStyle,
  layout,
}: {
  cardStyle: string;
  layout: string;
}) {
  const products = await getCachedProducts({ isNewArrival: true }, 10);
  if (!products.length) return null;
  return (
    <ProductCarouselSection
      title="New Arrivals"
      description="Discover the latest additions to our collection. Stay ahead of the curve."
      products={products}
      viewAllLink="/shop?filter=new"
      bgColor="bg-background"
      cardStyle={cardStyle}
      layout={layout}
    />
  );
}

// ─── Blog Recent ─────────────────────────────────────────────────────────────

async function BlogRecentSection() {
  const blogs = await getCachedBlogs(1);
  return <BlogRecent blogs={blogs} />;
}

// ─── Exported Wrapper Components (with Suspense) ──────────────────────────────

interface ProductSectionProps {
  cardStyle: string;
  layout: string;
}

interface ComboOfferProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings?: any;
  layout: string;
}

export function StreamedCategoryShowcase({ style }: { style: string }) {
  return (
    <Suspense fallback={<CategoryShowcaseSkeleton />}>
      <CategoryShowcaseSection style={style} />
    </Suspense>
  );
}

export function StreamedFeaturedProducts({ cardStyle, layout }: ProductSectionProps) {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <FeaturedProductsSection cardStyle={cardStyle} layout={layout} />
    </Suspense>
  );
}

export function StreamedFlashSale({ cardStyle, layout }: ProductSectionProps) {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <FlashSaleSection cardStyle={cardStyle} layout={layout} />
    </Suspense>
  );
}

export function StreamedComboOffer({ settings, layout }: ComboOfferProps) {
  return (
    <Suspense fallback={<BannerSkeleton />}>
      <ComboOfferSection settings={settings} layout={layout} />
    </Suspense>
  );
}

export function StreamedTrending({ cardStyle, layout }: ProductSectionProps) {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <TrendingSection cardStyle={cardStyle} layout={layout} />
    </Suspense>
  );
}

export function StreamedRootCategorySections({ cardStyle, layout }: ProductSectionProps) {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <RootCategorySections cardStyle={cardStyle} layout={layout} />
    </Suspense>
  );
}

export function StreamedBlogRecent() {
  return (
    <Suspense fallback={<BlogRecentSkeleton />}>
      <BlogRecentSection />
    </Suspense>
  );
}

export function StreamedNewArrivals({ cardStyle, layout }: ProductSectionProps) {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <NewArrivalsSection cardStyle={cardStyle} layout={layout} />
    </Suspense>
  );
}

export function StreamedNewsletter({ layout }: { layout: string }) {
  return (
    <Suspense fallback={<BannerSkeleton />}>
      <NewsletterV2 layout={layout} />
    </Suspense>
  );
}

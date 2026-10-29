/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { generateProductSchema, generateBreadcrumbSchema, resolveRequestHost, getProductMeta } from '@/lib/seo';
import { ProductDetailsSelector } from '@/components/templates/ServerRegistry';
import { ProductCard } from '@/components/storefront/ProductCard';
import { ViewTracker } from '@/components/common/ViewTracker';
import { getCachedProductBySlug, getCachedSettings } from '@/lib/data-fetching';
import { notFound } from 'next/navigation';

const sanitizeForScript = (json: any) => {
  return JSON.stringify(json).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
};

const getProduct = async (slug: string) => {
  return getCachedProductBySlug(slug);
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [product, settings] = await Promise.all([
    getProduct(slug),
    getCachedSettings()
  ]);
  if (!product) return { title: 'Product Not Found' };

  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const headersList = await headers();
  const host = resolveRequestHost(headersList);
  const baseUrl = `${protocol}://${host}`;
  const canonicalUrl = `${baseUrl}/product/${slug}`;

  const { safeTitle, safeDescription } = getProductMeta({
    name: product.name,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
  });

  const mainImage = product.images?.[0] ? [{ url: product.images[0] }] : [];
  const twitterImage = product.images?.[0] ? [product.images[0]] : [];
  const siteName = settings?.brandName || 'Online Shop';

  return {
    title: safeTitle,
    description: safeDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: safeTitle,
      description: safeDescription,
      images: mainImage,
      type: 'website',
      url: canonicalUrl,
      siteName: siteName,
    },
    twitter: {
      card: 'summary_large_image',
      title: safeTitle,
      description: safeDescription,
      images: twitterImage,
    }
  };
}

import Script from 'next/script';

export default async function ProductDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([
    getProduct(slug),
    getCachedSettings()
  ]);

  if (!product) {
    // If product is not in mother catalog, check if it is a reseller product and redirect to the reseller store!
    try {
      const conn = await (await import('@/lib/db')).default();
      const ProductModel = (await import('@/models/Product')).default;
      const resellerProduct = await ProductModel.findOne({ slug, isPublished: true })
        .populate('uploadedBy', 'subdomain customDomain')
        .lean() as any;

      if (resellerProduct && resellerProduct.uploadedBy) {
        const { redirect } = await import('next/navigation');
        const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dhakafairprice.com';
        const storeDomain = resellerProduct.uploadedBy.customDomain?.replace(/^https?:\/\//, '').replace(/\/+$/, '')
          || `${resellerProduct.uploadedBy.subdomain}.${rootDomain}`;
        const previewQuery = resellerProduct.isApprovedByAdmin ? '' : '?preview=true';
        redirect(`https://${storeDomain}/product/${slug}${previewQuery}`);
      }
    } catch (e: any) {
      if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e;
    }

    notFound();
  }



  let related = [];
  try {
    const conn = await (await import('@/lib/db')).default();
    const ProductModel = (await import('@/models/Product')).default;
    const relatedProducts = await ProductModel.find({
      _id: { $ne: product._id },
      isPublished: true,
      $or: [
        { categories: { $in: (product.categories ?? []).map((category: { _id: string }) => category._id) } },
        { tags: { $in: product.tags || [] } },
      ],
    })
      .populate('categories')
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();
    related = JSON.parse(JSON.stringify(relatedProducts));
  } catch (error) {
    console.error("Error fetching related products:", error);
    related = [];
  }

  return (
    <div className="container px-4 md:px-0 mx-auto pt-2 pb-10">

      <div className="w-full">
        {/* Track View */}
        <ViewTracker id={product._id.toString()} type="product" />
        {/* Dynamic Product Detail Template Selector */}
        <ProductDetailsSelector style={settings?.uiTemplates?.productDetail || 'v1'} product={product} />
      </div>

      {Array.isArray(related) && related.length > 0 && (
        <section className="mt-20">
          <div className="flex items-end justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">You May Also Like</h2>
              <p className="text-muted-foreground mt-1">Similar picks based on this product&apos;s category and tags.</p>
            </div>
            <Button variant="outline" render={<Link href="/shop" />} nativeButton={false}>
              Explore More
            </Button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {related.map((item: any) => (
              <ProductCard key={item._id} product={item} style={settings?.uiTemplates?.productCard || 'v1'} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}


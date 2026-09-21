import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import ResellerProduct from '@/models/ResellerProduct';
import { getCachedCategories, getCachedBrands } from '@/lib/data-fetching';
import { ShopHeaderSkeleton, ProductCardSkeleton } from '@/components/storefront/Skeletons';
import { ShopListingSelector } from '@/components/templates/ServerRegistry';
import { NavbarSelector } from '@/components/templates/Registry';
import { FooterSelector } from '@/components/templates/ServerRegistry';
import { SettingsProvider } from '@/components/SettingsProvider';
import { ResellerPixels } from '@/components/reseller/ResellerPixels';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getReseller(subdomain: string) {
  await dbConnect();
  return Reseller.findOne({ subdomain, status: 'active' }).lean();
}

export async function generateMetadata({ params }: { params: Promise<{ subdomain: string }> }): Promise<Metadata> {
  const { subdomain } = await params;
  const reseller = await getReseller(subdomain);
  if (!reseller) return { title: 'Store Not Found' };
  return {
    title: `Shop All Products | ${reseller.storeName}`,
    description: reseller.description || `Explore and buy products at ${reseller.storeName}`,
    openGraph: {
      title: `Shop | ${reseller.storeName}`,
      description: `Explore products at ${reseller.storeName}`,
    },
  };
}

export default async function ResellerShopPage({ params, searchParams }: Props) {
  const { subdomain } = await params;
  const reseller = await getReseller(subdomain);
  if (!reseller) notFound();

  await dbConnect();

  // Load reseller's assigned products with parent product populated
  const [resellerProducts, categories, brands] = await Promise.all([
    ResellerProduct.find({
      resellerId: reseller._id,
      isPublished: true,
      isAvailableOnMother: true,
      stock: { $gt: 0 },
    })
      .populate({
        path: 'productId',
        populate: [
          { path: 'categories' },
          { path: 'brand' }
        ]
      })
      .sort({ createdAt: -1 })
      .lean(),
    getCachedCategories(),
    getCachedBrands(),
  ]);

  // Format reseller products so they match the standard storefront Product shape
  const formattedProducts = (resellerProducts || []).map((rp: any) => {
    const parent = rp.productId || {};
    const finalPrice = typeof rp.retailPrice === 'number' && !isNaN(rp.retailPrice) 
      ? rp.retailPrice 
      : (typeof parent.price === 'number' ? parent.price : 0);
    return {
      _id: rp._id.toString(),
      productId: parent._id ? parent._id.toString() : rp.productId?.toString(),
      name: rp.name || parent.name || 'Product',
      slug: rp.slug || parent.slug,
      price: finalPrice,
      salePrice: finalPrice,
      retailPrice: rp.retailPrice,
      images: rp.images?.length > 0 ? rp.images : parent.images || [],
      description: parent.description,
      categories: parent.categories || [],
      brand: parent.brand || null,
      stock: rp.stock ?? parent.stock ?? 0,
      isPublished: rp.isPublished,
      isNewArrival: Boolean(parent.isNewArrival),
      isFeatured: Boolean(parent.isFeatured),
      isFlashSale: Boolean(parent.isFlashSale),
      rating: parent.rating || 5,
      numReviews: parent.numReviews || 0,
      variants: parent.variants || [],
      createdAt: rp.createdAt || parent.createdAt,
    };
  });

  const storeName = reseller.storeName;
  const logo = reseller.logoUrl;
  const settingsData = {
    brandName: storeName,
    logoUrl: logo,
    contact: {
      email: reseller.contact?.email,
      phone: reseller.contact?.phone,
      address: reseller.contact?.address,
    },
    socialLinks: {
      facebook: reseller.socialLinks?.facebook,
      whatsapp: reseller.socialLinks?.whatsapp,
    }
  };

  const navStyle = reseller.themeOverrides?.navbar || 'v1';
  const footerStyle = reseller.themeOverrides?.footer || 'v1';
  const cardStyle = reseller.themeOverrides?.productCard || 'v1';
  const shopStyle = 'v1';

  return (
    <SettingsProvider settings={settingsData}>
      <div className="min-h-screen bg-background font-sans">
        <ResellerPixels 
          subdomain={subdomain} 
          metaPixelId={reseller.seoConfig?.metaPixelId} 
          tiktokPixelId={reseller.seoConfig?.tiktokPixelId} 
        />
        <NavbarSelector style={navStyle} />
        <main className="min-h-[70vh]">
          <Suspense fallback={<ShopFallback />}>
            <ShopListingSelector
              style={shopStyle}
              productCardStyle={cardStyle}
              products={formattedProducts}
              categories={categories}
              brands={brands}
              searchParams={searchParams}
            />
          </Suspense>
        </main>
        <FooterSelector style={footerStyle} />
      </div>
    </SettingsProvider>
  );
}

function ShopFallback() {
  return (
    <div className="container py-10">
      <ShopHeaderSkeleton />
      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="hidden w-64 shrink-0 md:block">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          </div>
        </aside>
        <div className="flex-1">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

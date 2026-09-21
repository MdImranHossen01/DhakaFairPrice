import { notFound } from 'next/navigation';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import ResellerProduct from '@/models/ResellerProduct';
import Link from 'next/link';
import type { Metadata } from 'next';
import { NavbarSelector } from '@/components/templates/Registry';
import { FooterSelector } from '@/components/templates/ServerRegistry';
import { SettingsProvider } from '@/components/SettingsProvider';
import { FreeDeliveryBanner } from '@/components/storefront/FreeDeliveryBanner';
import ResellerProductDetailsClient from '@/components/reseller/ResellerProductDetailsClient';
import { ResellerPixels } from '@/components/reseller/ResellerPixels';
import { ChevronRight } from 'lucide-react';
import { ProductCard } from '@/components/storefront/ProductCard';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ subdomain: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subdomain, slug } = await params;
  await dbConnect();
  const reseller = await Reseller.findOne({ subdomain, status: 'active' }).lean();
  if (!reseller) return { title: 'Not Found' };
  const product = await ResellerProduct.findOne({ resellerId: reseller._id, slug, isPublished: true }).lean();
  if (!product) return { title: 'Product Not Found' };
  return {
    title: `${product.name} — ${reseller.storeName}`,
    description: product.name,
    openGraph: { images: product.images?.[0] ? [product.images[0]] : [] },
  };
}

export default async function ResellerProductPage({ params }: Props) {
  const { subdomain, slug } = await params;
  await dbConnect();

  const reseller = await Reseller.findOne({ subdomain, status: 'active' }).lean() as any;
  if (!reseller) notFound();

  const productDoc = await ResellerProduct.findOne({
    resellerId: reseller._id,
    slug,
    isPublished: true,
    isAvailableOnMother: true,
  }).populate({
    path: 'productId',
    populate: [
      { path: 'categories' },
      { path: 'brand' }
    ]
  }).lean() as any;

  if (!productDoc || !productDoc.productId) notFound();

  // Format product to match the shape expected by ResellerProductDetailsClient
  const parent = productDoc.productId as any;
  const product = {
    _id: productDoc._id.toString(),
    productId: parent._id ? parent._id.toString() : productDoc.productId?.toString(),
    name: productDoc.name || parent.name || 'Product',
    slug: productDoc.slug || parent.slug,
    retailPrice: productDoc.retailPrice,
    price: productDoc.retailPrice,
    salePrice: undefined as number | undefined,
    images: productDoc.images?.length > 0 ? productDoc.images : parent.images || [],
    description: parent.description,
    categories: parent.categories || [],
    brand: parent.brand || null,
    stock: productDoc.stock ?? parent.stock ?? 0,
    isPublished: productDoc.isPublished,
    isNewArrival: Boolean(parent.isNewArrival),
    isFeatured: Boolean(parent.isFeatured),
    ratings: parent.ratings || 0,
    numReviews: parent.numReviews || 0,
    variants: parent.variants || [],
    attributes: parent.attributes || [],
    createdAt: productDoc.createdAt || parent.createdAt,
  };

  // Related products from the same reseller store
  let relatedProducts: any[] = [];
  try {
    const allCategoryIds = (parent.categories || []).map((c: any) => c._id?.toString() || c.toString()).filter(Boolean);
    if (allCategoryIds.length > 0) {
      const related = await ResellerProduct.find({
        resellerId: reseller._id,
        _id: { $ne: productDoc._id },
        isPublished: true,
        isAvailableOnMother: true,
        stock: { $gt: 0 },
      }).populate({
        path: 'productId',
        populate: [{ path: 'categories' }]
      }).limit(4).lean() as any[];

      relatedProducts = related
        .filter((rp: any) => {
          if (!rp.productId) return false;
          const cats = (rp.productId.categories || []).map((c: any) => c._id?.toString() || c.toString());
          return cats.some((id: string) => allCategoryIds.includes(id));
        })
        .map((rp: any) => {
          const p = rp.productId || {};
          const finalPrice = typeof rp.retailPrice === 'number' ? rp.retailPrice : (p.price ?? 0);
          return {
            _id: rp._id.toString(),
            name: rp.name || p.name || 'Product',
            slug: rp.slug || p.slug,
            price: finalPrice,
            salePrice: finalPrice,
            images: rp.images?.length > 0 ? rp.images : p.images || [],
            stock: rp.stock ?? p.stock ?? 0,
            categories: p.categories || [],
            isNewArrival: Boolean(p.isNewArrival),
            isFeatured: Boolean(p.isFeatured),
            ratings: p.ratings || 0,
            numReviews: p.numReviews || 0,
            variants: p.variants || [],
          };
        });
    }
  } catch (err) {
    console.error('Error fetching related products:', err);
  }

  const themeOverrides = (reseller.themeOverrides as any) || {};
  const navStyle = themeOverrides.navbar || 'v1';
  const footerStyle = themeOverrides.footer || 'v1';
  const cardStyle = themeOverrides.productCard || 'v1';
  const deliveryInside = reseller.deliveryConfig?.insideDhaka ?? 60;
  const deliveryOutside = reseller.deliveryConfig?.outsideDhaka ?? 120;
  const freeDeliveryThreshold = reseller.deliveryConfig?.freeDeliveryThreshold || 0;

  const settingsData = {
    brandName: reseller.storeName,
    logoUrl: reseller.logoUrl,
    freeDeliveryThreshold,
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

        <main className="flex-1 container px-4 md:px-0 mx-auto pt-4 pb-12">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/shop" className="hover:text-primary transition-colors">Shop</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium truncate">{product.name}</span>
          </div>

          {/* Product Details */}
          <ResellerProductDetailsClient
            product={product}
            subdomain={subdomain}
            deliveryInside={deliveryInside}
            deliveryOutside={deliveryOutside}
            metaPixelId={reseller.seoConfig?.metaPixelId}
          />

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <section className="mt-20">
              <div className="flex items-end justify-between mb-8 gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight">আরো পণ্য দেখুন</h2>
                  <p className="text-muted-foreground mt-1">একই ক্যাটাগরির আরো পণ্য।</p>
                </div>
                <Link href="/shop" className="text-sm font-bold text-primary hover:underline">সব দেখুন →</Link>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {relatedProducts.map((item: any) => (
                  <ProductCard key={item._id} product={item} style={cardStyle} />
                ))}
              </div>
            </section>
          )}
        </main>

        <FooterSelector style={footerStyle} />
      </div>
    </SettingsProvider>
  );
}

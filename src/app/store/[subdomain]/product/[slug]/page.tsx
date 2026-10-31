import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import ResellerProduct from '@/models/ResellerProduct';
import Product from '@/models/Product';
import Link from 'next/link';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { resolveRequestHost, getProductMeta } from '@/lib/seo';
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
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subdomain, slug } = await params;
  await dbConnect();
  const reseller = await Reseller.findOne({ subdomain, status: 'active' }).select('storeName customDomain subdomain').lean() as any;
  if (!reseller) return { title: 'Not Found' };

  const headersList = await headers();
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dhakafairprice.com';
  const defaultSubdomainHost = `${reseller.subdomain || subdomain}.${rootDomain}`;
  const incomingHost = resolveRequestHost(headersList, defaultSubdomainHost);
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const canonicalUrl = `${protocol}://${incomingHost}/product/${slug}`;

  let product = await ResellerProduct.findOne({ resellerId: reseller._id, slug, isPublished: true }).populate('productId').lean() as any;
  if (!product) {
    const direct = await Product.findOne({ uploadedBy: reseller._id, slug, isPublished: true }).lean() as any;
    if (direct) {
      const { safeTitle, safeDescription } = getProductMeta({
        name: direct.name,
        metaTitle: direct.metaTitle,
        metaDescription: direct.metaDescription,
      });

      return {
        title: safeTitle,
        description: safeDescription,
        alternates: {
          canonical: canonicalUrl,
        },
        openGraph: {
          title: `${safeTitle} | ${reseller.storeName}`,
          description: safeDescription,
          url: canonicalUrl,
          images: direct.images?.[0] ? [direct.images[0]] : [],
        },
      };
    }
    return { title: 'Product Not Found' };
  }

  const motherProduct = product.productId || {};
  const { safeTitle, safeDescription } = getProductMeta({
    name: product.name || motherProduct.name,
    metaTitle: product.metaTitle || motherProduct.metaTitle,
    metaDescription: product.metaDescription || motherProduct.metaDescription,
  });

  return {
    title: safeTitle,
    description: safeDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${safeTitle} | ${reseller.storeName}`,
      description: safeDescription,
      url: canonicalUrl,
      images: product.images?.[0] ? [product.images[0]] : [],
    },
  };
}

export default async function ResellerProductPage({ params, searchParams }: Props) {
  const { subdomain, slug } = await params;
  const sParams = searchParams ? await searchParams : {};
  const isPreview = sParams.preview === 'true' || sParams.adminPreview === 'true';
  await dbConnect();

  const reseller = await Reseller.findOne({ subdomain, status: 'active' }).lean() as any;
  if (!reseller) notFound();

  let productDoc = await ResellerProduct.findOne({
    resellerId: reseller._id,
    slug,
    isPublished: true,
  }).populate({
    path: 'productId',
    populate: [
      { path: 'categories' },
      { path: 'brand' }
    ]
  }).lean() as any;

  // If ResellerProduct is missing or not populated, check if reseller directly owns this product
  if (!productDoc || !productDoc.productId) {
    const directProduct = await Product.findOne({
      uploadedBy: reseller._id,
      slug,
      isPublished: true,
    }).populate([
      { path: 'categories' },
      { path: 'brand' }
    ]).lean() as any;

    if (directProduct) {
      const retailPrice = directProduct.salePrice && directProduct.salePrice > 0 ? directProduct.salePrice : directProduct.price;
      const createdRP = await ResellerProduct.findOneAndUpdate(
        { resellerId: reseller._id, productId: directProduct._id },
        {
          $set: {
            resellerId: reseller._id,
            productId: directProduct._id,
            retailPrice: retailPrice ?? 0,
            name: directProduct.name,
            slug: directProduct.slug,
            images: directProduct.images ?? [],
            stock: directProduct.stock ?? 0,
            purchasePrice: directProduct.resellerPrice || directProduct.purchasePrice || 0,
            motherPrice: directProduct.price ?? 0,
            isAvailableOnMother: true,
            isPublished: true,
            syncedAt: new Date(),
          }
        },
        { upsert: true, new: true }
      ).lean() as any;

      productDoc = {
        ...createdRP,
        productId: directProduct,
      };
    }
  }

  if (!productDoc || !productDoc.productId) notFound();

  const parent = productDoc.productId as any;

  // Allow admins, super_admins, store owner, or preview token to view pending reseller products
  let isAllowedToPreview = isPreview;
  if (!isAllowedToPreview) {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const isAdmin = userRole === 'admin' || userRole === 'super_admin' || session?.user?.email === 'imranshuvo101@gmail.com';
    const isOwner = session?.user && ((session?.user as any)?.resellerId === reseller._id.toString() || session?.user?.id === reseller.userId?.toString());
    isAllowedToPreview = !!(isAdmin || isOwner);
  }

  const isPendingApproval = parent.uploadedBy && parent.isApprovedByAdmin !== true;
  if (isPendingApproval && !isAllowedToPreview) {
    notFound();
  }
  const isPersonal = parent.isMotherProduct === false || (parent.uploadedBy && parent.uploadedBy.toString() === reseller._id.toString());
  // If it's a mother catalog product and unpublished on mother site, 404
  if (!isPersonal && productDoc.isAvailableOnMother === false) {
    notFound();
  }

  // isOwnProduct: uploaded directly by this reseller
  const isOwnProduct = Boolean(parent.uploadedBy && parent.uploadedBy.toString() === reseller._id.toString());

  // Determine regular vs sale pricing
  // For sourced products (from another reseller or mother catalog without explicit discount),
  // NEVER use the supplier's personal retail price as regularPrice or strikethrough!
  let regularPrice = productDoc.retailPrice;
  let salePrice: number | undefined = undefined;

  if (isOwnProduct) {
    if (typeof parent.price === 'number' && typeof parent.salePrice === 'number' && parent.price > parent.salePrice) {
      regularPrice = parent.price;
      salePrice = parent.salePrice;
    } else {
      regularPrice = productDoc.retailPrice || (typeof parent.price === 'number' ? parent.price : 0);
      salePrice = undefined;
    }
  } else if (!parent.uploadedBy) {
    // Mother catalog item: only show strikethrough if mother price was genuinely higher than reseller selling price
    if (typeof parent.price === 'number' && parent.price > productDoc.retailPrice && typeof parent.salePrice === 'number') {
      regularPrice = parent.price;
      salePrice = productDoc.retailPrice;
    } else {
      regularPrice = productDoc.retailPrice;
      salePrice = undefined;
    }
  } else {
    // Sourced from another reseller (e.g. B2B supplier reseller):
    // The reseller's selling price is cleanly shown with no foreign retail price or fake strikethrough
    regularPrice = productDoc.retailPrice;
    salePrice = undefined;
  }

  // Merge parent variants with reseller's custom variant pricing
  const parentVariants = Array.isArray(parent.variants) ? parent.variants : [];
  const rpVariants = Array.isArray(productDoc.variants) ? productDoc.variants : [];

  const mergedVariants = parentVariants.map((v: any, idx: number) => {
    const match = rpVariants.find((rv: any) =>
      String(rv.color || '').trim().toLowerCase() === String(v.color || '').trim().toLowerCase() &&
      String(rv.size || '').trim().toLowerCase() === String(v.size || '').trim().toLowerCase()
    );
    const varRetailPrice = match?.retailPrice || (idx === 0 ? productDoc.retailPrice : (v.price || productDoc.retailPrice));
    
    let varRegularPrice = varRetailPrice;
    let varSalePrice: number | undefined = undefined;

    if (isOwnProduct) {
      if (typeof v.price === 'number' && typeof v.salePrice === 'number' && v.price > v.salePrice) {
        varRegularPrice = v.price;
        varSalePrice = v.salePrice;
      }
    } else if (!parent.uploadedBy) {
      if (typeof v.price === 'number' && v.price > varRetailPrice && typeof v.salePrice === 'number') {
        varRegularPrice = v.price;
        varSalePrice = varRetailPrice;
      }
    }

    return {
      ...v,
      price: varRegularPrice,
      salePrice: varSalePrice,
      retailPrice: varRetailPrice,
    };
  });

  const product = {
    _id: productDoc._id.toString(),
    productId: parent._id ? parent._id.toString() : productDoc.productId?.toString(),
    name: productDoc.name || parent.name || 'Product',
    slug: productDoc.slug || parent.slug,
    retailPrice: productDoc.retailPrice,
    price: regularPrice,
    salePrice: salePrice,
    uploadedBy: parent.uploadedBy,
    isOwnProduct,
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
    variants: mergedVariants,
    sku: parent.sku || productDoc.sku || '',
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
  const GlobalSettings = (await import('@/models/GlobalSettings')).default;
  const globalSettings = await GlobalSettings.findOne().sort({ updatedAt: -1 }).lean() as any;
  const deliveryInside = globalSettings?.deliveryChargeInsideDhaka ?? 60;
  const deliveryOutside = globalSettings?.deliveryChargeOutsideDhaka ?? 120;
  const freeDeliveryThreshold = reseller.deliveryConfig?.freeDeliveryThreshold || 0;

  const settingsData = {
    isReseller: true,
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

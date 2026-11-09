/* eslint-disable @typescript-eslint/no-explicit-any */
import { unstable_cache } from 'next/cache';
import mongoose from 'mongoose';
import connectToDatabase from './db';
import Product, { MOTHER_SHOP_PRODUCT_FILTER } from '@/models/Product';
import Category from '@/models/Category';
import Banner from '@/models/Banner';
import Blog from '@/models/Blog';
import FAQ from '@/models/FAQ';
import GlobalSettings from '@/models/GlobalSettings';
import Coupon from '@/models/Coupon';
import Order from '@/models/Order';

import Brand from '@/models/Brand';
import Reseller from '@/models/Reseller';

// Helper to serialize MongoDB data
const serialize = (data: any) => JSON.parse(JSON.stringify(data));

/**
 * Strict Rule: If product has variants, root pricing and discount MUST strictly follow firstVariant.
 * If firstVariant has no discount, root salePrice & discountRate MUST be completely removed!
 * If discounted price is <= 0 or >= price, treat as NO DISCOUNT at all.
 */
export const sanitizeProductPrices = (product: any) => {
  if (!product) return product;
  const p = { ...product };

  if (Array.isArray(p.variants) && p.variants.length > 0) {
    p.variants = p.variants.map((v: any) => {
      const vObj = { ...v };
      const vPrice = Number(vObj.price || 0);
      const rawVSale = vObj.salePrice !== undefined && vObj.salePrice !== null ? Number(vObj.salePrice) : undefined;
      if (rawVSale !== undefined && (rawVSale <= 0 || (vPrice > 0 && rawVSale >= vPrice))) {
        delete vObj.salePrice;
        delete vObj.discountRate;
      }
      return vObj;
    });

    const firstV = p.variants[0];
    const firstPrice = Number(firstV?.price || 0);
    p.price = firstPrice > 0 ? firstPrice : Number(p.price || 0);

    const firstSale = firstV?.salePrice !== undefined && firstV?.salePrice !== null ? Number(firstV.salePrice) : undefined;
    if (firstSale !== undefined && firstSale > 0 && firstSale < p.price) {
      p.salePrice = firstSale;
      p.discountRate = firstV.discountRate;
    } else {
      delete p.salePrice;
      delete p.discountRate;
    }
  } else {
    const price = Number(p.price || 0);
    const rawSale = p.salePrice !== undefined && p.salePrice !== null ? Number(p.salePrice) : undefined;
    if (rawSale !== undefined && (rawSale <= 0 || (price > 0 && rawSale >= price))) {
      delete p.salePrice;
      delete p.discountRate;
    }
  }
  return p;
};

/**
 * CACHE_TAGS constants for consistency
 */
export const CACHE_TAGS = {
  products: 'products',
  categories: 'categories',
  brands: 'brands',
  banners: 'banners',
  blogs: 'blogs',
  faqs: 'faqs',
  settings: 'settings',
  coupons: 'coupons',
  resellerProgram: 'reseller-program',
};

// --- PRODUCTS ---

export const getCachedProducts = (query = {}, limit = 10, sort: any = { createdAt: -1 }) => {
  return unstable_cache(
    async () => {
      await connectToDatabase();
      // Ensure Reseller model is registered
      if (!Reseller) {}
      const motherCondition = {
        isPublished: { $ne: false },
        ...MOTHER_SHOP_PRODUCT_FILTER,
      };
      const finalQuery = Object.keys(query).length > 0 ? { $and: [motherCondition, query] } : motherCondition;
      const products = await Product.find(finalQuery)
        .select('-embedding -description -batches -variants.batches -attributes')
        .populate('categories', 'name slug parentCategory isActive')
        .populate('brand', 'name slug image isActive')
        .populate('uploadedBy', 'storeName subdomain')
        .sort(sort as any)
        .limit(limit)
        .lean();
      return serialize(products.map(sanitizeProductPrices));
    },
    ['products-list-v2', JSON.stringify(query), limit.toString(), JSON.stringify(sort)],
    { revalidate: 31536000, tags: [CACHE_TAGS.products] }
  )();
};

export const getCachedProductBySlug = (slug: string) => {
  return unstable_cache(
    async () => {
      await connectToDatabase();
      const decodedSlug = decodeURIComponent(slug);
      const isObjId = /^[0-9a-fA-F]{24}$/.test(decodedSlug);
      const slugCondition = isObjId
        ? { $or: [{ slug: decodedSlug }, { slug }, { _id: decodedSlug }] }
        : { $or: [{ slug: decodedSlug }, { slug }] };
      const product = await Product.findOne({
        $and: [
          slugCondition,
          { isPublished: { $ne: false } },
          MOTHER_SHOP_PRODUCT_FILTER,
        ],
      })
        .select('-embedding')
        .populate('categories')
        .populate('brand')
        .populate('uploadedBy', 'storeName subdomain')
        .lean();
      return serialize(sanitizeProductPrices(product));
    },
    ['product-detail-v2', slug],
    { revalidate: 31536000, tags: [CACHE_TAGS.products] }
  )();
};

export const getTrendingProducts = (limit = 10) => {
  return unstable_cache(
    async () => {
      await connectToDatabase();

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // 1. Get Top Selling products in last 30 days
      const topSellingItems = await Order.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo }, status: { $ne: 'Cancelled' } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', totalSales: { $sum: '$items.quantity' } } },
        { $sort: { totalSales: -1 } },
        { $limit: limit }
      ]);

      const topSellingIds = topSellingItems.map(item => item._id);

      let trendingProducts = await Product.find({
        _id: { $in: topSellingIds },
        isPublished: { $ne: false },
        ...MOTHER_SHOP_PRODUCT_FILTER,
      })
        .select('-embedding -description -batches -variants.batches -attributes')
        .populate('categories', 'name slug parentCategory isActive')
        .lean();

      // Ensure they are in the order of totalSales
      trendingProducts.sort((a: any, b: any) => {
        const aSales = topSellingItems.find(item => item._id.toString() === a._id.toString())?.totalSales || 0;
        const bSales = topSellingItems.find(item => item._id.toString() === b._id.toString())?.totalSales || 0;
        return bSales - aSales;
      });

      // 2. If not enough, fill with high ratings
      if (trendingProducts.length < limit) {
        const remaining = limit - trendingProducts.length;
        const topRated = await Product.find({
          _id: { $nin: trendingProducts.map(p => p._id) },
          isPublished: { $ne: false },
          ratings: { $gt: 0 },
          ...MOTHER_SHOP_PRODUCT_FILTER,
        })
          .select('-embedding -description -batches -variants.batches -attributes')
          .populate('categories', 'name slug parentCategory isActive')
          .sort({ ratings: -1, numReviews: -1 } as any)
          .limit(remaining)
          .lean();
        trendingProducts = [...trendingProducts, ...topRated] as any;
      }

      // 3. If still not enough, fill with high views
      if (trendingProducts.length < limit) {
        const remaining = limit - trendingProducts.length;
        const topViewed = await Product.find({
          _id: { $nin: trendingProducts.map(p => p._id) },
          isPublished: { $ne: false },
          views: { $gt: 0 },
          ...MOTHER_SHOP_PRODUCT_FILTER,
        })
          .select('-embedding -description -batches -variants.batches -attributes')
          .populate('categories', 'name slug parentCategory isActive')
          .sort({ views: -1 } as any)
          .limit(remaining)
          .lean();
        trendingProducts = [...trendingProducts, ...topViewed] as any;
      }

      // 4. Finally, fill with latest added
      if (trendingProducts.length < limit) {
        const remaining = limit - trendingProducts.length;
        const latest = await Product.find({
          _id: { $nin: trendingProducts.map(p => p._id) },
          isPublished: { $ne: false },
          ...MOTHER_SHOP_PRODUCT_FILTER,
        })
          .select('-embedding -description -batches -variants.batches -attributes')
          .populate('categories', 'name slug parentCategory isActive')
          .sort({ createdAt: -1 } as any)
          .limit(remaining)
          .lean();
        trendingProducts = [...trendingProducts, ...latest] as any;
      }

      return serialize(trendingProducts.map(sanitizeProductPrices));
    },
    ['trending-products-v2', limit.toString()],
    { revalidate: 3600, tags: [CACHE_TAGS.products] }
  )();
};

// --- CATEGORIES ---

export const getCachedCategories = () => {
  return unstable_cache(
    async () => {
      await connectToDatabase();
      const categories = await Category.find({ isActive: true })
        .populate('parentCategory', 'name')
        .sort({ createdAt: -1 })
        .lean();
      return serialize(categories);
    },
    ['categories-list'],
    { revalidate: 31536000, tags: [CACHE_TAGS.categories] }
  )();
};

/**
 * Fetches all root categories (parentCategory = null) that have at least one product,
 * along with a limited set of products for each. Used for home page category sections.
 */
export const getCachedRootCategoriesWithProducts = (productsPerCategory = 10) => {
  return unstable_cache(
    async () => {
      await connectToDatabase();

      // 1. Get all root categories
      const rootCategories = await Category.find({ parentCategory: null, isActive: true })
        .sort({ createdAt: 1 })
        .lean();

      // 2. Get all descendant category IDs for each root
      const allCategories = await Category.find({ isActive: true }).lean();

      const getDescendantIds = (rootId: string): string[] => {
        const ids: string[] = [rootId];
        const children = allCategories.filter(
          (c: any) => c.parentCategory?.toString() === rootId
        );
        for (const child of children) {
          ids.push(...getDescendantIds(child._id.toString()));
        }
        return ids;
      };

      // 3. For each root category, fetch products
      const results = [];
      for (const root of rootCategories) {
        const allStringIds = getDescendantIds(root._id.toString());
        // Convert to ObjectIds so MongoDB $in query matches correctly
        const allObjectIds = allStringIds.map(id => new mongoose.Types.ObjectId(id));
        const products = await Product.find({
          isPublished: { $ne: false },
          categories: { $in: allObjectIds },
          ...MOTHER_SHOP_PRODUCT_FILTER,
        })
          .select('-embedding -description -batches -variants.batches -attributes')
          .populate('categories', 'name slug parentCategory isActive')
          .populate('brand', 'name slug image isActive')
          .sort({ createdAt: -1 })
          .limit(productsPerCategory)
          .lean();

        if (products.length > 0) {
          results.push({
            category: root,
            products: serialize(products.map(sanitizeProductPrices)),
          });
        }
      }

      return serialize(results);
    },
    ['root-categories-with-products-v2', productsPerCategory.toString()],
    { revalidate: 31536000, tags: [CACHE_TAGS.products, CACHE_TAGS.categories] }
  )();
};

// --- BRANDS ---

export const getCachedBrands = () => {
  return unstable_cache(
    async () => {
      await connectToDatabase();
      const brands = await Brand.find({ isActive: true })
        .sort({ name: 1 })
        .lean();
      return serialize(brands);
    },
    ['brands-list'],
    { revalidate: 31536000, tags: [CACHE_TAGS.brands] }
  )();
};

// --- BANNERS ---

export const getCachedBanners = () => {
  return unstable_cache(
    async () => {
      await connectToDatabase();
      // Only fetch admin global banners (resellerId: null) for the main storefront.
      // Reseller-specific banners are fetched separately for their own storefronts.
      const banners = await Banner.find({
        isActive: true,
        $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
      })
        .sort({ order: 1 })
        .lean();
      return serialize(banners);
    },
    ['banners-list'],
    { revalidate: 60, tags: [CACHE_TAGS.banners] }
  )();
};

// --- BLOGS ---

export const getCachedBlogs = (limit = 10) => {
  return unstable_cache(
    async () => {
      await connectToDatabase();
      const blogs = await Blog.find({ isPublished: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      return serialize(blogs);
    },
    ['blogs-list', limit.toString()],
    { revalidate: 31536000, tags: [CACHE_TAGS.blogs] }
  )();
};

export const getCachedBlogBySlug = (slug: string) => {
  return unstable_cache(
    async () => {
      await connectToDatabase();
      const blog = await Blog.findOne({ slug, isPublished: true }).lean();
      return serialize(blog);
    },
    ['blog-detail', slug],
    { revalidate: 31536000, tags: [CACHE_TAGS.blogs] }
  )();
};

// --- FAQs ---

export const getCachedFAQs = () => {
  return unstable_cache(
    async () => {
      await connectToDatabase();
      const faqs = await FAQ.find({ isActive: true }).sort({ order: 1 }).lean();
      return serialize(faqs);
    },
    ['faqs-list'],
    { revalidate: 31536000, tags: [CACHE_TAGS.faqs] }
  )();
};

// --- SETTINGS ---

/**
 * Fetches global settings for the storefront.
 */
export const getCachedSettings = () => {
  return unstable_cache(
    async () => {
      await connectToDatabase();

      // Find the first available settings record
      const settings = await GlobalSettings.findOne().lean();

      return serialize(settings);
    },
    ['global-settings'],
    { tags: [CACHE_TAGS.settings], revalidate: 3600 }
  )();
};

// --- COUPONS ---

export const getCachedActiveCoupon = () => {
  return unstable_cache(
    async () => {
      await connectToDatabase();
      const coupon = await Coupon.findOne({
        isActive: true,
        expiryDate: { $gt: new Date() }
      }).sort({ createdAt: -1 }).lean();
      return serialize(coupon);
    },
    ['active-coupon'],
    { revalidate: 3600, tags: [CACHE_TAGS.coupons] }
  )();
};

// --- RESELLER PROGRAM (SSG / ISR) ---

export const getCachedResellerProgram = () => {
  return unstable_cache(
    async () => {
      await connectToDatabase();
      const ResellerProgramPage = (await import('@/models/ResellerProgramPage')).default;
      const { DEFAULT_RESELLER_PROGRAM_DATA } = await import('@/lib/default-reseller-program');
      const doc = await ResellerProgramPage.findOne().sort({ updatedAt: -1 }).lean();

      if (!doc) {
        return serialize(DEFAULT_RESELLER_PROGRAM_DATA);
      }

      const heroBenefits =
        doc.hero?.benefits && Array.isArray(doc.hero.benefits) && doc.hero.benefits.length > 0
          ? doc.hero.benefits
          : DEFAULT_RESELLER_PROGRAM_DATA.hero.benefits;

      const mergedData = {
        hero: {
          ...DEFAULT_RESELLER_PROGRAM_DATA.hero,
          ...(doc.hero || {}),
          benefits: heroBenefits,
        },
        pricingHeader: { ...DEFAULT_RESELLER_PROGRAM_DATA.pricingHeader, ...(doc.pricingHeader || {}) },
        packages: doc.packages?.length ? doc.packages : DEFAULT_RESELLER_PROGRAM_DATA.packages,
        whyChooseUs: { ...DEFAULT_RESELLER_PROGRAM_DATA.whyChooseUs, ...(doc.whyChooseUs || {}) },
        workflow: { ...DEFAULT_RESELLER_PROGRAM_DATA.workflow, ...(doc.workflow || {}) },
        comparisonTable: { ...DEFAULT_RESELLER_PROGRAM_DATA.comparisonTable, ...(doc.comparisonTable || {}) },
        faqs: { ...DEFAULT_RESELLER_PROGRAM_DATA.faqs, ...(doc.faqs || {}) },
        importantInfo: { ...DEFAULT_RESELLER_PROGRAM_DATA.importantInfo, ...(doc.importantInfo || {}) },
      };

      return serialize(mergedData);
    },
    ['reseller-program-data'],
    { revalidate: 31536000, tags: [CACHE_TAGS.resellerProgram] }
  )();
};



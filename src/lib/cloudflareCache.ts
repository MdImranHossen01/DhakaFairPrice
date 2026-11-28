/**
 * Cloudflare Edge Cache Purge Utility
 * Supports both full-zone purge (for global settings/categories/brands)
 * and surgical URL-only purge (for products, reseller stores, blogs, banners, landing pages).
 * Reads credentials strictly from environment variables:
 * - process.env.CLOUDFLARE_ZONE_ID
 * - process.env.CLOUDFLARE_API_TOKEN
 */

interface CloudflarePurgeOptions {
  zoneId?: string;
  apiToken?: string;
  files?: string[];
}

export async function purgeCloudflareCache(options?: CloudflarePurgeOptions): Promise<void> {
  const zoneId = options?.zoneId || process.env.CLOUDFLARE_ZONE_ID;
  const apiToken = options?.apiToken || process.env.CLOUDFLARE_API_TOKEN;

  if (!zoneId || !apiToken) {
    return;
  }

  try {
    const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;
    const payload =
      options?.files && options.files.length > 0
        ? { files: options.files }
        : { purge_everything: true };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => null)) as any;

    if (response.ok && data?.success) {
      const mode = payload.files ? `${payload.files.length} URL(s)` : 'everything';
      console.log(`[Cloudflare Purge] Successfully purged ${mode} for zone: ${zoneId.slice(0, 6)}...`);
    } else {
      console.warn(`[Cloudflare Purge] Warning from Cloudflare API:`, data?.errors || data);
    }
  } catch (error: any) {
    console.error(`[Cloudflare Purge] Error triggering purge:`, error?.message || error);
  }
}

export function getMotherOrigins(): string[] {
  const origins = new Set<string>();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');
  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');

  if (siteUrl && /^https?:\/\//.test(siteUrl)) {
    origins.add(siteUrl);
    try {
      const parsed = new URL(siteUrl);
      const bareHost = parsed.hostname.replace(/^www\./, '');
      origins.add(`${parsed.protocol}//${bareHost}`);
      origins.add(`${parsed.protocol}//www.${bareHost}`);
    } catch {
      // ignore invalid URL
    }
  }
  if (rootDomain) {
    origins.add(`https://${rootDomain}`);
    origins.add(`https://www.${rootDomain}`);
  }
  return Array.from(origins);
}

export function getResellerOrigins(reseller?: { subdomain?: string; customDomain?: string } | null): string[] {
  if (!reseller) return [];
  const origins = new Set<string>();
  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');

  if (reseller.subdomain && rootDomain) {
    const cleanSub = String(reseller.subdomain).trim().toLowerCase();
    if (cleanSub) origins.add(`https://${cleanSub}.${rootDomain}`);
  }
  if (reseller.customDomain) {
    const cleanDomain = String(reseller.customDomain).trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (cleanDomain) origins.add(`https://${cleanDomain}`);
  }
  return Array.from(origins);
}

export async function purgePathsForOrigins(origins: string[], paths: string[]): Promise<void> {
  const cleanOrigins = Array.from(
    new Set((origins || []).map((o) => String(o || '').trim().replace(/\/+$/, '')).filter((o) => /^https?:\/\//.test(o)))
  );
  const cleanPaths = Array.from(
    new Set((paths || []).map((p) => (String(p || '').startsWith('/') ? String(p) : `/${p}`)).filter(Boolean))
  );

  if (cleanOrigins.length === 0 || cleanPaths.length === 0) return;

  const files: string[] = [];
  for (const origin of cleanOrigins) {
    for (const p of cleanPaths) {
      files.push(`${origin}${p}`);
    }
  }

  for (let i = 0; i < files.length; i += 30) {
    await purgeCloudflareCache({ files: files.slice(i, i + 30) }).catch(() => {});
  }
}

export async function purgeOutOfStockProductUrls(
  slugs: string[],
  options?: { extraOrigins?: string[] }
): Promise<void> {
  const cleanSlugs = Array.from(new Set((slugs || []).map((s) => String(s || '').trim()).filter(Boolean)));
  if (cleanSlugs.length === 0) return;

  const origins = [...getMotherOrigins(), ...(options?.extraOrigins || [])];
  const paths = cleanSlugs.map((slug) => `/product/${slug}`);
  await purgePathsForOrigins(origins, paths);
}

export async function purgeProductCache(params: {
  productId?: string;
  slug?: string;
  includeMother?: boolean;
  extraResellerOrigins?: string[];
  categorySlugs?: string[];
}): Promise<void> {
  try {
    const origins = new Set<string>(params.extraResellerOrigins || []);
    let resolvedSlug = params.slug ? String(params.slug).trim() : '';
    let shouldPurgeMother = params.includeMother;
    const categorySlugSet = new Set<string>((params.categorySlugs || []).filter(Boolean));
    let resolvedBrandSlug = '';

    if (params.productId) {
      try {
        const [{ default: Product }, { default: ResellerProduct }, { default: Reseller }, { default: Category }] = await Promise.all([
          import('@/models/Product'),
          import('@/models/ResellerProduct'),
          import('@/models/Reseller'),
          import('@/models/Category'),
        ]);

        const [productDoc, linkedRps] = await Promise.all([
          Product.findById(params.productId)
            .select('slug uploadedBy isMotherProduct isApprovedByAdmin categories brand')
            .populate('categories', 'slug parentCategory')
            .populate('brand', 'slug')
            .lean() as Promise<any>,
          ResellerProduct.find({ productId: params.productId })
            .select('resellerId')
            .lean() as Promise<any[]>,
        ]);

        if (productDoc) {
          if (!resolvedSlug && productDoc.slug) resolvedSlug = String(productDoc.slug).trim();
          if (shouldPurgeMother === undefined) {
            shouldPurgeMother = Boolean(
              productDoc.isMotherProduct || !productDoc.uploadedBy || productDoc.isApprovedByAdmin
            );
          }
          if (productDoc.brand?.slug) {
            resolvedBrandSlug = String(productDoc.brand.slug).trim();
          }
          if (Array.isArray(productDoc.categories)) {
            const parentIds = new Set<string>();
            for (const cat of productDoc.categories) {
              if (cat?.slug) categorySlugSet.add(String(cat.slug).trim());
              if (cat?.parentCategory) parentIds.add(cat.parentCategory.toString());
            }
            if (parentIds.size > 0) {
              const parentCats = await Category.find({ _id: { $in: Array.from(parentIds) } })
                .select('slug parentCategory')
                .lean() as any[];
              const grandParentIds = new Set<string>();
              for (const pc of parentCats) {
                if (pc?.slug) categorySlugSet.add(String(pc.slug).trim());
                if (pc?.parentCategory) grandParentIds.add(pc.parentCategory.toString());
              }
              if (grandParentIds.size > 0) {
                const grandParents = await Category.find({ _id: { $in: Array.from(grandParentIds) } })
                  .select('slug')
                  .lean() as any[];
                for (const gp of grandParents) {
                  if (gp?.slug) categorySlugSet.add(String(gp.slug).trim());
                }
              }
            }
          }
        }

        const resellerIdSet = new Set<string>();
        if (productDoc?.uploadedBy) resellerIdSet.add(productDoc.uploadedBy.toString());
        for (const rp of linkedRps || []) {
          if (rp?.resellerId) resellerIdSet.add(rp.resellerId.toString());
        }

        if (resellerIdSet.size > 0) {
          const resellers = await Reseller.find({ _id: { $in: Array.from(resellerIdSet) } })
            .select('subdomain customDomain')
            .lean() as any[];
          for (const r of resellers) {
            for (const o of getResellerOrigins(r)) origins.add(o);
          }
        }
      } catch (lookupErr) {
        console.warn('[Cloudflare Purge] Product lookup warning:', lookupErr);
      }
    }

    if (shouldPurgeMother !== false) {
      for (const o of getMotherOrigins()) origins.add(o);
    }

    const paths = ['/', '/shop', ...Array.from({ length: 30 }, (_, i) => `/shop?page=${i + 1}`)];
    if (resolvedSlug) paths.push(`/product/${resolvedSlug}`);
    for (const cSlug of categorySlugSet) {
      if (cSlug) paths.push(`/shop?category=${encodeURIComponent(cSlug)}`);
    }
    if (resolvedBrandSlug) {
      paths.push(`/shop?brand=${encodeURIComponent(resolvedBrandSlug)}`);
    }

    await purgePathsForOrigins(Array.from(origins), paths);
  } catch (err) {
    console.error('[Cloudflare Purge] purgeProductCache error:', err);
  }
}

export async function purgeResellerStoreCache(
  reseller?: { subdomain?: string; customDomain?: string } | null,
  extraPaths: string[] = []
): Promise<void> {
  const origins = getResellerOrigins(reseller);
  if (origins.length === 0) return;
  const shopPages = Array.from({ length: 30 }, (_, i) => `/shop?page=${i + 1}`);
  await purgePathsForOrigins(origins, ['/', '/shop', ...shopPages, ...extraPaths]);
}

export async function purgeBlogCache(slug?: string): Promise<void> {
  const blogPages = Array.from({ length: 30 }, (_, i) => `/blog?page=${i + 1}`);
  const paths = ['/', '/blog', ...blogPages];
  if (slug) {
    paths.push(`/blog/${slug}`);
  }
  await purgePathsForOrigins(getMotherOrigins(), paths);
}

export async function purgeHomeCache(reseller?: { subdomain?: string; customDomain?: string } | null): Promise<void> {
  const origins = reseller ? getResellerOrigins(reseller) : getMotherOrigins();
  await purgePathsForOrigins(origins, ['/']);
}

export async function purgeLandingPageCache(
  slug?: string,
  reseller?: { subdomain?: string; customDomain?: string } | null
): Promise<void> {
  if (!slug) return;
  const origins = reseller ? getResellerOrigins(reseller) : getMotherOrigins();
  await purgePathsForOrigins(origins, [`/lp/${slug}`]);
}

import dbConnect from '@/lib/db';
import Product from '@/models/Product';
import ResellerProduct from '@/models/ResellerProduct';

/**
 * Product Sync Engine
 * 
 * When a Mother/Reseller product is created or updated, this engine propagates
 * the changes to all ResellerProduct records that already reference it.
 * 
 * IMPORTANT: updateMany only updates EXISTING ResellerProduct records.
 * It does NOT create new records, so it only affects resellers who have
 * already explicitly added this product to their store. This is correct
 * multi-tenant isolation behavior.
 * 
 * Fields synced: name, slug, images, stock, purchasePrice (mother price),
 * motherPrice (retail), isAvailableOnMother (published state).
 */

export interface SyncResult {
  productId: string;
  resellersUpdated: number;
  errors: string[];
}

/**
 * Sync a single product to all reseller storefronts that have it.
 */
export async function syncProductToResellers(productId: string): Promise<SyncResult> {
  const errors: string[] = [];
  let resellersUpdated = 0;

  try {
    await dbConnect();

    const product = await Product.findById(productId).lean();
    if (!product) {
      return { productId, resellersUpdated: 0, errors: ['Product not found'] };
    }

    const isPersonalProduct =
      product.isMotherProduct === false ||
      Boolean(product.uploadedBy);

    const defaultFeeRatio = 0.15;
    const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;

    if (hasVariants) {
      const existingRPs = await ResellerProduct.find({ productId: product._id });
      for (const rp of existingRPs) {
        const updatedVariants = (product.variants || []).map((pv: any) => {
          const existingVar = (rp.variants || []).find((ev: any) =>
            String(ev.color || '').trim().toLowerCase() === String(pv.color || '').trim().toLowerCase() &&
            String(ev.size || '').trim().toLowerCase() === String(pv.size || '').trim().toLowerCase()
          );
          const vWholesale = Number(pv.resellerPrice) || (pv.purchasePrice ? Math.round(Number(pv.purchasePrice) * (1 + defaultFeeRatio)) : (product.resellerPrice || product.purchasePrice || 0));
          const vRetail = existingVar?.retailPrice || Math.max(vWholesale, Math.round(vWholesale * 1.2));
          return {
            color: pv.color,
            size: pv.size,
            sku: pv.sku,
            retailPrice: vRetail,
            purchasePrice: vWholesale,
            stock: Number(pv.stock) || 0,
          };
        });

        const firstV = updatedVariants[0];
        await ResellerProduct.updateOne(
          { _id: rp._id },
          {
            $set: {
              name: product.name,
              slug: product.slug,
              images: product.images ?? [],
              stock: product.stock ?? 0,
              purchasePrice: firstV ? firstV.purchasePrice : (product.resellerPrice || (product.purchasePrice ? Math.round(Number(product.purchasePrice) * (1 + defaultFeeRatio)) : 0)),
              motherPrice: (product.variants && product.variants[0]?.price) || product.price || 0,
              retailPrice: firstV ? firstV.retailPrice : rp.retailPrice,
              isAvailableOnMother: isPersonalProduct ? true : (product.isPublished ?? true),
              isPublished: product.isPublished !== undefined ? product.isPublished : true,
              variants: updatedVariants,
              syncedAt: new Date(),
            }
          }
        );
      }
      resellersUpdated = existingRPs.length;
      const wholesalePrice = isPersonalProduct
        ? (product.purchasePrice || 0)
        : (product.resellerPrice || (product.purchasePrice ? Math.round(Number(product.purchasePrice) * (1 + defaultFeeRatio)) : 0));

      const syncPayload = {
        name: product.name,
        slug: product.slug,
        images: product.images ?? [],
        stock: product.stock ?? 0,
        purchasePrice: wholesalePrice,
        motherPrice: product.price ?? 0,
        isAvailableOnMother: isPersonalProduct ? true : (product.isPublished ?? true),
        isPublished: product.isPublished !== undefined ? product.isPublished : true,
        syncedAt: new Date(),
      };

      const result = await ResellerProduct.updateMany(
        { productId: product._id },
        { $set: syncPayload }
      );
      resellersUpdated = result.modifiedCount;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
    console.error(`[SyncEngine] Error syncing product ${productId}:`, err);
  }

  return { productId, resellersUpdated, errors };
}

/**
 * Sync all products (bulk re-sync).
 * Used for admin "Sync All" operations or after bulk updates.
 */
export async function syncAllProducts(): Promise<{ total: number; updated: number; errors: string[] }> {
  await dbConnect();
  const errors: string[] = [];
  let updated = 0;

  const resellerProducts = await ResellerProduct.distinct('productId');

  for (const productId of resellerProducts) {
    const result = await syncProductToResellers(productId.toString());
    updated += result.resellersUpdated;
    errors.push(...result.errors);
  }

  return { total: resellerProducts.length, updated, errors };
}

/**
 * When a product is deleted or unpublished on the Mother site,
 * mark it as unavailable across all reseller storefronts.
 */
export async function unpublishProductFromResellers(productId: string): Promise<number> {
  await dbConnect();
  const result = await ResellerProduct.updateMany(
    { productId },
    { $set: { isAvailableOnMother: false, stock: 0, syncedAt: new Date() } }
  );
  return result.modifiedCount;
}

/**
 * Add a product to a specific reseller's storefront.
 * Reseller sets their own `retailPrice` and optional variant retail prices; snapshot data comes from Mother.
 */
export async function addProductToReseller(
  resellerId: string,
  productId: string,
  retailPrice: number,
  customVariants?: { color?: string; size?: string; sku?: string; retailPrice: number; purchasePrice?: number }[]
): Promise<{ success: boolean; message: string }> {
  try {
    await dbConnect();

    const product = await Product.findById(productId).lean();
    if (!product) return { success: false, message: 'Product not found in catalog' };

    const isOwnProduct = Boolean(
      product.uploadedBy && product.uploadedBy.toString() === resellerId.toString()
    );

    // Sourced products must be published on Mother shop catalog.
    // Personal products uploaded by the reseller do not need to be published on Mother site.
    if (!isOwnProduct && !product.isPublished) {
      return { success: false, message: 'Product is not published on Mother site' };
    }

    // Sourced products from another reseller require Mother Shop Admin approval
    if (!isOwnProduct && product.uploadedBy && !product.isApprovedByAdmin) {
      return { success: false, message: 'This reseller product has not been approved by Mother Shop Admin yet' };
    }

    const isPublishedOnStore = isOwnProduct
      ? (product.isPublished !== undefined ? product.isPublished : true)
      : true;

    const defaultFeeRatio = 0.15;

    // Sourced products receive wholesale resellerPrice (Base price + Mother Shop System Fee).
    // Own products retain base purchasePrice.
    const effectivePurchasePrice = isOwnProduct
      ? (product.purchasePrice || 0)
      : (product.resellerPrice || (product.purchasePrice ? Math.round(product.purchasePrice * (1 + defaultFeeRatio)) : 0));

    // Handle variant pricing if product has variants
    const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
    let mappedVariants: any[] = [];

    if (hasVariants) {
      const markupRatio = effectivePurchasePrice > 0 ? (retailPrice / effectivePurchasePrice) : 1.2;

      mappedVariants = (product.variants || []).map((pv: any) => {
        const matching = (customVariants || []).find((cv: any) =>
          String(cv.color || '').trim().toLowerCase() === String(pv.color || '').trim().toLowerCase() &&
          String(cv.size || '').trim().toLowerCase() === String(pv.size || '').trim().toLowerCase()
        );

        const vWholesale = isOwnProduct
          ? (Number(pv.purchasePrice) || Number(product.purchasePrice) || 0)
          : (Number(pv.resellerPrice) || (pv.purchasePrice ? Math.round(Number(pv.purchasePrice) * (1 + defaultFeeRatio)) : effectivePurchasePrice));

        let vRetail: number;
        if (matching && Number(matching.retailPrice) > 0) {
          vRetail = Number(matching.retailPrice);
        } else {
          vRetail = Math.max(vWholesale, Math.round(vWholesale * markupRatio));
        }

        return {
          color: pv.color,
          size: pv.size,
          sku: pv.sku,
          retailPrice: vRetail,
          purchasePrice: vWholesale,
          stock: Number(pv.stock) || 0,
        };
      });
    }

    // First variant's retail price is ALWAYS the primary retailPrice for product cards!
    const primaryRetailPrice = mappedVariants.length > 0 ? mappedVariants[0].retailPrice : retailPrice;
    const primaryPurchasePrice = mappedVariants.length > 0 ? mappedVariants[0].purchasePrice : effectivePurchasePrice;
    const primaryMotherPrice = (hasVariants && product.variants && product.variants[0]?.price) || product.price || 0;

    await ResellerProduct.findOneAndUpdate(
      { resellerId, productId },
      {
        $set: {
          resellerId,
          productId,
          retailPrice: primaryRetailPrice,
          name: product.name,
          slug: product.slug,
          images: product.images ?? [],
          stock: product.stock ?? 0,
          purchasePrice: primaryPurchasePrice,
          motherPrice: primaryMotherPrice,
          isAvailableOnMother: isOwnProduct ? true : (product.isPublished ?? true),
          isPublished: isPublishedOnStore,
          ...(mappedVariants.length > 0 ? { variants: mappedVariants } : { $unset: { variants: 1 } }),
          syncedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return { success: true, message: 'Product added to reseller storefront' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, message };
  }
}

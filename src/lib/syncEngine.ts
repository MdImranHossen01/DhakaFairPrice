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

    const syncPayload = {
      name: product.name,
      slug: product.slug,
      images: product.images ?? [],
      stock: product.stock ?? 0,
      purchasePrice: product.resellerPrice || product.purchasePrice || 0,
      motherPrice: product.price ?? 0,
      isAvailableOnMother: product.isPublished ?? true,
      syncedAt: new Date(),
    };

    const result = await ResellerProduct.updateMany(
      { productId: product._id },
      { $set: syncPayload }
    );

    resellersUpdated = result.modifiedCount;
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
 * Reseller sets their own `retailPrice`; snapshot data comes from Mother.
 */
export async function addProductToReseller(
  resellerId: string,
  productId: string,
  retailPrice: number
): Promise<{ success: boolean; message: string }> {
  try {
    await dbConnect();

    const product = await Product.findById(productId).lean();
    if (!product) return { success: false, message: 'Product not found in Mother catalog' };
    if (!product.isPublished) return { success: false, message: 'Product is not published on Mother site' };

    await ResellerProduct.findOneAndUpdate(
      { resellerId, productId },
      {
        $set: {
          resellerId,
          productId,
          retailPrice,
          name: product.name,
          slug: product.slug,
          images: product.images ?? [],
          stock: product.stock ?? 0,
          purchasePrice: product.resellerPrice || product.purchasePrice || 0,
          motherPrice: product.price ?? 0,
          isAvailableOnMother: product.isPublished ?? true,
          syncedAt: new Date(),
        },
        $setOnInsert: { isPublished: true },
      },
      { upsert: true, new: true }
    );

    return { success: true, message: 'Product added to reseller storefront' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, message };
  }
}

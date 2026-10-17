/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { ClientSession } from 'mongoose';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { syncProductToResellers } from '@/lib/syncEngine';

interface StockActionOptions {
  orderId: string | mongoose.Types.ObjectId;
  session?: ClientSession | null;
  skipResellerSync?: boolean;
}

export interface StockActionResult {
  success: boolean;
  actionTaken: boolean;
  affectedProductIds: string[];
  message?: string;
}

/**
 * Restores product stock and variant stock when an order is cancelled.
 * Also reverses `totalSales` if sales were already counted for this order.
 * Uses `isStockRestored` flag on Order to prevent duplicate restorations.
 */
export async function restoreStockForOrder({
  orderId,
  session = null,
  skipResellerSync = false,
}: StockActionOptions): Promise<StockActionResult> {
  try {
    const orderQuery = Order.findById(orderId);
    if (session) orderQuery.session(session);
    const order = await orderQuery;

    if (!order) {
      return { success: false, actionTaken: false, affectedProductIds: [], message: 'Order not found' };
    }

    // Guard: Prevent double-restoration
    if (order.isStockRestored) {
      return { success: true, actionTaken: false, affectedProductIds: [], message: 'Stock already restored for this order' };
    }

    const shouldDecrementSales = Boolean(order.isSalesCounted);
    const affectedProductIds = new Set<string>();

    for (const item of order.items || []) {
      if (!item.product) continue;
      const productId = (item.product?._id || item.product).toString();
      const qty = Number(item.quantity) || 0;
      if (qty <= 0) continue;

      const hasVariant = Boolean(item.color || item.size);

      if (hasVariant) {
        // Attempt to increment the specific variant stock
        const variantFilter: any = {
          _id: productId,
          variants: {
            $elemMatch: {
              ...(item.color ? { color: String(item.color).trim() } : {}),
              ...(item.size ? { size: String(item.size).trim() } : {}),
            },
          },
        };

        const updateRes = await Product.updateOne(
          variantFilter,
          {
            $inc: {
              'variants.$.stock': qty,
              ...(shouldDecrementSales ? { totalSales: -qty } : {}),
            },
          },
          session ? { session } : {}
        );

        if (updateRes.matchedCount === 0) {
          // Fallback: If variant no longer matches, restore to main stock
          await Product.updateOne(
            { _id: productId },
            {
              $inc: {
                stock: qty,
                ...(shouldDecrementSales ? { totalSales: -qty } : {}),
              },
            },
            session ? { session } : {}
          );
        } else {
          // Recalculate main stock from sum of variants to keep consistency
          const prodQuery = Product.findById(productId).select('variants');
          if (session) prodQuery.session(session);
          const currentProd = await prodQuery;
          if (currentProd && Array.isArray(currentProd.variants) && currentProd.variants.length > 0) {
            const sumStock = currentProd.variants.reduce(
              (acc: number, v: any) => acc + (Number(v.stock) || 0),
              0
            );
            await Product.updateOne(
              { _id: productId },
              { $set: { stock: Math.max(0, sumStock) } },
              session ? { session } : {}
            );
          }
        }
      } else {
        // Simple product: restore main stock
        await Product.updateOne(
          { _id: productId },
          {
            $inc: {
              stock: qty,
              ...(shouldDecrementSales ? { totalSales: -qty } : {}),
            },
          },
          session ? { session } : {}
        );
      }

      affectedProductIds.add(productId);
    }

    // Mark order stock as restored and reset isSalesCounted if decremented
    const updateOrderFields: any = { isStockRestored: true };
    if (shouldDecrementSales) {
      updateOrderFields.isSalesCounted = false;
    }

    await Order.updateOne(
      { _id: order._id },
      { $set: updateOrderFields },
      session ? { session } : {}
    );

    const affectedList = Array.from(affectedProductIds);

    // Sync updated stock to all ResellerProduct entries if not skipping or in session
    if (!skipResellerSync && !session) {
      for (const prodId of affectedList) {
        try {
          await syncProductToResellers(prodId);
        } catch (syncErr) {
          console.error(`[StockHelper] Failed to sync product ${prodId} to resellers:`, syncErr);
        }
      }
    }

    return { success: true, actionTaken: true, affectedProductIds: affectedList };
  } catch (error: any) {
    console.error(`[StockHelper] Error restoring stock for order ${orderId}:`, error);
    return { success: false, actionTaken: false, affectedProductIds: [], message: error.message };
  }
}

/**
 * Re-deducts stock if a previously cancelled order is un-cancelled.
 */
export async function reDeductStockForOrder({
  orderId,
  session = null,
  skipResellerSync = false,
}: StockActionOptions): Promise<StockActionResult> {
  try {
    const orderQuery = Order.findById(orderId);
    if (session) orderQuery.session(session);
    const order = await orderQuery;

    if (!order) {
      return { success: false, actionTaken: false, affectedProductIds: [], message: 'Order not found' };
    }

    // Only re-deduct if stock was previously restored
    if (!order.isStockRestored) {
      return { success: true, actionTaken: false, affectedProductIds: [], message: 'Stock was not marked as restored' };
    }

    const affectedProductIds = new Set<string>();

    for (const item of order.items || []) {
      if (!item.product) continue;
      const productId = (item.product?._id || item.product).toString();
      const qty = Number(item.quantity) || 0;
      if (qty <= 0) continue;

      const hasVariant = Boolean(item.color || item.size);

      if (hasVariant) {
        const variantFilter: any = {
          _id: productId,
          variants: {
            $elemMatch: {
              ...(item.color ? { color: String(item.color).trim() } : {}),
              ...(item.size ? { size: String(item.size).trim() } : {}),
            },
          },
        };

        const updateRes = await Product.updateOne(
          variantFilter,
          { $inc: { 'variants.$.stock': -qty } },
          session ? { session } : {}
        );

        if (updateRes.matchedCount === 0) {
          await Product.updateOne(
            { _id: productId },
            { $inc: { stock: -qty } },
            session ? { session } : {}
          );
        } else {
          const prodQuery = Product.findById(productId).select('variants');
          if (session) prodQuery.session(session);
          const currentProd = await prodQuery;
          if (currentProd && Array.isArray(currentProd.variants) && currentProd.variants.length > 0) {
            const sumStock = currentProd.variants.reduce(
              (acc: number, v: any) => acc + (Number(v.stock) || 0),
              0
            );
            await Product.updateOne(
              { _id: productId },
              { $set: { stock: Math.max(0, sumStock) } },
              session ? { session } : {}
            );
          }
        }
      } else {
        await Product.updateOne(
          { _id: productId },
          { $inc: { stock: -qty } },
          session ? { session } : {}
        );
      }

      affectedProductIds.add(productId);
    }

    await Order.updateOne(
      { _id: order._id },
      { $set: { isStockRestored: false } },
      session ? { session } : {}
    );

    const affectedList = Array.from(affectedProductIds);

    if (!skipResellerSync && !session) {
      for (const prodId of affectedList) {
        try {
          await syncProductToResellers(prodId);
        } catch (syncErr) {
          console.error(`[StockHelper] Failed to sync product ${prodId} to resellers:`, syncErr);
        }
      }
    }

    return { success: true, actionTaken: true, affectedProductIds: affectedList };
  } catch (error: any) {
    console.error(`[StockHelper] Error re-deducting stock for order ${orderId}:`, error);
    return { success: false, actionTaken: false, affectedProductIds: [], message: error.message };
  }
}

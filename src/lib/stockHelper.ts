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

export interface StockItem {
  product?: any;
  productId?: any;
  name?: string;
  quantity: number;
  color?: string;
  size?: string;
}

export interface DeductStockOptions {
  items: StockItem[];
  session?: ClientSession | null;
  skipResellerSync?: boolean;
}

/**
 * Atomically deducts product stock and variant stock when an order is placed.
 * Ensures stock does not go negative.
 */
export async function deductStockForOrderItems({
  items,
  session = null,
  skipResellerSync = false,
}: DeductStockOptions): Promise<StockActionResult> {
  try {
    const affectedProductIds = new Set<string>();

    for (const item of items) {
      const rawId = item.productId || item.product;
      if (!rawId) continue;
      const productId = (rawId._id || rawId).toString();
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
              stock: { $gte: qty },
            },
          },
        };

        const updateRes = await Product.updateOne(
          variantFilter,
          { $inc: { 'variants.$.stock': -qty } },
          session ? { session } : {}
        );

        if (updateRes.matchedCount === 0) {
          // If specific variant matching failed, check if product has enough stock
          const prodCheck = await Product.findById(productId).select('name variants stock');
          const variant = prodCheck?.variants?.find((v: any) =>
            (!item.color || String(v.color).trim() === String(item.color).trim()) &&
            (!item.size || String(v.size).trim() === String(item.size).trim())
          );
          if (variant && variant.stock < qty) {
            throw new Error(`Insufficient stock for "${item.name || prodCheck?.name || 'Product'} (${[item.color, item.size].filter(Boolean).join('/')})". Available: ${variant.stock}, requested: ${qty}.`);
          }
          // Fallback: deduct from main stock
          const mainDeduct = await Product.updateOne(
            { _id: productId, stock: { $gte: qty } },
            { $inc: { stock: -qty } },
            session ? { session } : {}
          );
          if (mainDeduct.matchedCount === 0) {
            throw new Error(`Insufficient stock for "${item.name || prodCheck?.name || 'Product'}". Available: ${prodCheck?.stock ?? 0}, requested: ${qty}.`);
          }
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
        // Simple product: deduct main stock
        const updateRes = await Product.updateOne(
          { _id: productId, stock: { $gte: qty } },
          { $inc: { stock: -qty } },
          session ? { session } : {}
        );
        if (updateRes.matchedCount === 0) {
          const prodCheck = await Product.findById(productId).select('name stock');
          throw new Error(`Insufficient stock for "${item.name || prodCheck?.name || 'Product'}". Available: ${prodCheck?.stock ?? 0}, requested: ${qty}.`);
        }
      }

      affectedProductIds.add(productId);
    }

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
    console.error('[StockHelper] Error deducting stock for items:', error);
    throw error;
  }
}

/**
 * Counts totalSales on Product for an order when it becomes valid/paid.
 */
export async function countSalesForOrder({
  orderId,
  session = null,
}: {
  orderId: string | mongoose.Types.ObjectId;
  session?: ClientSession | null;
}): Promise<boolean> {
  try {
    const orderQuery = Order.findById(orderId);
    if (session) orderQuery.session(session);
    let order = await orderQuery;

    let isResellerOrderDoc = false;
    if (!order) {
      const ResellerOrder = (await import('@/models/ResellerOrder')).default;
      let roQuery = ResellerOrder.findById(orderId);
      if (session) roQuery.session(session);
      const ro = await roQuery;
      if (ro) {
        if (ro.motherOrderId) {
          return countSalesForOrder({ orderId: ro.motherOrderId, session });
        }
        order = ro as any;
        isResellerOrderDoc = true;
      }
    }

    if (!order || (order as any).isSalesCounted) {
      return false;
    }

    const items = order.items || [];
    for (const item of items) {
      const rawId = (item as any).productId || (item as any).product;
      if (!rawId) continue;
      const productId = (rawId._id || rawId).toString();
      const qty = Number((item as any).quantity) || 0;
      if (qty <= 0) continue;

      await Product.updateOne(
        { _id: productId },
        { $inc: { totalSales: qty } },
        session ? { session } : {}
      );
    }

    const OrderModel: any = isResellerOrderDoc ? (await import('@/models/ResellerOrder')).default : Order;
    await OrderModel.updateOne(
      { _id: order._id },
      { $set: { isSalesCounted: true } },
      session ? { session } : {}
    );

    const ResellerOrder = (await import('@/models/ResellerOrder')).default;
    await ResellerOrder.updateMany(
      { motherOrderId: order._id },
      { $set: { isSalesCounted: true } },
      session ? { session } : {}
    );

    return true;
  } catch (err) {
    console.error(`[StockHelper] Error counting sales for order ${orderId}:`, err);
    return false;
  }
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
    let order = await orderQuery;

    let isResellerOrderDoc = false;
    if (!order) {
      const ResellerOrder = (await import('@/models/ResellerOrder')).default;
      let roQuery = ResellerOrder.findById(orderId);
      if (session) roQuery.session(session);
      const ro = await roQuery;
      if (ro) {
        if (ro.motherOrderId) {
          return restoreStockForOrder({ orderId: ro.motherOrderId, session, skipResellerSync });
        }
        order = ro as any;
        isResellerOrderDoc = true;
      }
    }

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

    const affectedList = Array.from(affectedProductIds);

    if (shouldDecrementSales && affectedList.length > 0) {
      await Product.updateMany(
        { _id: { $in: affectedList }, totalSales: { $lt: 0 } },
        { $set: { totalSales: 0 } },
        session ? { session } : {}
      );
    }

    // Mark order stock as restored and reset isSalesCounted if decremented
    const updateOrderFields: any = { isStockRestored: true };
    if (shouldDecrementSales) {
      updateOrderFields.isSalesCounted = false;
    }

    const OrderModel: any = isResellerOrderDoc ? (await import('@/models/ResellerOrder')).default : Order;
    await OrderModel.updateOne(
      { _id: order._id },
      { $set: updateOrderFields },
      session ? { session } : {}
    );

    const ResellerOrder = (await import('@/models/ResellerOrder')).default;
    await ResellerOrder.updateMany(
      { motherOrderId: order._id },
      { $set: updateOrderFields },
      session ? { session } : {}
    );

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
    let order = await orderQuery;

    let isResellerOrderDoc = false;
    if (!order) {
      const ResellerOrder = (await import('@/models/ResellerOrder')).default;
      let roQuery = ResellerOrder.findById(orderId);
      if (session) roQuery.session(session);
      const ro = await roQuery;
      if (ro) {
        if (ro.motherOrderId) {
          return reDeductStockForOrder({ orderId: ro.motherOrderId, session, skipResellerSync });
        }
        order = ro as any;
        isResellerOrderDoc = true;
      }
    }

    if (!order) {
      return { success: false, actionTaken: false, affectedProductIds: [], message: 'Order not found' };
    }

    // Only re-deduct if stock was previously restored
    if (!order.isStockRestored) {
      return { success: true, actionTaken: false, affectedProductIds: [], message: 'Stock was not marked as restored' };
    }

    const affectedProductIds = new Set<string>();

    for (const item of order.items || []) {
      const rawId = (item as any).productId || (item as any).product;
      if (!rawId) continue;
      const productId = (rawId._id || rawId).toString();
      const qty = Number((item as any).quantity) || 0;
      if (qty <= 0) continue;

      const hasVariant = Boolean((item as any).color || (item as any).size);

      if (hasVariant) {
        const variantFilter: any = {
          _id: productId,
          variants: {
            $elemMatch: {
              ...((item as any).color ? { color: String((item as any).color).trim() } : {}),
              ...((item as any).size ? { size: String((item as any).size).trim() } : {}),
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

    const OrderModel: any = isResellerOrderDoc ? (await import('@/models/ResellerOrder')).default : Order;
    await OrderModel.updateOne(
      { _id: order._id },
      { $set: { isStockRestored: false } },
      session ? { session } : {}
    );

    const ResellerOrder = (await import('@/models/ResellerOrder')).default;
    await ResellerOrder.updateMany(
      { motherOrderId: order._id },
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

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';
import { logActivity, ACTIONS } from '@/lib/activityLogger';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !['admin', 'super_admin', 'manager'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { productId, variantId, quantity, type, reason } = body;

    if (!productId || typeof quantity !== 'number' || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (type !== 'set' && type !== 'inc') {
      return NextResponse.json({ error: 'Invalid adjustment type. Supported types are "set" and "inc".' }, { status: 400 });
    }

    await dbConnect();

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    let previousStock = 0;
    let newStock = 0;

    // Adjusting a variant stock
    if (variantId && product.variants && product.variants.length > 0) {
      const variantIdx = product.variants.findIndex((v: any) => v._id.toString() === variantId);
      if (variantIdx === -1) {
        return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
      }

      previousStock = product.variants[variantIdx].stock;
      if (type === 'set') {
        product.variants[variantIdx].stock = Math.max(0, quantity);
      } else if (type === 'inc') {
        product.variants[variantIdx].stock = Math.max(0, product.variants[variantIdx].stock + quantity);
      }
      newStock = product.variants[variantIdx].stock;
      
      // Update overall product stock as sum of variant stocks
      product.stock = Math.max(0, product.variants.reduce((sum, v) => sum + v.stock, 0));
    } else {
      // Adjusting main product stock
      previousStock = product.stock;
      if (type === 'set') {
        product.stock = Math.max(0, quantity);
      } else if (type === 'inc') {
        product.stock = Math.max(0, product.stock + quantity);
      }
      newStock = product.stock;
    }

    // Handle optimistic concurrency checks using Mongoose versioning
    if (product.__v !== undefined) {
      product.$where = { __v: product.__v };
    }
    await product.save();

    // Isolate post-save side effects (reseller sync, activity logging) to prevent retries on failure
    try {
      // Trigger sync to reseller storefronts
      const { syncProductToResellers } = await import('@/lib/syncEngine');
      await syncProductToResellers(product._id.toString());

      // Log this action to ActivityLog
      await logActivity({
        userId: (session.user as any).id,
        userEmail: session.user.email || '',
        role: (session.user as any).role,
        action: ACTIONS.UPDATE_PRODUCT,
        resource: 'Product',
        resourceId: product._id.toString(),
        details: {
          adjustmentType: type,
          amount: quantity,
          previousStock,
          newStock,
          variantId: variantId || null,
          reason: reason || 'Warehouse adjustment',
        },
      });
    } catch (sideEffectError) {
      console.error('[Warehouse Adjustment Post-Save Side Effects Failed]', sideEffectError);
    }

    return NextResponse.json({
      success: true,
      message: 'Stock adjusted successfully',
      newStock,
    });
  } catch (error: any) {
    console.error('[Warehouse Adjustment Error]', error);
    if (error.name === 'VersionError') {
      return NextResponse.json({ error: 'Conflict: Product was updated by another process. Please reload and try again.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

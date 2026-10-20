import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !['admin', 'super_admin'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  // Automatically update active resellers whose expiresAt has passed to 'expired'
  await Reseller.updateMany(
    {
      status: 'active',
      expiresAt: { $ne: null, $lte: new Date() },
    },
    {
      $set: { status: 'expired' },
    }
  );

  const resellers = await Reseller.find().populate('userId', 'name email').sort({ createdAt: -1 }).lean();

  return NextResponse.json({ resellers });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !['admin', 'super_admin'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { resellerId, status, commissionRate, suspendReason, subdomain, customDomain, storeName, expiresAt } = body;

    if (!resellerId) {
      return NextResponse.json({ error: 'resellerId is required' }, { status: 400 });
    }

    await dbConnect();

    const updatePayload: any = {};
    if (expiresAt !== undefined) {
      updatePayload.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }
    if (status) {
      updatePayload.status = status;
      if (status === 'active') {
        updatePayload.approvedAt = new Date();
        if (expiresAt !== undefined) {
          updatePayload.expiresAt = expiresAt ? new Date(expiresAt) : null;
        }
      } else if (status === 'suspended') {
        updatePayload.suspendedAt = new Date();
        updatePayload.suspendReason = suspendReason || '';
      } else if (status === 'rejected') {
        updatePayload.suspendedAt = new Date();
        updatePayload.suspendReason = suspendReason || 'Application rejected by administrator';
      }
    }
    if (commissionRate !== undefined) {
      const rate = Number(commissionRate);
      if (isNaN(rate) || !isFinite(rate) || rate < 0 || rate > 100) {
        return NextResponse.json({ error: 'Commission rate must be a valid number between 0 and 100.' }, { status: 400 });
      }
      updatePayload.commissionRate = rate;
    }
    if (storeName !== undefined) {
      updatePayload.storeName = storeName.trim();
    }
    if (subdomain !== undefined) {
      const cleanSub = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (!cleanSub) {
        return NextResponse.json({ error: 'Subdomain cannot be empty' }, { status: 400 });
      }
      const existing = await Reseller.findOne({ subdomain: cleanSub, _id: { $ne: resellerId } });
      if (existing) {
        return NextResponse.json({ error: 'This subdomain is already taken by another reseller.' }, { status: 400 });
      }
      updatePayload.subdomain = cleanSub;
    }
    if (customDomain !== undefined) {
      const cleanCustom = customDomain ? customDomain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/+$/, '') : '';
      if (cleanCustom) {
        const existingCustom = await Reseller.findOne({ customDomain: cleanCustom, _id: { $ne: resellerId } });
        if (existingCustom) {
          return NextResponse.json({ error: 'This custom domain is already linked to another reseller.' }, { status: 400 });
        }
      }
      updatePayload.customDomain = cleanCustom;
    }
    if (body.courierConfig !== undefined) {
      updatePayload.courierConfig = body.courierConfig;
    }

    const updated = await Reseller.findByIdAndUpdate(
      resellerId,
      { $set: updatePayload },
      { new: true }
    );

    if (status === 'active' && updated) {
      await User.findByIdAndUpdate(updated.userId, { role: 'reseller', resellerId: updated._id });
    } else if (status === 'rejected' && updated) {
      await User.findByIdAndUpdate(updated.userId, { role: 'user' });
    }

    return NextResponse.json({ success: true, reseller: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !['admin', 'super_admin'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const resellerId = searchParams.get('resellerId');

    if (!resellerId) {
      return NextResponse.json({ error: 'resellerId is required' }, { status: 400 });
    }

    await dbConnect();

    const reseller = await Reseller.findById(resellerId);
    if (!reseller) {
      return NextResponse.json({ error: 'Reseller not found' }, { status: 404 });
    }

    // 1. Reset user role and unlink resellerId
    if (reseller.userId) {
      await User.findByIdAndUpdate(reseller.userId, {
        $unset: { resellerId: 1 },
        role: 'user',
      });
    }

    // 2. Cascade delete all related reseller data
    const [
      ResellerProduct,
      ResellerOrder,
      Order,
      ResellerWalletTransaction,
      LedgerTransaction,
      LedgerAccount,
      Expense,
      TransactionCategory,
      ResellerCoupon,
      Banner,
      FAQ,
      ResellerTestimonial,
      AbandonedCart,
    ] = await Promise.all([
      import('@/models/ResellerProduct').then((m) => m.default),
      import('@/models/ResellerOrder').then((m) => m.default),
      import('@/models/Order').then((m) => m.default),
      import('@/models/ResellerWalletTransaction').then((m) => m.default),
      import('@/models/LedgerTransaction').then((m) => m.default),
      import('@/models/LedgerAccount').then((m) => m.default),
      import('@/models/Expense').then((m) => m.default),
      import('@/models/TransactionCategory').then((m) => m.default),
      import('@/models/ResellerCoupon').then((m) => m.default),
      import('@/models/Banner').then((m) => m.default),
      import('@/models/FAQ').then((m) => m.default),
      import('@/models/ResellerTestimonial').then((m) => m.default),
      import('@/models/AbandonedCart').then((m) => m.default),
    ]);

    await Promise.all([
      ResellerProduct.deleteMany({ resellerId }),
      ResellerOrder.deleteMany({ resellerId }),
      Order.deleteMany({ resellerId }),
      ResellerWalletTransaction.deleteMany({ resellerId }),
      LedgerTransaction.deleteMany({ resellerId }),
      LedgerAccount.deleteMany({ resellerId }),
      Expense.deleteMany({ resellerId }),
      TransactionCategory.deleteMany({ resellerId }),
      ResellerCoupon.deleteMany({ resellerId }),
      Banner.deleteMany({ resellerId }),
      FAQ.deleteMany({ resellerId }),
      ResellerTestimonial.deleteMany({ resellerId }),
      AbandonedCart.deleteMany({ resellerId }),
      Reseller.findByIdAndDelete(resellerId),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Store and all associated products, ledger history, and data deleted successfully',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}


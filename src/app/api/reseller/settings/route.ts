import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import User from '@/models/User';

// GET - Load current reseller's settings
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const currentUserId = (session.user as any).id;
    let reseller = await Reseller.findOne({ userId: currentUserId });
    if (!reseller) {
      return NextResponse.json({ error: 'Reseller not found' }, { status: 404 });
    }

    // Auto-reconcile any Delivered/Paid commissions
    const { reconcileResellerCommissions } = await import('@/lib/resellerCommissionSync');
    await reconcileResellerCommissions(reseller._id);
    reseller = await Reseller.findById(reseller._id);

    // Ensure User profile image is synchronized with store logo
    if (reseller?.logoUrl && currentUserId) {
      await User.findByIdAndUpdate(currentUserId, { image: reseller.logoUrl });
    }

    return NextResponse.json({ reseller });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH - Save reseller settings
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      resellerId,
      // Basic info
      storeName,
      description,
      marqueeText,
      logoUrl,
      faviconUrl,
      // Domain
      subdomain,
      customDomain,
      // Contact
      contact,
      // Social
      socialLinks,
      // SEO + Tracking
      seoConfig,
      // Delivery
      deliveryConfig,
      // Payment
      paymentConfig,
      // Loyalty
      loyaltyConfig,
      // Courier
      courierConfig,
    } = body;

    if (!resellerId) {
      return NextResponse.json({ error: 'resellerId is required' }, { status: 400 });
    }

    await dbConnect();

    // Verify reseller belongs to current user (or admin/super_admin)
    const reseller = await Reseller.findOne({ _id: resellerId, userId: (session.user as any).id });
    if (!reseller && !['admin', 'super_admin'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatePayload: Record<string, any> = {};

    // Basic info
    if (storeName !== undefined) updatePayload.storeName = storeName;
    if (description !== undefined) updatePayload.description = description;
    if (marqueeText !== undefined) updatePayload.marqueeText = marqueeText;
    if (logoUrl !== undefined) {
      updatePayload.logoUrl = logoUrl;
      const targetUserId = reseller?.userId || (session.user as any).id;
      if (targetUserId) {
        await User.findByIdAndUpdate(targetUserId, { image: logoUrl });
      }
    }
    if (faviconUrl !== undefined) updatePayload.faviconUrl = faviconUrl;

    // Domain
    if (subdomain && subdomain !== reseller?.subdomain) {
      const cleanSub = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
      const existing = await Reseller.findOne({ subdomain: cleanSub, _id: { $ne: resellerId } });
      if (existing) {
        return NextResponse.json({ error: 'এই সাব-ডোমেইনটি ইতিমধ্যে ব্যবহৃত হচ্ছে' }, { status: 400 });
      }
      updatePayload.subdomain = cleanSub;
    }
    if (customDomain !== undefined) {
      updatePayload.customDomain = customDomain.toLowerCase().trim();
    }

    // Contact (merge field by field)
    if (contact) {
      Object.keys(contact).forEach((key) => {
        updatePayload[`contact.${key}`] = contact[key];
      });
    }

    // Social links (full replace)
    if (socialLinks !== undefined) updatePayload.socialLinks = socialLinks;

    // SEO + Tracking config (full replace)
    if (seoConfig !== undefined) updatePayload.seoConfig = seoConfig;

    // Delivery config (full replace)
    if (deliveryConfig !== undefined) updatePayload.deliveryConfig = deliveryConfig;

    // Payment config (full replace)
    if (paymentConfig !== undefined) updatePayload.paymentConfig = paymentConfig;

    // Loyalty config (full replace)
    if (loyaltyConfig !== undefined) updatePayload.loyaltyConfig = loyaltyConfig;

    // Pickup / Warehouse address (full replace or merge)
    if (body.pickupAddress !== undefined) updatePayload.pickupAddress = body.pickupAddress;

    // Courier config (full replace)
    if (courierConfig !== undefined) updatePayload.courierConfig = courierConfig;

    const updated = await Reseller.findByIdAndUpdate(
      resellerId,
      { $set: updatePayload },
      { new: true }
    );

    return NextResponse.json({ success: true, reseller: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

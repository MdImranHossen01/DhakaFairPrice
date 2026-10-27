import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import LandingPage from '@/models/LandingPage';
import Reseller from '@/models/Reseller';
import { auth } from '@/auth';
import mongoose from 'mongoose';

async function getResellerContext() {
  const session = await auth();
  if (!session?.user) return null;

  const role = (session.user as any)?.role;
  const isReseller = role === 'reseller';
  const isAdmin = ['admin', 'super_admin'].includes(role) || session.user.email === 'imranshuvo101@gmail.com';

  if (!isReseller && !isAdmin) return null;

  await connectToDatabase();

  let reseller = null;
  const resellerId = (session.user as any)?.resellerId;
  if (resellerId) {
    reseller = await Reseller.findById(resellerId);
  }

  if (!reseller) {
    reseller = await Reseller.findOne({ userId: session.user.id });
  }

  return reseller;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reseller = await getResellerContext();
    if (!reseller) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid ID format' }, { status: 400 });
    }

    await connectToDatabase();
    const page = await LandingPage.findOne({ _id: id, resellerId: reseller._id });
    
    if (!page) {
      return NextResponse.json({ message: 'Landing page not found' }, { status: 404 });
    }

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || (process.env.NODE_ENV === 'production' ? 'dhakafairprice.com' : 'localhost:3000');
    const storeHost = reseller.customDomain || (reseller.subdomain ? `${reseller.subdomain}.${rootDomain}` : '');
    const isLocal = storeHost.includes('localhost');
    const protocol = isLocal ? 'http' : 'https';

    const pageObj: any = page.toObject();
    pageObj.liveUrl = storeHost ? `${protocol}://${storeHost}/lp/${page.slug}` : `/store/${reseller.subdomain}/lp/${page.slug}`;
    pageObj.resellerSubdomain = reseller.subdomain;

    return NextResponse.json(pageObj);
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reseller = await getResellerContext();
    if (!reseller) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid ID format' }, { status: 400 });
    }

    const body = await req.json();
    
    const allowedFields = ['title', 'description', 'sections', 'seoConfig', 'isActive', 'slug'];
    const sanitizedUpdate: any = {};
    
    Object.keys(body).forEach(key => {
      if (allowedFields.includes(key)) {
        sanitizedUpdate[key] = body[key];
      }
    });

    if (sanitizedUpdate.slug) {
      sanitizedUpdate.slug = sanitizedUpdate.slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
      const existing = await LandingPage.findOne({ 
        slug: sanitizedUpdate.slug, 
        resellerId: reseller._id, 
        _id: { $ne: id } 
      });
      if (existing) {
        return NextResponse.json({ message: 'A landing page with this slug already exists' }, { status: 409 });
      }
    }

    if (Object.keys(sanitizedUpdate).length === 0) {
      return NextResponse.json({ message: 'No valid fields provided for update' }, { status: 400 });
    }

    await connectToDatabase();
    const updatedPage = await LandingPage.findOneAndUpdate(
      { _id: id, resellerId: reseller._id },
      { $set: sanitizedUpdate },
      { new: true, runValidators: true }
    );

    if (!updatedPage) {
      return NextResponse.json({ message: 'Landing page not found' }, { status: 404 });
    }

    return NextResponse.json(updatedPage);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reseller = await getResellerContext();
    if (!reseller) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid ID format' }, { status: 400 });
    }

    await connectToDatabase();
    const deletedPage = await LandingPage.findOneAndDelete({ _id: id, resellerId: reseller._id });

    if (!deletedPage) {
      return NextResponse.json({ message: 'Landing page not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Landing page deleted successfully' });
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

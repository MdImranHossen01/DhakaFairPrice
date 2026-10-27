import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import LandingPage from '@/models/LandingPage';
import Reseller from '@/models/Reseller';
import { auth } from '@/auth';

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

// GET all landing pages for logged-in reseller
export async function GET() {
  try {
    const reseller = await getResellerContext();
    if (!reseller) {
      return NextResponse.json({ message: 'Unauthorized or Reseller store not found' }, { status: 401 });
    }

    await connectToDatabase();
    const pages = await LandingPage.find({ resellerId: reseller._id }).sort({ createdAt: -1 });

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || (process.env.NODE_ENV === 'production' ? 'dhakafairprice.com' : 'localhost:3000');
    const storeHost = reseller.customDomain || (reseller.subdomain ? `${reseller.subdomain}.${rootDomain}` : '');
    const isLocal = storeHost.includes('localhost');
    const protocol = isLocal ? 'http' : 'https';

    const enrichedPages = pages.map(page => {
      const p: any = page.toObject();
      p.liveUrl = storeHost ? `${protocol}://${storeHost}/lp/${p.slug}` : `/store/${reseller.subdomain}/lp/${p.slug}`;
      p.resellerSubdomain = reseller.subdomain;
      return p;
    });

    return NextResponse.json(enrichedPages);
  } catch (error) {
    console.error('Error fetching reseller landing pages:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST create new landing page for logged-in reseller
export async function POST(req: NextRequest) {
  try {
    const reseller = await getResellerContext();
    if (!reseller) {
      return NextResponse.json({ message: 'Unauthorized or Reseller store not found' }, { status: 401 });
    }

    const body = await req.json();
    const { title, slug } = body;

    if (!title || !slug) {
      return NextResponse.json({ message: 'Title and Slug are required' }, { status: 400 });
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(cleanSlug)) {
      return NextResponse.json({ 
        message: 'Invalid slug format. Use only lowercase letters, numbers, and hyphens.' 
      }, { status: 400 });
    }

    await connectToDatabase();

    const existing = await LandingPage.findOne({ slug: cleanSlug, resellerId: reseller._id });
    if (existing) {
      return NextResponse.json({ message: 'A landing page with this slug already exists in your store' }, { status: 409 });
    }

    const newPage = await LandingPage.create({
      resellerId: reseller._id,
      title: title.trim(),
      slug: cleanSlug,
      sections: [],
      isActive: true,
    });

    return NextResponse.json(newPage, { status: 201 });
  } catch (error: any) {
    console.error('Error creating reseller landing page:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

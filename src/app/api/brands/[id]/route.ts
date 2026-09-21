import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Brand from '@/models/Brand';
import { auth } from '@/auth';

// GET a single brand
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();

    const brand = await Brand.findById(id).lean();
    if (!brand) {
      return NextResponse.json({ message: 'Brand not found' }, { status: 404 });
    }

    return NextResponse.json(brand);
  } catch (error: any) {
    console.error('Error fetching brand:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT update a brand
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const role = (session?.user as any)?.role;

    if (!session || !session.user || !['admin', 'super_admin', 'manager', 'moderator'].includes(role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, slug, image, isActive } = body;

    await connectToDatabase();

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (slug) updateData.slug = slug.trim();
    if (image !== undefined) updateData.image = image;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await Brand.findByIdAndUpdate(id, updateData, { new: true }).lean();
    if (!updated) {
      return NextResponse.json({ message: 'Brand not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating brand:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE a brand
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const role = (session?.user as any)?.role;

    if (!session || !session.user || !['admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const deleted = await Brand.findByIdAndDelete(id).lean();
    if (!deleted) {
      return NextResponse.json({ message: 'Brand not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Brand deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting brand:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

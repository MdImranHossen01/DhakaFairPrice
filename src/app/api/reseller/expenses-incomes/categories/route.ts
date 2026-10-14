import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Reseller from '@/models/Reseller';
import TransactionCategory from '@/models/TransactionCategory';

async function getReseller(userId: string) {
  await connectToDatabase();
  return await Reseller.findOne({ userId });
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const reseller = await getReseller(session.user.id);
    if (!reseller) {
      return NextResponse.json({ message: 'Reseller profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    await connectToDatabase();

    const query: any = { resellerId: reseller._id };
    if (type) query.type = type;

    let categories = await TransactionCategory.find(query).sort({ type: 1, name: 1 }).lean();

    // If no categories exist for this reseller, auto-seed defaults
    if (categories.length === 0) {
      const defaultCategories = [
        { name: 'Ads & Marketing', type: 'expense', resellerId: reseller._id },
        { name: 'Packaging & Delivery', type: 'expense', resellerId: reseller._id },
        { name: 'Shop Rent & Utilities', type: 'expense', resellerId: reseller._id },
        { name: 'Staff & Freelancer', type: 'expense', resellerId: reseller._id },
        { name: 'Product Sourcing', type: 'expense', resellerId: reseller._id },
        { name: 'Tools & Software', type: 'expense', resellerId: reseller._id },
        { name: 'Others Expense', type: 'expense', resellerId: reseller._id },
        { name: 'Direct Sales', type: 'income', resellerId: reseller._id },
        { name: 'Investment & Capital', type: 'income', resellerId: reseller._id },
        { name: 'Other Income', type: 'income', resellerId: reseller._id },
      ];
      await TransactionCategory.insertMany(defaultCategories);
      categories = await TransactionCategory.find(query).sort({ type: 1, name: 1 }).lean();
    }

    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error('Fetch Reseller Categories Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const reseller = await getReseller(session.user.id);
    if (!reseller) {
      return NextResponse.json({ message: 'Reseller profile not found' }, { status: 404 });
    }

    const body = await req.json();
    const { name, type } = body;

    if (!name || !type || !['expense', 'income'].includes(type)) {
      return NextResponse.json({ message: 'Name and valid type (expense/income) are required' }, { status: 400 });
    }

    await connectToDatabase();

    const existing = await TransactionCategory.findOne({
      name: name.trim(),
      type,
      resellerId: reseller._id,
    });
    if (existing) {
      return NextResponse.json({ message: 'Category already exists in your store' }, { status: 400 });
    }

    const category = await TransactionCategory.create({
      name: name.trim(),
      type,
      resellerId: reseller._id,
    });

    return NextResponse.json({ message: 'Category created successfully', category }, { status: 201 });
  } catch (error: any) {
    console.error('Create Reseller Category Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

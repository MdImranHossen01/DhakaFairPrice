import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import TransactionCategory from '@/models/TransactionCategory';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    await connectToDatabase();

    const query: any = {
      $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
    };
    if (type) query.type = type;

    let categories = await TransactionCategory.find(query).sort({ type: 1, name: 1 }).lean();

    // If no categories exist, auto-seed default categories
    if (categories.length === 0) {
      const defaultCategories = [
        { name: 'Ads & Marketing', type: 'expense', resellerId: null },
        { name: 'Salary & Wages', type: 'expense', resellerId: null },
        { name: 'Office Rent', type: 'expense', resellerId: null },
        { name: 'Utility & Bills', type: 'expense', resellerId: null },
        { name: 'Courier & Shipping', type: 'expense', resellerId: null },
        { name: 'Packaging & Supplies', type: 'expense', resellerId: null },
        { name: 'Software & Tools', type: 'expense', resellerId: null },
        { name: 'Others Expense', type: 'expense', resellerId: null },
        { name: 'Sales Revenue', type: 'income', resellerId: null },
        { name: 'Investment / Capital', type: 'income', resellerId: null },
        { name: 'Service Income', type: 'income', resellerId: null },
        { name: 'Other Income', type: 'income', resellerId: null }
      ];
      await TransactionCategory.insertMany(defaultCategories);
      categories = await TransactionCategory.find(query).sort({ type: 1, name: 1 }).lean();
    }

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Fetch Categories Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, type } = body;

    if (!name || !type) {
      return NextResponse.json({ message: 'Name and type are required' }, { status: 400 });
    }

    await connectToDatabase();

    const existing = await TransactionCategory.findOne({
      name: name.trim(),
      type,
      $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
    });
    if (existing) {
      return NextResponse.json({ message: 'Category already exists for this type' }, { status: 400 });
    }

    const category = await TransactionCategory.create({
      name: name.trim(),
      type,
      resellerId: null
    });

    return NextResponse.json({ message: 'Category created successfully', category });
  } catch (error: any) {
    console.error('Create Category Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

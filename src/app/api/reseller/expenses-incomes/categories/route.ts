import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Reseller from '@/models/Reseller';
import TransactionCategory from '@/models/TransactionCategory';
import { seedDefaultTransactionCategories } from '@/lib/ledgerHelper';

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

    // Ensure default transaction categories exist for this reseller
    await seedDefaultTransactionCategories(reseller._id);

    const query: any = { resellerId: reseller._id };
    if (type) query.type = type;

    const categories = await TransactionCategory.find(query).sort({ type: 1, name: 1 }).lean();

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

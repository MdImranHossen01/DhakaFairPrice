/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');

    const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

    if (isNaN(month) || month < 1 || month > 12 || isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ message: 'Invalid month or year parameter' }, { status: 400 });
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999));

    await connectToDatabase();

    const brandSalesAgg = await Order.aggregate([
      {
        $match: {
          status: { $in: ['Paid', 'Confirmed', 'Processing', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] },
          createdAt: { $gte: startDate, $lte: endDate },
          deletedAt: null
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDoc'
        }
      },
      { $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$productDoc.brand',
          soldQty: { $sum: '$items.quantity' },
          totalSales: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      {
        $lookup: {
          from: 'brands',
          localField: '_id',
          foreignField: '_id',
          as: 'brandDoc'
        }
      },
      { $unwind: { path: '$brandDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          brandName: { $ifNull: ['$brandDoc.name', 'No Brand / Generic'] },
          soldQty: 1,
          totalSales: 1
        }
      },
      { $sort: { totalSales: -1 } }
    ]);

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return NextResponse.json({
      monthName: monthNames[month - 1],
      year,
      brands: brandSalesAgg
    });
  } catch (error) {
    console.error('Brand Sales API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

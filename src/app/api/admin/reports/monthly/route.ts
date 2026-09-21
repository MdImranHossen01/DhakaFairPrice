import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import Expense from '@/models/Expense';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !['admin', 'super_admin', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = parseInt(searchParams.get('year') || now.getFullYear().toString());

    // Calculate start and end dates for selected year (BST +06:00)
    const startDate = new Date(`${year}-01-01T00:00:00+06:00`);
    const endDate = new Date(`${year}-12-31T23:59:59.999+06:00`);

    await connectToDatabase();

    const [ordersAggregation, expensesAggregation] = await Promise.all([
      // Orders Aggregated by month (%Y-%m) (BST +06:00)
      Order.aggregate([
        {
          $match: {
            status: { $in: ['Paid', 'Confirmed', 'Processing', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] },
            createdAt: { $gte: startDate, $lte: endDate },
            deletedAt: null
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: '+06:00' } },
            totalSales: { $sum: '$totalAmount' },
            deliveryCost: { $sum: '$deliveryCharge' },
            orderCount: { $sum: 1 },
            cogs: {
              $sum: {
                $sum: {
                  $map: {
                    input: '$items',
                    as: 'item',
                    in: { $multiply: ['$$item.quantity', { $ifNull: ['$$item.purchasePrice', 0] }] }
                  }
                }
              }
            }
          }
        }
      ]),

      // Expenses Aggregated by month (%Y-%m) (BST +06:00)
      Expense.aggregate([
        {
          $match: {
            date: { $gte: startDate, $lte: endDate },
            type: { $ne: 'income' }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$date', timezone: '+06:00' } },
            expense: { $sum: '$amount' }
          }
        }
      ])
    ]);

    const orderMap = new Map<string, any>();
    ordersAggregation.forEach(o => orderMap.set(o._id, o));

    const expenseMap = new Map<string, number>();
    expensesAggregation.forEach(e => expenseMap.set(e._id, e.expense || 0));

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const monthlyRows = [];
    let summaryNetSales = 0;
    let summaryDeliveryCost = 0;
    let summaryTotal = 0;
    let summarySalesProfit = 0;
    let summaryExpense = 0;
    let summaryNetProfit = 0;

    for (let m = 1; m <= 12; m++) {
      const monthStr = m.toString().padStart(2, '0');
      const monthKey = `${year}-${monthStr}`;
      const monthName = monthNames[m - 1];

      const orderData = orderMap.get(monthKey) || { totalSales: 0, deliveryCost: 0, cogs: 0, orderCount: 0 };
      const expense = expenseMap.get(monthKey) || 0;

      const netSales = Math.max(0, orderData.totalSales - orderData.deliveryCost);
      const deliveryCost = orderData.deliveryCost || 0;
      const total = orderData.totalSales || 0;
      const salesProfit = netSales - (orderData.cogs || 0);
      const netProfit = salesProfit - expense;

      summaryNetSales += netSales;
      summaryDeliveryCost += deliveryCost;
      summaryTotal += total;
      summarySalesProfit += salesProfit;
      summaryExpense += expense;
      summaryNetProfit += netProfit;

      monthlyRows.push({
        monthNumber: m,
        month: monthName,
        monthKey,
        netSales,
        deliveryCost,
        total,
        salesProfit,
        expense,
        netProfit,
        orderCount: orderData.orderCount || 0
      });
    }

    return NextResponse.json({
      year,
      rows: monthlyRows,
      summary: {
        totalNetSales: summaryNetSales,
        totalDeliveryCost: summaryDeliveryCost,
        grandTotal: summaryTotal,
        totalSalesProfit: summarySalesProfit,
        totalExpense: summaryExpense,
        totalNetProfit: summaryNetProfit
      }
    });
  } catch (error) {
    console.error('Monthly Report API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

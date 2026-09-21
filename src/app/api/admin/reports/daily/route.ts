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
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');

    const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

    if (isNaN(month) || month < 1 || month > 12 || isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ message: 'Invalid month or year parameter' }, { status: 400 });
    }

    // Calculate start and end dates for selected month & year (BST +06:00)
    const startDate = new Date(`${year}-${month.toString().padStart(2, '0')}-01T00:00:00+06:00`);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDate = new Date(new Date(`${nextYear}-${nextMonth.toString().padStart(2, '0')}-01T00:00:00+06:00`).getTime() - 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    await connectToDatabase();

    const [ordersAggregation, expensesAggregation] = await Promise.all([
      // Orders Aggregated by day (BST +06:00)
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
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+06:00' } },
            totalSales: { $sum: '$totalAmount' },
            deliveryCost: { $sum: '$deliveryCharge' },
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
            },
            orderCount: { $sum: 1 }
          }
        }
      ]),

      // Expenses Aggregated by day (BST +06:00)
      Expense.aggregate([
        {
          $match: {
            date: { $gte: startDate, $lte: endDate },
            type: { $ne: 'income' }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: '+06:00' } },
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
    const monthShort = monthNames[month - 1].substring(0, 3);

    const dailyRows = [];
    let summaryNetSales = 0;
    let summaryDeliveryCost = 0;
    let summaryTotal = 0;
    let summarySalesProfit = 0;
    let summaryExpense = 0;
    let summaryNetProfit = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = day.toString().padStart(2, '0');
      const monthStr = month.toString().padStart(2, '0');
      const dateKey = `${year}-${monthStr}-${dayStr}`;
      const displayDate = `${dayStr}-${monthShort}-${year}`;

      const orderData = orderMap.get(dateKey) || { totalSales: 0, deliveryCost: 0, cogs: 0, orderCount: 0 };
      const expense = expenseMap.get(dateKey) || 0;

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

      dailyRows.push({
        date: displayDate,
        dateKey,
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
      month,
      monthName: monthNames[month - 1],
      year,
      rows: dailyRows,
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
    console.error('Daily Report API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

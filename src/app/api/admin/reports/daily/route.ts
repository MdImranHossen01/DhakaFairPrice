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

    const sourceParam = searchParams.get('source'); // 'all' | 'mother' | 'reseller'

    const orderMatch: any = {
      status: { $in: ['Paid', 'Confirmed', 'Processing', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] },
      createdAt: { $gte: startDate, $lte: endDate },
      $or: [
        { deletedAt: null },
        { paymentStatus: 'Paid' },
        { status: 'Delivered' }
      ],
    };

    if (sourceParam === 'mother') {
      orderMatch.orderSource = { $ne: 'reseller_storefront' };
      orderMatch.systemNote = { $not: /^Reseller Order/ };
    } else if (sourceParam === 'reseller') {
      orderMatch.$or = [
        { orderSource: 'reseller_storefront' },
        { systemNote: /^Reseller Order/ }
      ];
    }

    await connectToDatabase();

    const [ordersAggregation, expensesAggregation] = await Promise.all([
      // Orders Aggregated by day (BST +06:00)
      Order.aggregate([
        {
          $match: orderMatch
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+06:00' } },
            totalSales: { $sum: '$totalAmount' },
            deliveryCost: { $sum: '$deliveryCharge' },
            resellerCommission: { $sum: { $ifNull: ['$resellerCommission', 0] } },
            cogs: {
              $sum: {
                $cond: [
                  { $regexMatch: { input: { $ifNull: ['$systemNote', ''] }, regex: /own product/i } },
                  0,
                  {
                    $sum: {
                      $map: {
                        input: '$items',
                        as: 'item',
                        in: { $multiply: ['$$item.quantity', { $ifNull: ['$$item.purchasePrice', 0] }] }
                      }
                    }
                  }
                ]
              }
            },
            orderCount: { $sum: 1 }
          }
        }
      ]),

      // Expenses Aggregated by day (BST +06:00) - Only Mother general operating expenses
      Expense.aggregate([
        {
          $match: {
            date: { $gte: startDate, $lte: endDate },
            type: { $ne: 'income' },
            category: { $ne: 'Courier & Shipping' }, // Exclude courier charge as it is already subtracted in Net Sales
            $or: [{ resellerId: null }, { resellerId: { $exists: false } }]
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
    let summaryCOGS = 0;
    let summaryResellerCommission = 0;
    let summarySalesProfit = 0;
    let summaryExpense = 0;
    let summaryNetProfit = 0;
    let summaryOrderCount = 0;

    // Loop descending from latest day down to 1
    for (let day = daysInMonth; day >= 1; day--) {
      const dayStr = day.toString().padStart(2, '0');
      const monthStr = month.toString().padStart(2, '0');
      const dateKey = `${year}-${monthStr}-${dayStr}`;
      const displayDate = `${dayStr}-${monthShort}-${year}`;

      const dateObj = new Date(`${dateKey}T00:00:00+06:00`);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

      const orderData = orderMap.get(dateKey) || { totalSales: 0, deliveryCost: 0, cogs: 0, resellerCommission: 0, orderCount: 0 };
      const expense = expenseMap.get(dateKey) || 0;

      const netSales = Math.max(0, orderData.totalSales - orderData.deliveryCost);
      const deliveryCost = orderData.deliveryCost || 0;
      const total = orderData.totalSales || 0;
      const cogs = orderData.cogs || 0;
      const resellerCommission = orderData.resellerCommission || 0;
      const salesProfit = Math.max(0, netSales - cogs - resellerCommission);
      const netProfit = salesProfit - expense;
      const orderCount = orderData.orderCount || 0;

      summaryNetSales += netSales;
      summaryDeliveryCost += deliveryCost;
      summaryTotal += total;
      summaryCOGS += cogs;
      summaryResellerCommission += resellerCommission;
      summarySalesProfit += salesProfit;
      summaryExpense += expense;
      summaryNetProfit += netProfit;
      summaryOrderCount += orderCount;

      dailyRows.push({
        date: displayDate,
        dateKey,
        day: dayStr,
        dayName,
        orders: orderCount,
        orderCount,
        netSales,
        deliveryCost,
        total,
        totalSales: total,
        cogs,
        productCost: cogs,
        resellerCommission,
        salesProfit,
        grossProfit: salesProfit,
        expense,
        netProfit
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
        totalCOGS: summaryCOGS,
        totalOrderCount: summaryOrderCount,
        totalResellerCommission: summaryResellerCommission,
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

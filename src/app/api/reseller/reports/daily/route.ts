import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizedReseller } from '@/lib/resellerReportsHelper';
import ResellerOrder from '@/models/ResellerOrder';
import Expense from '@/models/Expense';

export async function GET(req: NextRequest) {
  try {
    const { error, status, reseller } = await getAuthorizedReseller();
    if (error || !reseller) {
      return NextResponse.json({ message: error || 'Unauthorized' }, { status: status || 401 });
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

    // Start & End dates in BST +06:00
    const startDate = new Date(`${year}-${month.toString().padStart(2, '0')}-01T00:00:00+06:00`);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDate = new Date(new Date(`${nextYear}-${nextMonth.toString().padStart(2, '0')}-01T00:00:00+06:00`).getTime() - 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    const [ordersAggregation, expensesAggregation] = await Promise.all([
      // Reseller orders aggregate by day
      ResellerOrder.aggregate([
        {
          $match: {
            resellerId: reseller._id,
            status: { $in: ['Paid', 'Confirmed', 'Processing', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] },
            createdAt: { $gte: startDate, $lte: endDate },
            $or: [
              { deletedAt: null },
              { commissionStatus: 'cleared' },
              { status: 'Delivered' }
            ]
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+06:00' } },
            totalSales: {
              $sum: {
                $cond: [
                  { $regexMatch: { input: { $ifNull: ['$shortId', ''] }, regex: /-F\d+$/ } },
                  { $ifNull: ['$resellerCommission', 0] },
                  { $ifNull: ['$totalAmount', 0] }
                ]
              }
            },
            deliveryCost: {
              $sum: {
                $cond: [
                  { $regexMatch: { input: { $ifNull: ['$shortId', ''] }, regex: /-F\d+$/ } },
                  0,
                  { $ifNull: ['$deliveryCharge', 0] }
                ]
              }
            },
            cogs: {
              $sum: {
                $cond: [
                  { $regexMatch: { input: { $ifNull: ['$shortId', ''] }, regex: /-F\d+$/ } },
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
            resellerCommission: { $sum: '$resellerCommission' },
            orderCount: { $sum: 1 }
          }
        }
      ]),

      // Reseller expenses aggregate by day
      Expense.aggregate([
        {
          $match: {
            resellerId: reseller._id,
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

    const days = [];
    let summaryNetSales = 0;
    let summaryDeliveryCost = 0;
    let summaryTotal = 0;
    let summaryCOGS = 0;
    let summaryGrossProfit = 0;
    let summaryExpense = 0;
    let summaryNetProfit = 0;
    let summaryOrderCount = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = d.toString().padStart(2, '0');
      const dateKey = `${year}-${month.toString().padStart(2, '0')}-${dayStr}`;

      const dateObj = new Date(`${dateKey}T00:00:00+06:00`);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

      const orderData = orderMap.get(dateKey) || { totalSales: 0, deliveryCost: 0, cogs: 0, resellerCommission: 0, orderCount: 0 };
      const expense = expenseMap.get(dateKey) || 0;

      const totalSales = orderData.totalSales;
      const deliveryCost = orderData.deliveryCost;
      const netSales = Math.max(0, totalSales - deliveryCost);
      const cogs = orderData.cogs;
      // Reseller Gross Profit = resellerCommission (or netSales - cogs if commission wasn't set)
      const grossProfit = orderData.resellerCommission > 0 ? orderData.resellerCommission : Math.max(0, netSales - cogs);
      const netProfit = grossProfit - expense;

      summaryNetSales += netSales;
      summaryDeliveryCost += deliveryCost;
      summaryTotal += totalSales;
      summaryCOGS += cogs;
      summaryGrossProfit += grossProfit;
      summaryExpense += expense;
      summaryNetProfit += netProfit;
      summaryOrderCount += orderData.orderCount;

      days.push({
        date: dateKey,
        day: d,
        dayName,
        netSales,
        deliveryCost,
        totalSales,
        cogs,
        resellerCommission: grossProfit,
        grossProfit,
        expense,
        netProfit,
        orderCount: orderData.orderCount
      });
    }

    return NextResponse.json({
      year,
      month,
      monthName: monthNames[month - 1],
      daysInMonth,
      days,
      summary: {
        totalSales: summaryTotal,
        netSales: summaryNetSales,
        deliveryCost: summaryDeliveryCost,
        cogs: summaryCOGS,
        grossProfit: summaryGrossProfit,
        expense: summaryExpense,
        netProfit: summaryNetProfit,
        orderCount: summaryOrderCount
      }
    });
  } catch (error: any) {
    console.error('Failed to generate reseller daily report:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

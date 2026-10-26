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
    const year = parseInt(searchParams.get('year') || now.getFullYear().toString(), 10);

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ message: 'Invalid year parameter' }, { status: 400 });
    }

    const startDate = new Date(`${year}-01-01T00:00:00+06:00`);
    const endDate = new Date(`${year}-12-31T23:59:59.999+06:00`);

    const [ordersAggregation, expensesAggregation] = await Promise.all([
      // Reseller Orders grouped by month
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
            },
            resellerCommission: { $sum: '$resellerCommission' }
          }
        }
      ]),

      // Reseller Expenses grouped by month
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
    let summaryGrossProfit = 0;
    let summaryExpense = 0;
    let summaryNetProfit = 0;
    let summaryOrderCount = 0;

    for (let m = 1; m <= 12; m++) {
      const monthStr = m.toString().padStart(2, '0');
      const monthKey = `${year}-${monthStr}`;
      const monthName = monthNames[m - 1];

      const orderData = orderMap.get(monthKey) || { totalSales: 0, deliveryCost: 0, cogs: 0, resellerCommission: 0, orderCount: 0 };
      const expense = expenseMap.get(monthKey) || 0;

      const totalSales = orderData.totalSales;
      const deliveryCost = orderData.deliveryCost;
      const netSales = Math.max(0, totalSales - deliveryCost);
      const grossProfit = orderData.resellerCommission > 0 ? orderData.resellerCommission : Math.max(0, netSales - orderData.cogs);
      const netProfit = grossProfit - expense;

      summaryNetSales += netSales;
      summaryDeliveryCost += deliveryCost;
      summaryTotal += totalSales;
      summaryGrossProfit += grossProfit;
      summaryExpense += expense;
      summaryNetProfit += netProfit;
      summaryOrderCount += orderData.orderCount;

      monthlyRows.push({
        monthNumber: m,
        monthName,
        netSales,
        deliveryCost,
        totalSales,
        grossProfit,
        resellerCommission: grossProfit,
        expense,
        netProfit,
        orderCount: orderData.orderCount
      });
    }

    return NextResponse.json({
      year,
      monthlyRows,
      summary: {
        totalSales: summaryTotal,
        netSales: summaryNetSales,
        deliveryCost: summaryDeliveryCost,
        grossProfit: summaryGrossProfit,
        expense: summaryExpense,
        netProfit: summaryNetProfit,
        orderCount: summaryOrderCount
      }
    });
  } catch (error: any) {
    console.error('Failed to generate reseller monthly report:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

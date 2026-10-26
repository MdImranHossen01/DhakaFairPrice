import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import ResellerOrder from '@/models/ResellerOrder';
import ResellerWalletTransaction from '@/models/ResellerWalletTransaction';
import Product from '@/models/Product';
import ResellerProduct from '@/models/ResellerProduct';
import Expense from '@/models/Expense';
import LedgerAccount from '@/models/LedgerAccount';
import { seedResellerLedgerAccounts } from '@/lib/ledgerHelper';

// Comprehensive Reseller Dashboard Stats API
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const reseller = await Reseller.findOne({ userId: session.user.id }).lean();
    if (!reseller) return NextResponse.json({ error: 'Reseller not found' }, { status: 404 });

    const resellerId = (reseller as any)._id;
    await seedResellerLedgerAccounts(resellerId);

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Default range: Last 30 days
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 30);
    const defaultTo = new Date();

    let startDate = defaultFrom;
    if (from) {
      const parsedFrom = new Date(from);
      if (!isNaN(parsedFrom.getTime())) {
        startDate = new Date(Date.UTC(parsedFrom.getUTCFullYear(), parsedFrom.getUTCMonth(), parsedFrom.getUTCDate(), 0, 0, 0, 0));
      }
    } else {
      startDate = new Date(Date.UTC(defaultFrom.getUTCFullYear(), defaultFrom.getUTCMonth(), defaultFrom.getUTCDate(), 0, 0, 0, 0));
    }

    let endDate = defaultTo;
    if (to) {
      const parsedTo = new Date(to);
      if (!isNaN(parsedTo.getTime())) {
        endDate = new Date(Date.UTC(parsedTo.getUTCFullYear(), parsedTo.getUTCMonth(), parsedTo.getUTCDate(), 23, 59, 59, 999));
      }
    } else {
      endDate = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate(), 23, 59, 59, 999));
    }

    // Previous Period for dynamic % growth
    const periodDuration = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - periodDuration);
    const prevEndDate = new Date(startDate.getTime() - 1);

    const [
      currentPeriodAgg,
      prevPeriodAgg,
      dailyChartAgg,
      dailyExpensesAgg,
      currentExpensesAgg,
      prevExpensesAgg,
      statusCountsAgg,
      walletTxAgg,
      catalogCount,
      lowStockCount,
      outOfStockCount,
      recentOrders,
      recentTransactions,
      ledgerAccounts,
    ] = await Promise.all([
      // 1. Current Period Revenue & Commission
      ResellerOrder.aggregate([
        {
          $match: {
            resellerId,
            createdAt: { $gte: startDate, $lte: endDate },
            $or: [
              { deletedAt: null },
              { commissionStatus: 'cleared' },
              { status: 'Delivered' }
            ]
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: {
                $cond: [{ $ne: ['$status', 'Cancelled'] }, '$totalAmount', 0],
              },
            },
            totalCommission: {
              $sum: {
                $cond: [{ $ne: ['$status', 'Cancelled'] }, '$resellerCommission', 0],
              },
            },
            totalOrders: { $sum: 1 },
            activeOrdersCount: {
              $sum: {
                $cond: [{ $ne: ['$status', 'Cancelled'] }, 1, 0],
              },
            },
          },
        },
      ]),

      // 2. Previous Period Revenue & Commission (for comparison)
      ResellerOrder.aggregate([
        {
          $match: {
            resellerId,
            createdAt: { $gte: prevStartDate, $lte: prevEndDate },
            $or: [
              { deletedAt: null },
              { commissionStatus: 'cleared' },
              { status: 'Delivered' }
            ]
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: {
                $cond: [{ $ne: ['$status', 'Cancelled'] }, '$totalAmount', 0],
              },
            },
            totalCommission: {
              $sum: {
                $cond: [{ $ne: ['$status', 'Cancelled'] }, '$resellerCommission', 0],
              },
            },
            totalOrders: { $sum: 1 },
          },
        },
      ]),

      // 3. Daily chart points
      ResellerOrder.aggregate([
        {
          $match: {
            resellerId,
            createdAt: { $gte: startDate, $lte: endDate },
            $or: [
              { deletedAt: null },
              { commissionStatus: 'cleared' },
              { status: 'Delivered' }
            ]
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            revenue: {
              $sum: {
                $cond: [{ $ne: ['$status', 'Cancelled'] }, '$totalAmount', 0],
              },
            },
            commission: {
              $sum: {
                $cond: [{ $ne: ['$status', 'Cancelled'] }, '$resellerCommission', 0],
              },
            },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // 3b. Daily expenses aggregate
      Expense.aggregate([
        {
          $match: {
            resellerId,
            date: { $gte: startDate, $lte: endDate },
            type: { $ne: 'income' },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$date' },
            },
            expense: { $sum: '$amount' },
          },
        },
      ]),

      // 3c. Current Period Total Expenses
      Expense.aggregate([
        {
          $match: {
            resellerId,
            date: { $gte: startDate, $lte: endDate },
            type: { $ne: 'income' },
          },
        },
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: '$amount' },
          },
        },
      ]),

      // 3d. Previous Period Total Expenses (for growth)
      Expense.aggregate([
        {
          $match: {
            resellerId,
            date: { $gte: prevStartDate, $lte: prevEndDate },
            type: { $ne: 'income' },
          },
        },
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: '$amount' },
          },
        },
      ]),

      // 4. Order status breakdown
      ResellerOrder.aggregate([
        {
          $match: {
            resellerId,
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            amount: { $sum: '$totalAmount' },
          },
        },
      ]),

      // 5. Wallet Payouts & Transaction aggregates
      ResellerWalletTransaction.aggregate([
        { $match: { resellerId } },
        {
          $group: {
            _id: '$type',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),

      // 6. Products in catalog (either ResellerProduct or Product uploaded by reseller)
      Promise.all([
        ResellerProduct.countDocuments({ resellerId }),
        Product.countDocuments({ uploadedBy: resellerId }),
      ]).then(([rc, uc]) => Math.max(rc, uc)),

      // 7. Low stock items (stock > 0 and stock <= 5)
      Promise.all([
        ResellerProduct.countDocuments({ resellerId, stock: { $gt: 0, $lte: 5 } }),
        Product.countDocuments({ uploadedBy: resellerId, stock: { $gt: 0, $lte: 5 } }),
      ]).then(([rc, uc]) => Math.max(rc, uc)),

      // 8. Out of stock items (stock <= 0)
      Promise.all([
        ResellerProduct.countDocuments({ resellerId, stock: { $lte: 0 } }),
        Product.countDocuments({ uploadedBy: resellerId, stock: { $lte: 0 } }),
      ]).then(([rc, uc]) => Math.max(rc, uc)),

      // 9. Recent orders
      ResellerOrder.find({ resellerId }).sort({ createdAt: -1 }).limit(6).lean(),

      // 10. Recent transactions
      ResellerWalletTransaction.find({ resellerId }).sort({ createdAt: -1 }).limit(5).lean(),

      // 11. Ledger Accounts (Cash, Bank, MFS)
      LedgerAccount.find({ resellerId }).lean(),
    ]);

    const cur = currentPeriodAgg[0] || { totalRevenue: 0, totalCommission: 0, totalOrders: 0, activeOrdersCount: 0 };
    const prev = prevPeriodAgg[0] || { totalRevenue: 0, totalCommission: 0, totalOrders: 0 };

    // Process Ledger Balances
    let cashBalance = 0;
    let bankBalance = 0;
    let mfsBalance = 0;
    let cashAccountsCount = 0;
    let bankAccountsCount = 0;
    let mfsAccountsCount = 0;

    ((ledgerAccounts || []) as any[]).forEach((acc: any) => {
      if (['AR', 'AP'].includes(acc.code)) return;

      if (acc.code === 'CASH' || acc.category === 'Cash') {
        cashBalance += acc.currentBalance || 0;
        cashAccountsCount += 1;
      } else if (acc.category === 'MFS') {
        mfsBalance += acc.currentBalance || 0;
        mfsAccountsCount += 1;
      } else if (acc.code === 'BANK' || acc.category === 'Bank') {
        bankBalance += acc.currentBalance || 0;
        bankAccountsCount += 1;
      }
    });

    const totalLiquidBalance = cashBalance + bankBalance + mfsBalance;

    // Growth calculations
    const revenueGrowth = prev.totalRevenue > 0
      ? Math.round(((cur.totalRevenue - prev.totalRevenue) / prev.totalRevenue) * 100)
      : (cur.totalRevenue > 0 ? 100 : 0);

    const earningsGrowth = prev.totalCommission > 0
      ? Math.round(((cur.totalCommission - prev.totalCommission) / prev.totalCommission) * 100)
      : (cur.totalCommission > 0 ? 100 : 0);

    const ordersGrowth = prev.totalOrders > 0
      ? Math.round(((cur.totalOrders - prev.totalOrders) / prev.totalOrders) * 100)
      : (cur.totalOrders > 0 ? 100 : 0);

    // Status map
    const statusMap = new Map<string, number>();
    for (const item of statusCountsAgg) {
      statusMap.set(item._id, item.count);
    }

    const pendingOrdersCount = (statusMap.get('Order Placed') || 0) + (statusMap.get('Hold') || 0);
    const processingOrdersCount =
      (statusMap.get('Confirmed') || 0) +
      (statusMap.get('Processing') || 0) +
      (statusMap.get('Ready for Delivery') || 0) +
      (statusMap.get('Released for Delivery') || 0);
    const deliveredOrdersCount = (statusMap.get('Delivered') || 0) + (statusMap.get('Paid') || 0);
    const cancelledOrdersCount = statusMap.get('Cancelled') || 0;

    // Completed payouts
    let totalWithdrawn = 0;
    for (const tx of walletTxAgg) {
      if (tx._id === 'payout_released') {
        totalWithdrawn += Math.abs(tx.totalAmount || 0);
      }
    }

    const averageOrderValue = cur.activeOrdersCount > 0 ? Math.round(cur.totalRevenue / cur.activeOrdersCount) : 0;
    const deliverySuccessRate = (deliveredOrdersCount + cancelledOrdersCount) > 0
      ? Math.round((deliveredOrdersCount / (deliveredOrdersCount + cancelledOrdersCount)) * 100)
      : 100;

    const totalExpenses = currentExpensesAgg[0]?.totalExpenses || 0;
    const prevTotalExpenses = prevExpensesAgg[0]?.totalExpenses || 0;
    const expenseGrowth = prevTotalExpenses > 0
      ? Math.round(((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100)
      : (totalExpenses > 0 ? 100 : 0);

    // Merge orders and expenses into continuous chartData
    const chartDateMap = new Map<string, any>();

    dailyChartAgg.forEach((d: any) => {
      chartDateMap.set(d._id, {
        date: d._id,
        revenue: d.revenue || 0,
        commission: d.commission || 0,
        orders: d.orders || 0,
        expense: 0,
        netProfit: d.commission || 0,
      });
    });

    dailyExpensesAgg.forEach((item: any) => {
      const dateKey = item._id;
      const expenseAmount = item.expense || 0;
      const existing = chartDateMap.get(dateKey);
      if (existing) {
        existing.expense = expenseAmount;
        existing.netProfit = (existing.commission || 0) - expenseAmount;
      } else {
        chartDateMap.set(dateKey, {
          date: dateKey,
          revenue: 0,
          commission: 0,
          orders: 0,
          expense: expenseAmount,
          netProfit: -expenseAmount,
        });
      }
    });

    const chartData = Array.from(chartDateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      reseller,
      stats: {
        totalRevenue: cur.totalRevenue || 0,
        totalEarnings: cur.totalCommission || 0,
        totalExpenses,
        netProfit: (cur.totalCommission || 0) - totalExpenses,
        totalOrders: cur.totalOrders || 0,
        pendingOrdersCount,
        processingOrdersCount,
        deliveredOrdersCount,
        cancelledOrdersCount,
        averageOrderValue,
        deliverySuccessRate,
        cashBalance,
        bankBalance,
        mfsBalance,
        totalLiquidBalance,
        cashAccountsCount,
        bankAccountsCount,
        mfsAccountsCount,
        growth: {
          revenue: revenueGrowth,
          earnings: earningsGrowth,
          expense: expenseGrowth,
          orders: ordersGrowth,
        },
      },
      breakdown: {
        liquidAccounts: {
          cash: cashBalance,
          bank: bankBalance,
          mfs: mfsBalance,
          total: totalLiquidBalance,
        },
        earnings: {
          walletBalance: reseller.walletBalance || 0,
          pendingBalance: reseller.pendingBalance || 0,
          totalWithdrawn,
        },
        orderStatus: {
          pending: pendingOrdersCount,
          processing: processingOrdersCount,
          delivered: deliveredOrdersCount,
          cancelled: cancelledOrdersCount,
        },
      },
      catalogStats: {
        totalProducts: catalogCount,
        lowStockCount,
        outOfStockCount,
      },
      chartData,
      recentOrders,
      recentTransactions,
    });
  } catch (error: any) {
    console.error('Error fetching reseller dashboard stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

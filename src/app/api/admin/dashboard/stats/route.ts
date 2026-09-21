import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import User from '@/models/User';
import Product from '@/models/Product';
import Expense from '@/models/Expense';
import Reseller from '@/models/Reseller';
import LedgerAccount from '@/models/LedgerAccount';
import Bill from '@/models/Bill';
import Subscriber from '@/models/Subscriber';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
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
        startDate = new Date(Date.UTC(parsedFrom.getUTCFullYear(), parsedFrom.getUTCMonth(), parsedFrom.getUTCDate()));
      }
    } else {
      startDate = new Date(Date.UTC(defaultFrom.getUTCFullYear(), defaultFrom.getUTCMonth(), defaultFrom.getUTCDate()));
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

    await connectToDatabase();

    // 7 Days Range Calculation for 7-day Matrix
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Concurrently fetch all metrics using Promise.all
    const [
      revenueStats,
      expenseStats,
      orderStatusStats,
      totalUsersCount,
      activeResellersCount,
      pendingResellersCount,
      subscribersCount,
      stockValueStats,
      lowStockProducts,
      ledgerAccounts,
      resellerWallets,
      dueBillsStats,
      chartData,
      sevenDaysOrders,
      sevenDaysExpenses
    ] = await Promise.all([
      // 1. Revenue, COGS, Delivery charge stats
      Order.aggregate([
        { 
          $match: { 
            status: { $in: ['Paid', 'Confirmed', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] },
            createdAt: { $gte: startDate, $lte: endDate },
            deletedAt: null
          } 
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            totalDeliveryCharge: { $sum: '$deliveryCharge' },
            salesCount: { $sum: 1 },
            paidRevenue: {
              $sum: {
                $cond: [{ $in: ['$status', ['Paid', 'Delivered']] }, '$totalAmount', 0]
              }
            },
            totalCOGS: { 
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

      // 2. Expenses breakdown by category
      Expense.aggregate([
        { 
          $match: { 
            date: { $gte: startDate, $lte: endDate },
            type: { $ne: 'income' }
          } 
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' }
          }
        }
      ]),

      // 3. Order counts grouped by workflow status
      Order.aggregate([
        { $match: { deletedAt: null } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' }
          }
        }
      ]),

      // 4. Total registered customers
      User.countDocuments({ role: 'user' }),

      // 5. Active Resellers
      Reseller.countDocuments({ status: 'active' }),

      // 5b. Pending Resellers awaiting approval
      Reseller.countDocuments({ status: 'pending' }),

      // 6. Subscribers
      Subscriber.countDocuments({ isActive: true }).catch(() => 0),

      // 7. Total Stock & Stock Purchase Value
      Product.aggregate([
        { $match: { isPublished: true } },
        {
          $group: {
            _id: null,
            totalStockQuantity: { $sum: '$stock' },
            totalStockValue: {
              $sum: { $multiply: ['$stock', { $ifNull: ['$purchasePrice', { $multiply: ['$price', 0.7] }] }] }
            },
            totalProductsCount: { $sum: 1 }
          }
        }
      ]),

      // 8. Low Stock alerts (stock < 5)
      Product.find({ stock: { $lt: 5 }, isPublished: true })
        .select('name stock price images slug')
        .limit(6)
        .lean(),

      // 9. Ledger Accounts (CASH & BANK)
      LedgerAccount.find({}).lean().catch(() => []),

      // 10. Reseller Wallets Total
      Reseller.aggregate([
        {
          $group: {
            _id: null,
            totalWalletBalance: { $sum: '$walletBalance' },
            totalPendingBalance: { $sum: '$pendingBalance' }
          }
        }
      ]),

      // 11. Due Bills (Receivables from B2B / Wholesale bills)
      Bill.aggregate([
        { $match: { status: 'Due' } },
        {
          $group: {
            _id: null,
            totalDueBills: { $sum: '$currentBillDue' },
            count: { $sum: 1 }
          }
        }
      ]).catch(() => []),

      // 12. Chart Data (Daily aggregation for Range)
      Order.aggregate([
        {
          $match: {
            status: { $in: ['Paid', 'Confirmed', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] },
            createdAt: { $gte: startDate, $lte: endDate },
            deletedAt: null
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
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
            deliveryCharge: { $sum: '$deliveryCharge' }
          }
        },
        {
          $project: {
            _id: 0,
            date: '$_id',
            revenue: 1,
            orders: 1,
            cogs: 1,
            profit: { $subtract: [{ $subtract: ['$revenue', '$cogs'] }, '$deliveryCharge'] }
          }
        },
        { $sort: { date: 1 } }
      ]),

      // 13. Last 7 Days Orders for Performance Matrix
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: sevenDaysAgo },
            deletedAt: null
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            sales: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
            deliveredSales: {
              $sum: {
                $cond: [{ $in: ['$status', ['Paid', 'Delivered']] }, '$totalAmount', 0]
              }
            }
          }
        }
      ]),

      // 14. Last 7 Days Expenses for Performance Matrix
      Expense.aggregate([
        {
          $match: {
            date: { $gte: sevenDaysAgo },
            type: { $ne: 'income' }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$date' }
            },
            expense: { $sum: '$amount' }
          }
        }
      ])
    ]);

    // Process Revenue Stats
    const {
      totalRevenue = 0,
      totalDeliveryCharge = 0,
      salesCount = 0,
      paidRevenue = 0,
      totalCOGS = 0
    } = revenueStats[0] || {};

    // Process Expense Stats
    let totalExpenses = 0;
    const expenseCategories: Record<string, number> = {};
    expenseStats.forEach((e: any) => {
      totalExpenses += e.total || 0;
      expenseCategories[e._id || 'Others'] = e.total || 0;
    });

    const grossProfit = totalRevenue - totalCOGS - totalDeliveryCharge;
    const netProfit = grossProfit - totalExpenses;

    // Process Order Workflow Status
    const statusMap: Record<string, { count: number; total: number }> = {};
    orderStatusStats.forEach((st: any) => {
      statusMap[st._id] = { count: st.count, total: st.totalAmount };
    });

    const pendingOrdersCount = statusMap['Order Placed']?.count || 0;
    const pendingOrdersAmount = statusMap['Order Placed']?.total || 0;
    const processingOrdersCount = (statusMap['Confirmed']?.count || 0) + (statusMap['Ready for Delivery']?.count || 0) + (statusMap['Released for Delivery']?.count || 0);
    const deliveredOrdersCount = statusMap['Delivered']?.count || 0;
    const cancelledOrdersCount = statusMap['Cancelled']?.count || 0;

    // Process Stock Value Stats
    const stockStats = stockValueStats[0] || { totalStockQuantity: 0, totalStockValue: 0, totalProductsCount: 0 };

    // Process Ledger Balances
    let cashBalance = 0;
    let bankBalance = 0;
    let cashAccountsCount = 0;
    const bankAccountsList: any[] = [];
    (ledgerAccounts as any[]).forEach((acc: any) => {
      if (acc.code === 'CASH' || acc.category === 'Cash') {
        cashBalance += acc.currentBalance || 0;
        cashAccountsCount += 1;
      } else if (acc.code === 'BANK' || acc.category === 'Bank' || acc.category === 'MFS') {
        bankBalance += acc.currentBalance || 0;
        bankAccountsList.push({ name: acc.name, balance: acc.currentBalance || 0 });
      }
    });

    // Process Reseller Balances
    const resellerWalletTotal = resellerWallets[0]?.totalWalletBalance || 0;
    const resellerPendingTotal = resellerWallets[0]?.totalPendingBalance || 0;

    // Process Receivables (Bills due + Uncollected order values)
    const billDueTotal = dueBillsStats[0]?.totalDueBills || 0;
    const pendingOrderReceivable = Math.max(0, totalRevenue - paidRevenue);
    const totalReceivable = billDueTotal + pendingOrderReceivable;

    // Total Assets Calculation
    const totalLiquidBalance = cashBalance + bankBalance;
    const totalAssetValue = stockStats.totalStockValue + totalReceivable + totalLiquidBalance;

    // Merge Expenses with Daily Chart Data
    const expensesMap = new Map();
    const allExpensesInRange = await Expense.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          type: { $ne: 'income' }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          expense: { $sum: '$amount' }
        }
      }
    ]);
    allExpensesInRange.forEach(item => {
      expensesMap.set(item._id, item.expense);
    });

    const completeChartData = chartData.map((d: any) => {
      const exp = expensesMap.get(d.date) || 0;
      return {
        ...d,
        expense: exp,
        netIncome: (d.profit || 0) - exp
      };
    });

    // Build 7-Day Performance Matrix Table
    const last7DaysMap = new Map();
    sevenDaysOrders.forEach((o: any) => {
      last7DaysMap.set(o._id, {
        sales: o.sales || 0,
        orders: o.orders || 0,
        collected: o.deliveredSales || 0,
        expense: 0
      });
    });

    sevenDaysExpenses.forEach((e: any) => {
      const existing = last7DaysMap.get(e._id) || { sales: 0, orders: 0, collected: 0, expense: 0 };
      existing.expense = e.expense || 0;
      last7DaysMap.set(e._id, existing);
    });

    const last7DaysList = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const dDay = d.getDate().toString().padStart(2, '0');
      const dMonth = d.toLocaleString('en-US', { month: 'short' });
      const dYear = d.getFullYear();

      const dayData = last7DaysMap.get(dateKey) || { sales: 0, orders: 0, collected: 0, expense: 0 };
      last7DaysList.push({
        date: dateKey,
        displayDate: `${dDay} ${dMonth}, ${dYear}`,
        sales: dayData.sales,
        orders: dayData.orders,
        collected: dayData.collected,
        expense: dayData.expense,
        net: dayData.sales - dayData.expense
      });
    }

    return NextResponse.json({
      stats: {
        totalRevenue,
        paidRevenue,
        totalDeliveryCharge,
        salesCount,
        totalCOGS,
        totalExpenses,
        expenseCategories,
        grossProfit,
        netProfit,
        totalCustomers: totalUsersCount,
        activeResellers: activeResellersCount,
        pendingResellers: pendingResellersCount,
        subscribersCount,
        pendingOrdersCount,
        pendingOrdersAmount,
        processingOrdersCount,
        deliveredOrdersCount,
        cancelledOrdersCount,
        totalStockQuantity: stockStats.totalStockQuantity,
        totalStockValue: stockStats.totalStockValue,
        totalProductsCount: stockStats.totalProductsCount,
        cashBalance,
        bankBalance,
        cashAccountsCount,
        bankAccountsList,
        resellerWalletTotal,
        resellerPendingTotal,
        billDueTotal,
        totalReceivable,
        totalAssetValue
      },
      lowStockProducts,
      chartData: completeChartData,
      last7DaysStats: last7DaysList
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

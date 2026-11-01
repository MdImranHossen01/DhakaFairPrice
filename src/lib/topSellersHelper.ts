import ResellerOrder from '@/models/ResellerOrder';
import Reseller from '@/models/Reseller';

export interface TopSellerItem {
  rank: number;
  _id: string;
  storeName: string;
  subdomain: string;
  ownerName?: string;
  ownerPhone?: string;
  logoUrl?: string;
  totalOrders: number;
  deliveredOrders: number;
  totalSales: number;
  totalCommission: number;
  isCurrent?: boolean;
}

export async function getTopSellers(
  startDate?: Date,
  endDate?: Date,
  currentResellerId?: string
): Promise<TopSellerItem[]> {
  try {
    const matchFilter: any = {
      $or: [
        { deletedAt: null },
        { commissionStatus: 'cleared' },
        { status: 'Delivered' }
      ]
    };
    if (startDate && endDate) {
      matchFilter.createdAt = { $gte: startDate, $lte: endDate };
    }

    // 1. Group orders by resellerId within date range
    let topSellersAgg = await ResellerOrder.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$resellerId',
          totalOrders: { $sum: 1 },
          totalSales: {
            $sum: { $cond: [{ $ne: ['$status', 'Cancelled'] }, '$totalAmount', 0] }
          },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] }
          },
          totalCommission: {
            $sum: { $cond: [{ $ne: ['$status', 'Cancelled'] }, { $ifNull: ['$resellerCommission', 0] }, 0] }
          }
        }
      },
      { $sort: { totalSales: -1, deliveredOrders: -1, totalOrders: -1 } },
      { $limit: 5 }
    ]);

    let topSellerResellerIds = topSellersAgg.map((item) => item._id).filter(Boolean);

    // 2. If fewer than 5 in date range, fill from all-time top sellers
    if (topSellersAgg.length < 5) {
      const fallbackAgg = await ResellerOrder.aggregate([
        {
          $match: {
            resellerId: { $nin: topSellerResellerIds },
            $or: [
              { deletedAt: null },
              { commissionStatus: 'cleared' },
              { status: 'Delivered' }
            ]
          }
        },
        {
          $group: {
            _id: '$resellerId',
            totalOrders: { $sum: 1 },
            totalSales: {
              $sum: { $cond: [{ $ne: ['$status', 'Cancelled'] }, '$totalAmount', 0] }
            },
            deliveredOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] }
            },
            totalCommission: {
              $sum: { $cond: [{ $ne: ['$status', 'Cancelled'] }, { $ifNull: ['$resellerCommission', 0] }, 0] }
            }
          }
        },
        { $sort: { totalSales: -1, deliveredOrders: -1, totalOrders: -1 } },
        { $limit: 5 - topSellersAgg.length }
      ]);

      topSellersAgg.push(...fallbackAgg);
      topSellerResellerIds = topSellersAgg.map((item) => item._id).filter(Boolean);
    }

    // 3. If still fewer than 5, fill from other active resellers
    if (topSellersAgg.length < 5) {
      const otherResellers = await Reseller.find({
        _id: { $nin: topSellerResellerIds },
        status: 'active'
      })
        .limit(5 - topSellersAgg.length)
        .lean();

      otherResellers.forEach((r: any) => {
        topSellersAgg.push({
          _id: r._id,
          totalOrders: 0,
          totalSales: 0,
          deliveredOrders: 0,
          totalCommission: 0
        });
      });
    }

    const allIds = topSellersAgg.map((t) => t._id).filter(Boolean);
    const resellerDocs = await Reseller.find({ _id: { $in: allIds } })
      .populate('userId', 'name phone')
      .lean();

    const resellerMap = new Map<string, any>();
    resellerDocs.forEach((r: any) => resellerMap.set(r._id.toString(), r));

    return topSellersAgg.map((item: any, idx: number) => {
      const r = resellerMap.get(item._id?.toString()) || {};
      const resellerIdStr = item._id?.toString() || '';
      return {
        rank: idx + 1,
        _id: resellerIdStr,
        storeName: r.storeName || 'Store',
        subdomain: r.subdomain || '',
        ownerName: r.userId?.name || 'Reseller',
        ownerPhone: r.userId?.phone || '',
        logoUrl: r.logoUrl || null,
        totalOrders: item.totalOrders || 0,
        deliveredOrders: item.deliveredOrders || 0,
        totalSales: item.totalSales || 0,
        totalCommission: item.totalCommission || 0,
        isCurrent: Boolean(currentResellerId && resellerIdStr === currentResellerId.toString())
      };
    });
  } catch (error) {
    console.error('Error in getTopSellers:', error);
    return [];
  }
}


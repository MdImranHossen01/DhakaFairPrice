import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import ResellerOrder from '@/models/ResellerOrder';
import Reseller from '@/models/Reseller';
import Order from '@/models/Order';
import Product from '@/models/Product';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ message: 'Order ID is required' }, { status: 400 });
    }

    await dbConnect();

    const reseller = await Reseller.findOne({ userId: session.user.id });
    if (!reseller) {
      return NextResponse.json({ message: 'Reseller not found' }, { status: 404 });
    }

    const order = await ResellerOrder.findOne({ _id: orderId, resellerId: reseller._id })
      .populate('resellerId', 'storeName subdomain customDomain contact pickupAddress logoUrl')
      .populate({
        path: 'motherOrderId',
        select: 'storefrontResellerId resellerId orderSource shortId systemNote totalAmount deliveryCharge courierCharge isFreeDelivery systemFee resellerCommission subtotal items',
        populate: [
          {
            path: 'storefrontResellerId',
            select: 'storeName subdomain customDomain contact pickupAddress logoUrl'
          },
          {
            path: 'resellerId',
            select: 'storeName subdomain customDomain contact pickupAddress logoUrl'
          }
        ]
      })
      .populate({
        path: 'items.productId',
        select: 'name uploadedBy isMotherProduct image retailPrice price',
        populate: {
          path: 'uploadedBy',
          select: 'storeName subdomain customDomain'
        }
      })
      .populate('items.resellerProductId')
      .lean();

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    const mId = (order as any).motherOrderId?._id || (order as any).motherOrderId;
    let siblingRos: any[] = [];
    if (mId) {
      siblingRos = await ResellerOrder.find({
        motherOrderId: mId,
        deletedAt: null
      })
      .select('motherOrderId shortId resellerId resellerCommission systemFee commissionStatus')
      .populate('resellerId', 'storeName subdomain')
      .lean();
    }

    const motherOrder = (order as any).motherOrderId;
    const storefrontRo = siblingRos.find((r: any) => !r.shortId?.includes('-F'))
      || ((order as any).shortId && !(order as any).shortId.includes('-F') ? order : null);

    const fulfillmentRos = siblingRos.filter((r: any) =>
      r.shortId?.includes('-F') || (storefrontRo && r._id.toString() !== storefrontRo._id.toString())
    );

    const isFreeDelivery = Boolean(motherOrder?.isFreeDelivery || (order as any).isFreeDelivery);
    const orderValue = Math.round(Number(motherOrder?.totalAmount) || Number((order as any).totalAmount) || 0);
    const deliveryCharge = Math.round(Number(motherOrder?.courierCharge || (order as any).courierCharge || motherOrder?.deliveryCharge || (order as any).deliveryCharge) || 0);
    let motherFee = Math.round(
      Number(motherOrder?.systemFee) ||
      Number((order as any).systemFee) ||
      siblingRos.reduce((sum: number, r: any) => sum + (Number(r.systemFee) || 0), 0) ||
      0
    );

    let supplierPart: { name: string; amount: number; isYou?: boolean; status?: string } | null = null;
    if (fulfillmentRos.length > 0) {
      const firstF = fulfillmentRos[0];
      const supName = (firstF.resellerId as any)?.storeName || 'Supplier';
      const totalSupAmount = fulfillmentRos.reduce((sum: number, f: any) => sum + (Number(f.resellerCommission) || 0), 0);
      const isYou = firstF.resellerId?._id?.toString() === reseller._id.toString() || firstF.resellerId?.toString() === reseller._id.toString();
      supplierPart = {
        name: supName,
        amount: Math.round(totalSupAmount),
        isYou,
        status: firstF.commissionStatus || 'pending'
      };
    }

    let sellerPart: { name: string; amount: number; isYou?: boolean; status?: string } | null = null;
    if (storefrontRo) {
      const sellerName = (storefrontRo.resellerId as any)?.storeName || 'Storefront Reseller';
      const isYou = storefrontRo.resellerId?._id?.toString() === reseller._id.toString() || storefrontRo.resellerId?.toString() === reseller._id.toString();
      sellerPart = {
        name: sellerName,
        amount: Math.round(Number(storefrontRo.resellerCommission) || 0),
        isYou,
        status: storefrontRo.commissionStatus || 'pending'
      };
    } else if (!(order as any).shortId?.includes('-F')) {
      sellerPart = {
        name: ((order as any).resellerId as any)?.storeName || 'Storefront Reseller',
        amount: Math.round(Number((order as any).resellerCommission) || 0),
        isYou: true,
        status: (order as any).commissionStatus || 'pending'
      };
    }

    const isOwnProductSale = !supplierPart && !!sellerPart && (motherFee > 0 || Number((order as any).systemFee) > 0);

    // Fallback calculation for historical orders where motherFee is 0
    if (motherFee === 0 && supplierPart && sellerPart && sellerPart.amount > 0) {
      const computedFee = Math.min(sellerPart.amount, Math.round(supplierPart.amount * 0.15));
      if (computedFee > 0) {
        motherFee = computedFee;
        sellerPart.amount = Math.max(0, sellerPart.amount - computedFee);
      }
    }

    const disbursement = {
      orderValue,
      deliveryCharge,
      courierCharge: deliveryCharge,
      isFreeDelivery,
      supplier: supplierPart,
      seller: sellerPart,
      isOwnProductSale,
      motherFee,
      motherProfit: 0, // Never leak platform internal margins to reseller
    };

    const finalDeliveryCharge = deliveryCharge;
    const finalOrderValue = orderValue;
    const finalSubtotal = Number(motherOrder?.subtotal) || Math.max(0, finalOrderValue - finalDeliveryCharge);

    let finalItems = (order as any).items || [];
    if (motherOrder?.items && Array.isArray(motherOrder.items) && motherOrder.items.length > 0) {
      finalItems = finalItems.map((it: any) => {
        const matchingMotherItem = motherOrder.items.find((mi: any) => {
          const miProdId = mi.product?._id?.toString() || mi.product?.toString();
          const itProdId = it.productId?._id?.toString() || it.productId?.toString();
          return miProdId && itProdId && miProdId === itProdId;
        });
        if (matchingMotherItem && matchingMotherItem.price) {
          return {
            ...it,
            retailPrice: matchingMotherItem.price,
          };
        }
        return it;
      });
    }

    // Determine the selling storefront store (White-label invoice branding)
    let sellingStoreInfo: any = null;
    const isFulfillment = Boolean((order as any).shortId?.includes('-F'));
    if (isFulfillment) {
      const sfReseller = (motherOrder as any)?.storefrontResellerId || (motherOrder as any)?.resellerId;
      if (sfReseller && sfReseller.storeName) {
        sellingStoreInfo = {
          storeName: sfReseller.storeName,
          domain: sfReseller.customDomain || (sfReseller.subdomain ? `${sfReseller.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dhakafairprice.com'}` : ''),
          email: sfReseller.contact?.email || '',
          phone: sfReseller.contact?.phone || sfReseller.pickupAddress?.phone || '',
          address: sfReseller.contact?.address || sfReseller.pickupAddress?.address || '',
          logoUrl: sfReseller.logoUrl || '',
          isReseller: true,
        };
      }
    } else {
      const myReseller = (order as any).resellerId;
      if (myReseller && myReseller.storeName) {
        sellingStoreInfo = {
          storeName: myReseller.storeName,
          domain: myReseller.customDomain || (myReseller.subdomain ? `${myReseller.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dhakafairprice.com'}` : ''),
          email: myReseller.contact?.email || '',
          phone: myReseller.contact?.phone || myReseller.pickupAddress?.phone || '',
          address: myReseller.contact?.address || myReseller.pickupAddress?.address || '',
          logoUrl: myReseller.logoUrl || '',
          isReseller: true,
        };
      }
    }

    return NextResponse.json({
      ...order,
      items: finalItems,
      subtotal: finalSubtotal,
      deliveryCharge: finalDeliveryCharge,
      totalAmount: finalOrderValue,
      disbursement,
      fullOrderValue: finalOrderValue,
      sellingStore: sellingStoreInfo,
    });
  } catch (error: any) {
    console.error('Error fetching reseller order:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'reseller') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ message: 'Order ID is required' }, { status: 400 });
    }

    await dbConnect();

    const reseller = await Reseller.findOne({ userId: session.user.id });
    if (!reseller) {
      return NextResponse.json({ message: 'Reseller not found' }, { status: 404 });
    }

    const body = await req.json();
    const { customer, internalNote, customerNote, status, paymentStatus, items, deliveryCharge } = body;

    const order = await ResellerOrder.findOne({ _id: orderId, resellerId: reseller._id });
    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    const allowedStatuses = ['Order Placed', 'Confirmed', 'Hold', 'Ready for Delivery', 'Released for Delivery', 'Cancelled'];

    // Update customer info if provided
    if (customer) {
      if (customer.name !== undefined) order.customer.name = customer.name;
      if (customer.phone !== undefined) order.customer.phone = customer.phone;
      if (customer.email !== undefined) order.customer.email = customer.email;
      if (customer.address) {
        order.customer.address = {
          street: customer.address.street !== undefined ? customer.address.street : order.customer.address?.street || '',
          city: customer.address.city !== undefined ? customer.address.city : order.customer.address?.city || '',
          division: customer.address.division !== undefined ? customer.address.division : order.customer.address?.division || '',
          zipCode: customer.address.zipCode !== undefined ? customer.address.zipCode : order.customer.address?.zipCode || '',
        };
      }
    }

    // Update items & financial recalculation if provided
    let finalValidatedItems: any[] | null = null;
    let targetSellerKey: string | null = null;

    if (items !== undefined && Array.isArray(items)) {
      if (items.length === 0) {
        return NextResponse.json({ message: 'Order must contain at least one item' }, { status: 400 });
      }

      const resellerFeeRate = reseller.systemFeePercent !== undefined 
        ? reseller.systemFeePercent 
        : (reseller.commissionRate ?? 15);
      let serverComputedSubtotal = 0;
      let totalCommission = 0;
      let totalOwnProductSystemFee = 0;
      const validatedList: any[] = [];

      for (const item of items) {
        const prodId = item.productId || item.product;
        const prod = await Product.findById(prodId);
        if (!prod) {
          return NextResponse.json({ message: `Product not found: ${item.name || prodId}` }, { status: 400 });
        }

        // Strict Seller Isolation Enforcement:
        // All items in an order must belong to the exact same vendor / pickup location.
        const itemSellerKey = prod.uploadedBy ? prod.uploadedBy.toString() : 'mother';
        if (targetSellerKey === null) {
          targetSellerKey = itemSellerKey;
        } else if (targetSellerKey !== itemSellerKey) {
          return NextResponse.json({
            message: 'All items in an order must be from the same seller / pickup location. Mixed seller orders are not supported.'
          }, { status: 400 });
        }

        const retailPrice = Number(item.retailPrice) !== undefined && !isNaN(Number(item.retailPrice))
          ? Number(item.retailPrice)
          : (Number(item.price) || prod.salePrice || prod.price || 0);
        const purchasePrice = Number(item.purchasePrice) !== undefined && !isNaN(Number(item.purchasePrice))
          ? Number(item.purchasePrice)
          : (prod.purchasePrice || prod.price || 0);
        const quantity = Math.max(1, Number(item.quantity) || 1);
        const itemSubtotal = retailPrice * quantity;

        const uploaderId = prod.uploadedBy ? prod.uploadedBy.toString() : null;
        const isOwnProduct = !!(uploaderId && uploaderId === reseller._id.toString());
        let itemCommission = 0;
        let itemSystemFee = 0;

        if (isOwnProduct) {
          // Reseller is selling their OWN uploaded product on their own storefront
          // Calculate platform system fee on the retail selling price to protect against base price manipulation
          itemSystemFee = Math.round(retailPrice * (resellerFeeRate / 100)) * quantity;
          totalOwnProductSystemFee += itemSystemFee;
          itemCommission = (retailPrice * quantity) - itemSystemFee;
        } else {
          itemCommission = (retailPrice - purchasePrice) * quantity;
        }

        serverComputedSubtotal += itemSubtotal;
        totalCommission += itemCommission;

        validatedList.push({
          resellerProductId: prod._id,
          productId: prod._id,
          name: item.name || prod.name,
          quantity,
          retailPrice,
          purchasePrice: isOwnProduct ? (Number(prod.purchasePrice) || 0) : purchasePrice,
          image: item.image || prod.images?.[0] || (prod as any).image || '',
          color: item.color || undefined,
          size: item.size || undefined,
          systemFee: itemSystemFee,
          uploaderId,
        });
      }

      finalValidatedItems = validatedList;

      const delCharge = deliveryCharge !== undefined ? Math.max(0, Number(deliveryCharge) || 0) : (order.deliveryCharge || 0);
      const discount = Number(order.couponDiscount) || 0;
      const finalTotal = Math.max(0, serverComputedSubtotal + delCharge - discount);
      const netCommission = Math.max(0, totalCommission - discount);

      order.items = finalValidatedItems as any;
      order.subtotal = serverComputedSubtotal;
      order.deliveryCharge = delCharge;
      order.totalAmount = finalTotal;
      order.resellerCommission = netCommission;
      order.systemFee = totalOwnProductSystemFee;
    } else if (deliveryCharge !== undefined) {
      const delCharge = Math.max(0, Number(deliveryCharge) || 0);
      const discount = Number(order.couponDiscount) || 0;
      order.deliveryCharge = delCharge;
      order.totalAmount = Math.max(0, (order.subtotal || 0) + delCharge - discount);
    }

    // Update status if provided
    if (status) {
      if (status === 'Paid') {
        return NextResponse.json({ message: 'Resellers cannot mark orders as Paid. Payment is verified and received by Admin.' }, { status: 400 });
      }
      if (!allowedStatuses.includes(status)) {
        return NextResponse.json({ message: `Invalid status: ${status}` }, { status: 400 });
      }
      if (status === 'Hold') {
        const finalNote = internalNote !== undefined ? internalNote : order.internalNote;
        if (!finalNote || !finalNote.trim()) {
          return NextResponse.json({ message: 'An internal note / reason is mandatory when setting order status to Hold' }, { status: 400 });
        }
      }
      if (status === 'Cancelled') {
        const finalNote = internalNote !== undefined ? internalNote : order.internalNote;
        if (!finalNote || !finalNote.trim()) {
          return NextResponse.json({ message: 'A cancellation reason is mandatory when setting order status to Cancelled' }, { status: 400 });
        }
      }
      order.status = status;
      if (status === 'Cancelled') {
        order.commissionStatus = 'cancelled';
      } else if (order.commissionStatus === 'cancelled') {
        order.commissionStatus = 'pending';
      }
    }

    // Update notes if provided
    if (internalNote !== undefined) order.internalNote = internalNote;
    if (customerNote !== undefined) order.customerNote = customerNote;

    await order.save();

    // Sync changes to Mother Order if exists
    if (order.motherOrderId) {
      const motherUpdate: any = {};
      if (customer) {
        motherUpdate['shippingAddress.fullName'] = order.customer.name;
        motherUpdate['shippingAddress.phone'] = order.customer.phone;
        if (order.customer.address) {
          motherUpdate['shippingAddress.street'] = order.customer.address.street;
          motherUpdate['shippingAddress.city'] = order.customer.address.city;
          motherUpdate['shippingAddress.state'] = order.customer.address.city;
          motherUpdate['shippingAddress.division'] = order.customer.address.division;
          motherUpdate['shippingAddress.zipCode'] = order.customer.address.zipCode || '0000';
        }
      }
      if (finalValidatedItems) {
        motherUpdate.items = finalValidatedItems.map(i => ({
          product: i.productId,
          name: i.name,
          quantity: i.quantity,
          price: i.retailPrice,
          purchasePrice: i.purchasePrice,
          image: i.image,
          color: i.color,
          size: i.size,
        }));
        motherUpdate.subtotal = order.subtotal;
        motherUpdate.deliveryCharge = order.deliveryCharge;
        motherUpdate.totalAmount = order.totalAmount;
        motherUpdate.resellerCommission = order.resellerCommission;
        motherUpdate.systemFee = order.systemFee;

        // Sync linked supplier fulfillment orders if any
        try {
          const fulfillmentOrders = await ResellerOrder.find({
            motherOrderId: order.motherOrderId,
            shortId: { $regex: /-F\d+$/ }
          });
          for (const fo of fulfillmentOrders) {
            const foUploaderId = fo.resellerId.toString();
            const foItems = finalValidatedItems
              .filter(vi => vi.uploaderId === foUploaderId)
              .map(vi => ({
                resellerProductId: vi.resellerProductId,
                productId: vi.productId,
                name: vi.name,
                quantity: vi.quantity,
                retailPrice: vi.purchasePrice,
                purchasePrice: vi.purchasePrice,
                image: vi.image,
                color: vi.color,
                size: vi.size,
              }));
            if (foItems.length > 0) {
              const uploaderCommission = foItems.reduce((sum: number, item: any) => sum + (Number(item.purchasePrice) || 0) * item.quantity, 0);
              fo.items = foItems;
              fo.subtotal = uploaderCommission;
              fo.totalAmount = uploaderCommission;
              fo.resellerCommission = uploaderCommission;
              await fo.save();
            }
          }
        } catch (fErr) {
          console.error('[Sync Fulfillment Orders Error]', fErr);
        }
      } else if (deliveryCharge !== undefined) {
        motherUpdate.deliveryCharge = order.deliveryCharge;
        motherUpdate.totalAmount = order.totalAmount;
      }
      if (customerNote !== undefined) motherUpdate.customerNote = customerNote;
      if (internalNote !== undefined) motherUpdate.internalNote = internalNote;
      else if (order.internalNote) motherUpdate.internalNote = order.internalNote;
      if (order.resellerId) motherUpdate.resellerId = order.resellerId;
      if (status) motherUpdate.status = status;
      if (paymentStatus) motherUpdate.paymentStatus = paymentStatus;
      
      const updatedMother = await Order.findByIdAndUpdate(order.motherOrderId, { $set: motherUpdate }, { new: true });

      // Handle product sales counting on Mother Order
      const targetStatus = status || updatedMother?.status || order.status;
      const targetPayment = paymentStatus || updatedMother?.paymentStatus || order.paymentStatus;
      const isSaleValid = (['Confirmed', 'Paid', 'Delivered'].includes(targetStatus) || targetPayment === 'Paid') && targetStatus !== 'Cancelled';

      if (isSaleValid && updatedMother && !updatedMother.isSalesCounted && updatedMother.status !== 'Cancelled') {
        try {
          const Product = (await import('@/models/Product')).default;
          for (const item of updatedMother.items) {
            await Product.updateOne(
              { _id: item.product },
              { $inc: { totalSales: item.quantity } }
            );
          }
          await Order.findByIdAndUpdate(order.motherOrderId, { isSalesCounted: true });
        } catch (salesErr) {
          console.error('[Reseller Order Sales Count Error]', salesErr);
        }
      }
      // Sync reseller commission, restore product stock and ledger if status is Cancelled
      if (status === 'Cancelled' || paymentStatus === 'Failed') {
        try {
          if (status === 'Cancelled' && order.motherOrderId) {
            const { restoreStockForOrder } = await import('@/lib/stockHelper');
            await restoreStockForOrder({
              orderId: order.motherOrderId,
            });
          }

          const { syncResellerCommissionForMotherOrder } = await import('@/lib/resellerCommissionSync');
          await syncResellerCommissionForMotherOrder({
            motherOrderId: order.motherOrderId,
            newStatus: status,
            newPaymentStatus: paymentStatus,
          });

          const { default: LedgerTransaction } = await import('@/models/LedgerTransaction');
          const { recalculateLedgerBalance } = await import('@/lib/ledgerHelper');
          const shortId = order.motherOrderId.toString().slice(-8).toUpperCase();
          await LedgerTransaction.deleteMany({ reference: `ORDER-${shortId}` });
          await recalculateLedgerBalance('CASH');
          await recalculateLedgerBalance('BANK');
        } catch (syncErr) {
          console.error('[Reseller Order Cancel Sync Error]', syncErr);
        }
      } else if (order.status === 'Cancelled' && status && status !== 'Cancelled') {
        try {
          if (order.motherOrderId) {
            const { reDeductStockForOrder } = await import('@/lib/stockHelper');
            await reDeductStockForOrder({
              orderId: order.motherOrderId,
            });
            if (isSaleValid && updatedMother) {
              const Product = (await import('@/models/Product')).default;
              for (const item of updatedMother.items) {
                await Product.updateOne(
                  { _id: item.product },
                  { $inc: { totalSales: item.quantity } }
                );
              }
              await Order.findByIdAndUpdate(order.motherOrderId, { isSalesCounted: true });
            }
          }
        } catch (reDeductErr) {
          console.error('[Reseller Order Stock Re-deduct Error]', reDeductErr);
        }
      }
    }

    return NextResponse.json({
      message: 'Order updated successfully',
      order
    });
  } catch (error: any) {
    console.error('Error updating reseller order:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json(
    { message: 'Order deletion is not allowed for resellers. Only Mother Shop Admin can delete orders.' },
    { status: 403 }
  );
}


import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * ResellerOrder: An order placed on a reseller's storefront.
 * It is linked to a Mother Order (created once the reseller's order is confirmed).
 * The order pipeline: Customer → Reseller Store → Mother Dashboard → Courier → Delivery
 */
export interface IResellerOrder extends Document {
  resellerId: mongoose.Types.ObjectId;
  motherOrderId?: mongoose.Types.ObjectId;   // Linked mother order (created after confirmation)
  customer: {
    name: string;
    phone: string;
    email?: string;
    address: {
      street: string;
      city: string;
      division?: string;
      zipCode?: string;
    };
  };
  items: {
    resellerProductId: mongoose.Types.ObjectId;
    productId: mongoose.Types.ObjectId;        // Mother product ID
    name: string;
    quantity: number;
    retailPrice: number;                       // What customer paid
    purchasePrice: number;                     // What reseller owes Mother
    image?: string;
    color?: string;
    size?: string;
  }[];
  subtotal: number;
  deliveryCharge: number;
  totalAmount: number;
  couponCode?: string;
  couponDiscount?: number;
  paymentMethod: string;
  paymentStatus: 'Pending' | 'Paid' | 'Failed';
  manualPaymentDetails?: {
    methodName?: string;
    senderNumber?: string;
    transactionId?: string;
  };
  status: 'Order Placed' | 'Confirmed' | 'Paid' | 'Hold' | 'Processing' | 'Ready for Delivery' | 'Released for Delivery' | 'Delivered' | 'Cancelled';
  // Financial settlement
  resellerCommission: number;                  // Amount earned by reseller on this order
  commissionStatus: 'pending' | 'cleared' | 'cancelled';
  // Shipping
  shippingDetails?: {
    courierName?: string;
    trackingId?: string;
    consignmentId?: string;
    trackingUrl?: string;
    courierStatus?: string;
  };
  internalNote?: string;
  customerNote?: string;
  systemNote?: string;
  shortId?: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ResellerOrderSchema: Schema<IResellerOrder> = new Schema(
  {
    resellerId: { type: Schema.Types.ObjectId, ref: 'Reseller', required: true },
    motherOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String },
      address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        division: { type: String },
        zipCode: { type: String },
      },
    },
    items: [
      {
        resellerProductId: { type: Schema.Types.ObjectId, ref: 'ResellerProduct', required: true },
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        retailPrice: { type: Number, required: true, min: 0 },
        purchasePrice: { type: Number, required: true, min: 0 },
        image: { type: String },
        color: { type: String },
        size: { type: String },
      },
    ],
    subtotal: { type: Number, required: true, min: 0 },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    couponCode: { type: String },
    couponDiscount: { type: Number, default: 0, min: 0 },
    paymentMethod: { type: String, required: true },
    paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed'], default: 'Pending' },
    manualPaymentDetails: {
      methodName: { type: String },
      senderNumber: { type: String },
      transactionId: { type: String },
    },
    status: {
      type: String,
      enum: ['Order Placed', 'Confirmed', 'Paid', 'Hold', 'Processing', 'Ready for Delivery', 'Released for Delivery', 'Delivered', 'Cancelled'],
      default: 'Order Placed',
    },
    resellerCommission: { type: Number, default: 0, min: 0 },
    commissionStatus: {
      type: String,
      enum: ['pending', 'cleared', 'cancelled'],
      default: 'pending',
    },
    shippingDetails: {
      courierName: { type: String },
      trackingId: { type: String },
      consignmentId: { type: String },
      trackingUrl: { type: String },
      courierStatus: { type: String },
    },
    internalNote: { type: String, default: '' },
    customerNote: { type: String, default: '' },
    systemNote: { type: String, default: '' },
    shortId: { type: String, unique: true, sparse: true, index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

ResellerOrderSchema.index({ resellerId: 1, createdAt: -1 });
ResellerOrderSchema.index({ status: 1 });
ResellerOrderSchema.index({ motherOrderId: 1 }, { sparse: true });

const ResellerOrder: Model<IResellerOrder> =
  mongoose.models.ResellerOrder ||
  mongoose.model<IResellerOrder>('ResellerOrder', ResellerOrderSchema);

export default ResellerOrder;

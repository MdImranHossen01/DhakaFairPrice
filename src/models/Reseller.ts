import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IReseller extends Document {
  userId: mongoose.Types.ObjectId;          // linked User account
  storeName: string;
  subdomain: string;                         // e.g. "bestshop" → bestshop.swapnobaz.com
  customDomain?: string;                     // e.g. "bestshop.com"
  logoUrl?: string;
  faviconUrl?: string;
  description?: string;
  marqueeText?: string;
  status: 'pending' | 'active' | 'suspended' | 'expired';
  commissionRate: number;                    // % profit share for reseller (e.g. 10 = 10%)
  walletBalance: number;                     // cleared wallet balance
  pendingBalance: number;                    // uncleared (in-transit) balance
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  pickupAddress?: {
    hubName?: string;
    contactPerson?: string;
    phone?: string;
    address?: string;
    division?: string;
    district?: string;
    thana?: string;
  };
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
    whatsapp?: string;
    linkedin?: string;
  };
  themeOverrides?: {
    theme?: string;
    primaryColor?: string;
    navbar?: string;
    footer?: string;
    hero?: string;
    productCard?: string;
  };
  seoConfig?: {
    metaTitle?: string;
    metaDescription?: string;
    // Meta (Facebook) Pixel
    metaPixelId?: string;
    facebookAccessToken?: string;
    facebookTestEventCode?: string;
    facebookDomainVerification?: string;
    // TikTok Pixel
    tiktokPixelId?: string;
    tiktokAccessToken?: string;
    // Google
    googleTagManagerId?: string;
    googleAnalyticsId?: string;
  };
  deliveryConfig?: {
    insideDhaka?: number;
    outsideDhaka?: number;
    freeDeliveryThreshold?: number;
  };
  paymentConfig?: {
    bkash?: { number: string; qrCode?: string; active: boolean };
    nagad?: { number: string; qrCode?: string; active: boolean };
    rocket?: { number: string; qrCode?: string; active: boolean };
    instructions?: string;
  };
  loyaltyConfig?: {
    isEnabled?: boolean;
    activationThreshold?: number;
    rewardPercentage?: number;
  };
  courierConfig?: {
    activeProvider?: string;
    steadfast?: { apiKey?: string; secretKey?: string };
    pathao?: { storeId?: string };
    redx?: { apiKey?: string };
    bdCourier?: { apiKey?: string };
  };
  totalOrders: number;
  totalRevenue: number;                      // gross revenue from their store
  totalEarnings: number;                     // total commissions earned (lifetime)
  approvedAt?: Date;
  suspendedAt?: Date;
  suspendReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ResellerSchema: Schema<IReseller> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    storeName: { type: String, required: true },
    subdomain: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9][a-z0-9-]{2,62}[a-z0-9]$/, 'Subdomain must be 4–64 lowercase letters, numbers, or hyphens'],
    },
    customDomain: { type: String, lowercase: true, trim: true },
    logoUrl: { type: String },
    faviconUrl: { type: String },
    description: { type: String },
    marqueeText: { type: String },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'expired'],
      default: 'pending',
    },
    commissionRate: { type: Number, default: 10, min: 0, max: 100 },
    walletBalance: { type: Number, default: 0, min: 0 },
    pendingBalance: { type: Number, default: 0, min: 0 },
    contact: { type: Object, default: {} },
    pickupAddress: {
      type: new Schema({
        hubName: { type: String, default: '' },
        contactPerson: { type: String, default: '' },
        phone: { type: String, default: '' },
        address: { type: String, default: '' },
        division: { type: String, default: '' },
        district: { type: String, default: '' },
        thana: { type: String, default: '' },
      }, { _id: false }),
      default: {},
    },
    socialLinks: { type: Object, default: {} },
    themeOverrides: { type: Object, default: {} },
    seoConfig: { type: Object, default: {} },
    deliveryConfig: {
      type: Object,
      default: { insideDhaka: 60, outsideDhaka: 120, freeDeliveryThreshold: 0 },
    },
    paymentConfig: { type: Object, default: {} },
    loyaltyConfig: {
      type: new Schema({
        isEnabled: { type: Boolean, default: false },
        activationThreshold: { type: Number, default: 5000, min: [0, 'Activation threshold cannot be negative'] },
        rewardPercentage: { type: Number, default: 5, min: [0, 'Reward percentage cannot be negative'], max: [100, 'Reward percentage cannot exceed 100'] },
      }, { _id: false }),
      default: { isEnabled: false, activationThreshold: 5000, rewardPercentage: 5 },
    },
    courierConfig: {
      type: new Schema({
        activeProvider: { type: String, enum: ['none', 'steadfast', 'pathao', 'redx', 'bdCourier'], default: 'none' },
        steadfast: {
          apiKey: { type: String, default: '' },
          secretKey: { type: String, default: '' },
        },
        pathao: {
          storeId: { type: String, default: '' },
        },
        redx: {
          apiKey: { type: String, default: '' },
        },
        bdCourier: {
          apiKey: { type: String, default: '' },
        },
      }, { _id: false }),
      default: { activeProvider: 'none', steadfast: {}, pathao: {}, redx: {}, bdCourier: {} },
    },
    totalOrders: { type: Number, default: 0, min: 0 },
    totalRevenue: { type: Number, default: 0, min: 0 },
    totalEarnings: { type: Number, default: 0, min: 0 },
    approvedAt: { type: Date },
    suspendedAt: { type: Date },
    suspendReason: { type: String },
  },
  { timestamps: true }
);

ResellerSchema.pre('findOneAndUpdate', function(this: any, next: any) {
  this.setOptions({ runValidators: true });
  if (typeof next === 'function') next();
});

ResellerSchema.pre('updateOne', function(this: any, next: any) {
  this.setOptions({ runValidators: true });
  if (typeof next === 'function') next();
});

ResellerSchema.index({ customDomain: 1 }, { sparse: true });
ResellerSchema.index({ status: 1 });

const Reseller: Model<IReseller> =
  mongoose.models.Reseller || mongoose.model<IReseller>('Reseller', ResellerSchema);

export default Reseller;

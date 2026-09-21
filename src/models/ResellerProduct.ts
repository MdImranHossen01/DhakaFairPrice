import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * ResellerProduct: Links a Mother product to a specific Reseller storefront.
 * Resellers select products from the Mother catalog and set their own retail price.
 * When the Mother product is updated, `syncedAt` and the snapshot fields are refreshed.
 */
export interface IResellerProduct extends Document {
  resellerId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;       // Mother catalog product
  retailPrice: number;                       // Reseller's selling price to their customers
  isPublished: boolean;                      // Reseller can hide products from their store
  // Snapshot fields (auto-synced from Mother)
  name: string;
  slug: string;
  images: string[];
  stock: number;
  purchasePrice: number;                     // Mother's price to reseller (cost price)
  motherPrice: number;                       // Original retail price on Mother site
  isAvailableOnMother: boolean;              // Goes false when Mother unpublishes the product
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ResellerProductSchema: Schema<IResellerProduct> = new Schema(
  {
    resellerId: { type: Schema.Types.ObjectId, ref: 'Reseller', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    retailPrice: { type: Number, required: true, min: 0 },
    isPublished: { type: Boolean, default: true },
    // Synced snapshot
    name: { type: String, required: true },
    slug: { type: String, required: true },
    images: [{ type: String }],
    stock: { type: Number, default: 0, min: 0 },
    purchasePrice: { type: Number, default: 0, min: 0 },
    motherPrice: { type: Number, default: 0, min: 0 },
    isAvailableOnMother: { type: Boolean, default: true },
    syncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Composite index: one product per reseller
ResellerProductSchema.index({ resellerId: 1, productId: 1 }, { unique: true });
ResellerProductSchema.index({ resellerId: 1, isPublished: 1 });
ResellerProductSchema.index({ productId: 1 }); // For bulk sync

const ResellerProduct: Model<IResellerProduct> =
  mongoose.models.ResellerProduct ||
  mongoose.model<IResellerProduct>('ResellerProduct', ResellerProductSchema);

export default ResellerProduct;

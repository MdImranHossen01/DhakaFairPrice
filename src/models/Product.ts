/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  price: number;
  salePrice?: number;
  purchasePrice?: number;
  resellerPrice?: number;
  discountRate?: number;
  sku: string;
  barcode?: string;
  stock: number;
  categories: mongoose.Types.ObjectId[];
  brand?: mongoose.Types.ObjectId;
  tags: string[];
  images: string[];
  batches?: {
    batchNumber: string;
    expiryDate?: Date;
    stock: number;
  }[];
  attributes: {
    key: string;
    value: string;
  }[];
  variants?: {
    _id?: any;
    color?: string;
    size?: string;
    price: number;
    salePrice?: number;
    purchasePrice?: number;
    resellerPrice?: number;
    discountRate?: number;
    stock: number;
    sku?: string;
    barcode?: string;
    image?: string;
    images?: string[];
    batches?: {
      batchNumber: string;
      expiryDate?: Date;
      stock: number;
    }[];
  }[];
  isFeatured: boolean;
  isNewArrival: boolean;
  isFlashSale: boolean;
  isPublished: boolean;
  ratings: number;
  numReviews: number;
  views: number;
  totalSales: number;
  embedding?: number[];
  uploadedBy?: mongoose.Types.ObjectId | null;
  isShared?: boolean;
  isMotherProduct?: boolean;
  isApprovedByAdmin?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  videoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema<IProduct> = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    price: { 
      type: Number, 
      min: [0, 'Price cannot be negative'] 
    },
    salePrice: { 
      type: Number,
      min: [0, 'Sale price cannot be negative'],
    },
    purchasePrice: { 
      type: Number,
      min: [0, 'Purchase price cannot be negative'],
    },
    resellerPrice: {
      type: Number,
      min: [0, 'Reseller price cannot be negative'],
    },
    discountRate: { type: Number },
    sku: { 
      type: String, 
      unique: true,
      sparse: true
    },
    barcode: {
      type: String,
      sparse: true,
      trim: true,
    },
    stock: { type: Number, required: true, default: 0, min: [0, 'Stock cannot be negative'] },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    brand: { type: Schema.Types.ObjectId, ref: 'Brand' },
    tags: [{ type: String }],
    images: [{ type: String }],
    batches: [
      {
        batchNumber: { type: String, required: true },
        expiryDate: { type: Date },
        stock: { type: Number, default: 0 },
      },
    ],
    attributes: [
      {
        key: { type: String },
        value: { type: String },
      },
    ],
    variants: [
      {
        color: { type: String },
        size: { type: String },
        price: { type: Number, required: true, min: [0, 'Price cannot be negative'] },
        salePrice: { type: Number, min: [0, 'Sale price cannot be negative'] },
        purchasePrice: { type: Number, min: [0, 'Purchase price cannot be negative'] },
        resellerPrice: { type: Number, min: [0, 'Reseller price cannot be negative'] },
        discountRate: { type: Number },
        stock: { type: Number, required: true, default: 0, min: [0, 'Stock cannot be negative'] },
        sku: { type: String },
        barcode: { type: String, trim: true },
        image: { type: String },
        images: [{ type: String }],
        batches: [
          {
            batchNumber: { type: String },
            expiryDate: { type: Date },
            stock: { type: Number, default: 0 },
          },
        ],
      },
    ],
    isFeatured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isFlashSale: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },
    ratings: { type: Number, default: 0, min: [0, 'Rating cannot be below 0'], max: [5, 'Rating cannot be above 5'] },
    numReviews: { type: Number, default: 0, min: [0, 'Number of reviews cannot be negative'] },
    views: { type: Number, default: 0, min: [0, 'Views cannot be negative'] },
    totalSales: { type: Number, default: 0, min: [0, 'Total sales cannot be negative'] },
    embedding: { type: [Number] },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'Reseller', default: null },
    isShared: { type: Boolean, default: false },
    isMotherProduct: { type: Boolean, default: false },
    isApprovedByAdmin: { type: Boolean, default: false },
    metaTitle: { type: String, maxlength: 70 },
    metaDescription: { type: String, maxlength: 160 },
    videoUrl: { type: String },
  },
  { timestamps: true }
);

ProductSchema.index({ isMotherProduct: 1 });
ProductSchema.index({ uploadedBy: 1 });
ProductSchema.index({ isApprovedByAdmin: 1 });
ProductSchema.index({ name: 1 }); // Optimized for search
ProductSchema.index({ categories: 1 }); // Optimized for category filtering

ProductSchema.pre('validate', function(this: any) {
  // If no uploadedBy reseller is specified, this product is owned by Mother Shop Admin
  if (!this.uploadedBy) {
    this.isMotherProduct = true;
    this.isApprovedByAdmin = true;
  }

  // Strict Rule: If product has variants, root pricing MUST be derived strictly from the first variant (ignore main pricing)
  if (this.variants && Array.isArray(this.variants) && this.variants.length > 0) {
    const firstV = this.variants[0];
    if (firstV) {
      this.price = Number(firstV.price || 0);
      const rawVSale = firstV.salePrice !== undefined && firstV.salePrice !== null ? Number(firstV.salePrice) : undefined;
      if (rawVSale !== undefined && rawVSale > 0 && rawVSale < this.price) {
        this.salePrice = rawVSale;
        this.discountRate = firstV.discountRate;
      } else {
        this.salePrice = undefined;
        this.discountRate = undefined;
        firstV.salePrice = undefined;
        firstV.discountRate = undefined;
      }
    }
  } else {
    // If no variants, validate main salePrice: if <= 0 or >= price, treat as NO DISCOUNT
    if (this.salePrice !== undefined && this.salePrice !== null) {
      if (this.salePrice <= 0 || (this.price !== undefined && this.salePrice >= this.price)) {
        this.salePrice = undefined;
        this.discountRate = undefined;
      }
    }
  }

  // Variants validation and sanitization
  if (this.variants && Array.isArray(this.variants)) {
    this.variants.forEach((v: any) => {
      if (v.salePrice !== undefined && v.salePrice !== null) {
        if (v.salePrice <= 0 || (v.price !== undefined && v.salePrice >= v.price)) {
          v.salePrice = undefined;
          v.discountRate = undefined;
        }
      }
    });
  }
});

if (mongoose.models && mongoose.models.Product) {
  delete (mongoose.models as any).Product;
}

const Product: Model<IProduct> = mongoose.model<IProduct>('Product', ProductSchema);

export const MOTHER_SHOP_PRODUCT_FILTER = {
  $or: [
    { isMotherProduct: true },
    { uploadedBy: null },
    { uploadedBy: { $exists: false } },
  ],
};

export default Product;

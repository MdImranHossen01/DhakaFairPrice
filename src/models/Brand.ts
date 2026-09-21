import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IBrand extends Document {
  name: string;
  slug?: string;
  image?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BrandSchema: Schema<IBrand> = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String },
    image: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Scoped unique index on slug
BrandSchema.index({ slug: 1 }, { unique: true });

BrandSchema.pre('save', function (this: any) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
});

const Brand: Model<IBrand> = mongoose.models.Brand || mongoose.model<IBrand>('Brand', BrandSchema);

export default Brand;

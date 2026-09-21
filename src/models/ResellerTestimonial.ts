import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IResellerTestimonial extends Document {
  resellerId: mongoose.Types.ObjectId;
  name: string;
  role?: string;
  content: string;
  image?: string;
  rating: number;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ResellerTestimonialSchema: Schema<IResellerTestimonial> = new Schema(
  {
    resellerId: { type: Schema.Types.ObjectId, ref: 'Reseller', required: true, index: true },
    name: { type: String, required: true },
    role: { type: String, default: 'Customer' },
    content: { type: String, required: true },
    image: { type: String, default: '' },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ResellerTestimonialSchema.index({ resellerId: 1, isActive: 1 });

const ResellerTestimonial: Model<IResellerTestimonial> =
  mongoose.models.ResellerTestimonial ||
  mongoose.model<IResellerTestimonial>('ResellerTestimonial', ResellerTestimonialSchema);

export default ResellerTestimonial;

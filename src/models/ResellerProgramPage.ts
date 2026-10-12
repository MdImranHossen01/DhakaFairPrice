import mongoose, { Document, Model, Schema } from 'mongoose';
import { IResellerProgramData } from '@/types/reseller-program';

export interface IResellerProgramPageDocument extends Document, IResellerProgramData {
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ResellerProgramPageSchema = new Schema(
  {
    hero: { type: Schema.Types.Mixed, required: true },
    pricingHeader: { type: Schema.Types.Mixed, required: true },
    packages: { type: [Schema.Types.Mixed], default: [] },
    whyChooseUs: { type: Schema.Types.Mixed, required: true },
    workflow: { type: Schema.Types.Mixed, required: true },
    comparisonTable: { type: Schema.Types.Mixed, required: true },
    faqs: { type: Schema.Types.Mixed, required: true },
    importantInfo: { type: Schema.Types.Mixed, required: true },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

const ResellerProgramPage: Model<IResellerProgramPageDocument> =
  mongoose.models.ResellerProgramPage ||
  mongoose.model<IResellerProgramPageDocument>('ResellerProgramPage', ResellerProgramPageSchema as any);

export default ResellerProgramPage;

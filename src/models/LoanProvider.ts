import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ILoanProvider extends Document {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LoanProviderSchema: Schema<ILoanProvider> = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    description: { type: String },
  },
  { timestamps: true }
);

const LoanProvider: Model<ILoanProvider> = mongoose.models.LoanProvider || mongoose.model<ILoanProvider>('LoanProvider', LoanProviderSchema);

export default LoanProvider;

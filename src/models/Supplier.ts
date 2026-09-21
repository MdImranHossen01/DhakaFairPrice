import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISupplier extends Document {
  name: string;
  companyName?: string;
  phone: string;
  email?: string;
  address?: string;
  currentBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema: Schema<ISupplier> = new Schema(
  {
    name: { type: String, required: true },
    companyName: { type: String },
    phone: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String },
    currentBalance: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const Supplier: Model<ISupplier> = mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', SupplierSchema);

export default Supplier;

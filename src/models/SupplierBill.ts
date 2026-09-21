import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISupplierBillItem {
  name: string;
  quantity: number;
  price: number;
}

export interface ISupplierBill extends Document {
  billNo: string;
  supplier: mongoose.Types.ObjectId;
  date: Date;
  items: ISupplierBillItem[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: 'Cash' | 'Bank' | 'MFS' | 'Credit';
  paymentAccountId?: mongoose.Types.ObjectId;
  expectedPaymentDate?: Date;
  status: 'Paid' | 'Due';
  createdAt: Date;
  updatedAt: Date;
}

const SupplierBillSchema: Schema<ISupplierBill> = new Schema(
  {
    billNo: { type: String, required: true, unique: true },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    date: { type: Date, default: Date.now },
    items: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 }
      }
    ],
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueAmount: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ['Cash', 'Bank', 'MFS', 'Credit'], default: 'Cash' },
    paymentAccountId: { type: Schema.Types.ObjectId, ref: 'LedgerAccount' },
    expectedPaymentDate: { type: Date },
    status: { type: String, enum: ['Paid', 'Due'], default: 'Due' }
  },
  { timestamps: true }
);

SupplierBillSchema.pre('save', function (this: any) {
  this.dueAmount = Math.max(0, this.total - this.paidAmount);
  this.status = this.dueAmount === 0 ? 'Paid' : 'Due';
});

SupplierBillSchema.index({ status: 1 });
SupplierBillSchema.index({ date: -1 });

const SupplierBill: Model<ISupplierBill> = mongoose.models.SupplierBill || mongoose.model<ISupplierBill>('SupplierBill', SupplierBillSchema);

export default SupplierBill;

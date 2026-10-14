import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IExpense extends Document {
  title: string;
  amount: number;
  category: string;
  type: 'expense' | 'income';
  paymentAccountId?: mongoose.Types.ObjectId;
  resellerId?: mongoose.Types.ObjectId | null;
  date: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema: Schema<IExpense> = new Schema(
  {
    title: { type: String, required: true },
    amount: { type: Number, required: true, min: [0, 'Amount cannot be negative'] },
    category: {
      type: String,
      required: true,
      default: 'Others',
    },
    type: {
      type: String,
      enum: ['expense', 'income'],
      default: 'expense',
      required: true,
    },
    paymentAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'LedgerAccount'
    },
    resellerId: {
      type: Schema.Types.ObjectId,
      ref: 'Reseller',
      default: null,
      index: true,
    },
    date: { type: Date, required: true, default: Date.now },
    description: { type: String },
  },
  { timestamps: true }
);

ExpenseSchema.index({ resellerId: 1, date: -1 });

const Expense: Model<IExpense> = mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);

export default Expense;

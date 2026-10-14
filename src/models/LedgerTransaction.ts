import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ILedgerTransaction extends Document {
  account: mongoose.Types.ObjectId | string;
  date: Date;
  description: string;
  type: 'debit' | 'credit';
  amount: number;
  reference?: string;
  balanceAfter: number;
  resellerId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LedgerTransactionSchema: Schema<ILedgerTransaction> = new Schema(
  {
    account: { type: Schema.Types.ObjectId, ref: 'LedgerAccount', required: true },
    date: { type: Date, default: Date.now, required: true },
    description: { type: String, required: true },
    type: { type: String, required: true, enum: ['debit', 'credit'] },
    amount: { type: Number, required: true, min: [0, 'Amount cannot be negative'] },
    reference: { type: String },
    balanceAfter: { type: Number, required: true },
    resellerId: {
      type: Schema.Types.ObjectId,
      ref: 'Reseller',
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

LedgerTransactionSchema.index({ resellerId: 1, account: 1, date: -1 });

const LedgerTransaction: Model<ILedgerTransaction> =
  mongoose.models.LedgerTransaction || mongoose.model<ILedgerTransaction>('LedgerTransaction', LedgerTransactionSchema);

export default LedgerTransaction;

import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ILedgerAccount extends Document {
  name: string;
  code: string;
  accountNumber?: string;
  bankName?: string;
  branchName?: string;
  bankAccountType?: 'Savings' | 'Current';
  mfsProvider?: string;
  mfsType?: 'Merchant' | 'Agent' | 'Personal';
  openingBalance: number;
  currentBalance: number;
  type: 'asset' | 'liability';
  category: 'Cash' | 'Bank' | 'MFS' | 'Other';
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LedgerAccountSchema: Schema<ILedgerAccount> = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    accountNumber: { type: String },
    bankName: { type: String },
    branchName: { type: String },
    bankAccountType: { type: String, enum: ['Savings', 'Current'] },
    mfsProvider: { type: String },
    mfsType: { type: String, enum: ['Merchant', 'Agent', 'Personal'] },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    type: { type: String, default: 'asset', enum: ['asset', 'liability'] },
    category: { type: String, default: 'Bank', enum: ['Cash', 'Bank', 'MFS', 'Other'] },
    description: { type: String },
  },
  { timestamps: true }
);

const LedgerAccount: Model<ILedgerAccount> =
  mongoose.models.LedgerAccount || mongoose.model<ILedgerAccount>('LedgerAccount', LedgerAccountSchema);

export default LedgerAccount;

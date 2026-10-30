import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * ResellerWalletTransaction: Ledger entry for every financial movement
 * in a reseller's wallet (commission earned, payout released, reversal on cancellation).
 */
export interface IResellerWalletTransaction extends Document {
  resellerId: mongoose.Types.ObjectId;
  type: 'commission_earned' | 'payout_released' | 'order_cancelled' | 'adjustment' | 'refund' | 'courier_return_loss';
  amount: number;                            // positive = credit, negative = debit
  orderId?: mongoose.Types.ObjectId;         // Related reseller order
  description: string;
  status: 'pending' | 'cleared' | 'failed' | 'cancelled';
  payoutMethod?: string;                     // bKash, Nagad, Bank Transfer etc.
  payoutReference?: string;                  // Transaction ID from payment
  adminTrxId?: string;                       // Transaction ID entered by admin upon payment
  adminAccountId?: mongoose.Types.ObjectId;  // Admin's source payment account
  adminAccountDetails?: string;              // Name & Account number of admin's payment account
  adminAccountName?: string;                 // Admin account name (e.g. bKash, Bank)
  adminAccountNumber?: string;               // Admin account number (e.g. 017...)
  adminNote?: string;                        // Optional admin note
  destinationAccountId?: mongoose.Types.ObjectId; // Reseller's selected LedgerAccount
  processedBy?: mongoose.Types.ObjectId;     // Admin user who processed payout
  balanceAfter?: number;                     // Running wallet balance after this transaction
  createdAt: Date;
  updatedAt: Date;
}

const ResellerWalletTransactionSchema: Schema<IResellerWalletTransaction> = new Schema(
  {
    resellerId: { type: Schema.Types.ObjectId, ref: 'Reseller', required: true },
    type: {
      type: String,
      enum: ['commission_earned', 'payout_released', 'order_cancelled', 'adjustment', 'refund', 'courier_return_loss'],
      required: true,
    },
    amount: { type: Number, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'ResellerOrder' },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'cleared', 'failed', 'cancelled'],
      default: 'pending',
    },
    payoutMethod: { type: String },
    payoutReference: { type: String },
    adminTrxId: { type: String },
    adminAccountId: { type: Schema.Types.ObjectId, ref: 'LedgerAccount' },
    adminAccountDetails: { type: String },
    adminAccountName: { type: String },
    adminAccountNumber: { type: String },
    adminNote: { type: String },
    destinationAccountId: { type: Schema.Types.ObjectId, ref: 'LedgerAccount' },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    balanceAfter: { type: Number },
  },
  { timestamps: true }
);

ResellerWalletTransactionSchema.index({ resellerId: 1, createdAt: -1 });
ResellerWalletTransactionSchema.index({ status: 1 });

const ResellerWalletTransaction: Model<IResellerWalletTransaction> =
  mongoose.models.ResellerWalletTransaction ||
  mongoose.model<IResellerWalletTransaction>(
    'ResellerWalletTransaction',
    ResellerWalletTransactionSchema
  );

export default ResellerWalletTransaction;

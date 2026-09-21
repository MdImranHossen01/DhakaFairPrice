import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IBusinessLoan extends Document {
  loanId: string;
  lenderName: string;
  amount: number;
  paidAmount: number;
  dueAmount: number;
  date: Date;
  expectedRepaymentDate: Date;
  receivingAccountId: mongoose.Types.ObjectId;
  lenderId?: mongoose.Types.ObjectId;
  interestAmount: number;
  totalRepaymentAmount: number;
  status: 'Active' | 'Paid';
  createdAt: Date;
  updatedAt: Date;
}

const BusinessLoanSchema: Schema<IBusinessLoan> = new Schema(
  {
    loanId: { type: String, required: true, unique: true },
    lenderName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueAmount: { type: Number, default: 0, min: 0 },
    date: { type: Date, default: Date.now },
    expectedRepaymentDate: { type: Date, required: true },
    receivingAccountId: { type: Schema.Types.ObjectId, ref: 'LedgerAccount', required: true },
    lenderId: { type: Schema.Types.ObjectId, ref: 'LoanProvider' },
    interestAmount: { type: Number, default: 0, min: 0 },
    totalRepaymentAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['Active', 'Paid'], default: 'Active' },
  },
  { timestamps: true }
);

BusinessLoanSchema.pre('save', function (this: any) {
  if (!this.totalRepaymentAmount) {
    this.totalRepaymentAmount = this.amount + (this.interestAmount || 0);
  }
  this.dueAmount = Math.max(0, this.totalRepaymentAmount - (this.paidAmount || 0));
  this.status = this.dueAmount === 0 ? 'Paid' : 'Active';
});

const BusinessLoan: Model<IBusinessLoan> = mongoose.models.BusinessLoan || mongoose.model<IBusinessLoan>('BusinessLoan', BusinessLoanSchema);

export default BusinessLoan;

'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Wallet,
  Building,
  History
} from 'lucide-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { cleanAccountName, isTransferableAccount } from '@/lib/utils';

interface LoanRepaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: any | null;
  accounts: any[];
  onSuccess: () => void;
}

export function LoanRepaymentDialog({
  open,
  onOpenChange,
  loan,
  accounts,
  onSuccess,
}: LoanRepaymentDialogProps) {
  const [amount, setAmount] = useState<string>('');
  const [paymentAccountId, setPaymentAccountId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Filter transferable (liquid) accounts: Cash, Bank, MFS
  const liquidAccounts = React.useMemo(() => {
    return accounts.filter((a) => isTransferableAccount(a));
  }, [accounts]);

  // Reset form when loan changes or modal opens
  useEffect(() => {
    if (loan && open) {
      setAmount(String(loan.dueAmount || ''));
      setDate(new Date().toISOString().split('T')[0]);
      setNote('');
      setShowHistory(false);

      // Auto-select first liquid account with positive balance
      const firstValidAcc = liquidAccounts.find((a) => (a.currentBalance || 0) > 0);
      if (firstValidAcc) {
        setPaymentAccountId(firstValidAcc._id);
      } else if (liquidAccounts.length > 0) {
        setPaymentAccountId(liquidAccounts[0]._id);
      }
    }
  }, [loan, open, liquidAccounts]);

  if (!loan) return null;

  const dueAmount = Number(loan.dueAmount || 0);
  const payAmount = Number(amount || 0);
  const selectedAccount = liquidAccounts.find((a) => a._id === paymentAccountId);
  const accountBalance = selectedAccount?.currentBalance || 0;
  const isZeroBalance = accountBalance <= 0;
  const isInsufficient = payAmount > accountBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!payAmount || payAmount <= 0) {
      toast.error('Please enter a valid repayment amount');
      return;
    }

    if (payAmount > dueAmount) {
      toast.error(`Payment amount cannot exceed outstanding due of ৳${dueAmount.toLocaleString()}`);
      return;
    }

    if (!paymentAccountId) {
      toast.error('Please select an account to pay from');
      return;
    }

    if (isZeroBalance) {
      toast.error(`Cannot pay from ${cleanAccountName(selectedAccount?.name)}: Account has zero or negative balance.`);
      return;
    }

    if (isInsufficient) {
      toast.error(`Insufficient balance in ${cleanAccountName(selectedAccount?.name)}. Available: ৳${Math.round(accountBalance).toLocaleString()}`);
      return;
    }

    // Confirmation using SweetAlert2
    const confirmResult = await Swal.fire({
      title: 'Confirm Loan Repayment',
      html: `
        <div style="text-align: left; font-size: 13px; line-height: 1.6;">
          <p><strong>Loan ID:</strong> ${loan.loanId}</p>
          <p><strong>Lender / Bank:</strong> ${loan.lenderName}</p>
          <p><strong>Payment Amount:</strong> <span style="color: #10b981; font-weight: bold;">৳${payAmount.toLocaleString()}</span></p>
          <p><strong>Paid From:</strong> ${cleanAccountName(selectedAccount?.name)} (Bal: ৳${Math.round(accountBalance).toLocaleString()})</p>
          <p><strong>Remaining Due After:</strong> ৳${Math.max(0, dueAmount - payAmount).toLocaleString()}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Confirm Payment',
      cancelButtonText: 'Cancel'
    });

    if (!confirmResult.isConfirmed) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/loans/repay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: loan._id || loan.loanId,
          amount: payAmount,
          paymentAccountId,
          date,
          note: note.trim()
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to record loan repayment');
      }

      await Swal.fire({
        title: 'Payment Successful!',
        text: data.message || `Repayment of ৳${payAmount.toLocaleString()} recorded successfully.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Loan repayment error:', error);
      Swal.fire({
        title: 'Repayment Failed',
        text: error.message || 'An unexpected error occurred',
        icon: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-base md:text-lg font-bold">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              <span>Loan Repayment</span>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {loan.loanId}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Loan Details Banner */}
        <div className="rounded-xl border bg-muted/40 p-3.5 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium">Lender / Provider:</span>
            <span className="font-bold text-foreground text-sm">{loan.lenderName}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-muted/50 text-center">
            <div className="p-2 rounded-lg bg-background/60">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Payable</p>
              <p className="font-bold text-foreground text-xs mt-0.5">
                ৳{Math.round(loan.totalRepaymentAmount || loan.amount).toLocaleString()}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-background/60">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Paid So Far</p>
              <p className="font-bold text-emerald-600 text-xs mt-0.5">
                ৳{Math.round(loan.paidAmount || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <p className="text-[10px] text-rose-600 uppercase font-bold">Outstanding Due</p>
              <p className="font-black text-rose-600 text-sm mt-0.5">
                ৳{Math.round(dueAmount).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Toggle between Payment Form and Repayment History */}
        {loan.repayments && loan.repayments.length > 0 && (
          <div className="flex items-center justify-between border-b pb-2">
            <Button
              type="button"
              variant={!showHistory ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShowHistory(false)}
              className="h-7 text-xs font-semibold"
            >
              Make Repayment
            </Button>
            <Button
              type="button"
              variant={showHistory ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShowHistory(true)}
              className="h-7 text-xs font-semibold"
            >
              <History className="h-3.5 w-3.5 mr-1" />
              History ({loan.repayments.length})
            </Button>
          </div>
        )}

        {showHistory ? (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Repayment History</p>
            {loan.repayments.map((rep: any, idx: number) => (
              <div key={idx} className="p-2.5 rounded-lg border bg-card flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-foreground">৳{Math.round(rep.amount).toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground">
                    From: {rep.paymentAccountName || 'Account'} {rep.note ? `• ${rep.note}` : ''}
                  </p>
                </div>
                <div className="text-right text-[11px] text-muted-foreground">
                  {rep.date ? new Date(rep.date).toLocaleDateString() : '-'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {/* Repayment Amount */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="repay-amount" className="text-xs font-bold">
                  Repayment Amount (৳) *
                </Label>
                <button
                  type="button"
                  onClick={() => setAmount(String(dueAmount))}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  Pay Full Due (৳{dueAmount.toLocaleString()})
                </button>
              </div>
              <Input
                id="repay-amount"
                type="number"
                min="1"
                max={dueAmount}
                step="any"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-9 text-xs font-semibold"
              />
            </div>

            {/* Pay From Account */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Pay From Account (Liquid Asset) *</Label>
              <Select value={paymentAccountId} onValueChange={(val) => val && setPaymentAccountId(val)}>
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder="Select Payment Account">
                    {paymentAccountId ? (
                      selectedAccount ? (
                        `${cleanAccountName(selectedAccount.name)} (৳${Math.round(selectedAccount.currentBalance || 0).toLocaleString()})`
                      ) : (
                        'Select Payment Account'
                      )
                    ) : (
                      'Select Payment Account'
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-(--anchor-width) min-w-[320px]">
                  {liquidAccounts.map((acc) => {
                    const bal = acc.currentBalance || 0;
                    const isZero = bal <= 0;
                    const isLow = !isZero && payAmount > 0 && bal < payAmount;
                    return (
                      <SelectItem
                        key={acc._id}
                        value={acc._id}
                        disabled={isZero}
                        className="text-xs py-1.5"
                      >
                        {cleanAccountName(acc.name)} (৳{Math.round(bal).toLocaleString()})
                        {isZero ? ' — (Zero Balance)' : isLow ? ' ⚠️ (Low Balance)' : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {/* Warning messages if account has zero or low balance */}
              {selectedAccount && isZeroBalance && (
                <div className="flex items-center gap-1.5 text-destructive text-[11px] font-medium bg-destructive/10 p-2 rounded-md">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Cannot pay from this account: balance is ৳{Math.round(accountBalance).toLocaleString()}.</span>
                </div>
              )}

              {selectedAccount && !isZeroBalance && isInsufficient && (
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-[11px] font-medium bg-amber-500/10 p-2 rounded-md">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Warning: Repayment amount (৳{payAmount.toLocaleString()}) exceeds available balance (৳{Math.round(accountBalance).toLocaleString()}).
                  </span>
                </div>
              )}
            </div>

            {/* Date & Note */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="repay-date" className="text-xs font-bold">
                  Payment Date
                </Label>
                <Input
                  id="repay-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="repay-note" className="text-xs font-bold">
                  Note / Reference (Optional)
                </Label>
                <Input
                  id="repay-note"
                  placeholder="e.g. Cheque #1234, Bank Tx"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading || isZeroBalance || isInsufficient || payAmount <= 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CreditCard className="h-4 w-4 mr-1.5" />}
                Confirm Repayment
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

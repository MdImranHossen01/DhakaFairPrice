'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building, 
  Plus, 
  DollarSign, 
  Loader2, 
  RefreshCw, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Search,
  HandCoins,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { MobileDataCard, MobileDataRow } from '@/components/common/MobileDataCard';

export default function LoansPage() {
  const [data, setData] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Loan Modal State
  const [newLoanOpen, setNewLoanOpen] = useState(false);
  const [loanForm, setLoanForm] = useState({
    lenderId: '',
    lenderName: '',
    amount: '',
    interestAmount: '0',
    receivingAccountId: '',
    expectedRepaymentDate: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [creating, setCreating] = useState(false);

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const [loansRes, providersRes, accountsRes] = await Promise.all([
        fetch('/api/admin/loans'),
        fetch('/api/admin/loans/providers'),
        fetch('/api/admin/accounts')
      ]);

      if (loansRes.ok) {
        const json = await loansRes.json();
        setData(json);
      }
      if (providersRes.ok) {
        const json = await providersRes.json();
        setProviders(json.providers || []);
      }
      if (accountsRes.ok) {
        const json = await accountsRes.json();
        setAccounts(json.accounts || []);
      }
    } catch (error) {
      console.error('Failed to fetch loans:', error);
      toast.error('Failed to load loans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanForm.amount || !loanForm.receivingAccountId || !loanForm.expectedRepaymentDate) {
      toast.error('Please fill in all required loan fields');
      return;
    }
    if (providers.length > 0 && !loanForm.lenderId) {
      toast.error('Please select a loan provider');
      return;
    }
    if (providers.length === 0 && !loanForm.lenderName.trim()) {
      toast.error('Please enter a lender name');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loanForm)
      });
      if (res.ok) {
        toast.success('Business loan recorded successfully');
        setNewLoanOpen(false);
        setLoanForm({
          lenderId: '',
          lenderName: '',
          amount: '',
          interestAmount: '0',
          receivingAccountId: '',
          expectedRepaymentDate: '',
          date: new Date().toISOString().split('T')[0]
        });
        fetchLoans();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to record loan');
      }
    } catch (error) {
      toast.error('Error recording loan');
    } finally {
      setCreating(false);
    }
  };

  const loans = data?.loans || [];
  const summary = data?.summary || { totalPrincipal: 0, totalPaid: 0, totalDue: 0, activeLoansCount: 0 };

  return (
    <div className="flex-1 space-y-4 md:space-y-6 px-0 py-2 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">Business Loans & Capital</h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-0.5">
            Track business capital loans, loan providers, total borrowed funds and repayments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Link href="/admin/loans/providers">
            <Button variant="outline" size="sm" className="gap-1.5 font-semibold h-9 text-xs">
              <Building className="h-3.5 w-3.5 text-primary" />
              <span>Providers ({providers.length})</span>
            </Button>
          </Link>

          <Button size="sm" onClick={() => setNewLoanOpen(true)} className="gap-1.5 font-bold h-9 text-xs">
            <Plus className="h-3.5 w-3.5" />
            <span>+ Record Loan</span>
          </Button>

          <Button variant="outline" size="icon" onClick={fetchLoans} disabled={loading} className="h-9 w-9">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 md:gap-4">
        <Card className="shadow-xs">
          <CardContent className="p-3 md:p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase">Borrowed Capital</p>
              <p className="text-lg md:text-2xl font-bold text-foreground mt-0.5 md:mt-1">
                ৳{Math.round(summary.totalPrincipal).toLocaleString()}
              </p>
            </div>
            <div className="p-2 md:p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600">
              <HandCoins className="h-4 w-4 md:h-5 md:w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-3 md:p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase">Total Repaid</p>
              <p className="text-lg md:text-2xl font-bold text-emerald-600 mt-0.5 md:mt-1">
                ৳{Math.round(summary.totalPaid).toLocaleString()}
              </p>
            </div>
            <div className="p-2 md:p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-rose-500/5 border-rose-500/20 shadow-xs">
          <CardContent className="p-3 md:p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-semibold text-rose-600 uppercase">Outstanding Balance</p>
              <p className="text-lg md:text-2xl font-black text-rose-700 dark:text-rose-400 mt-0.5 md:mt-1">
                ৳{Math.round(summary.totalDue).toLocaleString()}
              </p>
            </div>
            <div className="p-2 md:p-2.5 rounded-xl bg-rose-500/10 text-rose-600">
              <DollarSign className="h-4 w-4 md:h-5 md:w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loans Table Card */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/30 py-2.5 px-3 md:py-3 md:px-4 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-sm md:text-base font-bold flex items-center gap-2">
            <HandCoins className="h-4 w-4 text-primary" /> Active & Completed Loans
          </CardTitle>
          <Badge variant="outline" className="text-xs font-mono">{loans.length} Loans</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs md:text-sm text-center border-collapse">
              <thead>
                <tr className="bg-muted/20 border-b text-muted-foreground font-semibold">
                  <th className="p-3 text-left font-bold text-foreground">Date</th>
                  <th className="p-3 font-bold text-foreground">Loan ID</th>
                  <th className="p-3 text-left font-bold text-foreground">Lender / Provider</th>
                  <th className="p-3 font-bold text-foreground">Receiving Account</th>
                  <th className="p-3 font-bold text-foreground">Principal (৳)</th>
                  <th className="p-3 font-bold text-emerald-600">Paid (৳)</th>
                  <th className="p-3 font-bold text-rose-600">Outstanding Due</th>
                  <th className="p-3 font-bold text-muted-foreground">Repayment Date</th>
                  <th className="p-3 font-bold text-right text-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading loans...</span>
                      </div>
                    </td>
                  </tr>
                ) : loans.length > 0 ? (
                  loans.map((loan: any) => (
                    <tr key={loan._id} className="border-b border-muted/30 hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-left text-muted-foreground">
                        {new Date(loan.date).toLocaleDateString()}
                      </td>
                      <td className="p-3 font-mono font-bold text-foreground">{loan.loanId}</td>
                      <td className="p-3 text-left">
                        <div className="font-bold text-foreground">{loan.lenderName}</div>
                        {loan.lenderId?.phone && <div className="text-[11px] text-muted-foreground">{loan.lenderId.phone}</div>}
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className="text-[10px]">
                          {loan.receivingAccountId?.name || 'Account'}
                        </Badge>
                      </td>
                      <td className="p-3 font-bold text-foreground">৳{Math.round(loan.amount).toLocaleString()}</td>
                      <td className="p-3 font-medium text-emerald-600">৳{Math.round(loan.paidAmount || 0).toLocaleString()}</td>
                      <td className="p-3 font-bold text-rose-600">৳{Math.round(loan.dueAmount || 0).toLocaleString()}</td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {loan.expectedRepaymentDate ? new Date(loan.expectedRepaymentDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-3 text-right">
                        <Badge variant={loan.status === 'Paid' ? 'secondary' : 'default'} className="text-[10px]">
                          {loan.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-muted-foreground">No business loans recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="block md:hidden p-2 space-y-2.5">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                <span>Loading loans...</span>
              </div>
            ) : loans.length > 0 ? (
              loans.map((loan: any) => (
                <MobileDataCard
                  key={loan._id}
                  title={loan.lenderName || 'Loan'}
                  badge={
                    <Badge variant={loan.status === 'Paid' ? 'secondary' : 'default'} className="text-[10px]">
                      {loan.status}
                    </Badge>
                  }
                  footer={
                    <div className="flex items-center justify-between w-full font-bold text-xs">
                      <span className="text-muted-foreground">Outstanding Due:</span>
                      <span className="text-rose-600 text-sm font-black">৳{Math.round(loan.dueAmount || 0).toLocaleString()}</span>
                    </div>
                  }
                >
                  <MobileDataRow label="Loan ID" value={<span className="font-mono text-xs">{loan.loanId}</span>} />
                  <MobileDataRow label="Disbursement Date" value={new Date(loan.date).toLocaleDateString()} />
                  <MobileDataRow label="Principal Amount" value={<span className="font-bold">৳{Math.round(loan.amount).toLocaleString()}</span>} />
                  <MobileDataRow label="Paid So Far" value={<span className="text-emerald-600 font-semibold">৳{Math.round(loan.paidAmount || 0).toLocaleString()}</span>} />
                  {loan.receivingAccountId?.name && <MobileDataRow label="Account" value={loan.receivingAccountId.name} />}
                  {loan.expectedRepaymentDate && <MobileDataRow label="Repayment Date" value={new Date(loan.expectedRepaymentDate).toLocaleDateString()} />}
                </MobileDataCard>
              ))
            ) : (
              <div className="p-6 text-center text-muted-foreground text-xs">
                No business loans recorded.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Record Loan Modal */}
      <Dialog open={newLoanOpen} onOpenChange={setNewLoanOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <HandCoins className="h-5 w-5 text-primary" />
              Record New Business Loan
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateLoan} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Loan Provider / Lender *</Label>
              {providers.length > 0 ? (
                <Select
                  value={loanForm.lenderId}
                  onValueChange={(val) => {
                    if (!val) return;
                    const p = providers.find(item => item._id === val);
                    setLoanForm(prev => ({ ...prev, lenderId: val, lenderName: p ? p.name : '' }));
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Loan Provider">
                      {loanForm.lenderId ? (
                        providers.find(p => p._id === loanForm.lenderId)
                          ? `${providers.find(p => p._id === loanForm.lenderId)?.name}${providers.find(p => p._id === loanForm.lenderId)?.phone ? ` (${providers.find(p => p._id === loanForm.lenderId)?.phone})` : ''}`
                          : loanForm.lenderName || 'Select Loan Provider'
                      ) : 'Select Loan Provider'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map(p => (
                      <SelectItem key={p._id} value={p._id} className="text-xs">
                        {p.name} {p.phone ? `(${p.phone})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  required
                  placeholder="Lender / Bank Name"
                  value={loanForm.lenderName}
                  onChange={(e) => setLoanForm(prev => ({ ...prev, lenderName: e.target.value }))}
                  className="h-8 text-xs"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Loan Amount (Principal ৳) *</Label>
                <Input
                  required
                  type="number"
                  min="1"
                  placeholder="e.g. 100000"
                  value={loanForm.amount}
                  onChange={(e) => setLoanForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Interest / Fee (৳)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={loanForm.interestAmount}
                  onChange={(e) => setLoanForm(prev => ({ ...prev, interestAmount: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Receiving Bank / Cash Account *</Label>
              <Select
                value={loanForm.receivingAccountId}
                onValueChange={(val) => val && setLoanForm(prev => ({ ...prev, receivingAccountId: val }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select Account to Deposit Loan">
                    {loanForm.receivingAccountId ? (
                      accounts.find(a => a._id === loanForm.receivingAccountId)
                        ? `${accounts.find(a => a._id === loanForm.receivingAccountId)?.name} (${accounts.find(a => a._id === loanForm.receivingAccountId)?.category || accounts.find(a => a._id === loanForm.receivingAccountId)?.code || ''})`
                        : 'Select Account to Deposit Loan'
                    ) : 'Select Account to Deposit Loan'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a._id} value={a._id} className="text-xs">
                      {a.name} ({a.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Disbursement Date</Label>
                <Input
                  type="date"
                  value={loanForm.date}
                  onChange={(e) => setLoanForm(prev => ({ ...prev, date: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Expected Repayment Date *</Label>
                <Input
                  required
                  type="date"
                  value={loanForm.expectedRepaymentDate}
                  onChange={(e) => setLoanForm(prev => ({ ...prev, expectedRepaymentDate: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setNewLoanOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={creating} className="font-bold">
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Record Loan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

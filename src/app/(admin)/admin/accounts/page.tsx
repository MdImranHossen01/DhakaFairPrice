'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  ArrowRightLeft,
  Landmark,
  Wallet,
  Smartphone,
  Loader2,
  RefreshCw,
  Building2,
  CreditCard,
  FileText,
  MoreHorizontal,
  ArrowDownCircle,
  X,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { MobileDataCard, MobileDataRow } from '@/components/common/MobileDataCard';
import { TransactionForm } from '@/components/admin/TransactionForm';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Transaction Modal State (Add Money / Debit / Transfer)
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [selectedAccountForTx, setSelectedAccountForTx] = useState<any>(null);
  const [txModalType, setTxModalType] = useState<'income' | 'expense'>('income');
  const [txModalTab, setTxModalTab] = useState<'journal' | 'transfer'>('journal');

  // New Account Modal State
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({
    name: '',
    code: '',
    category: 'Bank',
    bankName: '',
    branchName: '',
    bankAccountType: 'Savings',
    accountNumber: '',
    mfsProvider: 'bKash',
    mfsType: 'Merchant',
    openingBalance: '',
    description: ''
  });
  const [creating, setCreating] = useState(false);

  const todayLocal = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Transfer Modal State (Standalone)
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    note: '',
    date: todayLocal()
  });
  const [transferring, setTransferring] = useState(false);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/accounts');
      if (res.ok) {
        const json = await res.json();
        setAccounts(json.accounts || []);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleOpenCredit = (acc: any | null) => {
    setSelectedAccountForTx(acc);
    setTxModalType('income');
    setTxModalTab('journal');
    setTxModalOpen(true);
  };

  const handleOpenDebit = (acc: any | null) => {
    setSelectedAccountForTx(acc);
    setTxModalType('expense');
    setTxModalTab('journal');
    setTxModalOpen(true);
  };

  const handleOpenTransfer = (acc?: any | null) => {
    setSelectedAccountForTx(acc || null);
    setTxModalTab('transfer');
    setTxModalOpen(true);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.name || !accountForm.code) {
      toast.error('Name and Code are required');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountForm)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create account');

      toast.success('Account created successfully');
      setNewAccountOpen(false);
      setAccountForm({
        name: '',
        code: '',
        category: 'Bank',
        bankName: '',
        branchName: '',
        bankAccountType: 'Savings',
        accountNumber: '',
        mfsProvider: 'bKash',
        mfsType: 'Merchant',
        openingBalance: '',
        description: ''
      });
      fetchAccounts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.fromAccountId || !transferForm.toAccountId || !transferForm.amount) {
      toast.error('Please fill in all required transfer fields');
      return;
    }

    if (transferForm.fromAccountId === transferForm.toAccountId) {
      toast.error('Source and destination accounts must be different');
      return;
    }

    setTransferring(true);
    try {
      const res = await fetch('/api/admin/accounts/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAccountId: transferForm.fromAccountId,
          toAccountId: transferForm.toAccountId,
          amount: Number(transferForm.amount),
          note: transferForm.note,
          date: transferForm.date
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Transfer failed');

      toast.success(data.message || 'Fund transfer successful');
      setTransferOpen(false);
      setTransferForm({
        fromAccountId: '',
        toAccountId: '',
        amount: '',
        note: '',
        date: todayLocal()
      });
      fetchAccounts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setTransferring(false);
    }
  };

  // Group accounts by category
  const bankAccounts = accounts.filter(a => a.category === 'Bank');
  const cashAccounts = accounts.filter(a => a.category === 'Cash');
  const mfsAccounts = accounts.filter(a => a.category === 'MFS');
  const totalBalance = accounts.reduce((acc, c) => acc + (c.currentBalance || 0), 0);

  const getAccountIcon = (category: string) => {
    switch (category) {
      case 'Cash':
        return <Wallet className="h-4 w-4 text-emerald-600" />;
      case 'MFS':
        return <Smartphone className="h-4 w-4 text-sky-600" />;
      default:
        return <Building2 className="h-4 w-4 text-indigo-600" />;
    }
  };

  return (
    <div className="flex-1 space-y-4 md:space-y-6 px-0 py-2 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">Bank, Cash & MFS Accounts</h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Real-time multi-account cashflow, bank ledgers, mobile wallets and internal fund transfers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button 
            size="sm" 
            onClick={() => handleOpenCredit(null)} 
            className="gap-1.5 font-bold h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Credit + (Add Money)</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleOpenTransfer(null)} 
            className="gap-1.5 font-bold h-9 text-xs"
          >
            <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
            <span>Transfer Funds</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setNewAccountOpen(true)} 
            className="gap-1.5 font-bold h-9 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Add Account</span>
          </Button>

          <Button 
            variant="outline" 
            size="icon" 
            onClick={fetchAccounts} 
            disabled={loading} 
            className="h-9 w-9"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Summary Total Header Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
        <Card className="bg-primary/5 border-primary/20 shadow-xs">
          <CardContent className="p-3 md:p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-semibold text-primary uppercase">Liquid Balance</p>
              <p className="text-base md:text-2xl font-black text-foreground mt-0.5 md:mt-1">
                ৳{Math.round(totalBalance).toLocaleString()}
              </p>
            </div>
            <div className="p-2 md:p-2.5 rounded-xl bg-primary text-primary-foreground">
              <Landmark className="h-4 w-4 md:h-5 md:w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-3 md:p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase">Bank Balance</p>
              <p className="text-base md:text-xl font-bold text-foreground mt-0.5 md:mt-1">
                ৳{Math.round(bankAccounts.reduce((acc, c) => acc + (c.currentBalance || 0), 0)).toLocaleString()}
              </p>
            </div>
            <div className="p-2 md:p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600">
              <Building2 className="h-4 w-4 md:h-5 md:w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-3 md:p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase">Cash in Hand</p>
              <p className="text-base md:text-xl font-bold text-foreground mt-0.5 md:mt-1">
                ৳{Math.round(cashAccounts.reduce((acc, c) => acc + (c.currentBalance || 0), 0)).toLocaleString()}
              </p>
            </div>
            <div className="p-2 md:p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Wallet className="h-4 w-4 md:h-5 md:w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-3 md:p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase">Mobile Wallets</p>
              <p className="text-base md:text-xl font-bold text-foreground mt-0.5 md:mt-1">
                ৳{Math.round(mfsAccounts.reduce((acc, c) => acc + (c.currentBalance || 0), 0)).toLocaleString()}
              </p>
            </div>
            <div className="p-2 md:p-2.5 rounded-xl bg-sky-500/10 text-sky-600">
              <Smartphone className="h-4 w-4 md:h-5 md:w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts List Table Card */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/30 py-2.5 px-3 md:py-3 md:px-4 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm md:text-base font-bold">All Connected Accounts</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs font-mono">{accounts.length} Accounts</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs md:text-sm text-center border-collapse">
              <thead>
                <tr className="bg-muted/20 border-b text-muted-foreground font-semibold">
                  <th className="p-3 text-left font-bold text-foreground">Account Name</th>
                  <th className="p-3 font-bold text-foreground">Type</th>
                  <th className="p-3 font-bold text-foreground">Code</th>
                  <th className="p-3 text-left font-bold text-foreground">Details / Bank Info</th>
                  <th className="p-3 font-bold text-muted-foreground">Opening Balance</th>
                  <th className="p-3 font-bold text-primary text-right">Current Live Balance</th>
                  <th className="p-3 font-bold text-foreground text-center w-14">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading accounts...</span>
                      </div>
                    </td>
                  </tr>
                ) : accounts.length > 0 ? (
                  accounts.map((acc: any) => (
                    <tr key={acc._id} className="border-b border-muted/30 hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-left">
                        <div className="font-bold text-foreground flex items-center gap-2">
                          {getAccountIcon(acc.category)}
                          {acc.name}
                        </div>
                        {acc.description && (
                          <div className="text-[11px] text-muted-foreground pl-6">{acc.description}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className="text-[10px] font-semibold">
                          {acc.category}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{acc.code}</td>
                      <td className="p-3 text-left">
                        {acc.accountNumber && (
                          <div className="font-mono text-xs text-foreground">A/C: {acc.accountNumber}</div>
                        )}
                        {acc.mfsProvider && (
                          <div className="text-[11px] text-sky-600 font-semibold">{acc.mfsProvider} {acc.mfsType ? `· ${acc.mfsType}` : ''}</div>
                        )}
                        {acc.bankName && (
                          <div className="text-[11px] text-muted-foreground">{acc.bankName} {acc.branchName ? `(${acc.branchName})` : ''}</div>
                        )}
                        {acc.bankAccountType && (
                          <div className="text-[11px] text-indigo-500">{acc.bankAccountType} Account</div>
                        )}
                        {!acc.accountNumber && !acc.bankName && !acc.mfsProvider && (
                          <span className="text-muted-foreground italic text-[11px]">Direct account</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground font-medium">৳{Math.round(acc.openingBalance || 0).toLocaleString()}</td>
                      <td className="p-3 font-bold text-right text-base text-primary">
                        ৳{Math.round(acc.currentBalance || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 p-0 hover:bg-muted/80 rounded-md"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 text-xs font-medium">
                            <DropdownMenuItem
                              onClick={() => handleOpenCredit(acc)}
                              className="text-emerald-600 focus:text-emerald-700 font-semibold cursor-pointer gap-2"
                            >
                              <Plus className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Credit + (Add Money)</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenDebit(acc)}
                              className="text-rose-600 focus:text-rose-700 font-semibold cursor-pointer gap-2"
                            >
                              <ArrowDownCircle className="h-3.5 w-3.5 text-rose-600" />
                              <span>Debit - (Expense)</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenTransfer(acc)}
                              className="text-primary font-semibold cursor-pointer gap-2"
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5" />
                              <span>Transfer Funds</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/admin/ledger?search=${encodeURIComponent(acc.name)}`}
                                className="flex items-center gap-2 cursor-pointer w-full text-foreground"
                              >
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>View Ledger</span>
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">No accounts found. Click '+ Add Account' to create one.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="block md:hidden p-2 space-y-2.5">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                <span>Loading accounts...</span>
              </div>
            ) : accounts.length > 0 ? (
              accounts.map((acc: any) => (
                <MobileDataCard
                  key={acc._id}
                  title={
                    <div className="flex items-center gap-1.5 font-bold text-sm">
                      {getAccountIcon(acc.category)}
                      <span>{acc.name}</span>
                    </div>
                  }
                  badge={
                    <Badge variant="secondary" className="text-[10px]">
                      {acc.category}
                    </Badge>
                  }
                  footer={
                    <div className="flex items-center justify-between w-full font-bold text-xs pt-2 border-t">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Live Balance:</span>
                        <span className="text-primary text-sm font-black">৳{Math.round(acc.currentBalance || 0).toLocaleString()}</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1 font-semibold">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                            <span>Action</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs font-medium">
                          <DropdownMenuItem
                            onClick={() => handleOpenCredit(acc)}
                            className="text-emerald-600 focus:text-emerald-700 font-semibold cursor-pointer gap-2"
                          >
                            <Plus className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Credit + (Add Money)</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenDebit(acc)}
                            className="text-rose-600 focus:text-rose-700 font-semibold cursor-pointer gap-2"
                          >
                            <ArrowDownCircle className="h-3.5 w-3.5 text-rose-600" />
                            <span>Debit - (Expense)</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenTransfer(acc)}
                            className="text-primary font-semibold cursor-pointer gap-2"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            <span>Transfer Funds</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/admin/ledger?search=${encodeURIComponent(acc.name)}`}
                              className="flex items-center gap-2 cursor-pointer w-full text-foreground"
                            >
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>View Ledger</span>
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  }
                >
                  <MobileDataRow label="Account Code" value={<span className="font-mono text-xs">{acc.code}</span>} />
                  {acc.accountNumber && <MobileDataRow label="Account No" value={<span className="font-mono text-xs">{acc.accountNumber}</span>} />}
                  {acc.bankName && <MobileDataRow label="Bank / Branch" value={`${acc.bankName} ${acc.branchName ? `(${acc.branchName})` : ''}`} />}
                  <MobileDataRow label="Opening Balance" value={`৳${Math.round(acc.openingBalance || 0).toLocaleString()}`} />
                  {acc.description && <MobileDataRow label="Note" value={<span className="text-xs text-muted-foreground">{acc.description}</span>} />}
                </MobileDataCard>
              ))
            ) : (
              <div className="p-6 text-center text-muted-foreground text-xs">
                No accounts found. Click '+ Add Account' to create one.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Add Money / Debit / Transfer Dialog (Integrated TransactionForm) */}
      <Dialog open={txModalOpen} onOpenChange={setTxModalOpen}>
        <DialogContent className="sm:max-w-[500px] w-full">
          <DialogHeader>
            <DialogTitle>
              {txModalTab === 'transfer' 
                ? 'Transfer Funds' 
                : txModalType === 'income' 
                  ? (selectedAccountForTx ? `Add Money / Credit to ${selectedAccountForTx.name}` : 'Add Money / Deposit (Credit)')
                  : (selectedAccountForTx ? `Withdraw / Debit from ${selectedAccountForTx.name}` : 'Withdraw / Expense (Debit)')}
            </DialogTitle>
          </DialogHeader>
          <TransactionForm
            key={`${selectedAccountForTx?._id}-${txModalType}-${txModalTab}`}
            presetType={txModalType}
            presetAccountId={selectedAccountForTx?._id}
            presetTab={txModalTab}
            onSuccess={(wasEdit) => {
              fetchAccounts();
              if (wasEdit) {
                setTxModalOpen(false);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Add Account Modal — AmaniOutfits Style */}
      <Dialog open={newAccountOpen} onOpenChange={setNewAccountOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
          {/* Styled Header */}
          <div className="bg-primary px-5 py-3.5 flex justify-between items-center">
            <h2 className="text-base font-bold text-primary-foreground flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Account
            </h2>
            <button
              onClick={() => setNewAccountOpen(false)}
              className="text-primary-foreground hover:bg-white/10 p-1 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Body — Scrollable */}
          <div className="overflow-y-auto max-h-[80vh]">
          <form onSubmit={handleCreateAccount} className="p-5 space-y-4 pb-6">
            {/* Account Name */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Account Name <span className="text-red-500">*</span></Label>
              <Input
                required
                autoFocus
                placeholder="e.g. City Bank Primary / bKash Merchant"
                value={accountForm.name}
                onChange={(e) => setAccountForm(prev => ({ ...prev, name: e.target.value }))}
                className="h-11 text-base"
              />
            </div>

            {/* Account Code */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Account Code (Unique) <span className="text-red-500">*</span></Label>
              <Input
                required
                placeholder="e.g. CBL-01 / BKASH-01"
                value={accountForm.code}
                onChange={(e) => setAccountForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                className="h-11 text-base font-mono uppercase"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Account Type <span className="text-red-500">*</span></Label>
              <Select
                value={accountForm.category}
                onValueChange={(val) => val && setAccountForm(prev => ({ ...prev, category: val }))}
              >
                <SelectTrigger className="h-11 text-base">
                  <SelectValue placeholder="Select Account Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MFS">MFS (bKash, Nagad, etc.)</SelectItem>
                  <SelectItem value="Bank">Bank Account</SelectItem>
                  <SelectItem value="Cash">Cash in Hand</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* MFS-specific fields */}
            {accountForm.category === 'MFS' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 border p-4 rounded-lg bg-muted/30">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">MFS Provider</Label>
                  <Select
                    value={accountForm.mfsProvider}
                    onValueChange={(val) => val && setAccountForm(prev => ({ ...prev, mfsProvider: val }))}
                  >
                    <SelectTrigger className="h-11 text-base">
                      <SelectValue placeholder="Select Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bKash">bKash</SelectItem>
                      <SelectItem value="Nagad">Nagad</SelectItem>
                      <SelectItem value="Rocket">Rocket</SelectItem>
                      <SelectItem value="Upay">Upay</SelectItem>
                      <SelectItem value="mCash">mCash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Account Type</Label>
                  <Select
                    value={accountForm.mfsType}
                    onValueChange={(val) => val && setAccountForm(prev => ({ ...prev, mfsType: val }))}
                  >
                    <SelectTrigger className="h-11 text-base">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Merchant">Merchant</SelectItem>
                      <SelectItem value="Agent">Agent</SelectItem>
                      <SelectItem value="Personal">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Bank-specific fields */}
            {accountForm.category === 'Bank' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Bank Name</Label>
                    <Input
                      placeholder="e.g. Dutch Bangla"
                      value={accountForm.bankName}
                      onChange={(e) => setAccountForm(prev => ({ ...prev, bankName: e.target.value }))}
                      className="h-11 text-base"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Branch Name</Label>
                    <Input
                      placeholder="e.g. Dhanmondi"
                      value={accountForm.branchName}
                      onChange={(e) => setAccountForm(prev => ({ ...prev, branchName: e.target.value }))}
                      className="h-11 text-base"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Bank Account Type</Label>
                  <Select
                    value={accountForm.bankAccountType}
                    onValueChange={(val) => val && setAccountForm(prev => ({ ...prev, bankAccountType: val }))}
                  >
                    <SelectTrigger className="h-11 text-base">
                      <SelectValue placeholder="Select Account Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Savings">Savings Account</SelectItem>
                      <SelectItem value="Current">Current Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Account Number / Mobile Number */}
            {(accountForm.category === 'Bank' || accountForm.category === 'MFS') && (
              <div className="space-y-1.5 animate-in fade-in">
                <Label className="text-sm font-semibold">
                  {accountForm.category === 'MFS' ? 'Mobile Number' : 'Account Number'}
                </Label>
                <Input
                  placeholder={accountForm.category === 'MFS' ? 'e.g. 01712345678' : 'e.g. 104.120.55421'}
                  value={accountForm.accountNumber}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                  className="h-11 text-base font-mono"
                />
              </div>
            )}

            {/* Opening Balance */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Opening Balance (৳)</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={accountForm.openingBalance}
                onChange={(e) => setAccountForm(prev => ({ ...prev, openingBalance: e.target.value }))}
                className="h-11 text-base"
              />
              <p className="text-xs text-muted-foreground">Current balance when starting with this system.</p>
            </div>

            {/* Description/Note */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Note / Description</Label>
              <Textarea
                placeholder="Optional notes regarding this account..."
                value={accountForm.description}
                onChange={(e) => setAccountForm(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[80px] text-sm resize-y"
              />
            </div>

            {/* Submit */}
            <div className="pt-1 flex justify-center">
              <Button
                type="submit"
                disabled={creating}
                className="w-full sm:w-auto px-8 h-11 text-base rounded-full font-semibold"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Account
              </Button>
            </div>
          </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Internal Transfer Modal */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Transfer Funds (Internal Transfer)
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleTransfer} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">From Account (Source) *</Label>
              <Select
                value={transferForm.fromAccountId}
                onValueChange={(val) => {
                  const v = val || '';
                  setTransferForm(prev => ({ ...prev, fromAccountId: v }));
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select Source Account">
                    {transferForm.fromAccountId ? (
                      accounts.find(a => a._id === transferForm.fromAccountId)
                        ? `${accounts.find(a => a._id === transferForm.fromAccountId)?.name} (Available: ৳${Math.round(accounts.find(a => a._id === transferForm.fromAccountId)?.currentBalance || 0)})`
                        : 'Select Source Account'
                    ) : 'Select Source Account'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a._id} value={a._id} className="text-xs">
                      {a.name} (Available: ৳{Math.round(a.currentBalance || 0)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">To Account (Destination) *</Label>
              <Select
                value={transferForm.toAccountId}
                onValueChange={(val) => {
                  const v = val || '';
                  setTransferForm(prev => ({ ...prev, toAccountId: v }));
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select Destination Account">
                    {transferForm.toAccountId ? (
                      accounts.find(a => a._id === transferForm.toAccountId)
                        ? `${accounts.find(a => a._id === transferForm.toAccountId)?.name} (Balance: ৳${Math.round(accounts.find(a => a._id === transferForm.toAccountId)?.currentBalance || 0)})`
                        : 'Select Destination Account'
                    ) : 'Select Destination Account'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a._id !== transferForm.fromAccountId).map(a => (
                    <SelectItem key={a._id} value={a._id} className="text-xs">
                      {a.name} (Balance: ৳{Math.round(a.currentBalance || 0)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Transfer Amount (৳) *</Label>
                <Input
                  required
                  type="number"
                  min="1"
                  placeholder="e.g. 5000"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Transfer Date</Label>
                <Input
                  type="date"
                  value={transferForm.date}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, date: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Transfer Note / Reference</Label>
              <Input
                placeholder="e.g. Daily cash deposit to bank"
                value={transferForm.note}
                onChange={(e) => setTransferForm(prev => ({ ...prev, note: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setTransferOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={transferring} className="font-bold">
                {transferring ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Execute Transfer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

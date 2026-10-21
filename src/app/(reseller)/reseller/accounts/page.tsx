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
  ArrowUpCircle,
  X,
  Trash2,
  History,
  Search,
  Save
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
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
import { TransactionForm } from '@/components/admin/TransactionForm';
import { isTransferableAccount, cleanAccountName } from '@/lib/utils';

export default function ResellerAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Account Transaction History Modal State
  const [historyAccount, setHistoryAccount] = useState<any>(null);
  const [historyTransactions, setHistoryTransactions] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  const handleOpenHistory = async (acc: any) => {
    setHistoryAccount(acc);
    setHistorySearchTerm('');
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/reseller/ledger/transactions?accountId=${acc._id}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryTransactions(data || []);
      } else {
        toast.error('Failed to load transaction history');
      }
    } catch (err) {
      console.error('Error fetching account history:', err);
      toast.error('Failed to load transaction history');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Quick Transaction Modal State
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
    accountNumber: '',
    bankName: '',
    branchName: '',
    bankAccountType: 'Savings',
    mfsProvider: 'bKash',
    mfsType: 'Merchant',
    openingBalance: '',
    description: ''
  });
  const [submittingAccount, setSubmittingAccount] = useState(false);

  // Edit Opening Balance Modal State
  const [editOpeningModalOpen, setEditOpeningModalOpen] = useState(false);
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<any>(null);
  const [newOpeningBalance, setNewOpeningBalance] = useState('');
  const [submittingEditOpening, setSubmittingEditOpening] = useState(false);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reseller/accounts');
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

  // Group accounts by category (Excluding AR and AP from liquid cashflow accounts)
  const bankAccounts = accounts.filter(a => (a.category === 'Bank' || a.code === 'BANK') && a.code !== 'AR' && a.code !== 'AP');
  const cashAccounts = accounts.filter(a => a.category === 'Cash' || a.code === 'CASH');
  const mfsAccounts = accounts.filter(a => a.category === 'MFS');
  const totalBalance = (bankAccounts.reduce((acc, c) => acc + (c.currentBalance || 0), 0)) +
    (cashAccounts.reduce((acc, c) => acc + (c.currentBalance || 0), 0)) +
    (mfsAccounts.reduce((acc, c) => acc + (c.currentBalance || 0), 0));

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.name.trim() || !accountForm.code.trim()) {
      toast.error('Account name and unique code are required');
      return;
    }

    setSubmittingAccount(true);
    try {
      const res = await fetch('/api/reseller/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...accountForm,
          openingBalance: Number(accountForm.openingBalance) || 0
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create account');

      toast.success('Account created successfully');
      setNewAccountOpen(false);
      setAccountForm({
        name: '',
        code: '',
        category: 'Bank',
        accountNumber: '',
        bankName: '',
        branchName: '',
        bankAccountType: 'Savings',
        mfsProvider: 'bKash',
        mfsType: 'Merchant',
        openingBalance: '',
        description: ''
      });
      fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setSubmittingAccount(false);
    }
  };

  const handleUpdateOpeningBalance = async () => {
    if (!selectedAccountForEdit) return;
    setSubmittingEditOpening(true);
    try {
      const res = await fetch(`/api/reseller/accounts/${selectedAccountForEdit._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingBalance: Number(newOpeningBalance) || 0 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update balance');

      toast.success('Opening balance updated');
      setEditOpeningModalOpen(false);
      fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update balance');
    } finally {
      setSubmittingEditOpening(false);
    }
  };

  const handleDeleteAccount = async (account: any) => {
    const isDefault = ['CASH', 'BANK', 'AP', 'AR'].includes(account.code);
    if (isDefault) {
      await Swal.fire({
        title: 'Protected System Account',
        text: `"${account.name}" (${account.code}) is a core store account required for automatic store operations and cannot be deleted.`,
        icon: 'info',
        confirmButtonColor: '#3b82f6',
        confirmButtonText: 'Understood'
      });
      return;
    }

    const result = await Swal.fire({
      title: `Delete "${account.name}"?`,
      html: `<div class="text-xs text-left space-y-2">
        <p class="font-bold text-rose-600">⚠️ Warning: Permanent Data Deletion!</p>
        <p>Deleting this account will permanently delete:</p>
        <ul class="list-disc pl-4 space-y-1 text-muted-foreground">
          <li>All linked <b>Ledger Transactions & Journal entries</b> for this account.</li>
          <li>All linked <b>Expenses & Incomes</b> recorded under this account.</li>
          <li>All companion transfer entries will be removed and affected accounts will be automatically recalculated.</li>
          <li>Store dashboard analytics and reports will be synced immediately.</li>
        </ul>
        <p class="font-semibold text-rose-500 pt-1">This action cannot be undone!</p>
      </div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete & Sync Everything!',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/reseller/accounts/${account._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Account and all related records deleted successfully');
        fetchAccounts();
      } else {
        toast.error(data.message || 'Failed to delete account');
      }
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  const openQuickTx = (account: any, type: 'income' | 'expense', tab: 'journal' | 'transfer' = 'journal') => {
    setSelectedAccountForTx(account);
    setTxModalType(type);
    setTxModalTab(tab);
    setTxModalOpen(true);
  };

  return (
    <div className="flex-1 space-y-4 md:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">All Accounts</h2>
          <p className="text-xs md:text-sm text-muted-foreground">Manage your store bank accounts, cash registers, and MFS wallets</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => setNewAccountOpen(true)}
            className="h-9 gap-1.5 text-xs font-bold"
          >
            <Plus className="h-4 w-4" />
            Add New Account
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={fetchAccounts}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
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

      {/* Accounts List Grid */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground text-xs">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          Loading store accounts...
        </div>
      ) : accounts.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground text-xs">
          No accounts found. Click "Add New Account" to set up your accounts.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {accounts.map((acc) => {
            const isCash = acc.code === 'CASH' || acc.category === 'Cash';
            const isBank = acc.code === 'BANK' || acc.category === 'Bank';
            const isAR = acc.code === 'AR';
            const isAP = acc.code === 'AP';
            const isDefault = ['CASH', 'BANK', 'AP', 'AR'].includes(acc.code);

            const Icon = isCash
              ? Wallet
              : isBank
              ? Building2
              : isAR
              ? ArrowDownCircle
              : isAP
              ? ArrowUpCircle
              : acc.category === 'MFS'
              ? Smartphone
              : Building2;

            const iconClass = isCash
              ? 'bg-emerald-500/10 text-emerald-600'
              : isBank
              ? 'bg-indigo-500/10 text-indigo-600'
              : isAR
              ? 'bg-blue-500/10 text-blue-600'
              : isAP
              ? 'bg-rose-500/10 text-rose-600'
              : acc.category === 'MFS'
              ? 'bg-sky-500/10 text-sky-600'
              : 'bg-muted text-muted-foreground';

            const typeLabel = isCash
              ? 'Cash'
              : isAR
              ? 'Receivable'
              : isAP
              ? 'Payable'
              : acc.category || 'Bank';

            return (
              <Card key={acc._id} className="relative overflow-hidden hover:shadow-md transition-all border">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm leading-tight text-foreground line-clamp-1">{cleanAccountName(acc.name)}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold">{acc.code}</Badge>
                          <span className="text-[10px] text-muted-foreground font-medium">{typeLabel}</span>
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 text-xs font-medium">
                        <DropdownMenuItem
                          onClick={() => handleOpenHistory(acc)}
                          className="text-indigo-600 focus:text-indigo-700 font-semibold cursor-pointer gap-2"
                        >
                          <History className="h-3.5 w-3.5" />
                          <span>Transaction History</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer gap-2">
                          <Link href={`/reseller/ledger?accountId=${acc._id}&accountName=${encodeURIComponent(acc.name)}`}>
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>View in Full Ledger</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedAccountForEdit(acc);
                            setNewOpeningBalance(String(acc.openingBalance || 0));
                            setEditOpeningModalOpen(true);
                          }}
                          className="text-xs cursor-pointer gap-2"
                        >
                          <Save className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Edit Opening Balance</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteAccount(acc)}
                          className="text-xs cursor-pointer text-destructive focus:text-destructive gap-2 font-semibold"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          <span>Delete Account</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-3">
                  <div className="bg-muted/40 p-2.5 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium">Current Balance</p>
                      <p className="text-xl font-black text-foreground">৳{(acc.currentBalance || 0).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground font-medium">Opening Balance</p>
                      <p className="text-xs font-semibold text-muted-foreground">৳{(acc.openingBalance || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Account details if available */}
                  {(acc.accountNumber || acc.bankName || acc.mfsProvider) ? (
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      {acc.bankName && <p className="truncate">Bank: <span className="text-foreground font-medium">{acc.bankName} {acc.branchName ? `(${acc.branchName})` : ''}</span></p>}
                      {acc.accountNumber && <p className="truncate font-mono">A/C: <span className="text-foreground font-medium">{acc.accountNumber}</span></p>}
                      {acc.mfsProvider && <p className="truncate text-sky-600 font-semibold">{acc.mfsProvider} {acc.mfsType ? `· ${acc.mfsType}` : ''}</p>}
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground italic">
                      Direct account
                    </div>
                  )}

                  {/* Quick Action Buttons */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] px-1 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10"
                      onClick={() => openQuickTx(acc, 'income', 'journal')}
                    >
                      + Deposit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] px-1 text-rose-600 border-rose-500/20 hover:bg-rose-500/10"
                      onClick={() => openQuickTx(acc, 'expense', 'journal')}
                    >
                      - Debit
                    </Button>
                    {isTransferableAccount(acc) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] px-1 text-primary border-primary/20 hover:bg-primary/10"
                        onClick={() => openQuickTx(acc, 'expense', 'transfer')}
                      >
                        <ArrowRightLeft className="h-3 w-3 mr-1" /> Transfer
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Account Dialog */}
      <Dialog open={newAccountOpen} onOpenChange={setNewAccountOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add New Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAccount} className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Account Name *</Label>
              <Input
                placeholder="e.g. City Bank Current Account"
                value={accountForm.name}
                onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Unique Account Code *</Label>
                <Input
                  placeholder="e.g. CITY01"
                  value={accountForm.code}
                  onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value.toUpperCase() })}
                  className="h-8 text-xs uppercase"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Category *</Label>
                <Select
                  value={accountForm.category}
                  onValueChange={(val) => val && setAccountForm({ ...accountForm, category: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank" className="text-xs">Bank</SelectItem>
                    <SelectItem value="MFS" className="text-xs">MFS (bKash/Nagad)</SelectItem>
                    <SelectItem value="Other" className="text-xs">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {accountForm.category === 'Bank' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Bank Name</Label>
                  <Input
                    placeholder="e.g. City Bank"
                    value={accountForm.bankName}
                    onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Account Number</Label>
                  <Input
                    placeholder="Account Number"
                    value={accountForm.accountNumber}
                    onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}

            {accountForm.category === 'MFS' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Provider</Label>
                  <Select
                    value={accountForm.mfsProvider}
                    onValueChange={(val) => val && setAccountForm({ ...accountForm, mfsProvider: val })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bKash" className="text-xs">bKash</SelectItem>
                      <SelectItem value="Nagad" className="text-xs">Nagad</SelectItem>
                      <SelectItem value="Rocket" className="text-xs">Rocket</SelectItem>
                      <SelectItem value="Upay" className="text-xs">Upay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Wallet Number</Label>
                  <Input
                    placeholder="e.g. 017XXXXXXXX"
                    value={accountForm.accountNumber}
                    onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Opening Balance (৳)</Label>
              <Input
                type="number"
                placeholder="0"
                value={accountForm.openingBalance}
                onChange={(e) => setAccountForm({ ...accountForm, openingBalance: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description / Note</Label>
              <Textarea
                placeholder="Optional notes..."
                value={accountForm.description}
                onChange={(e) => setAccountForm({ ...accountForm, description: e.target.value })}
                className="text-xs min-h-[45px]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setNewAccountOpen(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submittingAccount} className="h-8 text-xs font-bold">
                {submittingAccount && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                Save Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Opening Balance Dialog */}
      <Dialog open={editOpeningModalOpen} onOpenChange={setEditOpeningModalOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Edit Opening Balance</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs py-1">
            <p className="text-muted-foreground">Account: <span className="font-bold text-foreground">{selectedAccountForEdit?.name}</span></p>
            <div className="space-y-1">
              <Label className="text-xs">New Opening Balance (৳)</Label>
              <Input
                type="number"
                value={newOpeningBalance}
                onChange={(e) => setNewOpeningBalance(e.target.value)}
                className="h-8 text-xs"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setEditOpeningModalOpen(false)} className="h-8 text-xs">Cancel</Button>
            <Button size="sm" onClick={handleUpdateOpeningBalance} disabled={submittingEditOpening} className="h-8 text-xs font-bold">
              {submittingEditOpening && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Transaction Modal (Add Money / Debit / Transfer) */}
      <Dialog open={txModalOpen} onOpenChange={setTxModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {txModalTab === 'transfer' ? 'Transfer Balance' : txModalType === 'income' ? 'Deposit Money' : 'Debit Money'}
            </DialogTitle>
          </DialogHeader>
          <TransactionForm
            presetAccountId={selectedAccountForTx?._id}
            presetType={txModalType}
            presetTab={txModalTab}
            apiPrefix="/api/reseller"
            onSuccess={() => {
              setTxModalOpen(false);
              fetchAccounts();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Account Specific Transaction History Modal */}
      <Dialog open={!!historyAccount} onOpenChange={(open) => { if (!open) setHistoryAccount(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-4 md:p-6 pb-3 border-b bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <DialogTitle className="flex items-center gap-2 text-lg md:text-xl font-bold">
                  <History className="h-5 w-5 text-indigo-600" />
                  <span>{historyAccount?.name} — Transaction History</span>
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Account Code: <span className="font-mono font-semibold text-foreground">{historyAccount?.code}</span>
                  {historyAccount?.accountNumber && ` • A/C: ${historyAccount.accountNumber}`}
                  {` • Type: ${historyAccount?.category || historyAccount?.type}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[11px] text-muted-foreground uppercase font-bold">Live Balance</div>
                  <div className={`text-base md:text-lg font-extrabold ${(historyAccount?.currentBalance ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ৳{Math.round(historyAccount?.currentBalance || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
            {/* Search within account transactions */}
            <div className="pt-2 flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search this account's transactions / ref..."
                  className="pl-8 h-8 text-xs bg-background"
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                />
              </div>
              <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5 shrink-0">
                <Link href={`/reseller/ledger?accountId=${historyAccount?._id}&accountName=${encodeURIComponent(historyAccount?.name || '')}`}>
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Open Full Ledger</span>
                </Link>
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {historyLoading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (() => {
              const filtered = historyTransactions.filter((tx) => {
                if (!historySearchTerm.trim()) return true;
                const term = historySearchTerm.toLowerCase();
                const desc = (tx.description || '').toLowerCase();
                const ref = (tx.reference || '').toLowerCase();
                return desc.includes(term) || ref.includes(term);
              });

              if (filtered.length === 0) {
                return (
                  <div className="flex h-40 flex-col items-center justify-center text-muted-foreground text-xs text-center">
                    <FileText className="h-8 w-8 mb-2 stroke-1 opacity-50" />
                    <p>No transaction records found for this account.</p>
                  </div>
                );
              }

              return (
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground border-b uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-right">Debit</th>
                        <th className="py-2.5 px-3 text-right">Credit</th>
                        <th className="py-2.5 px-3 text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filtered.map((tx: any) => {
                        return (
                          <tr key={tx._id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                              {format(new Date(tx.date), 'dd MMM yyyy')}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-foreground">{tx.description}</div>
                              {tx.reference && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono inline-block mt-0.5">
                                  Ref: {tx.reference}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-primary whitespace-nowrap">
                              {tx.type === 'debit' ? `৳${Math.round(tx.amount || 0).toLocaleString()}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-foreground whitespace-nowrap">
                              {tx.type === 'credit' ? `৳${Math.round(tx.amount || 0).toLocaleString()}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap">
                              ৳{Math.round(tx.balanceAfter || 0).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>

          <DialogFooter className="p-3 border-t bg-muted/10 flex items-center justify-between sm:justify-between">
            <span className="text-xs text-muted-foreground pl-2">
              Total {historyTransactions.length} transaction{historyTransactions.length === 1 ? '' : 's'} recorded
            </span>
            <Button variant="ghost" size="sm" onClick={() => setHistoryAccount(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

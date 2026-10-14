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
  Trash2
} from 'lucide-react';
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
import { isTransferableAccount } from '@/lib/utils';

export default function ResellerAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const totalBalance = accounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);

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
    const result = await Swal.fire({
      title: 'Delete Account?',
      text: `Are you sure you want to delete ${account.name}? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/reseller/accounts/${account._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Account deleted successfully');
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Total Current Balance</p>
            </div>
            <p className="text-2xl font-black text-foreground mt-1">৳{totalBalance.toLocaleString()}</p>
          </CardContent>
        </Card>

        {['Cash', 'Bank', 'MFS'].map((cat) => {
          const catAccounts = accounts.filter(a => a.category === cat);
          const catBal = catAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
          const Icon = cat === 'Cash' ? Wallet : cat === 'Bank' ? Landmark : Smartphone;
          return (
            <Card key={cat} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-medium">{cat} Accounts</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{catAccounts.length}</Badge>
                </div>
                <p className="text-xl font-black text-foreground mt-1">৳{catBal.toLocaleString()}</p>
              </CardContent>
            </Card>
          );
        })}
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
            const Icon = acc.category === 'Cash' ? Wallet : acc.category === 'Bank' ? Landmark : Smartphone;

            return (
              <Card key={acc._id} className="relative overflow-hidden hover:shadow-md transition-all border">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm leading-tight text-foreground line-clamp-1">{acc.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold">{acc.code}</Badge>
                          <span className="text-[10px] text-muted-foreground">{acc.category}</span>
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" className="h-7 w-7 p-0" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedAccountForEdit(acc);
                            setNewOpeningBalance(String(acc.openingBalance || 0));
                            setEditOpeningModalOpen(true);
                          }}
                          className="text-xs cursor-pointer"
                        >
                          Edit Opening Balance
                        </DropdownMenuItem>
                        {!isCash && (
                          <DropdownMenuItem
                            onClick={() => handleDeleteAccount(acc)}
                            className="text-xs cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete Account
                          </DropdownMenuItem>
                        )}
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
                  {(acc.accountNumber || acc.bankName) && (
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      {acc.bankName && <p className="truncate">Bank: <span className="text-foreground font-medium">{acc.bankName}</span></p>}
                      {acc.accountNumber && <p className="truncate">A/C: <span className="text-foreground font-medium">{acc.accountNumber}</span></p>}
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
    </div>
  );
}

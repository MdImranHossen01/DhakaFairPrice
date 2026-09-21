'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2,
  Plus,
  Search,
  ArrowRightLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  DollarSign,
  Wallet,
  Landmark,
  Edit2,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { Pagination } from '@/components/ui/pagination';
import { MobileDataCard, MobileDataRow } from '@/components/common/MobileDataCard';

function AccountsLedgerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [journalSearchTerm, setJournalSearchTerm] = useState('');
  
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });

  // Editing Opening Balance state
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [newOpeningBalance, setNewOpeningBalance] = useState<number>(0);
  const [updatingOpening, setUpdatingOpening] = useState(false);

  // Manual Transaction Dialog state
  const [isTxOpen, setIsTxOpen] = useState(false);
  
  const initialTab = (searchParams.get('tab') as 'journal' | 'transfer') || 'journal';
  const [activeTab, setActiveTab] = useState<'journal' | 'transfer'>(initialTab);

  // Sync state to URL search params
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    } else {
      params.delete('page');
    }
    if (activeTab !== 'journal') {
      params.set('tab', activeTab);
    } else {
      params.delete('tab');
    }
    router.push(`/admin/ledger?${params.toString()}`);
  }, [currentPage, activeTab]);

  useEffect(() => {
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    router.push(`/admin/ledger?${params.toString()}`);
  }, [journalSearchTerm, dateFilter.from, dateFilter.to]);

  const [accountCode, setAccountCode] = useState<'CASH' | 'BANK'>('CASH');
  const [fromAccountCode, setFromAccountCode] = useState<'CASH' | 'BANK'>('CASH');
  const [toAccountCode, setToAccountCode] = useState<'CASH' | 'BANK'>('BANK');
  const [journalType, setJournalType] = useState<'in' | 'out'>('out');
  const [journalAmount, setJournalAmount] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [creatingTx, setCreatingTx] = useState(false);
  const [editingTx, setEditingTx] = useState<any>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAccounts();
    fetchTransactions();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/admin/ledger/accounts');
      if (!res.ok) throw new Error('Failed to fetch accounts');
      const data = await res.json();
      setAccounts(data);
    } catch (error) {
      toast.error('Failed to load accounts');
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/ledger/transactions');
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const data = await res.json();
      setTransactions(data);
    } catch (error) {
      toast.error('Failed to load transaction logs');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    try {
      setUpdatingOpening(true);
      const res = await fetch('/api/admin/ledger/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: editingAccount.code,
          openingBalance: newOpeningBalance,
        }),
      });

      if (!res.ok) throw new Error('Failed to update opening balance');
      toast.success(`${editingAccount.name} opening balance updated!`);
      setEditingAccount(null);
      fetchAccounts();
      fetchTransactions();
    } catch (error) {
      toast.error('Failed to update opening balance');
    } finally {
      setUpdatingOpening(false);
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Title is required');
      return;
    }

    let finalEntryType: 'deposit' | 'withdrawal' | 'transfer' = 'deposit';
    let finalAmount = 0;

    if (activeTab === 'journal') {
      const amtVal = parseFloat(journalAmount) || 0;
      if (amtVal <= 0) {
        toast.error('Please enter a positive amount.');
        return;
      }

      if (journalType === 'in') {
        finalEntryType = 'deposit';
        finalAmount = amtVal;
      } else {
        finalEntryType = 'withdrawal';
        finalAmount = amtVal;
      }
    } else {
      const transVal = parseFloat(transferAmount) || 0;
      if (transVal <= 0) {
        toast.error('Please enter a positive transfer amount.');
        return;
      }
      finalEntryType = 'transfer';
      finalAmount = transVal;
    }

    try {
      setCreatingTx(true);
      const payload = {
        entryType: finalEntryType,
        amount: finalAmount,
        description,
        date,
        accountCode: finalEntryType !== 'transfer' ? accountCode : undefined,
        fromAccountCode: finalEntryType === 'transfer' ? fromAccountCode : undefined,
        toAccountCode: finalEntryType === 'transfer' ? toAccountCode : undefined,
      };

      const url = editingTx ? `/api/admin/ledger/transactions/${editingTx._id}` : '/api/admin/ledger/transactions';
      const method = editingTx ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Transaction saving failed');
      }

      toast.success(editingTx ? 'Ledger entry updated successfully!' : 'Ledger entry recorded successfully!');
      
      if (editingTx) {
        setIsTxOpen(false);
        setEditingTx(null);
        resetTxForm();
      } else {
        setJournalAmount('');
        setTransferAmount('');
        setDescription('');
        setTimeout(() => {
          titleRef.current?.focus();
        }, 50);
      }
      
      fetchAccounts();
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save transaction');
    } finally {
      setCreatingTx(false);
    }
  };

  const handleEditClick = (tx: any) => {
    setEditingTx(tx);
    const tab = tx.reference === 'manual-transfer' ? 'transfer' : 'journal';
    setActiveTab(tab);
    
    setAccountCode(tx.account?.code || 'CASH');
    setJournalType(tx.type === 'debit' ? 'in' : 'out');
    
    const cleanDesc = tx.description.replace(/^(Transfer to |Transfer from |Manual Deposit: |Manual Withdrawal: |Transfer to CASH: |Transfer to BANK: |Transfer from CASH: |Transfer from BANK: )/g, '');
    setDescription(cleanDesc);
    setDate(format(new Date(tx.date), 'yyyy-MM-dd'));

    if (tab === 'journal') {
      setJournalAmount(tx.amount.toString());
    } else {
      setTransferAmount(tx.amount.toString());
      if (tx.type === 'debit') {
        setToAccountCode(tx.account?.code || 'BANK');
        setFromAccountCode(tx.account?.code === 'CASH' ? 'BANK' : 'CASH');
      } else {
        setFromAccountCode(tx.account?.code || 'CASH');
        setToAccountCode(tx.account?.code === 'CASH' ? 'BANK' : 'CASH');
      }
    }
    setIsTxOpen(true);
  };

  const handleDeleteTx = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Ledger Entry?',
      text: 'Are you sure you want to delete this manual transaction? This will update the running balances of the ledger.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/admin/ledger/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Transaction deleted successfully');
        fetchAccounts();
        fetchTransactions();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to delete transaction');
      }
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
  };

  const resetTxForm = () => {
    setActiveTab('journal');
    setAccountCode('CASH');
    setFromAccountCode('CASH');
    setToAccountCode('BANK');
    setJournalType('out');
    setJournalAmount('');
    setTransferAmount('');
    setDescription('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setEditingTx(null);
  };

  const filteredTransactions = transactions.filter((tx) => {
    const term = journalSearchTerm.toLowerCase();
    const name = tx.account?.name?.toLowerCase() || '';
    const desc = tx.description?.toLowerCase() || '';
    const ref = tx.reference?.toLowerCase() || '';
    const matchesSearch = name.includes(term) || desc.includes(term) || ref.includes(term);

    let matchesDate = true;
    if (dateFilter.from) {
      matchesDate = matchesDate && new Date(tx.date) >= new Date(dateFilter.from + 'T00:00:00');
    }
    if (dateFilter.to) {
      matchesDate = matchesDate && new Date(tx.date) <= new Date(dateFilter.to + 'T23:59:59');
    }

    return matchesSearch && matchesDate;
  });

  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-4 md:space-y-6 px-0 py-2 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3">
        <div>
          <h2 className="text-xl md:text-3xl font-bold tracking-tight">Accounts Ledger</h2>
          <p className="text-muted-foreground text-xs md:text-sm mt-0.5">
            Manage cash & bank opening balances, record manual entries, and track account receivables.
          </p>
        </div>
        <Button onClick={() => setIsTxOpen(true)} className="w-full sm:w-auto bg-primary text-primary-foreground font-bold h-9 text-xs">
          <Plus className="mr-1.5 h-4 w-4" /> New Journal Entry
        </Button>
      </div>

      {/* Account Balance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {accounts.map((acc) => {
          const isCash = acc.code === 'CASH';
          const isBank = acc.code === 'BANK';

          return (
            <Card key={acc._id} className="relative overflow-hidden shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-1 p-2.5 sm:p-3 md:p-4">
                <CardTitle className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                  {acc.name}
                </CardTitle>
                {isCash ? (
                  <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                ) : isBank ? (
                  <Landmark className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                ) : (
                  <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                )}
              </CardHeader>
              <CardContent className="space-y-1.5 p-2.5 sm:p-3 md:p-4 pt-0">
                <div className="text-lg sm:text-2xl font-bold tracking-tight">৳{Math.round(acc.currentBalance).toLocaleString()}</div>
                <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] sm:text-xs text-muted-foreground border-t pt-1.5">
                  <span className="truncate">Opening: ৳{Math.round(acc.openingBalance || 0).toLocaleString()}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingAccount(acc);
                      setNewOpeningBalance(acc.openingBalance || 0);
                    }}
                    className="h-5 sm:h-6 px-1.5 text-[10px] sm:text-xs hover:bg-muted"
                  >
                    <Edit2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" /> Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Transactions Journal */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="p-3 md:p-4 bg-muted/20 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <CardTitle className="text-sm md:text-base font-bold">Transaction Journal</CardTitle>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 sm:w-60 md:w-72">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search description / ref..."
                  className="pl-8 h-8 text-xs"
                  value={journalSearchTerm}
                  onChange={(e) => setJournalSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-md border text-xs">
                <Input
                  type="date"
                  className="h-7 w-28 border-none bg-transparent focus-visible:ring-0 text-xs px-1"
                  value={dateFilter.from}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                />
                <span className="text-muted-foreground text-[10px]">to</span>
                <Input
                  type="date"
                  className="h-7 w-28 border-none bg-transparent focus-visible:ring-0 text-xs px-1"
                  value={dateFilter.to}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                />
              </div>
              {(dateFilter.from || dateFilter.to || journalSearchTerm) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateFilter({ from: '', to: '' });
                    setJournalSearchTerm('');
                  }}
                  className="text-xs text-muted-foreground hover:text-primary h-7 px-2"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-muted-foreground text-xs">
              <Plus className="h-8 w-8 mb-2 stroke-1" />
              <p>No journal entries found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[110px] whitespace-nowrap">Date</TableHead>
                      <TableHead className="w-[150px] whitespace-nowrap">Account</TableHead>
                      <TableHead className="max-w-[300px]">Description</TableHead>
                      <TableHead className="w-[110px] whitespace-nowrap">Type</TableHead>
                      <TableHead className="text-right w-[120px] whitespace-nowrap">Amount (৳)</TableHead>
                      <TableHead className="text-right w-[150px] whitespace-nowrap">Running Balance (৳)</TableHead>
                      <TableHead className="text-right w-[80px] whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.map((tx) => (
                      <TableRow key={tx._id}>
                        <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                          {format(new Date(tx.date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="font-semibold whitespace-nowrap text-xs">{tx.account?.name}</TableCell>
                        <TableCell className="max-w-[280px] md:max-w-[340px] whitespace-normal break-words py-2.5">
                          <div className="space-y-1">
                            <p className="leading-snug text-xs md:text-sm text-foreground">{tx.description}</p>
                            {tx.reference && (
                              <span className="inline-block text-[10px] text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded font-mono">
                                Ref: {tx.reference}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge
                            variant={tx.type === 'debit' ? 'default' : 'outline'}
                            className={tx.type === 'debit' ? 'bg-primary/20 text-primary hover:bg-primary/20 border-transparent text-xs' : 'text-xs'}
                          >
                            {tx.type === 'debit' ? 'Debit (+)' : 'Credit (-)'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold whitespace-nowrap text-xs md:text-sm">৳{Math.round(tx.amount).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold whitespace-nowrap text-xs md:text-sm">৳{Math.round(tx.balanceAfter).toLocaleString()}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {tx.reference && ['manual-deposit', 'manual-withdrawal', 'manual-transfer'].includes(tx.reference) ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditClick(tx)}>
                                    <Edit2 className="mr-2 h-4 w-4 text-indigo-600" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleDeleteTx(tx._id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List */}
              <div className="block md:hidden p-2 space-y-2.5">
                {paginatedTransactions.map((tx) => (
                  <MobileDataCard
                    key={tx._id}
                    title={tx.description || 'Transaction'}
                    badge={
                      <Badge
                        variant={tx.type === 'debit' ? 'default' : 'outline'}
                        className={`text-[10px] ${tx.type === 'debit' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}
                      >
                        {tx.type === 'debit' ? 'Debit (+)' : 'Credit (-)'}
                      </Badge>
                    }
                    footer={
                      <div className="flex items-center justify-between w-full font-bold text-xs">
                        <span className="text-muted-foreground">Running Balance:</span>
                        <span className="text-foreground text-sm">৳{Math.round(tx.balanceAfter).toLocaleString()}</span>
                      </div>
                    }
                  >
                    <MobileDataRow label="Date" value={format(new Date(tx.date), 'dd MMM yyyy')} />
                    <MobileDataRow label="Account" value={<span className="font-semibold">{tx.account?.name}</span>} />
                    <MobileDataRow 
                      label="Amount" 
                      value={
                        <span className={`font-bold ${tx.type === 'debit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tx.type === 'debit' ? '+' : '-'}৳{Math.round(tx.amount).toLocaleString()}
                        </span>
                      } 
                    />
                    {tx.reference && (
                      <MobileDataRow 
                        label="Reference" 
                        value={<span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{tx.reference}</span>} 
                      />
                    )}
                    {tx.reference && ['manual-deposit', 'manual-withdrawal', 'manual-transfer'].includes(tx.reference) && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t">
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(tx)} className="h-7 text-xs px-2">
                          <Edit2 className="h-3 w-3 mr-1 text-indigo-600" /> Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteTx(tx._id)} className="h-7 text-xs px-2">
                          <Trash2 className="h-3 w-3 mr-1" /> Delete
                        </Button>
                      </div>
                    )}
                  </MobileDataCard>
                ))}
              </div>
            </>
          )}

          {totalPages > 1 && (
            <div className="py-3 border-t bg-background px-3">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Opening Balance Dialog */}
      <Dialog open={!!editingAccount} onOpenChange={(open) => { if (!open) setEditingAccount(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Opening Balance — {editingAccount?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateOpeningBalance} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openingBal">Opening Balance (৳)</Label>
              <Input
                id="openingBal"
                type="number"
                value={newOpeningBalance}
                onChange={(e) => setNewOpeningBalance(parseFloat(e.target.value) || 0)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Note: Changing the opening balance will recalculate the entire ledger running balance.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingAccount(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updatingOpening} className="bg-primary text-primary-foreground font-bold">
                {updatingOpening && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Balance
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manual Entry Transaction Dialog */}
      <Dialog open={isTxOpen} onOpenChange={(open) => { setIsTxOpen(open); if(!open) resetTxForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTx ? 'Edit' : 'New'} Journal Entry</DialogTitle>
          </DialogHeader>

          {/* Custom Tabs */}
          {!editingTx && (
            <div className="flex border-b border-muted">
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'journal'
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('journal')}
              >
                Cash In / Out (Journal)
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'transfer'
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('transfer')}
              >
                Account Transfer
              </button>
            </div>
          )}

          <form onSubmit={handleCreateTransaction} className="space-y-3 pt-2 text-xs">
            {activeTab === 'journal' ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="txDate" className="text-xs">Transaction Date</Label>
                    <Input
                      id="txDate"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="accCode" className="text-xs">Target Account</Label>
                    <Select
                      value={accountCode}
                      onValueChange={(val: any) => setAccountCode(val)}
                    >
                      <SelectTrigger id="accCode" className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH" className="text-xs">Cash Account</SelectItem>
                        <SelectItem value="BANK" className="text-xs">Bank Account</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="journalType"
                        value="in"
                        checked={journalType === 'in'}
                        onChange={() => setJournalType('in')}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                      />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                        Debit (Cash In)
                      </span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="journalType"
                        value="out"
                        checked={journalType === 'out'}
                        onChange={() => setJournalType('out')}
                        className="h-4 w-4 text-rose-600 focus:ring-rose-500 border-gray-300"
                      />
                      <span className="text-rose-600 dark:text-rose-400 font-semibold text-xs">
                        Credit (Cash Out)
                      </span>
                    </label>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <Label htmlFor="txDate" className="text-xs">Transaction Date</Label>
                  <Input
                    id="txDate"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="h-8 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="fromAcc" className="text-xs">From Account</Label>
                    <Select
                      value={fromAccountCode}
                      onValueChange={(val: any) => {
                        setFromAccountCode(val);
                        if (val === toAccountCode) {
                          setToAccountCode(val === 'CASH' ? 'BANK' : 'CASH');
                        }
                      }}
                    >
                      <SelectTrigger id="fromAcc" className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH" className="text-xs">Cash</SelectItem>
                        <SelectItem value="BANK" className="text-xs">Bank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="toAcc" className="text-xs">To Account</Label>
                    <Select
                      value={toAccountCode}
                      onValueChange={(val: any) => {
                        setToAccountCode(val);
                        if (val === fromAccountCode) {
                          setFromAccountCode(val === 'CASH' ? 'BANK' : 'CASH');
                        }
                      }}
                    >
                      <SelectTrigger id="toAcc" className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH" className="text-xs">Cash</SelectItem>
                        <SelectItem value="BANK" className="text-xs">Bank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <Label htmlFor="txDesc" className="text-xs">Title</Label>
              <Input
                id="txDesc"
                ref={titleRef}
                autoFocus
                placeholder={
                  activeTab === 'journal'
                    ? "e.g. Sales Income or Facebook Ads Cost"
                    : "e.g. Account Transfer"
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="h-8 text-xs"
              />
            </div>

            {activeTab === 'journal' ? (
              <div className="space-y-1">
                <Label htmlFor="journalAmt" className="text-xs">Amount (৳)</Label>
                <Input
                  id="journalAmt"
                  type="number"
                  min="1"
                  placeholder="Enter amount"
                  value={journalAmount}
                  onChange={(e) => setJournalAmount(e.target.value)}
                  required
                  className="h-8 text-xs"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="transferAmt" className="text-xs">Transfer Amount (৳)</Label>
                <Input
                  id="transferAmt"
                  type="number"
                  min="1"
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  required
                  className="h-8 text-xs"
                />
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsTxOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={creatingTx} className="bg-primary text-primary-foreground font-bold">
                {creatingTx && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log Transaction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AccountsLedgerPage() {
  return (
    <Suspense fallback={<div className="flex h-32 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <AccountsLedgerContent />
    </Suspense>
  );
}

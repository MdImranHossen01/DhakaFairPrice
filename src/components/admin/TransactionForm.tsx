'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, ArrowRightLeft, ReceiptText } from 'lucide-react';
import { cn } from '@/lib/utils';

const transactionSchema = z.object({
  type: z.enum(['expense', 'income']),
  title: z.string().min(2, 'Title must be at least 2 characters'),
  amount: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : Number(val)),
    z.number({ message: 'Amount is required' }).min(1, 'Amount must be at least 1')
  ),
  category: z.string().min(1, 'Category is required'),
  paymentAccountId: z.string().optional(),
  date: z.string().min(1, 'Date is required').refine(s => !isNaN(Date.parse(s)), { message: 'Invalid date format' }),
  description: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  initialData?: any;
  presetType?: 'expense' | 'income';
  presetAccountId?: string;
  presetTab?: 'journal' | 'transfer';
  onSuccess: (wasEdit: boolean) => void;
}

export function TransactionForm({ 
  initialData, 
  presetType, 
  presetAccountId, 
  presetTab, 
  onSuccess 
}: TransactionFormProps) {
  const [activeTab, setActiveTab] = useState<'journal' | 'transfer'>(presetTab || 'journal');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  // Account Transfer Form State
  const [transferDate, setTransferDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [fromAccountId, setFromAccountId] = useState<string>(presetAccountId || '');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [transferTitle, setTransferTitle] = useState<string>('Account Transfer');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Keyboard navigation refs (Journal form)
  const dateRef = useRef<HTMLInputElement>(null);
  const categoryTriggerRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  // Keyboard navigation refs (Transfer form)
  const tDateRef = useRef<HTMLInputElement>(null);
  const tFromTriggerRef = useRef<HTMLButtonElement>(null);
  const tToTriggerRef = useRef<HTMLButtonElement>(null);
  const tTitleRef = useRef<HTMLInputElement>(null);
  const tAmountRef = useRef<HTMLInputElement>(null);
  const tSubmitBtnRef = useRef<HTMLButtonElement>(null);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema) as any,
    defaultValues: {
      type: initialData?.type || presetType || 'expense',
      title: initialData?.title || '',
      amount: initialData?.amount !== undefined ? initialData.amount : '',
      category: initialData?.category || '',
      paymentAccountId: initialData?.paymentAccountId?._id || initialData?.paymentAccountId || presetAccountId || '',
      date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      description: initialData?.description || '',
    },
  });

  const selectedType = form.watch('type');
  const selectedCategory = form.watch('category');
  const selectedAmount = Number(form.watch('amount')) || 0;
  const selectedAccountId = form.watch('paymentAccountId');

  // Load Categories & Accounts
  const loadAccountsAndCategories = async () => {
    try {
      const [catRes, accRes] = await Promise.all([
        fetch(`/api/admin/expenses-incomes/categories?type=${selectedType}`),
        fetch('/api/admin/accounts')
      ]);

      if (catRes.ok) {
        const cData = await catRes.json();
        const loadedCategories = cData.categories || [];
        setCategories(loadedCategories);

        const currentCategory = form.getValues('category');
        const isCurrentValid = loadedCategories.some((c: any) => c.name === currentCategory);
        if (!isCurrentValid && loadedCategories.length > 0 && !initialData) {
          form.setValue('category', loadedCategories[0].name);
          // Auto-fill title with first category if title is empty
          if (!form.getValues('title')) {
            form.setValue('title', loadedCategories[0].name, { shouldValidate: true });
          }
        }
      }

      if (accRes.ok) {
        const aData = await accRes.json();
        const loadedAccounts = aData.accounts || [];
        setAccounts(loadedAccounts);

        // Set default transfer accounts if empty
        if (loadedAccounts.length > 0) {
          setFromAccountId((prev) => prev || loadedAccounts[0]._id);
          if (loadedAccounts.length > 1) {
            setToAccountId((prev) => prev || loadedAccounts[1]._id);
          } else {
            setToAccountId((prev) => prev || loadedAccounts[0]._id);
          }

          // Default payment account for journal if not set
          const currentAcc = form.getValues('paymentAccountId');
          if (!currentAcc && !initialData) {
            form.setValue('paymentAccountId', loadedAccounts[0]._id);
          }
        }
      }
    } catch (err) {
      console.error('Meta load error in TransactionForm:', err);
    }
  };

  useEffect(() => {
    loadAccountsAndCategories();
  }, [selectedType]);

  // Title Auto-fill when category changes (for new entries)
  const handleCategoryChange = (categoryName: string | null) => {
    if (!categoryName) return;
    form.setValue('category', categoryName);
    if (!initialData) {
      form.setValue('title', categoryName, { shouldValidate: true });
    }
  };

  // Keyboard navigation event handlers (Journal Form)
  const handleDateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      categoryTriggerRef.current?.focus();
    }
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleRef.current?.focus();
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      amountRef.current?.focus();
    }
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      accountTriggerRef.current?.focus();
    }
  };

  const handleAccountKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      descriptionRef.current?.focus();
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitBtnRef.current?.focus();
      form.handleSubmit(onSubmit)();
    }
  };

  // Global Ctrl+Enter submit for journal form
  const handleJournalFormKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      form.handleSubmit(onSubmit)();
    }
  };

  // Journal Form Submit Handler
  const onSubmit = async (values: TransactionFormValues) => {
    // Insufficient balance check for expense
    if (values.type === 'expense' && values.paymentAccountId) {
      const selectedAcc = accounts.find((a) => a._id === values.paymentAccountId);
      if (selectedAcc) {
        const isEditSame = initialData && initialData.paymentAccountId?._id === selectedAcc._id && initialData.type === 'expense';
        const effectiveBalance = (selectedAcc.currentBalance || 0) + (isEditSame ? initialData.amount : 0);
        if (values.amount > effectiveBalance) {
          toast.error(`Insufficient balance in ${selectedAcc.name}. Available: ৳${effectiveBalance.toLocaleString()}`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const url = initialData ? `/api/admin/expenses-incomes/${initialData._id}` : '/api/admin/expenses-incomes';
      const method = initialData ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        toast.success(`Transaction ${initialData ? 'updated' : 'recorded'} successfully!`);
        if (initialData) {
          onSuccess(true);
        } else {
          // Reset fields for rapid consecutive entries while keeping the form open
          const defaultCat = categories.length > 0 ? categories[0].name : '';
          form.reset({
            type: form.getValues('type'),
            title: defaultCat,
            amount: '' as any,
            category: defaultCat,
            paymentAccountId: form.getValues('paymentAccountId'),
            date: form.getValues('date'),
            description: '',
          });
          onSuccess(false);
          loadAccountsAndCategories();
          setTimeout(() => {
            dateRef.current?.focus();
          }, 60);
        }
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.message || 'Failed to save transaction');
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Keyboard navigation for Transfer Form
  const handleTransferFormKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleTransferSubmit(e as any);
    }
  };

  const handleTDateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      tFromTriggerRef.current?.focus();
    }
  };

  const handleTFromKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      tToTriggerRef.current?.focus();
    }
  };

  const handleTToKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      tTitleRef.current?.focus();
    }
  };

  const handleTTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      tAmountRef.current?.focus();
    }
  };

  const handleTAmountKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      tSubmitBtnRef.current?.focus();
      handleTransferSubmit(e as any);
    }
  };

  // Account Transfer Submit Handler
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amt = Number(transferAmount);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid transfer amount');
      tAmountRef.current?.focus();
      return;
    }

    if (!fromAccountId || !toAccountId) {
      toast.error('Please select both source and destination accounts');
      return;
    }

    if (fromAccountId === toAccountId) {
      toast.error('Source and destination accounts cannot be the same');
      return;
    }

    const sourceAcc = accounts.find((a) => a._id === fromAccountId);
    if (sourceAcc && amt > (sourceAcc.currentBalance || 0)) {
      toast.error(`Insufficient balance in ${sourceAcc.name}. Available: ৳${(sourceAcc.currentBalance || 0).toLocaleString()}`);
      return;
    }

    setTransferLoading(true);
    try {
      const res = await fetch('/api/admin/accounts/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAccountId,
          toAccountId,
          amount: amt,
          note: transferTitle,
          date: transferDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Transfer failed');
      }

      toast.success(data.message || 'Account transfer recorded successfully!');
      // Reset transfer inputs and keep open
      setTransferAmount('');
      setTransferTitle('Account Transfer');
      onSuccess(false);
      loadAccountsAndCategories();
      setTimeout(() => {
        tDateRef.current?.focus();
      }, 60);
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast.error(error.message || 'Failed to complete transfer');
    } finally {
      setTransferLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Top Tab Switcher (Only visible when adding a new record) */}
      {!initialData && (
        <div className="flex border-b border-border pb-1 mb-2">
          <button
            type="button"
            onClick={() => setActiveTab('journal')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 pb-2 text-xs font-semibold border-b-2 transition-all cursor-pointer",
              activeTab === 'journal'
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <ReceiptText className="h-3.5 w-3.5" />
            Cash In / Out (Journal)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('transfer')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 pb-2 text-xs font-semibold border-b-2 transition-all cursor-pointer",
              activeTab === 'transfer'
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Account Transfer
          </button>
        </div>
      )}

      {/* 1. Cash In / Out (Journal) Form */}
      {activeTab === 'journal' || initialData ? (
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(onSubmit)} 
            onKeyDown={handleJournalFormKeyDown} 
            className="space-y-3 text-xs"
          >
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      ref={(e) => {
                        field.ref(e);
                        dateRef.current = e;
                      }}
                      onKeyDown={handleDateKeyDown}
                      className="h-8 text-xs"
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs">Transaction Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex items-center gap-6 pt-0.5"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="expense" id="type-expense" />
                        <Label htmlFor="type-expense" className="text-rose-600 dark:text-rose-400 font-bold cursor-pointer text-xs select-none">
                          Expense (খরচ)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="income" id="type-income" />
                        <Label htmlFor="type-income" className="text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer text-xs select-none">
                          Income (আয়)
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Category *</FormLabel>
                    <Select value={field.value} onValueChange={handleCategoryChange}>
                      <FormControl>
                        <SelectTrigger 
                          ref={categoryTriggerRef}
                          onKeyDown={handleCategoryKeyDown}
                          className="h-8 text-xs"
                        >
                          <SelectValue placeholder="Select Category">
                            {field.value || "Select Category"}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c._id} value={c.name} className="text-xs">
                            {c.name}
                          </SelectItem>
                        ))}
                        {categories.length === 0 && (
                          <SelectItem value="Others" className="text-xs">Others</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Bank / Cash Account</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger 
                          ref={accountTriggerRef}
                          onKeyDown={handleAccountKeyDown}
                          className="h-8 text-xs"
                        >
                          <SelectValue placeholder="Select Account">
                            {field.value
                              ? accounts.find((a) => a._id === field.value)
                                ? `${accounts.find((a) => a._id === field.value)?.name} (৳${Math.round(accounts.find((a) => a._id === field.value)?.currentBalance || 0).toLocaleString()})`
                                : "Select Account"
                              : "Select Account"}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((a) => {
                          const hasInsufficient = selectedType === 'expense' && selectedAmount > (a.currentBalance || 0);
                          return (
                            <SelectItem 
                              key={a._id} 
                              value={a._id} 
                              className="text-xs"
                            >
                              {a.name} (৳{Math.round(a.currentBalance || 0).toLocaleString()})
                              {hasInsufficient && " ⚠️"}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Title / Reason *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={selectedType === 'expense' ? 'e.g. Facebook Ads Campaign / Office Rent' : 'e.g. Direct Sales / Partner Inflow'} 
                      {...field} 
                      ref={(e) => {
                        field.ref(e);
                        titleRef.current = e;
                      }}
                      onKeyDown={handleTitleKeyDown}
                      className="h-8 text-xs"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Amount (৳) *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Enter amount"
                      {...field} 
                      onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                      ref={(e) => {
                        field.ref(e);
                        amountRef.current = e;
                      }}
                      onKeyDown={handleAmountKeyDown}
                      className="h-8 text-xs text-right font-bold"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Description / Note</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Optional additional notes..." 
                      {...field} 
                      ref={(e) => {
                        field.ref(e);
                        descriptionRef.current = e;
                      }}
                      onKeyDown={handleDescriptionKeyDown}
                      className="text-xs min-h-[50px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              ref={submitBtnRef} 
              type="submit" 
              className="w-full h-8 font-bold text-xs" 
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {initialData ? 'Update' : 'Confirm & Record'} {selectedType === 'expense' ? 'Expense' : 'Income'}
            </Button>
          </form>
        </Form>
      ) : (
        /* 2. Account Transfer Form */
        <form 
          onSubmit={handleTransferSubmit} 
          onKeyDown={handleTransferFormKeyDown}
          className="space-y-3 text-xs"
        >
          <div className="space-y-1">
            <Label htmlFor="transferDate" className="text-xs">Transaction Date *</Label>
            <Input
              id="transferDate"
              ref={tDateRef}
              type="date"
              className="h-8 text-xs"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              onKeyDown={handleTDateKeyDown}
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">From Account *</Label>
              <Select
                value={fromAccountId}
                onValueChange={(val) => {
                  const value = val || '';
                  setFromAccountId(value);
                  if (value === toAccountId) {
                    const nextAcc = accounts.find((a) => a._id !== value);
                    if (nextAcc) setToAccountId(nextAcc._id);
                  }
                }}
              >
                <SelectTrigger 
                  ref={tFromTriggerRef}
                  onKeyDown={handleTFromKeyDown}
                  className="h-8 text-xs"
                >
                  <SelectValue placeholder="Select Source">
                    {fromAccountId
                      ? accounts.find((a) => a._id === fromAccountId)
                        ? `${accounts.find((a) => a._id === fromAccountId)?.name} (৳${Math.round(accounts.find((a) => a._id === fromAccountId)?.currentBalance || 0).toLocaleString()})`
                        : "Select Source"
                      : "Select Source"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => {
                    const amtVal = parseFloat(transferAmount) || 0;
                    const hasInsufficient = amtVal > (acc.currentBalance || 0);
                    return (
                      <SelectItem 
                        key={acc._id} 
                        value={acc._id} 
                        className="text-xs"
                      >
                        {acc.name} (৳{Math.round(acc.currentBalance || 0).toLocaleString()})
                        {hasInsufficient && " ⚠️"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">To Account *</Label>
              <Select
                value={toAccountId}
                onValueChange={(val) => {
                  const value = val || '';
                  setToAccountId(value);
                  if (value === fromAccountId) {
                    const nextAcc = accounts.find((a) => a._id !== value);
                    if (nextAcc) setFromAccountId(nextAcc._id);
                  }
                }}
              >
                <SelectTrigger 
                  ref={tToTriggerRef}
                  onKeyDown={handleTToKeyDown}
                  className="h-8 text-xs"
                >
                  <SelectValue placeholder="Select Destination">
                    {toAccountId
                      ? accounts.find((a) => a._id === toAccountId)
                        ? `${accounts.find((a) => a._id === toAccountId)?.name} (৳${Math.round(accounts.find((a) => a._id === toAccountId)?.currentBalance || 0).toLocaleString()})`
                        : "Select Destination"
                      : "Select Destination"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc._id} value={acc._id} className="text-xs">
                      {acc.name} (৳{Math.round(acc.currentBalance || 0).toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="transferTitle" className="text-xs">Title / Description *</Label>
            <Input
              id="transferTitle"
              ref={tTitleRef}
              placeholder="e.g. Account Transfer"
              className="h-8 text-xs"
              value={transferTitle}
              onChange={(e) => setTransferTitle(e.target.value)}
              onKeyDown={handleTTitleKeyDown}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="transferAmt" className="text-xs">Transfer Amount (৳) *</Label>
            <Input
              id="transferAmt"
              ref={tAmountRef}
              type="number"
              min="1"
              placeholder="0.00"
              className="h-8 text-xs text-right font-bold"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              onKeyDown={handleTAmountKeyDown}
              required
            />
          </div>

          <Button 
            ref={tSubmitBtnRef}
            type="submit" 
            className="w-full h-8 font-bold text-xs" 
            disabled={transferLoading}
          >
            {transferLoading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Log Transfer Transaction
          </Button>
        </form>
      )}
    </div>
  );
}

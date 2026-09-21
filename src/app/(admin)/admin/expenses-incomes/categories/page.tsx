'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash, ArrowLeft, Loader2, RefreshCw, Tag, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/expenses-incomes/categories');
      if (res.ok) {
        const json = await res.json();
        setCategories(json.categories || []);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/expenses-incomes/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), type })
      });
      if (res.ok) {
        toast.success(`Category "${name}" created successfully`);
        setName('');
        fetchCategories();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to create category');
      }
    } catch (error) {
      toast.error('Error creating category');
    } finally {
      setSubmitting(false);
    }
  };

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

  return (
    <div className="flex-1 space-y-6 px-0 py-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/expenses-incomes" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Expense & Income Categories</h1>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Manage custom categories for organizing business expenses and revenue sources.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchCategories} disabled={loading} className="h-9">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Category Form Card */}
        <Card className="shadow-xs lg:col-span-1 h-fit">
          <CardHeader className="bg-muted/30 py-3 px-4 border-b">
            <CardTitle className="text-sm md:text-base font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Add New Category
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={handleAddCategory} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs">Category Type</Label>
                <Select value={type} onValueChange={(val: any) => val && setType(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Type">
                      {type === "expense" ? "Expense (খরচ)" : type === "income" ? "Income (আয়)" : "Select Type"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense" className="text-xs font-semibold text-rose-600">Expense (খরচ)</SelectItem>
                    <SelectItem value="income" className="text-xs font-semibold text-emerald-600">Income (আয়)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Category Name *</Label>
                <Input
                  required
                  placeholder="e.g. Courier Charge / Packaging / Google Ads"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full font-bold h-9">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                Create Category
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Categories List Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Expense Categories */}
          <Card className="shadow-xs overflow-hidden">
            <CardHeader className="bg-rose-500/10 border-b border-rose-500/20 py-2.5 px-4 flex flex-row items-center justify-between">
              <span className="font-bold text-rose-700 dark:text-rose-300 text-sm flex items-center gap-1.5">
                <Tag className="h-4 w-4" /> Expense Categories ({expenseCategories.length})
              </span>
              <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-300">Expense</Badge>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                {expenseCategories.map(c => (
                  <Badge key={c._id} variant="secondary" className="px-3 py-1.5 text-xs font-medium bg-muted/60 text-foreground border">
                    {c.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Income Categories */}
          <Card className="shadow-xs overflow-hidden">
            <CardHeader className="bg-emerald-500/10 border-b border-emerald-500/20 py-2.5 px-4 flex flex-row items-center justify-between">
              <span className="font-bold text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-1.5">
                <Tag className="h-4 w-4" /> Income Categories ({incomeCategories.length})
              </span>
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">Income</Badge>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                {incomeCategories.map(c => (
                  <Badge key={c._id} variant="secondary" className="px-3 py-1.5 text-xs font-medium bg-muted/60 text-foreground border">
                    {c.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

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

export default function ResellerCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reseller/expenses-incomes/categories');
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
      const res = await fetch('/api/reseller/expenses-incomes/categories', {
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
      toast.error('Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string, catName: string) => {
    if (!confirm(`Are you sure you want to delete category "${catName}"?`)) return;
    try {
      const res = await fetch(`/api/reseller/expenses-incomes/categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Category deleted successfully');
        fetchCategories();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to delete category');
      }
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/reseller/expenses-incomes">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Transaction Categories</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Manage categories for your store operating expenses and incomes</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchCategories} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Create Category Form */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Add New Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs">Category Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Courier Charge, Boosting"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="type" className="text-xs">Category Type</Label>
                <Select value={type} onValueChange={(val: 'expense' | 'income') => setType(val)}>
                  <SelectTrigger id="type" className="h-8 text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense" className="text-xs">Expense (খরচ)</SelectItem>
                    <SelectItem value="income" className="text-xs">Income (আয়)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" size="sm" className="w-full h-8 text-xs font-bold" disabled={submitting}>
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                Save Category
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Existing Categories List */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-rose-500" />
                  Expense Categories
                </span>
                <Badge variant="secondary" className="text-[10px]">{expenseCategories.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-6 text-muted-foreground text-xs">Loading categories...</div>
              ) : expenseCategories.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-xs">No expense categories found</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {expenseCategories.map((c) => (
                    <Badge
                      key={c._id}
                      variant="outline"
                      className="px-2.5 py-1 text-xs bg-rose-500/5 text-rose-600 border-rose-500/20 flex items-center gap-1.5"
                    >
                      {c.name}
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(c._id, c.name)}
                        className="hover:text-destructive transition-colors ml-1"
                        title="Delete category"
                      >
                        <Trash className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-emerald-500" />
                  Income Categories
                </span>
                <Badge variant="secondary" className="text-[10px]">{incomeCategories.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-6 text-muted-foreground text-xs">Loading categories...</div>
              ) : incomeCategories.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-xs">No income categories found</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {incomeCategories.map((c) => (
                    <Badge
                      key={c._id}
                      variant="outline"
                      className="px-2.5 py-1 text-xs bg-emerald-500/5 text-emerald-600 border-emerald-500/20 flex items-center gap-1.5"
                    >
                      {c.name}
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(c._id, c.name)}
                        className="hover:text-destructive transition-colors ml-1"
                        title="Delete category"
                      >
                        <Trash className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

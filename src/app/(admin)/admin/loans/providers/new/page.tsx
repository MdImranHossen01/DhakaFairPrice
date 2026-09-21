'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function AddLoanProviderPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Provider Name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/loans/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        toast.success('Loan provider added successfully');
        router.push('/admin/loans/providers');
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to add provider');
      }
    } catch (error) {
      toast.error('Error adding provider');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 px-0 py-4 md:p-8 max-w-2xl">
      <div className="flex items-center gap-2 border-b pb-4">
        <Link href="/admin/loans/providers" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Loan Provider</h1>
          <p className="text-muted-foreground text-xs md:text-sm">
            Register a new bank, NGO, or financial partner for business loans.
          </p>
        </div>
      </div>

      <Card className="shadow-xs">
        <CardHeader className="bg-muted/30 py-3 px-4 border-b">
          <CardTitle className="text-sm md:text-base font-bold flex items-center gap-2">
            <Building className="h-4 w-4 text-primary" /> Loan Provider Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">Provider / Institution Name *</Label>
              <Input
                required
                placeholder="e.g. BRAC Bank / Eastern Bank / Partner Investor"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Phone Number</Label>
                <Input
                  placeholder="e.g. 01700000000"
                  value={form.phone}
                  onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email Address</Label>
                <Input
                  type="email"
                  placeholder="e.g. loan@bank.com"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Office / Branch Address</Label>
              <Input
                placeholder="e.g. Motijheel C/A, Dhaka"
                value={form.address}
                onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notes / Description</Label>
              <Input
                placeholder="Optional relationship or terms note"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Link href="/admin/loans/providers">
                <Button type="button" variant="outline" size="sm">Cancel</Button>
              </Link>
              <Button type="submit" size="sm" disabled={saving} className="font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Save Provider
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

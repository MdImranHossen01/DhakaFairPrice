'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building, Plus, Loader2, RefreshCw, ArrowLeft, Phone, Mail, MapPin } from 'lucide-react';
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

export default function LoanProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Provider Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/loans/providers');
      if (res.ok) {
        const json = await res.json();
        setProviders(json.providers || []);
      } else {
        toast.error('Failed to load loan providers');
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error);
      toast.error('Failed to load loan providers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/loans/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        toast.success('Loan provider added successfully');
        setModalOpen(false);
        setForm({ name: '', phone: '', email: '', address: '', description: '' });
        fetchProviders();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to add provider');
      }
    } catch (error) {
      toast.error('Error adding loan provider');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 px-0 py-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/loans" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Loan Providers & Lenders</h1>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Directory of banks, financial institutions, and partners providing capital loans.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5 font-bold">
            <Plus className="h-4 w-4" />
            <span>+ Add Provider</span>
          </Button>

          <Button variant="outline" size="icon" onClick={fetchProviders} disabled={loading} className="h-9 w-9">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Providers Grid / Table */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/30 py-3 px-4 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-sm md:text-base font-bold flex items-center gap-2">
            <Building className="h-4 w-4 text-primary" /> Registered Loan Providers
          </CardTitle>
          <Badge variant="outline" className="text-xs font-mono">{providers.length} Providers</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm text-center border-collapse">
              <thead>
                <tr className="bg-muted/20 border-b text-muted-foreground font-semibold">
                  <th className="p-3 text-left font-bold text-foreground">Provider Name</th>
                  <th className="p-3 text-left font-bold text-foreground">Contact</th>
                  <th className="p-3 text-left font-bold text-muted-foreground">Address</th>
                  <th className="p-3 font-bold text-foreground">Total Loans</th>
                  <th className="p-3 font-bold text-foreground">Total Borrowed</th>
                  <th className="p-3 font-bold text-rose-600 text-right">Outstanding Balance</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading providers...</span>
                      </div>
                    </td>
                  </tr>
                ) : providers.length > 0 ? (
                  providers.map((p: any) => (
                    <tr key={p._id} className="border-b border-muted/30 hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-left">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-primary" />
                          {p.name}
                        </div>
                        {p.description && <div className="text-[11px] text-muted-foreground">{p.description}</div>}
                      </td>
                      <td className="p-3 text-left">
                        {p.phone && <div className="text-xs font-medium text-foreground">{p.phone}</div>}
                        {p.email && <div className="text-[11px] text-muted-foreground">{p.email}</div>}
                      </td>
                      <td className="p-3 text-left text-muted-foreground text-xs">{p.address || '-'}</td>
                      <td className="p-3 font-bold text-foreground">{p.totalLoansCount || 0}</td>
                      <td className="p-3 font-medium text-foreground">৳{Math.round(p.totalLoanAmount || 0).toLocaleString()}</td>
                      <td className="p-3 font-bold text-right text-rose-600">
                        ৳{Math.round(p.totalDueAmount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">No loan providers registered yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Provider Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <Building className="h-5 w-5 text-primary" />
              Add Loan Provider / Lender
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Provider / Institution Name *</Label>
              <Input
                required
                placeholder="e.g. BRAC Bank / Eastern Bank / Private Partner"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Phone Number</Label>
                <Input
                  placeholder="e.g. 01700000000"
                  value={form.phone}
                  onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  placeholder="e.g. loan@bank.com"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Address</Label>
              <Input
                placeholder="Office or branch address"
                value={form.address}
                onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description / Terms Note</Label>
              <Input
                placeholder="Optional notes or relationship info"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving} className="font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Save Provider
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

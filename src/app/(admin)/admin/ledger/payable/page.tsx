'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Building2, 
  Store, 
  Wallet, 
  Loader2, 
  RefreshCw, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Search,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function PayableLedgerPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'suppliers' | 'resellers'>('suppliers');
  const [search, setSearch] = useState('');

  const fetchPayables = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ledger/payable');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch payable ledger:', error);
      toast.error('Failed to load payable ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayables();
  }, []);

  const supplierDueBills = data?.supplierPayables?.dueBills || [];
  const resellersList = data?.resellerPayables?.resellers || [];

  const filteredBills = supplierDueBills.filter((b: any) =>
    b.billNo?.toLowerCase().includes(search.toLowerCase()) ||
    b.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.supplier?.companyName?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredResellers = resellersList.filter((r: any) =>
    r.storeName?.toLowerCase().includes(search.toLowerCase()) ||
    r.subdomain?.toLowerCase().includes(search.toLowerCase()) ||
    r.ownerName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-6 px-0 py-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/ledger" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Accounts Payable Ledger (প্রদেয় দায়)</h1>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Comprehensive ledger of outstanding supplier purchase dues and drop-shipping reseller wallet liabilities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPayables} disabled={loading} className="h-9">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-rose-500/5 border-rose-500/20 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-600 uppercase">Total Combined Payable</p>
              <p className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">
                ৳{Math.round(data?.grandTotalPayable || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setActiveTab('suppliers')}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Supplier Bills Due</p>
              <p className="text-xl font-bold text-foreground mt-1">
                ৳{Math.round(data?.supplierPayables?.totalDue || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setActiveTab('resellers')}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Reseller Wallet Liability</p>
              <p className="text-xl font-bold text-foreground mt-1">
                ৳{Math.round(data?.resellerPayables?.totalWalletPayable || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600">
              <Wallet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center bg-muted/50 p-1 rounded-lg border w-fit">
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`text-xs px-4 py-1.5 rounded-md font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'suppliers' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            Supplier Payables ({data?.supplierPayables?.dueBills?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('resellers')}
            className={`text-xs px-4 py-1.5 rounded-md font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'resellers' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Store className="h-3.5 w-3.5" />
            Reseller Payables ({data?.resellerPayables?.resellers?.length || 0})
          </button>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={activeTab === 'suppliers' ? 'Search supplier or bill...' : 'Search reseller store...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* 1. Supplier Payables Table */}
      {activeTab === 'suppliers' && (
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="bg-muted/30 py-3 px-4 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-600" /> Outstanding Supplier Invoices & Dues
            </CardTitle>
            <Link href="/admin/supplier-bills" className="text-xs text-primary font-semibold hover:underline">
              Manage Supplier Bills &rarr;
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm text-center border-collapse">
                <thead>
                  <tr className="bg-muted/20 border-b text-muted-foreground font-semibold">
                    <th className="p-3 text-left font-bold text-foreground">Date</th>
                    <th className="p-3 font-bold text-foreground">Bill No</th>
                    <th className="p-3 text-left font-bold text-foreground">Supplier</th>
                    <th className="p-3 font-bold text-foreground">Total Bill</th>
                    <th className="p-3 font-bold text-emerald-600">Paid</th>
                    <th className="p-3 font-bold text-rose-600 text-right">Outstanding Due</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Loading supplier dues...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredBills.length > 0 ? (
                    filteredBills.map((bill: any) => (
                      <tr key={bill._id} className="border-b border-muted/30 hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-left text-muted-foreground">{new Date(bill.date).toLocaleDateString()}</td>
                        <td className="p-3 font-medium text-foreground font-mono">{bill.billNo}</td>
                        <td className="p-3 text-left">
                          <div className="font-bold text-foreground">{bill.supplier?.name}</div>
                          {bill.supplier?.companyName && (
                            <div className="text-[11px] text-muted-foreground">{bill.supplier?.companyName}</div>
                          )}
                        </td>
                        <td className="p-3 font-medium text-foreground">৳{Math.round(bill.total || 0).toLocaleString()}</td>
                        <td className="p-3 font-medium text-emerald-600">৳{Math.round(bill.paidAmount || 0).toLocaleString()}</td>
                        <td className="p-3 font-bold text-right text-rose-600">
                          ৳{Math.round(bill.dueAmount || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">No outstanding supplier dues.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Reseller Payables Table */}
      {activeTab === 'resellers' && (
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="bg-muted/30 py-3 px-4 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Store className="h-4 w-4 text-sky-600" /> Reseller Cleared Wallet Liabilities
            </CardTitle>
            <Link href="/admin/payouts" className="text-xs text-primary font-semibold hover:underline">
              Process Payout Requests &rarr;
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm text-center border-collapse">
                <thead>
                  <tr className="bg-muted/20 border-b text-muted-foreground font-semibold">
                    <th className="p-3 text-left font-bold text-foreground">Reseller Store</th>
                    <th className="p-3 text-left font-bold text-foreground">Owner</th>
                    <th className="p-3 font-bold text-foreground">Total Orders</th>
                    <th className="p-3 font-bold text-emerald-600 dark:text-emerald-400">Lifetime Earnings</th>
                    <th className="p-3 font-bold text-muted-foreground">Pending In-Transit</th>
                    <th className="p-3 font-bold text-primary text-right">Cleared Wallet Due</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Loading reseller liabilities...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredResellers.length > 0 ? (
                    filteredResellers.map((r: any) => (
                      <tr key={r._id} className="border-b border-muted/30 hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-left">
                          <div className="font-bold text-foreground flex items-center gap-1.5">
                            <Store className="h-3.5 w-3.5 text-primary" />
                            {r.storeName}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">{r.subdomain}.swapnobaz.com</div>
                        </td>
                        <td className="p-3 text-left">
                          <div className="font-medium text-foreground">{r.ownerName}</div>
                          {r.ownerPhone && <div className="text-[11px] text-muted-foreground">{r.ownerPhone}</div>}
                        </td>
                        <td className="p-3 font-medium text-foreground">
                          <Badge variant="outline" className="font-mono bg-muted/40 font-semibold text-xs">
                            {r.totalOrders || 0} Orders
                          </Badge>
                        </td>
                        <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400">
                          ৳{Math.round(r.totalEarnings || 0).toLocaleString()}
                        </td>
                        <td className="p-3 font-medium text-muted-foreground">
                          ৳{Math.round(r.pendingBalance || 0).toLocaleString()}
                        </td>
                        <td className="p-3 font-bold text-right text-base text-primary">
                          ৳{Math.round(r.walletBalance || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">No reseller liabilities recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Building2, 
  Users, 
  ShoppingBag, 
  Loader2, 
  RefreshCw, 
  ArrowLeft, 
  Search,
  DollarSign,
  FileText,
  Truck,
  ExternalLink,
  Phone,
  MapPin,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function ReceivableLedgerPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bills' | 'clients' | 'orders'>('bills');
  const [search, setSearch] = useState('');

  const fetchReceivables = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ledger/receivable');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch receivable ledger:', error);
      toast.error('Failed to load receivable ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceivables();
  }, []);

  const clientDueBills = data?.clientPayables?.dueBills || [];
  const clientSummaries = data?.clientPayables?.clientDues || [];
  const pendingOrders = data?.orderReceivables?.orders || [];

  const filteredBills = clientDueBills.filter((b: any) =>
    b.invoiceNo?.toLowerCase().includes(search.toLowerCase()) ||
    b.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    b.clientPhone?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredClients = clientSummaries.filter((c: any) =>
    c.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    c.clientPhone?.toLowerCase().includes(search.toLowerCase()) ||
    c.clientAddress?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredOrders = pendingOrders.filter((o: any) =>
    o.shortId?.toLowerCase().includes(search.toLowerCase()) ||
    o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    o.customerPhone?.toLowerCase().includes(search.toLowerCase()) ||
    o.city?.toLowerCase().includes(search.toLowerCase())
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
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Accounts Receivable Ledger (প্রাপ্য সম্পদ)</h1>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Comprehensive ledger of outstanding client credit bills, customer receivables, and pending delivery cashflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchReceivables} disabled={loading} className="h-9">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-emerald-500/5 border-emerald-500/20 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase">Total Combined Receivable</p>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                ৳{Math.round(data?.grandTotalReceivable || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="shadow-xs cursor-pointer hover:border-primary/40 transition-colors" 
          onClick={() => setActiveTab('bills')}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Client Credit Bills Due</p>
              <p className="text-xl font-bold text-foreground mt-1">
                ৳{Math.round(data?.clientPayables?.totalDue || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="shadow-xs cursor-pointer hover:border-primary/40 transition-colors" 
          onClick={() => setActiveTab('orders')}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Pending COD & In-Transit</p>
              <p className="text-xl font-bold text-foreground mt-1">
                ৳{Math.round(data?.orderReceivables?.totalPending || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600">
              <Truck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center bg-muted/50 p-1 rounded-lg border w-fit overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('bills')}
            className={`text-xs px-4 py-1.5 rounded-md font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'bills' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Client Due Bills ({clientDueBills.length})
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`text-xs px-4 py-1.5 rounded-md font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'clients' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Client Ledger Summary ({clientSummaries.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`text-xs px-4 py-1.5 rounded-md font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'orders' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Order Receivables ({pendingOrders.length})
          </button>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              activeTab === 'bills' 
                ? 'Search invoice or client...' 
                : activeTab === 'clients' 
                ? 'Search client name/phone...' 
                : 'Search order or customer...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* 1. Client Due Invoices Table */}
      {activeTab === 'bills' && (
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="bg-muted/30 py-3 px-4 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-600" /> Outstanding Client Credit Invoices
            </CardTitle>
            <Link href="/admin/bills" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              Manage Client Bills <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm text-center border-collapse">
                <thead>
                  <tr className="bg-muted/20 border-b text-muted-foreground font-semibold">
                    <th className="p-3 text-left font-bold text-foreground">Date</th>
                    <th className="p-3 font-bold text-foreground">Invoice No</th>
                    <th className="p-3 text-left font-bold text-foreground">Client Details</th>
                    <th className="p-3 font-bold text-foreground">Total Bill</th>
                    <th className="p-3 font-bold text-emerald-600">Collected</th>
                    <th className="p-3 font-bold text-rose-600 text-right">Current Due</th>
                    <th className="p-3 font-bold text-foreground text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Loading client dues...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredBills.length > 0 ? (
                    filteredBills.map((bill: any) => (
                      <tr key={bill._id} className="border-b border-muted/30 hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-left text-muted-foreground">
                          {new Date(bill.date).toLocaleDateString()}
                        </td>
                        <td className="p-3 font-medium text-foreground font-mono">
                          {bill.invoiceNo}
                        </td>
                        <td className="p-3 text-left">
                          <div className="font-bold text-foreground">{bill.clientName}</div>
                          <div className="text-[11px] text-muted-foreground">{bill.clientPhone}</div>
                        </td>
                        <td className="p-3 font-medium text-foreground">
                          ৳{Math.round(bill.gTotal || bill.total || 0).toLocaleString()}
                        </td>
                        <td className="p-3 font-medium text-emerald-600">
                          ৳{Math.round(bill.cashIn || 0).toLocaleString()}
                        </td>
                        <td className="p-3 font-bold text-right text-rose-600">
                          ৳{Math.round(bill.currentBillDue || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <Link 
                            href={`/admin/bills?search=${encodeURIComponent(bill.invoiceNo)}`}
                            className="text-xs text-primary hover:underline font-semibold"
                          >
                            View / Collect
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">
                        No outstanding client credit dues found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Client Ledger Dues Summary Table */}
      {activeTab === 'clients' && (
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="bg-muted/30 py-3 px-4 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" /> Client-wise Outstanding Balance Summary
            </CardTitle>
            <Link href="/admin/bills" className="text-xs text-primary font-semibold hover:underline">
              Create New Invoice &rarr;
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm text-center border-collapse">
                <thead>
                  <tr className="bg-muted/20 border-b text-muted-foreground font-semibold">
                    <th className="p-3 text-left font-bold text-foreground">Client Name</th>
                    <th className="p-3 text-left font-bold text-foreground">Phone & Address</th>
                    <th className="p-3 font-bold text-foreground">Invoices</th>
                    <th className="p-3 font-bold text-foreground">Total Billed</th>
                    <th className="p-3 font-bold text-emerald-600">Total Collected</th>
                    <th className="p-3 font-bold text-rose-600 text-right">Total Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Loading client summaries...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredClients.length > 0 ? (
                    filteredClients.map((client: any, idx: number) => (
                      <tr key={idx} className="border-b border-muted/30 hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-left">
                          <div className="font-bold text-foreground">{client.clientName}</div>
                        </td>
                        <td className="p-3 text-left">
                          <div className="text-xs font-mono text-foreground">{client.clientPhone}</div>
                          {client.clientAddress && (
                            <div className="text-[11px] text-muted-foreground truncate max-w-xs">{client.clientAddress}</div>
                          )}
                        </td>
                        <td className="p-3 font-medium text-foreground">
                          <Badge variant="outline" className="text-[10px]">{client.totalInvoices} Bills</Badge>
                        </td>
                        <td className="p-3 font-medium text-foreground">
                          ৳{Math.round(client.totalBilled || 0).toLocaleString()}
                        </td>
                        <td className="p-3 font-medium text-emerald-600">
                          ৳{Math.round(client.totalCollected || 0).toLocaleString()}
                        </td>
                        <td className="p-3 font-bold text-right text-rose-600 text-base">
                          ৳{Math.round(client.totalDue || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        No client due balances recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Order & COD Receivables Table */}
      {activeTab === 'orders' && (
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="bg-muted/30 py-3 px-4 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-sky-600" /> Pending Customer Orders & Courier COD
            </CardTitle>
            <Link href="/admin/orders" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              Manage Orders <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm text-center border-collapse">
                <thead>
                  <tr className="bg-muted/20 border-b text-muted-foreground font-semibold">
                    <th className="p-3 text-left font-bold text-foreground">Order ID</th>
                    <th className="p-3 text-left font-bold text-foreground">Customer</th>
                    <th className="p-3 font-bold text-foreground">Courier / Status</th>
                    <th className="p-3 font-bold text-foreground">Payment Method</th>
                    <th className="p-3 font-bold text-primary text-right">Receivable Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Loading pending order receivables...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredOrders.length > 0 ? (
                    filteredOrders.map((ord: any) => (
                      <tr key={ord._id} className="border-b border-muted/30 hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-left font-mono font-bold text-foreground">
                          #{ord.shortId}
                        </td>
                        <td className="p-3 text-left">
                          <div className="font-bold text-foreground">{ord.customerName}</div>
                          <div className="text-[11px] text-muted-foreground">{ord.customerPhone} {ord.city ? `(${ord.city})` : ''}</div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-semibold">{ord.courierName}</span>
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                              {ord.status}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-3 font-medium text-muted-foreground">
                          {ord.paymentMethod === 'COD' ? 'Cash on Delivery' : ord.paymentMethod}
                        </td>
                        <td className="p-3 font-bold text-right text-base text-primary">
                          ৳{Math.round(ord.totalAmount || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">
                        No pending order receivables.
                      </td>
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

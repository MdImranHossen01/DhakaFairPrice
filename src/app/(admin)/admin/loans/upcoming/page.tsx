'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Building, 
  CalendarClock, 
  DollarSign, 
  Loader2, 
  RefreshCw, 
  ArrowLeft, 
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function UpcomingPayablePage() {
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUpcoming = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/loans?status=Active');
      if (res.ok) {
        const json = await res.json();
        // Sort by expectedRepaymentDate ascending (nearest dues first)
        const sorted = (json.loans || []).sort((a: any, b: any) => 
          new Date(a.expectedRepaymentDate).getTime() - new Date(b.expectedRepaymentDate).getTime()
        );
        setLoans(sorted);
      }
    } catch (error) {
      console.error('Failed to fetch upcoming payables:', error);
      toast.error('Failed to load upcoming payables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcoming();
  }, []);

  const totalUpcomingDue = loans.reduce((acc, l) => acc + (l.dueAmount || 0), 0);

  return (
    <div className="flex-1 space-y-6 px-0 py-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/loans" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Upcoming Payable (আসন্ন লোন পরিশোধ)</h1>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Active loans ordered chronologically by repayment maturity date for financial planning.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchUpcoming} disabled={loading} className="h-9">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {/* Summary Alert Card */}
      <Card className="bg-amber-500/5 border-amber-500/20 shadow-xs">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" /> Total Active Loan Repayment Liability
            </p>
            <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
              ৳{Math.round(totalUpcomingDue).toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
            <CalendarClock className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Table */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/30 py-3 px-4 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-sm md:text-base font-bold flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" /> Active Repayment Schedule
          </CardTitle>
          <Badge variant="outline" className="text-xs font-mono">{loans.length} Due Loans</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm text-center border-collapse">
              <thead>
                <tr className="bg-muted/20 border-b text-muted-foreground font-semibold">
                  <th className="p-3 text-left font-bold text-foreground">Repayment Date</th>
                  <th className="p-3 font-bold text-foreground">Loan ID</th>
                  <th className="p-3 text-left font-bold text-foreground">Lender / Bank</th>
                  <th className="p-3 font-bold text-foreground">Principal (৳)</th>
                  <th className="p-3 font-bold text-emerald-600">Paid (৳)</th>
                  <th className="p-3 font-bold text-rose-600 text-right">Payable Due</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading upcoming schedule...</span>
                      </div>
                    </td>
                  </tr>
                ) : loans.length > 0 ? (
                  loans.map((l: any) => {
                    const dueDate = new Date(l.expectedRepaymentDate);
                    const dueEndOfDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate(), 23, 59, 59, 999);
                    const isOverdue = dueEndOfDay.getTime() < Date.now();
                    return (
                      <tr key={l._id} className="border-b border-muted/30 hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-left">
                          <div className={`font-bold ${isOverdue ? 'text-destructive flex items-center gap-1' : 'text-foreground'}`}>
                            {new Date(l.expectedRepaymentDate).toLocaleDateString()}
                            {isOverdue && <Badge variant="destructive" className="text-[9px] py-0 px-1">Overdue</Badge>}
                          </div>
                        </td>
                        <td className="p-3 font-mono font-bold text-foreground">{l.loanId}</td>
                        <td className="p-3 text-left">
                          <div className="font-bold text-foreground">{l.lenderName}</div>
                          {l.lenderId?.phone && <div className="text-[11px] text-muted-foreground">{l.lenderId.phone}</div>}
                        </td>
                        <td className="p-3 font-medium text-foreground">৳{Math.round(l.amount).toLocaleString()}</td>
                        <td className="p-3 font-medium text-emerald-600">৳{Math.round(l.paidAmount || 0).toLocaleString()}</td>
                        <td className="p-3 font-bold text-right text-rose-600">
                          ৳{Math.round(l.dueAmount || 0).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">No active upcoming loan repayments due.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

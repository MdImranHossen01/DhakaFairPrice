'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  CalendarDays,
  Receipt,
  Package,
  TrendingUp,
  Tag,
  Wallet,
  FileSpreadsheet,
  ArrowRight,
  BarChart3,
  Sparkles,
} from 'lucide-react';

const reportSections = [
  {
    title: 'Daily Sales & Profit',
    description: 'Day-by-day sales revenue, customer delivery fees, product cost, gross commission and net profit.',
    icon: Calendar,
    href: '/reseller/reports/daily',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    tag: 'Daily Stats',
  },
  {
    title: 'Monthly Financial Report',
    description: '12-month annualized breakdown of sales, delivery costs, gross commissions, expenses and net profit.',
    icon: CalendarDays,
    href: '/reseller/reports/monthly',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    tag: 'Annual Breakdown',
  },
  {
    title: 'Order Profit Report',
    description: 'Detailed invoice-by-invoice profit breakdown, item counts, base cost vs retail price and commission clearance.',
    icon: Receipt,
    href: '/reseller/reports/order-profit',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    tag: 'Per Order Profit',
  },
  {
    title: 'Item Profit Report',
    description: 'Product-level performance analyzing sold quantities, retail revenue, wholesale cost and profit margins.',
    icon: Package,
    href: '/reseller/reports/item-profit',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    tag: 'Item Margins',
  },
  {
    title: 'Top & Low Sales',
    description: 'Discover bestsellers generating maximum revenue and slow-moving items that need marketing attention.',
    icon: TrendingUp,
    href: '/reseller/reports/product-sales',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    tag: 'Product Velocity',
  },
  {
    title: 'Brand Wise Sales',
    description: 'Monthly and custom period sales distribution categorized by product brands in your store.',
    icon: Tag,
    href: '/reseller/reports/brand-sales',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    tag: 'Brand Analytics',
  },
  {
    title: 'Payout & Earnings',
    description: 'Track all wallet ledger transactions, cleared commissions, pending payouts and withdrawal history.',
    icon: Wallet,
    href: '/reseller/reports/payouts',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    tag: 'Wallet & Payouts',
  },
  {
    title: 'Expense & Profit-Loss',
    description: 'Track marketing, advertising, operational costs and calculate accurate net business profit.',
    icon: FileSpreadsheet,
    href: '/reseller/reports/expense',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    tag: 'Operational Costs',
  },
];

export default function ResellerReportsOverviewPage() {
  return (
    <div className="flex-1 space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Reseller Business Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports & Analytics Hub</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Comprehensive real-time reporting on your sales, profit margins, product velocity, expenses, and wallet payouts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/reseller/reports/daily">
              <Button size="sm" className="gap-2 font-semibold">
                <BarChart3 className="h-4 w-4" />
                <span>View Today&apos;s Report</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Grid of Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportSections.map((sec) => {
          const Icon = sec.icon;
          return (
            <Card
              key={sec.href}
              className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/40 flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-lg ${sec.bgColor} ${sec.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/60 px-2 py-0.5 rounded">
                    {sec.tag}
                  </span>
                </div>
                <CardTitle className="text-base font-bold mt-3 group-hover:text-primary transition-colors">
                  {sec.title}
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
                  {sec.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link href={sec.href} className="block w-full">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between group-hover:bg-primary/10 group-hover:text-primary font-medium text-xs h-8"
                  >
                    <span>Open Report</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import React from 'react';
import { DollarSign, TrendingUp, Receipt, Landmark, FileText, ShoppingBag, Users, Store } from 'lucide-react';
import { fmt } from '@/components/admin/reports/utils';

export interface SummaryRow {
  label: string;
  value: number | string;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'primary';
}

export interface SummarySection {
  title: string;
  icon?: 'sales' | 'collection' | 'expense' | 'profit' | 'account' | 'orders' | 'users' | 'reseller' | 'other';
  rows: SummaryRow[];
  note?: string;
}

const icons = {
  sales:      <DollarSign className="h-4 w-4 text-primary" />,
  collection: <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
  expense:    <Receipt className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
  profit:     <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
  account:    <Landmark className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
  orders:     <ShoppingBag className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
  users:      <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />,
  reseller:   <Store className="h-4 w-4 text-teal-600 dark:text-teal-400" />,
  other:      <FileText className="h-4 w-4 text-primary" />,
};

const variantClass: Record<string, string> = {
  default: 'font-semibold text-foreground',
  success: 'font-bold text-emerald-600 dark:text-emerald-400',
  danger:  'font-bold text-rose-600 dark:text-rose-400',
  warning: 'font-bold text-amber-600 dark:text-amber-400',
  primary: 'font-bold text-primary',
};

const formatValue = (v: number | string) =>
  typeof v === 'number' ? fmt(v) : String(v);

interface MobileSummaryBoxProps {
  sections: SummarySection[];
  className?: string;
}

export const MobileSummaryBox: React.FC<MobileSummaryBoxProps> = ({ sections, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {sections.map((sec, si) => (
      <div key={si} className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
        {/* Section header */}
        <div className="px-3 py-2 bg-muted/30 border-b border-border flex items-center gap-2">
          {sec.icon ? icons[sec.icon] : icons.other}
          <h3 className="text-xs sm:text-sm font-bold text-foreground">{sec.title}</h3>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/40">
          {sec.rows.map((row, ri) => (
            <div
              key={ri}
              className={`px-3 py-2 flex items-center justify-between text-xs sm:text-sm gap-2 ${
                ri % 2 === 1 ? 'bg-muted/10' : ''
              }`}
            >
              <span className="font-medium text-foreground/80">{row.label}</span>
              <span className={variantClass[row.variant ?? 'default']}>
                {formatValue(row.value)}
              </span>
            </div>
          ))}
        </div>

        {sec.note && (
          <div className="px-3 py-1.5 bg-muted/20 border-t border-border text-[11px] text-muted-foreground italic">
            {sec.note}
          </div>
        )}
      </div>
    ))}
  </div>
);

export const ReportSummaryBox = MobileSummaryBox;

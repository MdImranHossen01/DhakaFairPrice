"use client";

import React from 'react';
import { Search, Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FilterOption {
  value: string;
  label: string;
}

export interface DropdownConfig {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (val: string) => void;
  options: FilterOption[];
}

export interface MobileFilterBarProps {
  // Search
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  };
  // Date range
  dateRange?: {
    from: string;
    to: string;
    onFromChange: (v: string) => void;
    onToChange: (v: string) => void;
  };
  // Month/Year
  monthYear?: {
    month?: string;
    onMonthChange?: (v: string) => void;
    year?: string;
    onYearChange?: (v: string) => void;
  };
  // Dropdowns
  dropdowns?: DropdownConfig[];
  // Entries limit
  limit?: {
    value: number;
    onChange: (v: number) => void;
    options?: number[];
  };
  // Actions
  onPrint?: () => void;
  customAction?: React.ReactNode;
  // Date summary label
  dateSummary?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MobileFilterBar: React.FC<MobileFilterBarProps> = ({
  search,
  dateRange,
  monthYear,
  dropdowns,
  limit,
  onPrint,
  customAction,
  dateSummary,
}) => {
  const inputClass =
    "w-full px-2.5 py-1.5 text-xs sm:text-sm bg-background border border-input rounded-lg " +
    "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors text-foreground";

  return (
    <div className="bg-card border border-border rounded-xl p-2.5 sm:p-4 mb-3 shadow-xs space-y-2.5 print:hidden">
      {/* Search & Custom Action Row */}
      {search && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder ?? "Search..."}
              className={`${inputClass} pl-8 pr-7`}
            />
            {search.value && (
              <button
                onClick={() => search.onChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {customAction && (
            <div className="shrink-0 flex items-center gap-2">
              {customAction}
            </div>
          )}
        </div>
      )}

      {/* Primary filters grid (2 cols on mobile, up to 4 on desktop) */}
      {(dateRange || monthYear || dropdowns?.length) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2">
          {dateRange && (
            <>
              <div>
                <label className="block text-[10px] sm:text-[11px] font-semibold text-muted-foreground mb-0.5 uppercase tracking-wide">
                  From Date
                </label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => dateRange.onFromChange(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[10px] sm:text-[11px] font-semibold text-muted-foreground mb-0.5 uppercase tracking-wide">
                  To Date
                </label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => dateRange.onToChange(e.target.value)}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {monthYear?.month !== undefined && monthYear.onMonthChange && (
            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold text-muted-foreground mb-0.5 uppercase tracking-wide">
                Month
              </label>
              <select
                value={monthYear.month}
                onChange={(e) => monthYear.onMonthChange!(e.target.value)}
                className={inputClass}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1).padStart(2, '0')}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {monthYear?.year !== undefined && monthYear.onYearChange && (
            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold text-muted-foreground mb-0.5 uppercase tracking-wide">
                Year
              </label>
              <input
                type="number"
                value={monthYear.year}
                onChange={(e) => monthYear.onYearChange!(e.target.value)}
                placeholder="2026"
                className={inputClass}
              />
            </div>
          )}

          {dropdowns?.map((dd) => (
            <div key={dd.id}>
              <label className="block text-[10px] sm:text-[11px] font-semibold text-muted-foreground mb-0.5 uppercase tracking-wide truncate">
                {dd.label}
              </label>
              <select
                value={dd.value}
                onChange={(e) => dd.onChange(e.target.value)}
                className={inputClass}
              >
                <option value="">{dd.placeholder ?? "--- All ---"}</option>
                {dd.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Bottom action row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60">
        <div className="flex items-center gap-2 flex-wrap">
          {limit && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Show
              <select
                value={limit.value}
                onChange={(e) => limit.onChange(Number(e.target.value))}
                className="px-1.5 py-0.5 text-xs bg-background border border-input rounded-md font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {(limit.options ?? [10, 25, 50, 100]).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              entries
            </span>
          )}
          {!search && customAction}
        </div>

        {onPrint && (
          <Button size="sm" onClick={onPrint} className="h-7 sm:h-8 px-2.5 text-xs font-semibold gap-1">
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
        )}
      </div>

      {/* Date summary badge */}
      {dateSummary && (
        <div className="text-[11px] sm:text-xs text-center font-medium text-muted-foreground bg-muted/40 rounded-lg py-1">
          Report period: {dateSummary}
        </div>
      )}
    </div>
  );
};

export const ReportFilterBar = MobileFilterBar;

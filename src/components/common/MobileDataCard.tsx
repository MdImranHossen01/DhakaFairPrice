"use client";

import React from 'react';

export interface MobileDataCardRow {
  label: React.ReactNode;
  value: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'muted' | 'primary';
  sub?: React.ReactNode;
}

export type ReportCardRow = MobileDataCardRow;

export interface MobileDataRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'muted' | 'primary';
  sub?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: 'text-foreground font-semibold',
  success: 'text-emerald-600 dark:text-emerald-400 font-bold',
  danger: 'text-rose-600 dark:text-rose-400 font-bold',
  warning: 'text-amber-600 dark:text-amber-400 font-bold',
  muted: 'text-muted-foreground',
  primary: 'text-primary font-bold',
};

const badgeStyles: Record<string, string> = {
  default: 'bg-primary/10 text-primary border border-primary/20',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  danger: 'bg-destructive/10 text-destructive border border-destructive/20',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
};

export const MobileDataRow: React.FC<MobileDataRowProps> = ({
  label,
  value,
  variant,
  sub,
  className = '',
}) => (
  <div className={`px-3 py-2 flex items-start justify-between gap-2.5 text-xs sm:text-sm ${className}`}>
    <span className="text-muted-foreground font-medium shrink-0 leading-snug">{label}</span>
    <div className="text-right min-w-0 max-w-[65%]">
      <span className={`${variantStyles[variant ?? 'default']} leading-snug break-words`}>
        {value}
      </span>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  </div>
);

export const ReportRow = MobileDataRow;
export const ReportRowItem = MobileDataRow;



export interface MobileDataCardProps {
  title?: React.ReactNode;
  badge?:
    | React.ReactNode
    | {
        text: string;
        variant?: 'default' | 'success' | 'danger' | 'warning' | 'info';
      };
  rows?: MobileDataCardRow[];
  children?: React.ReactNode;
  footer?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const MobileDataCard: React.FC<MobileDataCardProps> = ({
  title,
  badge,
  rows,
  children,
  footer,
  actions,
  className = '',
  onClick,
}) => {
  const renderBadge = () => {
    if (!badge) return null;
    if (React.isValidElement(badge)) return badge;
    if (typeof badge === 'object' && badge !== null && 'text' in badge) {
      const b = badge as { text: string; variant?: string };
      return (
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            badgeStyles[b.variant ?? 'default'] || badgeStyles.default
          }`}
        >
          {b.text}
        </span>
      );
    }
    return <span className="text-xs">{badge as React.ReactNode}</span>;
  };

  return (
    <div
      onClick={onClick}
      className={`bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs transition-colors ${
        onClick ? 'cursor-pointer hover:border-primary/50' : ''
      } ${className}`}
    >
      {(title || badge || actions) && (
        <div className="px-3 py-2 bg-muted/30 border-b border-border flex items-center justify-between gap-2">
          <div className="font-bold text-sm text-foreground truncate min-w-0 flex-1">{title}</div>
          <div className="flex items-center gap-1.5 shrink-0">
            {renderBadge()}
            {actions}
          </div>
        </div>
      )}

      <div className="divide-y divide-border/40">
        {children}
        {rows &&
          rows.map((row, i) => (
            <div
              key={i}
              className={`px-3 py-2 flex items-start justify-between gap-2.5 text-xs sm:text-sm ${
                i % 2 === 1 ? 'bg-muted/10' : ''
              }`}
            >
              <span className="text-muted-foreground font-medium shrink-0 leading-snug">
                {row.label}
              </span>
              <div className="text-right min-w-0 max-w-[65%]">
                <span className={`${variantStyles[row.variant ?? 'default']} leading-snug break-words`}>
                  {row.value}
                </span>
                {row.sub && <div className="text-[11px] text-muted-foreground mt-0.5">{row.sub}</div>}
              </div>
            </div>
          ))}
      </div>

      {footer && (
        <div className="px-3 py-2 bg-muted/20 border-t border-border text-xs text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
};

// Alias for ReportCard
export const ReportCard = MobileDataCard;



import React from 'react';
import { Badge } from '@/components/ui/badge';

export interface DisbursementData {
  orderValue: number;
  deliveryCharge: number;
  supplier?: {
    name: string;
    amount: number;
    isYou?: boolean;
    status?: string;
  } | null;
  seller?: {
    name: string;
    amount: number;
    isYou?: boolean;
    status?: string;
  } | null;
  isOwnProductSale?: boolean;
  motherFee: number;
  motherProfit?: number;
}

interface DisbursementBreakdownProps {
  disbursement?: DisbursementData;
  fallbackCommission?: number;
  fallbackSystemFee?: number;
  fallbackDeliveryCharge?: number;
  fallbackTotalAmount?: number;
  commissionStatus?: string;
  mode?: 'table' | 'card';
  perspective?: 'admin' | 'reseller';
}

export function DisbursementBreakdown({
  disbursement,
  fallbackCommission,
  fallbackSystemFee,
  fallbackDeliveryCharge,
  fallbackTotalAmount,
  commissionStatus,
  mode = 'table',
  perspective = 'admin'
}: DisbursementBreakdownProps) {
  if (!disbursement) {
    const comm = Math.round(fallbackCommission || 0);
    const fee = Math.round(fallbackSystemFee || 0);
    const del = Math.round(fallbackDeliveryCharge || 0);
    const tot = Math.round(fallbackTotalAmount || 0);

    return (
      <div className="flex flex-col gap-1 items-start text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-green-600 text-sm">৳{comm}</span>
          {commissionStatus === 'cleared' ? (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] px-1.5 py-0 font-bold">
              Paid
            </Badge>
          ) : commissionStatus === 'cancelled' ? (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-[10px] px-1.5 py-0 font-bold">
              Cancelled
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] px-1.5 py-0 font-bold">
              Pending
            </Badge>
          )}
        </div>
        {fee > 0 && <span className="text-[11px] text-primary">System Fee: ৳{fee}</span>}
        {del > 0 && <span className="text-[10px] text-muted-foreground">Delivery: ৳{del}</span>}
      </div>
    );
  }

  const {
    orderValue,
    deliveryCharge,
    supplier,
    seller,
    isOwnProductSale,
    motherFee,
    motherProfit
  } = disbursement;
  const isCard = mode === 'card';

  return (
    <div className={`flex flex-col gap-1.5 leading-tight rounded-xl border transition-all ${
      isCard
        ? 'w-full bg-slate-50/80 dark:bg-zinc-900/60 p-3.5 border-slate-200 dark:border-zinc-800 text-xs shadow-xs font-sans'
        : 'min-w-[195px] max-w-[240px] text-[11px] bg-slate-50/90 dark:bg-zinc-900/70 p-2 border-slate-200 dark:border-zinc-800 shadow-sm font-mono'
    }`}>
      {isCard && (
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80 dark:border-zinc-800/80 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <span>⚖️</span>
            <span>Disbursement</span>
          </span>
          <span className="text-[10px] lowercase font-mono text-muted-foreground/80">breakdown</span>
        </div>
      )}

      {/* 1. Supplier / Product Owner */}
      {supplier && (
        <div className={`flex justify-between items-center px-2 py-1 rounded-md transition-colors ${
          supplier.isYou
            ? 'bg-emerald-100/90 dark:bg-emerald-950/70 border border-emerald-300/80 dark:border-emerald-800'
            : 'hover:bg-slate-100/60 dark:hover:bg-zinc-800/40'
        }`}>
          <span className={`flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 ${!isCard ? 'truncate max-w-[115px]' : ''}`} title={supplier.name}>
            <span>📦</span>
            <span className="font-semibold truncate">{supplier.name}</span>
            {supplier.isYou && (
              <span className="text-[9px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.2 rounded-full">You</span>
            )}
            {!supplier.isYou && perspective === 'reseller' && (
              <span className="text-[9px] bg-slate-200/80 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-medium px-1 py-0.2 rounded">Product Cost</span>
            )}
          </span>
          <span className={`font-mono font-bold ${supplier.isYou ? 'text-emerald-700 dark:text-emerald-300 font-black' : 'text-slate-800 dark:text-zinc-200'}`}>
            ৳{supplier.amount}
          </span>
        </div>
      )}

      {/* 2. Seller / Storefront */}
      {seller && (
        <div className={`flex justify-between items-center px-2 py-1 rounded-md transition-colors ${
          seller.isYou
            ? 'bg-emerald-100/90 dark:bg-emerald-950/70 border border-emerald-300/80 dark:border-emerald-800'
            : 'hover:bg-slate-100/60 dark:hover:bg-zinc-800/40'
        }`}>
          <span className={`flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 ${!isCard ? 'truncate max-w-[115px]' : ''}`} title={seller.name}>
            <span>🏪</span>
            <span className="font-semibold truncate">{seller.name}</span>
            {seller.isYou && (
              <span className="text-[9px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.2 rounded-full">You</span>
            )}
            {isOwnProductSale && (
              <span className="text-[9px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold px-1.5 py-0.2 rounded">Owner</span>
            )}
          </span>
          <span className={`font-mono font-bold ${seller.isYou ? 'text-emerald-700 dark:text-emerald-300 font-black' : 'text-emerald-600 dark:text-emerald-400'}`}>
            ৳{seller.amount}
          </span>
        </div>
      )}

      {/* 3. System Fee - Shown to Admin, or to Reseller for own product sales or product supplier */}
      {motherFee > 0 && (perspective !== 'reseller' || isOwnProductSale || supplier?.isYou) && (
        <div className="flex justify-between items-center px-2 py-0.5 text-slate-600 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span>⚙️</span>
            <span>System Fee:</span>
          </span>
          <span className="font-mono font-bold text-primary">৳{motherFee}</span>
        </div>
      )}

      {/* 4. Mother Shop direct profit (Only shown to Admin) */}
      {perspective !== 'reseller' && (motherProfit ?? 0) > 0 && (
        <div className="flex justify-between items-center px-2 py-0.5 text-slate-600 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span>🏢</span>
            <span>Mother Shop:</span>
          </span>
          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">৳{motherProfit}</span>
        </div>
      )}

      {/* 5. Delivery Charge */}
      <div className="flex justify-between items-center px-2 py-0.5 text-slate-600 dark:text-zinc-400 border-t border-slate-200/70 dark:border-zinc-800 pt-1">
        <span className="flex items-center gap-1.5">
          <span>🚚</span>
          <span>Delivery Charge:</span>
        </span>
        <span className="font-mono font-semibold text-slate-700 dark:text-zinc-300">৳{deliveryCharge}</span>
      </div>

      {/* 6. Total Check -> Matches Order Value */}
      <div className="flex justify-between items-center px-2 py-1 border-t border-slate-300 dark:border-zinc-700 pt-1.5 text-xs font-bold text-foreground bg-slate-100/70 dark:bg-zinc-800/50 rounded-b-lg mt-0.5">
        <span className="uppercase text-[9px] tracking-wider text-muted-foreground font-sans font-bold">Total:</span>
        <span className="font-mono text-primary font-black text-sm">৳{orderValue}</span>
      </div>
    </div>
  );
}

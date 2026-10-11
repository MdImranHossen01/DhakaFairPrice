"use client";

import React, { useState } from "react";
import { 
  Store, 
  ShoppingBag, 
  Package, 
  Wallet, 
  Settings, 
  Globe, 
  Copy, 
  ExternalLink,
  ChevronDown,
  LayoutDashboard,
  PlusCircle,
  FileText
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ResellerSidebarProps {
  reseller: {
    storeName: string;
    subdomain: string;
    status: string;
  };
  statusColor: Record<string, string>;
  recentOrdersCount: number;
  copyStoreLink: () => void;
  storeLink: string;
}

interface NavGroupProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function NavGroup({ title, icon: Icon, isOpen, onToggle, children }: NavGroupProps) {
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all text-left"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="h-4.5 w-4.5 shrink-0 text-muted-foreground/80 group-hover:text-foreground" />
          <span>{title}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground/60 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} />
      </button>
      <div 
        className={`pl-4 border-l border-muted/60 ml-5 space-y-1 overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-96 opacity-100 py-1' : 'max-h-0 opacity-0 pointer-events-none'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function ResellerSidebar({
  reseller,
  statusColor,
  recentOrdersCount,
  copyStoreLink,
  storeLink,
}: ResellerSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    overview: true,
    products: true,
    sales: true,
    financial: true,
    settings: true,
  });

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  return (
    <aside className="w-full md:w-72 bg-card border-r flex flex-col shrink-0 md:sticky md:top-0 md:h-screen z-30">
      {/* Sidebar Header: Store Brand Info */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Store className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-sm leading-tight truncate">{reseller.storeName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{reseller.subdomain}.swapnobaz.com</p>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-bold ${statusColor[reseller.status] || ''}`}>
            {reseller.status === 'active' ? '● সক্রিয় স্টোর' : reseller.status === 'pending' ? 'অনুমোদনের অপেক্ষায়' : 'স্থগিত'}
          </Badge>
        </div>
      </div>

      {/* Sidebar Navigation Menu */}
      <div className="p-3 flex-1 overflow-y-auto space-y-4">
        <div>
          <p className="px-3 py-1.5 text-[10px] font-black uppercase text-muted-foreground tracking-wider mb-2">
            ন্যাভিগেশন মেনু
          </p>
          <TabsList className="flex flex-col h-auto w-full justify-start gap-2 bg-transparent p-0 mt-1">
            {/* Overview Group */}
            <NavGroup
              title="Overview (ওভারভিউ)"
              icon={LayoutDashboard}
              isOpen={expandedGroups.overview}
              onToggle={() => toggleGroup('overview')}
            >
              <TabsTrigger
                value="dashboard"
                className="w-full justify-start gap-2 px-3 py-2 rounded-lg font-bold text-xs text-muted-foreground hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary shadow-none transition-all text-left"
              >
                ● ড্যাশবোর্ড / পরিসংখ্যান
              </TabsTrigger>
            </NavGroup>

            {/* Wallet & Payouts Group */}
            <NavGroup
              title="Wallet & Payouts"
              icon={Wallet}
              isOpen={expandedGroups.financial}
              onToggle={() => toggleGroup('financial')}
            >
              <TabsTrigger
                value="wallet"
                className="w-full justify-start gap-2 px-3 py-2 rounded-lg font-bold text-xs text-muted-foreground hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary shadow-none transition-all text-left"
              >
                ● ওয়ালেট ও পেআউট
              </TabsTrigger>
            </NavGroup>

            {/* Product Management Group */}
            <NavGroup
              title="Product Management"
              icon={Package}
              isOpen={expandedGroups.products}
              onToggle={() => toggleGroup('products')}
            >
              <TabsTrigger
                value="store-products"
                className="w-full justify-start gap-2 px-3 py-2 rounded-lg font-bold text-xs text-muted-foreground hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary shadow-none transition-all text-left"
              >
                ● স্টোরের পণ্য (All Products)
              </TabsTrigger>
              <TabsTrigger
                value="my-products"
                className="w-full justify-start gap-2 px-3 py-2 rounded-lg font-bold text-xs text-muted-foreground hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary shadow-none transition-all text-left"
              >
                ● আমার ব্যক্তিগত পণ্য
              </TabsTrigger>
              <TabsTrigger
                value="add-product"
                className="w-full justify-start gap-2 px-3 py-2 rounded-lg font-bold text-xs text-muted-foreground hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary shadow-none transition-all text-left"
              >
                ● নতুন পণ্য যোগ করুন
              </TabsTrigger>
            </NavGroup>

            {/* Sales & Orders Group */}
            <NavGroup
              title="Sales & Orders"
              icon={ShoppingBag}
              isOpen={expandedGroups.sales}
              onToggle={() => toggleGroup('sales')}
            >
              <TabsTrigger
                value="orders"
                className="w-full justify-start gap-2 px-3 py-2 rounded-lg font-bold text-xs text-muted-foreground hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary shadow-none transition-all text-left"
              >
                <span className="flex-1 text-left">● অর্ডার সমূহ</span>
                {recentOrdersCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0 font-black">
                    {recentOrdersCount}
                  </Badge>
                )}
              </TabsTrigger>
            </NavGroup>

            {/* Store Settings Group */}
            <NavGroup
              title="Store Settings"
              icon={Settings}
              isOpen={expandedGroups.settings}
              onToggle={() => toggleGroup('settings')}
            >
              <TabsTrigger
                value="settings"
                className="w-full justify-start gap-2 px-3 py-2 rounded-lg font-bold text-xs text-muted-foreground hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary shadow-none transition-all text-left"
              >
                ● স্টোর সেটিংস ও ডোমেইন
              </TabsTrigger>
            </NavGroup>
          </TabsList>
        </div>
      </div>

      {/* Sidebar Footer Info Card */}
      <div className="p-3 border-t bg-muted/20 space-y-2.5 mt-auto">
        <div className="rounded-xl border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-primary">
            <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> স্টোর লিংক</span>
            <Badge variant="outline" className="text-[9px] px-1 py-0">Live</Badge>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground truncate">{reseller.subdomain}.swapnobaz.com</p>
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            <Button size="sm" variant="outline" className="h-7 text-[11px] px-2" onClick={copyStoreLink}>
              <Copy className="h-3 w-3 mr-1" /> কপি
            </Button>
            <Button size="sm" variant="default" className="h-7 text-[11px] px-2" asChild>
              <a href={storeLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" /> স্টোর দেখুন
              </a>
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}

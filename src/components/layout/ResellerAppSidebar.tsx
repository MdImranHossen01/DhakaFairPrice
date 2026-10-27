"use client"

import * as React from "react"
import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useSearchParams } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { handleSignOut } from "@/lib/logout"
import {
  ChevronRight,
  LayoutDashboard,
  ShoppingBag,
  FileText,
  Image as ImageIcon,
  Settings,
  Wallet,
  Users,
  Rocket,
  LogOut,
  Store,
  CreditCard,
  BarChart3,
  Home,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

const resellerNav = [
  {
    title: "Overview",
    icon: LayoutDashboard,
    items: [
      { title: "Dashboard", url: "/reseller/dashboard" },
    ],
  },
  {
    title: "Wallet & Payouts",
    icon: Wallet,
    items: [
      { title: "Wallet & Payouts", url: "/reseller/wallet" },
    ],
  },
  {
    title: "Product Management",
    icon: ShoppingBag,
    items: [
      { title: "Personal Products", url: "/reseller/products" },
      { title: "Add Personal Product", url: "/reseller/products/new" },
      { title: "Source B2B Products", url: "/reseller/products/source" },
      { title: "Upcoming Expire", url: "/reseller/upcoming-expiry" },
      { title: "Low Stock", url: "/reseller/low-stock" },
    ],
  },
  {
    title: "Sales & Orders",
    icon: FileText,
    items: [
      { title: "All Orders", url: "/reseller/orders" },
      { title: "Abandoned Carts", url: "/reseller/abandoned-carts" },
    ],
  },
  {
    title: "Reports & Analytics",
    icon: BarChart3,
    items: [
      { title: "Daily Report", url: "/reseller/reports/daily" },
      { title: "Monthly Report", url: "/reseller/reports/monthly" },
      { title: "Order Profit Report", url: "/reseller/reports/order-profit" },
      { title: "Item Profit Report", url: "/reseller/reports/item-profit" },
      { title: "Top & Low Sales", url: "/reseller/reports/product-sales" },
      { title: "Brand Wise Sales", url: "/reseller/reports/brand-sales" },
      { title: "Payout & Earnings", url: "/reseller/reports/payouts" },
      { title: "Expense Report", url: "/reseller/reports/expense" },
    ],
  },
  {
    title: "Ledger & Accounting",
    icon: CreditCard,
    items: [
      { title: "All Accounts", url: "/reseller/accounts" },
      { title: "Expenses & Incomes", url: "/reseller/expenses-incomes" },
      { title: "Add New Entry", url: "/reseller/expenses-incomes?action=new" },
      { title: "Category", url: "/reseller/expenses-incomes/categories" },
      { title: "Accounts Ledger", url: "/reseller/ledger" },
      { title: "Account Payable", url: "/reseller/ledger/payable" },
      { title: "Account Receivable", url: "/reseller/ledger/receivable" },
    ],
  },
  {
    title: "User Management",
    icon: Users,
    items: [
      { title: "All Customers", url: "/reseller/users" },
    ],
  },
  {
    title: "CMS Manager",
    icon: ImageIcon,
    items: [
      { title: "Hero Banners", url: "/reseller/cms/banners" },
      { title: "Landing Pages", url: "/reseller/landing-pages" },
    ],
  },
  {
    title: "System Settings",
    icon: Settings,
    items: [
      { title: "Coupons", url: "/reseller/coupons" },
      { title: "Store Settings", url: "/reseller/settings" },
      { title: "Marketing & Tracking", url: "/reseller/marketing" },
    ],
  },
]

function buildNav(basePath?: string) {
  if (!basePath) return resellerNav;
  return resellerNav.map(section => ({
    ...section,
    items: section.items.map(item => ({
      ...item,
      url: item.url.replace('/reseller', basePath),
    })),
  }));
}

function isUrlActive(
  itemUrl: string,
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams> | null,
  allSiblingUrls: string[]
) {
  if (!itemUrl || itemUrl === "#" || itemUrl === "/reseller") {
    return pathname === itemUrl;
  }

  // Parse path and query params from itemUrl
  const [itemPath, itemQuery] = itemUrl.split("?");

  if (itemQuery) {
    if (pathname !== itemPath) return false;
    if (!searchParams) return false;

    const itemSearchParams = new URLSearchParams(itemQuery);
    for (const [key, val] of itemSearchParams.entries()) {
      if (searchParams.get(key) !== val) {
        return false;
      }
    }
    return true;
  } else {
    const pathMatches =
      pathname === itemPath ||
      (pathname.startsWith(itemPath + "/") &&
        !allSiblingUrls.some(
          (other) =>
            other !== itemUrl &&
            other.length > itemUrl.length &&
            (pathname === other || pathname.startsWith(other + "/"))
        ));

    if (!pathMatches) return false;

    if (searchParams && searchParams.toString().length > 0) {
      const moreSpecificSiblingMatches = allSiblingUrls.some((siblingUrl) => {
        if (!siblingUrl.includes("?")) return false;
        const [sibPath, sibQuery] = siblingUrl.split("?");
        if (sibPath !== pathname) return false;
        const sibSearchParams = new URLSearchParams(sibQuery);
        for (const [key, val] of sibSearchParams.entries()) {
          if (searchParams.get(key) !== val) return false;
        }
        return true;
      });

      if (moreSpecificSiblingMatches) {
        return false;
      }
    }

    return true;
  }
}

function ResellerNavCollapsibleItem({
  item,
  pathname,
  searchParams,
  handleLinkClick,
}: {
  item: any;
  pathname: string;
  searchParams: ReturnType<typeof useSearchParams> | null;
  handleLinkClick: () => void;
}) {
  const siblingUrls = item.items.map((sub: any) => sub.url);
  const isParentActive =
    item.items.some((sub: any) =>
      isUrlActive(sub.url, pathname, searchParams, siblingUrls)
    ) || ((item as any).url ? isUrlActive((item as any).url, pathname, searchParams, []) : false);

  const [isOpen, setIsOpen] = useState(isParentActive);

  useEffect(() => {
    if (isParentActive) {
      setIsOpen(true);
    }
  }, [isParentActive]);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={
            <SidebarMenuButton
              tooltip={item.title}
              isActive={isParentActive}
              className={`h-10 rounded-xl px-3 transition-all duration-200 ${
                isParentActive
                  ? "!bg-primary !text-white font-bold shadow-md shadow-primary/30 data-active:!bg-primary data-active:!text-white data-[active=true]:!bg-primary data-[active=true]:!text-white"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            />
          }
        >
          {item.icon && <item.icon className={`h-5 w-5 shrink-0 ${isParentActive ? "!text-white" : "text-slate-300"}`} />}
          <span className={`text-sm font-medium tracking-tight ml-1.5 ${isParentActive ? "!text-white font-bold" : "text-slate-200"}`}>
            {item.title}
          </span>
          <ChevronRight className={`ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 ${isParentActive ? "!text-white opacity-90" : "text-slate-400 opacity-70"}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="ml-4 pl-2 border-l border-slate-800/80 my-1 space-y-1">
            {item.items.map((sub: any) => {
              const isSubActive = isUrlActive(sub.url, pathname, searchParams, siblingUrls);

              return (
                <SidebarMenuSubItem key={sub.title}>
                  <SidebarMenuSubButton
                    render={<Link href={sub.url} onClick={handleLinkClick} />}
                    isActive={isSubActive}
                    className={`h-8 rounded-lg px-3 text-xs transition-all duration-150 ${
                      isSubActive
                        ? "!bg-primary !text-white font-bold shadow-sm data-active:!bg-primary data-active:!text-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <span className={isSubActive ? "!text-white font-bold" : ""}>{sub.title}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function NavMain({
  items,
  pathname,
  searchParams
}: {
  items: typeof resellerNav;
  pathname: string;
  searchParams: ReturnType<typeof useSearchParams> | null;
}) {
  const { setOpenMobile, isMobile } = useSidebar()

  const handleLinkClick = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <SidebarGroup className="py-2">
      <SidebarMenu className="gap-1">
        {items.map((item) => (
          <ResellerNavCollapsibleItem
            key={item.title}
            item={item}
            pathname={pathname}
            searchParams={searchParams}
            handleLinkClick={handleLinkClick}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function NavMainWithSearchParams({
  items,
  pathname
}: {
  items: typeof resellerNav;
  pathname: string;
}) {
  const searchParams = useSearchParams();
  return <NavMain items={items} pathname={pathname} searchParams={searchParams} />;
}

export function ResellerAppSidebar({ basePath, ...props }: React.ComponentProps<typeof Sidebar> & { basePath?: string }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user
  const navItems = buildNav(basePath)

  const [storeLogo, setStoreLogo] = useState<string>("")
  const [storeName, setStoreName] = useState<string>("")
  const [subdomain, setSubdomain] = useState<string>("")
  const [customDomain, setCustomDomain] = useState<string>("")
  const [storeStatus, setStoreStatus] = useState<string>("active")

  useEffect(() => {
    let isMounted = true
    fetch("/api/reseller/settings")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.reseller) {
          if (data.reseller.logoUrl) setStoreLogo(data.reseller.logoUrl)
          if (data.reseller.storeName) setStoreName(data.reseller.storeName)
          if (data.reseller.subdomain) setSubdomain(data.reseller.subdomain)
          if (data.reseller.customDomain) setCustomDomain(data.reseller.customDomain)
          if (data.reseller.status) setStoreStatus(data.reseller.status)
        }
      })
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [user?.image])

  const storeHomeUrl = customDomain?.trim()
    ? (customDomain.trim().startsWith("http") ? customDomain.trim() : `https://${customDomain.trim()}`)
    : subdomain?.trim()
    ? `https://${subdomain.trim()}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
    : "/"

  return (
    <Sidebar {...props} className="border-r border-slate-800/80 bg-[#0a152e] text-slate-100">
      <SidebarHeader className="border-b border-slate-800/80 h-14 px-3.5 flex flex-row items-center justify-center bg-[#0a152e]">
        <a
          href={storeHomeUrl}
          className="flex items-center justify-center gap-2.5 min-w-0 max-w-full hover:opacity-90 transition-opacity mx-auto group"
          title="Visit Store Home Page"
        >
          {storeLogo ? (
            <div className="flex items-center justify-center gap-2.5 min-w-0">
              <div className="relative h-8 w-auto max-w-[120px] flex items-center justify-center shrink-0">
                <Image
                  src={storeLogo}
                  alt="Store Logo"
                  width={120}
                  height={32}
                  className="max-h-8 max-w-[120px] w-auto h-auto object-contain"
                  unoptimized
                />
              </div>
              <span className="text-sm font-bold tracking-tight text-slate-200 group-hover:text-white transition-colors group-data-[collapsible=icon]:hidden">
                Home
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0 border border-primary/30 group-hover:bg-primary/30 transition-colors">
                <Home className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold tracking-tight text-slate-100 group-hover:text-primary transition-colors group-data-[collapsible=icon]:hidden">
                Home
              </span>
            </div>
          )}
        </a>
      </SidebarHeader>

      <SidebarContent className="gap-0 bg-[#0a152e] scrollbar-thin scrollbar-thumb-slate-800">
        <Suspense fallback={<NavMain items={navItems} pathname={pathname} searchParams={null} />}>
          <NavMainWithSearchParams items={navItems} pathname={pathname} />
        </Suspense>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-800/80 p-2.5 bg-[#081024]">
        {/* User Profile Mini Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-7 w-7 border border-slate-700 shrink-0">
              <AvatarImage src={storeLogo || user?.image || ""} alt={storeName || user?.name || "Reseller"} />
              <AvatarFallback className="bg-primary text-white font-bold text-[10px]">
                {(storeName || user?.name || "RS").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-100 truncate max-w-[125px]">
                {storeName || user?.name || "Reseller Partner"}
              </p>
              <p className={`text-[10px] font-medium ${
                storeStatus === 'active'
                  ? 'text-emerald-400'
                  : storeStatus === 'pending'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}>
                {storeStatus === 'active'
                  ? 'Verified Reseller'
                  : storeStatus === 'pending'
                  ? 'Pending Approval'
                  : storeStatus === 'suspended'
                  ? 'Suspended'
                  : 'Not Approved'}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleSignOut('/login')}
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 rounded-lg transition-colors shrink-0"
            title="Log Out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

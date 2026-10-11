"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  ChevronRight,
  LayoutDashboard,
  ShoppingBag,
  FileText,
  Users,
  Image as ImageIcon,
  Settings,
  Store,
  Mail,
  CreditCard,
  BarChart3,
  Truck,
  Landmark,
  Rocket,
  LogOut,
} from "lucide-react"
import { Logo } from "@/components/ui/logo"
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

const data = {
  navMain: [
    {
      title: "Overview",
      url: "/admin/dashboard",
      icon: LayoutDashboard,
      isActive: true,
      items: [
        {
          title: "Dashboard",
          url: "/admin/dashboard",
        }
      ],
    },
    {
      title: "Product Management",
      url: "#",
      icon: ShoppingBag,
      items: [
        {
          title: "All Products",
          url: "/admin/products",
        },
        {
          title: "Add Product",
          url: "/admin/products/new",
        },
        {
          title: "Upcoming Expire",
          url: "/admin/upcoming-expiry",
        },
        {
          title: "Low Stock",
          url: "/admin/low-stock",
        },
        {
          title: "Categories",
          url: "/admin/categories",
        },
        {
          title: "Brands",
          url: "/admin/brands",
        },
      ],
    },
    {
      title: "Sales & Orders",
      url: "#",
      icon: FileText,
      items: [
        {
          title: "All Orders",
          url: "/admin/orders",
        },
        {
          title: "Abandoned Carts",
          url: "/admin/abandoned-carts",
        },
        {
          title: "Offers / Quotations",
          url: "/admin/offers",
        },
        {
          title: "Delivery Challans",
          url: "/admin/chalans",
        },
        {
          title: "Client Bills",
          url: "/admin/bills",
        },
      ],
    },
    {
      title: "Suppliers & Purchases",
      url: "#",
      icon: Truck,
      items: [
        {
          title: "Suppliers / Vendors",
          url: "/admin/suppliers",
        },
        {
          title: "Supplier Bills",
          url: "/admin/supplier-bills",
        },
      ],
    },
    {
      title: "Ledger & Accounting",
      url: "#",
      icon: CreditCard,
      items: [
        {
          title: "All Accounts",
          url: "/admin/accounts",
        },
        {
          title: "Expenses & Incomes",
          url: "/admin/expenses-incomes",
        },
        {
          title: "Add New Entry",
          url: "/admin/expenses-incomes?action=new",
        },
        {
          title: "Category",
          url: "/admin/expenses-incomes/categories",
        },
        {
          title: "Accounts Ledger",
          url: "/admin/ledger",
        },
        {
          title: "Account Payable",
          url: "/admin/ledger/payable",
        },
        {
          title: "Account Receivable",
          url: "/admin/ledger/receivable",
        },
      ],
    },
    {
      title: "Loan",
      url: "#",
      icon: Landmark,
      items: [
        {
          title: "Add Loan Provider",
          url: "/admin/loans/providers/new",
        },
        {
          title: "All Loan Providers",
          url: "/admin/loans/providers",
        },
        {
          title: "All Loans",
          url: "/admin/loans",
        },
        {
          title: "Upcoming Payable",
          url: "/admin/loans/upcoming",
        },
      ],
    },
    {
      title: "Reports & Analytics",
      url: "#",
      icon: BarChart3,
      items: [
        {
          title: "Daily Report",
          url: "/admin/reports/daily",
        },
        {
          title: "Monthly Report",
          url: "/admin/reports/monthly",
        },
        {
          title: "Order Profit Report",
          url: "/admin/reports/order-profit",
        },
        {
          title: "Item Profit Report",
          url: "/admin/reports/item-profit",
        },
        {
          title: "Top & Low Sales",
          url: "/admin/reports/product-sales",
        },
        {
          title: "Reseller Sales",
          url: "/admin/reports/reseller-sales",
        },
        {
          title: "Reseller Commission",
          url: "/admin/reports/reseller-commission",
        },
        {
          title: "Brand Wise Sales",
          url: "/admin/reports/brand-sales",
        },
        {
          title: "Purchase Report",
          url: "/admin/reports/purchase",
        },
        {
          title: "Expense Report",
          url: "/admin/reports/expense",
        },
      ],
    },
    {
      title: "User Management",
      url: "#",
      icon: Users,
      items: [
        {
          title: "All Users",
          url: "/admin/users",
        },
        {
          title: "Customers",
          url: "/admin/users?role=user",
        },
        {
          title: "Resellers",
          url: "/admin/users?role=reseller",
        },
        {
          title: "Admins",
          url: "/admin/users?role=admin",
        },
        {
          title: "Managers",
          url: "/admin/users?role=manager",
        },
        {
          title: "Moderators",
          url: "/admin/users?role=moderator",
        },
      ],
    },
    {
      title: "Reseller Management",
      url: "#",
      icon: Store,
      items: [
        {
          title: "Resellers",
          url: "/admin/resellers",
        },
        {
          title: "Pending Approval",
          url: "/admin/resellers?status=pending",
        },
        {
          title: "Reseller Payouts",
          url: "/admin/payouts",
        },
        {
          title: "Reseller Sales Report",
          url: "/admin/reports/reseller-sales",
        },
        {
          title: "Commission Report",
          url: "/admin/reports/reseller-commission",
        },
      ],
    },
    {
      title: "CMS Manager",
      url: "#",
      icon: ImageIcon,
      items: [
        {
          title: "Banners",
          url: "/admin/cms/banners",
        },
      ],
    },
    {
      title: "Blogs",
      url: "#",
      icon: FileText,
      items: [
        {
          title: "Manage Blog",
          url: "/admin/blogs",
        },
        {
          title: "Add New Blog",
          url: "/admin/blogs/new",
        },
      ],
    },
    {
      title: "System Settings",
      url: "#",
      icon: Settings,
      items: [
        {
          title: "Coupons",
          url: "/admin/coupons",
        },
        {
          title: "General Settings",
          url: "/admin/settings",
        },
        {
          title: "Marketing Settings",
          url: "/admin/marketing",
        },
        {
          title: "Subscribers",
          url: "/admin/subscribers",
          icon: Mail,
        },
        {
          title: "Infrastructure & Marketing",
          url: "/admin/system-design",
          superOnly: true
        },
      ],
    },
  ],
}

function NavMain({ items, pathname, role }: { items: typeof data.navMain; pathname: string; role?: string }) {
  const { setOpenMobile, isMobile } = useSidebar()

  const isLimitedStaff = role === 'manager' || role === 'moderator';
  const allowedPrefixes = [
    "/admin/dashboard",
    "/admin/products",
    "/admin/categories",
    "/admin/brands",
    "/admin/upcoming-expiry",
    "/admin/low-stock",
    "/admin/orders",
    "/admin/offers",
    "/admin/coupons",
    "/admin/chalans",
    "/admin/bills",
    "/admin/abandoned-carts",
    "/admin/cms",
    "/admin/landing-pages",
    "/admin/catalog",
    "/admin/blogs",
    "/admin/subscribers",
    "/admin/fraud-checker",
    "/admin/marketing"
  ];

  const filteredItems = items.map(item => ({
    ...item,
    items: item.items.filter((subItem: any) => {
      if (subItem.superOnly && role !== 'super_admin' && role !== 'admin') return false;
      if (isLimitedStaff) {
        return allowedPrefixes.some(prefix => subItem.url === prefix || subItem.url.startsWith(prefix + "/") || subItem.url.startsWith(prefix + "?"));
      }
      return true;
    })
  })).filter(item => item.items.length > 0);

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <SidebarGroup className="py-2">
      <SidebarMenu className="gap-1">
        {filteredItems.map((item) => {
          const isParentActive =
            item.items.some(
              (subItem) =>
                pathname === subItem.url ||
                (subItem.url !== "#" &&
                  subItem.url !== "/admin" &&
                  pathname.startsWith(subItem.url + "/"))
            ) || pathname === item.url

          return (
            <Collapsible
              key={item.title}
              defaultOpen={isParentActive}
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
                  <ChevronRight className={`ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-open/collapsible:rotate-90 group-[[data-state=open]]/collapsible:rotate-90 ${isParentActive ? "!text-white opacity-90" : "text-slate-400 opacity-70"}`} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="ml-4 pl-2 border-l border-slate-800/80 my-1 space-y-1">
                    {item.items.map((subItem) => {
                      const isSubActive =
                        pathname === subItem.url ||
                        (subItem.url !== "#" &&
                          subItem.url !== "/admin" &&
                          pathname.startsWith(subItem.url + "/") &&
                          !item.items.some(
                            (otherItem) =>
                              otherItem !== subItem &&
                              otherItem.url.length > subItem.url.length &&
                              (pathname === otherItem.url || pathname.startsWith(otherItem.url + "/"))
                          ))

                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            render={<Link href={subItem.url} onClick={handleLinkClick} />}
                            isActive={isSubActive}
                            className={`h-8 rounded-lg px-3 text-xs transition-all duration-150 ${
                              isSubActive
                                ? "!bg-primary !text-white font-bold shadow-sm data-active:!bg-primary data-active:!text-white"
                                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                            }`}
                          >
                            <span className={isSubActive ? "!text-white font-bold" : ""}>{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const user = session?.user

  return (
    <Sidebar {...props} className="border-r border-slate-800/80 bg-[#0a152e] text-slate-100">
      <SidebarHeader className="border-b border-slate-800/80 h-16 px-4 flex items-center justify-between bg-[#0a152e]">
        <Logo textClassName="text-base font-black tracking-wide text-white whitespace-nowrap" />
      </SidebarHeader>

      <SidebarContent className="gap-0 bg-[#0a152e] scrollbar-thin scrollbar-thumb-slate-800">
        <NavMain items={data.navMain} pathname={pathname} role={role} />
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-800/80 p-3 bg-[#081024]">
        {/* User Profile Mini Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="h-8 w-8 border border-slate-700">
              <AvatarImage src={user?.image || ""} alt={user?.name || "Admin"} />
              <AvatarFallback className="bg-primary text-white font-bold text-xs">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-100 truncate">{user?.name || "Admin User"}</p>
              <p className="text-[10px] text-slate-400 capitalize">{role || "Administrator"}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 rounded-lg transition-colors"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

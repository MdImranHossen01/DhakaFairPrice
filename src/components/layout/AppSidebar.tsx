"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronRight,
  LayoutDashboard,
  ShoppingBag,
  Tag,
  FileText,
  Users,
  Image as ImageIcon,
  Settings,
  Megaphone,
  Store,
  Mail,
  CreditCard,
  BarChart3,
  Truck,
  Landmark
} from "lucide-react"
import { Logo } from "@/components/ui/logo"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
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


import { useSession } from "next-auth/react"

function NavMain({ items, pathname, role }: { items: typeof data.navMain; pathname: string; role?: string }) {
  const { setOpenMobile, isMobile } = useSidebar()

  // Filter items based on role
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
      if (subItem.superOnly && role !== 'super_admin') return false;
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
    <SidebarGroup>
      <SidebarGroupLabel>Menu</SidebarGroupLabel>
      <SidebarMenu>
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
                <CollapsibleTrigger render={<SidebarMenuButton tooltip={item.title} isActive={isParentActive} />}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-open/collapsible:rotate-90 group-[[data-state=open]]/collapsible:rotate-90" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          render={<Link href={subItem.url} onClick={handleLinkClick} />}
                          isActive={
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
                          }
                        >
                          <span>{subItem.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
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

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b h-14 lg:h-[60px] px-4 flex items-center">
        <Logo textClassName="text-sm md:text-base font-black tracking-wide whitespace-nowrap" />
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <NavMain items={data.navMain} pathname={pathname} role={role} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}


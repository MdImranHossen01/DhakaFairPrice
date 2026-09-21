"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronRight,
  LayoutDashboard,
  ShoppingBag,
  FileText,
  Image as ImageIcon,
  Settings,
  Wallet,
  Store,
  Users,
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
      { title: "My Store Products", url: "/reseller/products" },
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
      { title: "Expenses & Incomes", url: "/reseller/expenses-incomes" },
      { title: "Accounts Ledger", url: "/reseller/ledger" },
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

function NavMain({ items, pathname }: { items: typeof resellerNav; pathname: string }) {
  const { setOpenMobile, isMobile } = useSidebar()

  const handleLinkClick = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Menu</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isParentActive = item.items.some(
            (sub) =>
              pathname === sub.url ||
              (sub.url !== "#" && pathname.startsWith(sub.url + "/"))
          )

          return (
            <Collapsible
              key={item.title}
              defaultOpen={isParentActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger
                  render={
                    <SidebarMenuButton tooltip={item.title} isActive={isParentActive} />
                  }
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((sub) => (
                      <SidebarMenuSubItem key={sub.title}>
                        <SidebarMenuSubButton
                          render={<Link href={sub.url} onClick={handleLinkClick} />}
                          isActive={
                            pathname === sub.url ||
                            (sub.url !== "#" &&
                              pathname.startsWith(sub.url + "/") &&
                              !item.items.some(
                                (other) =>
                                  other !== sub &&
                                  other.url.length > sub.url.length &&
                                  pathname.startsWith(other.url)
                              ))
                          }
                        >
                          <span>{sub.title}</span>
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

export function ResellerAppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b h-14 lg:h-[60px] px-4 flex items-center">
        <Logo textClassName="text-sm md:text-base font-black tracking-wide whitespace-nowrap" />
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <NavMain items={resellerNav} pathname={pathname} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

'use client';

import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
    ShoppingBag, 
    User as UserIcon, 
    Settings, 
    LogOut,
    Loader2,
    Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { signOut } from 'next-auth/react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user) {
      const role = (session.user as any)?.role;
      if (role === 'admin' || role === 'super_admin') {
        router.push('/admin/dashboard');
      }
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Prevent rendering protected layout content if pushed back to login
  if (status === 'unauthenticated') {
     return null;
  }

  const navLinks = [
    { href: '/dashboard', label: 'My Orders', icon: ShoppingBag, exact: true },
    { href: '/dashboard/wishlist', label: 'Wishlist', icon: Heart },
    { href: '/dashboard/profile', label: 'Profile Info', icon: UserIcon },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-full px-[2px] py-2 md:container md:px-6 md:py-8">
      {/* Mobile Top Profile & Scrollable Navigation Bar */}
      <div className="lg:hidden mb-4 space-y-2.5">
        <div className="flex items-center gap-3 p-3 bg-card border border-border/80 rounded-xl shadow-xs">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 shrink-0 overflow-hidden relative">
            {session?.user?.image ? (
              <Image 
                src={session.user.image} 
                alt={session?.user?.name || "Profile"} 
                width={48}
                height={48}
                className="h-full w-full object-cover" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <UserIcon className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold truncate text-foreground">{session?.user?.name || 'Customer'}</h2>
            <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive h-8 px-2 shrink-0 text-xs gap-1 hover:bg-destructive/10"
            onClick={() => signOut({ callbackUrl: window.location.origin })}
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </Button>
        </div>

        {/* Mobile Horizontal Scrollable Tab Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 bg-muted/40 rounded-xl border border-border/60">
          {navLinks.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/80"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-8">
        
        {/* Desktop Profile Sidebar */}
        <div className="hidden lg:block lg:col-span-1 space-y-6">
          <Card className="border-border/80">
            <CardHeader className="flex flex-col items-center text-center pb-4">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-md mb-3 overflow-hidden relative">
                  {session?.user?.image ? (
                     <Image 
                       src={session.user.image} 
                       alt={session?.user?.name || "Profile"} 
                       width={80}
                       height={80}
                       className="h-full w-full object-cover" 
                       referrerPolicy="no-referrer"
                     />
                  ) : (
                     <UserIcon className="h-10 w-10 text-primary" />
                  )}
              </div>
              <CardTitle className="text-lg font-bold">{session?.user?.name}</CardTitle>
              <CardDescription className="text-xs">{session?.user?.email}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="flex flex-col">
                <Link 
                  href="/dashboard" 
                  className={cn(
                    buttonVariants({ variant: 'ghost' }),
                    "justify-start px-5 h-11 rounded-none border-l-4 w-full text-sm",
                    pathname === '/dashboard' ? 'border-primary bg-muted/60 font-bold text-primary' : 'border-transparent text-muted-foreground'
                  )}
                >
                  <ShoppingBag className="mr-3 h-4 w-4" /> My Orders
                </Link>
                <Link 
                  href="/dashboard/wishlist" 
                  className={cn(
                    buttonVariants({ variant: 'ghost' }),
                    "justify-start px-5 h-11 rounded-none border-l-4 w-full text-sm",
                    pathname === '/dashboard/wishlist' ? 'border-primary bg-muted/60 font-bold text-primary' : 'border-transparent text-muted-foreground'
                  )}
                >
                  <Heart className="mr-3 h-4 w-4" /> Wishlist
                </Link>
                <Link 
                  href="/dashboard/profile" 
                  className={cn(
                    buttonVariants({ variant: 'ghost' }),
                    "justify-start px-5 h-11 rounded-none border-l-4 w-full text-sm",
                    pathname === '/dashboard/profile' ? 'border-primary bg-muted/60 font-bold text-primary' : 'border-transparent text-muted-foreground'
                  )}
                >
                  <UserIcon className="mr-3 h-4 w-4" /> Profile Info
                </Link>
                <Link 
                  href="/dashboard/settings" 
                  className={cn(
                    buttonVariants({ variant: 'ghost' }),
                    "justify-start px-5 h-11 rounded-none border-l-4 w-full text-sm",
                    pathname === '/dashboard/settings' ? 'border-primary bg-muted/60 font-bold text-primary' : 'border-transparent text-muted-foreground'
                  )}
                >
                  <Settings className="mr-3 h-4 w-4" /> Account Settings
                </Link>
                <Separator />
                <Button 
                    variant="ghost" 
                    className="justify-start px-5 h-11 rounded-none border-l-4 border-transparent text-destructive hover:bg-destructive/10 text-sm font-medium"
                    onClick={() => signOut({ callbackUrl: window.location.origin })}
                >
                  <LogOut className="mr-3 h-4 w-4" /> Sign Out
                </Button>
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-4 md:space-y-6">
           {children}
        </div>
      </div>
    </div>
  );
}

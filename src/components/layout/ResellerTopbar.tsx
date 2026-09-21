"use client";

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { User, LogOut, Store } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ResellerTopbar() {
  const { data: session } = useSession();
  const [storeLogo, setStoreLogo] = useState<string>('');
  const [storeName, setStoreName] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    fetch('/api/reseller/settings')
      .then(res => res.json())
      .then(data => {
        if (isMounted && data?.reseller) {
          if (data.reseller.logoUrl) setStoreLogo(data.reseller.logoUrl);
          if (data.reseller.storeName) setStoreName(data.reseller.storeName);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [session?.user?.image]);

  const avatarUrl = session?.user?.image || storeLogo;
  const displayName = storeName || session?.user?.name || "Reseller";

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden" />
        <div className="flex-1 font-semibold text-lg md:hidden flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          Reseller Panel
        </div>
      </div>
      <div className="hidden md:flex flex-1" />
      <div className="flex items-center gap-4">
        <ModeToggle />

        {session?.user ? (
          <DropdownMenu>
            <DropdownMenuTrigger nativeButton={true} render={
              <Button variant="secondary" size="icon" className="rounded-full overflow-hidden border border-primary/20 hover:border-primary transition-all p-0">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                    unoptimized
                  />
                ) : (
                  <User className="h-5 w-5" />
                )}
                <span className="sr-only">Toggle user menu</span>
              </Button>
            } />
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <div className="flex items-center gap-3 py-1">
                    {avatarUrl ? (
                      <div className="h-9 w-9 rounded-full overflow-hidden border shrink-0">
                        <Image
                          src={avatarUrl}
                          alt={displayName}
                          width={36}
                          height={36}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Store className="h-4 w-4" />
                      </div>
                    )}
                    <div className="flex flex-col space-y-0.5 overflow-hidden">
                      <p className="text-sm font-bold leading-tight truncate">{displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {session.user.email}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => signOut({ callbackUrl: window.location.origin })}
                className="cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="secondary" size="icon" className="rounded-full">
            <User className="h-5 w-5" />
            <span className="sr-only">Toggle user menu</span>
          </Button>
        )}
      </div>
    </header>
  );
}

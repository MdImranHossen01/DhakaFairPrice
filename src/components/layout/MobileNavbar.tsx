'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { Logo } from '@/components/ui/logo';
import { ModeToggle } from '@/components/mode-toggle';

interface MobileNavbarProps {
  navItems: { href: string; label: string }[];
  categories: any[];
}

/**
 * MobileNavbar — Reusable mobile top bar (V1 standard).
 * MUST be used by ALL navbar versions for mobile (lg:hidden).
 * Always sticky top-0 with solid bg-background. No transparent/floating on mobile.
 */
export function MobileNavbar({ navItems, categories }: MobileNavbarProps) {
  const { data: session } = useSession();

  return (
    <header className="lg:hidden sticky top-0 z-50 w-full bg-background border-b shadow-sm">
      <div className="relative flex h-14 items-center justify-between px-3">

        {/* Left: Mobile Menu Drawer Trigger */}
        <div className="flex items-center">
          <MobileMenu
            navItems={navItems}
            categories={categories}
            session={session}
          />
        </div>

        {/* Center: Logo */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
          <Logo textClassName="text-base sm:text-lg whitespace-nowrap" />
        </div>
        {/* Right: Theme Toggle Button */}
        <div className="flex items-center justify-end">
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}

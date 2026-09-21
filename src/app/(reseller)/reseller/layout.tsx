'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ResellerAppSidebar } from '@/components/layout/ResellerAppSidebar';
import ResellerTopbar from '@/components/layout/ResellerTopbar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export default function ResellerLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user) {
      const role = (session.user as any)?.role;
      if (role !== 'reseller') {
        router.push('/dashboard');
      }
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-bold">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  const role = (session?.user as any)?.role;
  if (role !== 'reseller') return null;

  return (
    <SidebarProvider>
      <ResellerAppSidebar />
      <SidebarInset>
        <ResellerTopbar />
        <main className="flex-1 items-start gap-4 px-[2px] py-1 md:px-4 md:py-6 md:gap-8 pb-24 md:pb-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

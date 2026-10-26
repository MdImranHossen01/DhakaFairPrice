'use client';

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ImpersonationDropdownCardProps {
  className?: string;
  onExitSuccess?: () => void;
}

export function ImpersonationDropdownCard({ className = '', onExitSuccess }: ImpersonationDropdownCardProps) {
  const { data: session } = useSession();
  const [isExiting, setIsExiting] = useState(false);

  const isImpersonated = Boolean((session?.user as any)?.isImpersonated);

  if (!isImpersonated || !session?.user) {
    return null;
  }

  const handleExitImpersonation = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsExiting(true);
    try {
      const res = await fetch('/api/admin/impersonate/exit', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to exit impersonation');
      }

      if (data.exitToken) {
        const signInRes = await signIn('credentials', {
          impersonationToken: data.exitToken,
          redirect: false,
        });

        if (signInRes?.error) {
          throw new Error(signInRes.error);
        }
      }

      toast.success('Successfully returned to Admin Dashboard');
      if (onExitSuccess) {
        onExitSuccess();
      }
      window.location.href = '/admin/dashboard';
    } catch (err: any) {
      console.error('Exit impersonation error:', err);
      toast.error(err.message || 'Failed to return to admin dashboard');
      setIsExiting(false);
    }
  };

  const displayName = session.user.name || 'User';
  const displayContact = (session.user as any)?.phone || session.user.email || '';

  return (
    <div
      className={`p-2.5 mb-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-950 dark:text-amber-100 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
        <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
        Admin Impersonation
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">
        You are currently viewing as:
      </p>
      <p className="text-xs font-bold text-foreground truncate mt-0.5" title={`${displayName} (${displayContact})`}>
        {displayName} {displayContact ? <span className="font-normal text-muted-foreground">({displayContact})</span> : null}
      </p>
      <Button
        size="sm"
        type="button"
        onClick={handleExitImpersonation}
        disabled={isExiting}
        className="w-full mt-2 h-7 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shadow-xs transition-colors"
      >
        {isExiting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ArrowLeft className="w-3.5 h-3.5" />
        )}
        Return to Admin Dashboard
      </Button>
    </div>
  );
}

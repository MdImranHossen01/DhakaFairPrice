'use client';

import { PasswordChangeForm } from '@/components/user/PasswordChangeForm';

export default function SettingsPage() {
  return (
    <div className="flex flex-col space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-foreground">Account Settings</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Update password and security</p>
      </div>
      <PasswordChangeForm />
    </div>
  );
}

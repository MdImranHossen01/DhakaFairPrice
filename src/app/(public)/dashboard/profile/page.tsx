'use client';

import { ProfileForm } from '@/components/user/ProfileForm';

export default function ProfilePage() {
  return (
    <div className="flex flex-col space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-foreground">Profile Information</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Manage your personal details</p>
      </div>
      <ProfileForm />
    </div>
  );
}

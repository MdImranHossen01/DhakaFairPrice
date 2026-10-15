'use client';

import { signOut } from 'next-auth/react';

/**
 * Universal sign-out utility that guarantees session cookies are completely cleared
 * across mother domain, subdomains, and custom reseller domains (e.g. bhootbazar.com).
 */
export async function handleSignOut(targetUrl?: string) {
  const destination = targetUrl || (typeof window !== 'undefined' ? window.location.origin : '/');

  try {
    // 1. Call our dedicated logout endpoint to force-clear all httpOnly auth cookies
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    console.error('Logout API error:', err);
  }

  try {
    // 2. Clear NextAuth client session state and broadcast event
    await signOut({ redirect: false });
  } catch (err) {
    console.error('NextAuth signOut error:', err);
  }

  if (typeof window !== 'undefined') {
    // 3. Clear any client-accessible cookies
    try {
      document.cookie.split(';').forEach((c) => {
        const trimmed = c.trim();
        const eqPos = trimmed.indexOf('=');
        const name = eqPos > -1 ? trimmed.substr(0, eqPos) : trimmed;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
      });
    } catch {
      // Ignore
    }

    // 4. Force hard navigation to reload the page without cached session
    window.location.href = destination;
  }
}

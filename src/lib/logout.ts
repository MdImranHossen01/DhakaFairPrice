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
      credentials: 'include',
      cache: 'no-store',
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
    // 3. Clear any client-accessible cookies across host and parent domains
    try {
      const hostname = window.location.hostname;
      const domains = ['', `;domain=${hostname}`];
      const parts = hostname.split('.');
      if (parts.length > 2) {
        const apex = parts.slice(-2).join('.');
        domains.push(`;domain=.${apex}`, `;domain=${apex}`);
      }

      document.cookie.split(';').forEach((c) => {
        const trimmed = c.trim();
        const eqPos = trimmed.indexOf('=');
        const name = eqPos > -1 ? trimmed.substr(0, eqPos) : trimmed;
        for (const d of domains) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/${d}`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/${d};Secure`;
        }
      });
    } catch {
      // Ignore
    }

    try {
      sessionStorage.clear();
      localStorage.removeItem('nextauth.message');
    } catch {
      // Ignore
    }

    // 4. Force hard navigation or reload so cached session state is wiped
    const currentHref = window.location.href;
    const isSamePage =
      currentHref === destination ||
      currentHref === destination + '/' ||
      (destination === '/' && window.location.pathname === '/');

    if (isSamePage) {
      window.location.reload();
    } else {
      window.location.replace(destination);
    }
  }
}


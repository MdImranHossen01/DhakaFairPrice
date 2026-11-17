'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { Provider as ReduxProvider } from 'react-redux';
import { SessionProvider } from 'next-auth/react';
import { store } from '@/store/store';

import { AnimationProvider } from './animation-provider';
import { CartHydrator } from './CartHydrator';
import { WishlistHydrator } from './WishlistHydrator';

import { SettingsProvider } from './SettingsProvider';
import { TooltipProvider } from '@/components/ui/tooltip';

const SESSION_CACHE_KEY = '__dfp_session_cache_v1__';
const PROFILE_CACHE_KEY = '__dfp_profile_cache_v1__';
const WISHLIST_CACHE_KEY = '__dfp_wishlist_cache_v1__';
const CATS_CACHE_KEY = '__dfp_cats_cache_v1__';
const BRANDS_CACHE_KEY = '__dfp_brands_cache_v1__';
const AUTH_HINT_KEY = '__dfp_has_auth_hint__';
const AUTH_HINT_COOKIE = 'dfp_has_auth=1';
const SESSION_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes shared across all tabs
const CATALOG_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes for navbar categories/brands

function hasAuthHint(): boolean {
  try {
    if (localStorage.getItem(AUTH_HINT_KEY) === '1') return true;
    if (typeof document !== 'undefined' && document.cookie.includes(AUTH_HINT_COOKIE)) return true;
  } catch {}
  return false;
}

function clearCachedSession() {
  try {
    localStorage.removeItem(SESSION_CACHE_KEY);
    localStorage.removeItem(PROFILE_CACHE_KEY);
    localStorage.removeItem(WISHLIST_CACHE_KEY);
    sessionStorage.removeItem(SESSION_CACHE_KEY);
    sessionStorage.removeItem('cartSynced');
  } catch {}
}

function setAuthHint(active: boolean) {
  try {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const parts = host.split('.');
    const rootDomain = parts.length >= 2 && host !== 'localhost' ? `.${parts.slice(-2).join('.')}` : '';
    if (active) {
      localStorage.setItem(AUTH_HINT_KEY, '1');
      document.cookie = `${AUTH_HINT_COOKIE}; path=/; max-age=2592000; SameSite=Lax`;
      if (rootDomain) {
        document.cookie = `${AUTH_HINT_COOKIE}; path=/; domain=${rootDomain}; max-age=2592000; SameSite=Lax`;
      }
    } else {
      localStorage.removeItem(AUTH_HINT_KEY);
      clearCachedSession();
      document.cookie = 'dfp_has_auth=; path=/; max-age=0; SameSite=Lax';
      if (rootDomain) {
        document.cookie = `dfp_has_auth=; path=/; domain=${rootDomain}; max-age=0; SameSite=Lax`;
      }
    }
  } catch {}
}

function isAuthOrProtectedPath(pathname: string): boolean {
  if (
    pathname === '/dashboard/wishlist' ||
    pathname.endsWith('/dashboard/wishlist') ||
    pathname === '/reseller-program' ||
    pathname === '/reseller/register'
  ) {
    return false;
  }
  return (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/reseller') ||
    pathname.includes('/login') ||
    pathname.includes('/reseller-panel') ||
    pathname.includes('/dashboard')
  );
}

// Install a zero-call guest guard + cross-tab localStorage cache for GET /api/auth/session
// Guest shoppers browsing Admin Shop & Reseller Shop public pages make 0 auth requests to Vercel.
if (typeof window !== 'undefined' && !(window as any).__dfpSessionFetchPatched) {
  (window as any).__dfpSessionFetchPatched = true;
  const originalFetch = window.fetch.bind(window);
  const inflightGetMap = new Map<string, Promise<{ status: number; body: string }>>();

  function fetchWithCacheAndDedup(
    cacheKey: string,
    storage: Storage,
    ttlMs: number,
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    try {
      const raw = storage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.ts === 'number' && Date.now() - parsed.ts < ttlMs) {
          return Promise.resolve(
            new Response(JSON.stringify(parsed.data), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
      }
    } catch {}

    let pending = inflightGetMap.get(cacheKey);
    if (!pending) {
      pending = (async () => {
        try {
          const res = await originalFetch(input, init);
          const text = await res.text();
          if (res.status === 401 && (cacheKey === PROFILE_CACHE_KEY || cacheKey === WISHLIST_CACHE_KEY)) {
            setAuthHint(false);
          } else if (res.ok) {
            try {
              const data = JSON.parse(text);
              storage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data }));
            } catch {}
          }
          return { status: res.status, body: text };
        } finally {
          inflightGetMap.delete(cacheKey);
        }
      })();
      inflightGetMap.set(cacheKey, pending);
    }

    return pending.then(
      ({ status, body }) =>
        new Response(body, {
          status,
          headers: { 'Content-Type': 'application/json' },
        })
    );
  }

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.href
        : input?.url || '';
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const pathname = window.location?.pathname || '';

    if (urlStr.includes('/api/auth/') && !(urlStr.includes('/api/auth/session') && method === 'GET')) {
      try {
        clearCachedSession();
        if (urlStr.includes('/signout') || urlStr.includes('/logout')) {
          setAuthHint(false);
        } else {
          setAuthHint(true);
        }
      } catch {}
    } else if (
      method !== 'GET' &&
      (urlStr.includes('/api/user') ||
        urlStr.includes('/api/reseller') ||
        urlStr.includes('/api/admin/users') ||
        urlStr.includes('/api/admin/impersonate') ||
        urlStr.includes('/api/orders'))
    ) {
      clearCachedSession();
    } else if (method !== 'GET' && urlStr.includes('/api/wishlist')) {
      try { localStorage.removeItem(WISHLIST_CACHE_KEY); } catch {}
    } else if (method !== 'GET' && urlStr.includes('/api/categories')) {
      try { sessionStorage.removeItem(CATS_CACHE_KEY); } catch {}
    } else if (method !== 'GET' && urlStr.includes('/api/brands')) {
      try { sessionStorage.removeItem(BRANDS_CACHE_KEY); } catch {}
    }

    // 1. GET /api/user/profile -> 0 calls for guests, cross-tab 30m cache for logged-in users
    if (urlStr.includes('/api/user/profile') && method === 'GET') {
      if (!hasAuthHint() && !isAuthOrProtectedPath(pathname)) {
        return new Response(JSON.stringify({ message: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return fetchWithCacheAndDedup(PROFILE_CACHE_KEY, localStorage, SESSION_CACHE_TTL_MS, input, init);
    }

    // 2. Skip redundant GET /api/cart on reload when cart was already merged in this tab session
    if ((urlStr.endsWith('/api/cart') || urlStr.includes('/api/cart?')) && method === 'GET') {
      try {
        if (!hasAuthHint() || sessionStorage.getItem('cartSynced') === 'true') {
          return new Response(null, { status: 304 });
        }
      } catch {}
    }

    // 3. Cross-tab localStorage cache for GET /api/wishlist
    if (urlStr.includes('/api/wishlist') && method === 'GET') {
      if (!hasAuthHint() && !isAuthOrProtectedPath(pathname)) {
        return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return fetchWithCacheAndDedup(WISHLIST_CACHE_KEY, localStorage, SESSION_CACHE_TTL_MS, input, init);
    }

    // 4. Deduplicate & cache Navbar GET /api/categories and GET /api/brands on storefront (Admin Shop & Reseller Shop)
    if (!pathname.startsWith('/admin') && method === 'GET') {
      if (urlStr.endsWith('/api/categories')) {
        return fetchWithCacheAndDedup(CATS_CACHE_KEY, sessionStorage, CATALOG_CACHE_TTL_MS, input, init);
      }
      if (urlStr.endsWith('/api/brands?all=true') || urlStr.endsWith('/api/brands')) {
        return fetchWithCacheAndDedup(BRANDS_CACHE_KEY, sessionStorage, CATALOG_CACHE_TTL_MS, input, init);
      }
    }

    // 5. Intercept GET /api/auth/session
    if (urlStr.includes('/api/auth/session') && method === 'GET') {
      if (!hasAuthHint() && !isAuthOrProtectedPath(pathname)) {
        return new Response('null', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const isAuthPage = pathname.includes('/login') || pathname.startsWith('/register');
      const ttl = isAuthPage ? 5000 : SESSION_CACHE_TTL_MS;
      try {
        const raw = localStorage.getItem(SESSION_CACHE_KEY) || sessionStorage.getItem(SESSION_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.ts === 'number' && Date.now() - parsed.ts < ttl) {
            return new Response(JSON.stringify(parsed.data), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        }
      } catch {}

      const response = await originalFetch(input, init);
      if (response.ok) {
        try {
          const cloned = response.clone();
          const data = await cloned.json();
          if (data && data.user) {
            setAuthHint(true);
            const payload = JSON.stringify({ ts: Date.now(), data });
            localStorage.setItem(SESSION_CACHE_KEY, payload);
            sessionStorage.setItem(SESSION_CACHE_KEY, payload);
          } else {
            setAuthHint(false);
          }
        } catch {}
      }
      return response;
    }

    return originalFetch(input, init);
  };
}

export function Providers({ 
  children,
  settings 
}: { 
  children: React.ReactNode;
  settings?: any;
}) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <ReduxProvider store={store}>
        <NextThemesProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SettingsProvider settings={settings}>
            <TooltipProvider>
              <AnimationProvider>
                <CartHydrator>
                  <WishlistHydrator>
                    {children}
                  </WishlistHydrator>
                </CartHydrator>
              </AnimationProvider>
            </TooltipProvider>
          </SettingsProvider>
        </NextThemesProvider>
      </ReduxProvider>
    </SessionProvider>
  );
}

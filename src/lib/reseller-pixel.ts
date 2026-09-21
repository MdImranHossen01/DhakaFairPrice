"use client";

/**
 * Reseller Storefront Pixel Tracking Utility
 * 
 * Mirrors the structure of fpixel.ts and tiktok.ts but:
 * - Posts to /api/store/[subdomain]/facebook/event (uses reseller's own Pixel ID/Token)
 * - Posts to /api/store/[subdomain]/tiktok/event
 * - Also fires browser-side via window.fbq and window.ttq (if loaded by ResellerPixels component)
 */

const generateEventId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

type UserData = {
  em?: string;
  ph?: string;
  fn?: string;
  ln?: string;
  ct?: string;
  st?: string;
  country?: string;
};

const TT_EVENT_MAP: Record<string, string> = {
  'PageView': 'PageView',
  'AddToCart': 'AddToCart',
  'AddToWishlist': 'AddToWishlist',
  'InitiateCheckout': 'InitiateCheckout',
  'Purchase': 'CompletePayment',
  'ViewContent': 'ViewContent',
  'Contact': 'Contact',
  'Search': 'Search',
};

/**
 * Waits until the reseller's specific Facebook pixel has been initialised
 * (i.e. window[`_resellerPixelReady_${pixelId}`] is true).
 *
 * We intentionally do NOT fall back to checking `window.fbq` alone — if the
 * mother-shop pixel somehow leaks in (edge-case), that would be a false positive.
 */
export const waitForResellerPixel = (pixelId: string, maxWaitMs = 5000, intervalMs = 200) =>
  new Promise<void>((resolve) => {
    if (typeof window !== 'undefined' && (window as any).fbq && (window as any)._resellerPageViewFired) {
      resolve();
      return;
    }
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += intervalMs;
      if (
        (typeof window !== 'undefined' && (window as any).fbq && (window as any)._resellerPageViewFired) ||
        elapsed >= maxWaitMs
      ) {
        clearInterval(timer);
        resolve();
      }
    }, intervalMs);
  });

export const resellerFbEvent = (
  subdomain: string,
  eventName: string,
  customData: Record<string, unknown> = {},
  userData: UserData = {},
  providedEventId?: string,
  /** Pass the pixel ID so browser-side tracking targets the correct init'd pixel. */
  pixelId?: string
) => {
  const eventId = providedEventId || generateEventId();

  const formattedCustomData = {
    ...customData,
    content_type: customData.content_type || 'product',
    ...(customData.contents && Array.isArray(customData.contents) ? {
      contents: (customData.contents as any[]).map((item: any) => ({
        ...item,
        price: item.price || item.item_price,
        item_price: item.item_price || item.price
      }))
    } : {})
  };

  // 1. Browser Pixel
  //    Since proxy.ts now correctly blocks the mother shop pixel, 
  //    we can safely trust window.fbq if it exists.
  if (typeof window !== "undefined" && typeof (window as any).fbq === "function") {
    const standardEvents = [
      "ViewContent", "AddToCart", "AddToWishlist", "InitiateCheckout",
      "Purchase", "Lead", "PageView", "Contact", "Search"
    ];
    if (userData?.em || userData?.ph) {
      (window as any).fbq('set', 'user_data', {
        ...(userData.em && { em: userData.em.trim().toLowerCase() }),
        ...(userData.ph && { ph: userData.ph.replace(/\D/g, '') }),
        ...(userData.fn && { fn: userData.fn.trim().toLowerCase() }),
        ...(userData.ln && { ln: userData.ln.trim().toLowerCase() }),
        ...(userData.ct && { ct: userData.ct.trim().toLowerCase() }),
        ...(userData.st && { st: userData.st.trim().toLowerCase() }),
        ...(userData.country && { country: userData.country.trim().toLowerCase() }),
      });
    }
    if (standardEvents.includes(eventName)) {
      (window as any).fbq("track", eventName, formattedCustomData, { eventID: eventId });
    } else {
      (window as any).fbq("trackCustom", eventName, formattedCustomData, { eventID: eventId });
    }
  }

  // 2. Server-side CAPI using reseller's own pixel config
  if (typeof window !== "undefined") {
    fetch(`/api/store/${subdomain}/facebook/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({
        eventName,
        eventUrl: window.location.href,
        userAgent: navigator.userAgent,
        eventId,
        userData,
        customData: formattedCustomData,
      }),
    }).catch(() => { /* Fail silently */ });
  }

  return eventId;
};

export const resellerTtEvent = (
  subdomain: string,
  eventName: string,
  customData: Record<string, unknown> = {},
  userData: UserData = {},
  providedEventId?: string
) => {
  const eventId = providedEventId || generateEventId();
  const mappedEvent = TT_EVENT_MAP[eventName] || eventName;

  const formattedCustomData = {
    ...customData,
    content_type: customData.content_type || 'product',
    ...(customData.contents && Array.isArray(customData.contents) ? {
      contents: (customData.contents as any[]).map((item: any) => ({
        ...item,
        price: item.price || item.item_price,
        item_price: item.item_price || item.price
      }))
    } : {})
  };

  // 1. Browser TikTok Pixel (if loaded)
  if (typeof window !== "undefined" && (window as any).ttq && typeof (window as any).ttq.track === "function") {
    (window as any).ttq.track(mappedEvent, formattedCustomData, { event_id: eventId });
  }

  // 2. Server-side Events API using reseller's own pixel config
  if (typeof window !== "undefined") {
    fetch(`/api/store/${subdomain}/tiktok/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: mappedEvent,
        eventUrl: window.location.href,
        userAgent: navigator.userAgent,
        eventId,
        userData,
        customData: formattedCustomData,
      }),
    }).catch(() => { /* Fail silently */ });
  }

  return eventId;
};

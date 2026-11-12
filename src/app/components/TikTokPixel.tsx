"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

export default function TikTokPixel({
  pixelId,
}: {
  pixelId?: string;
}) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  // Sanitize pixelId: alphanumeric for TikTok Pixel
  const sanitizedPixelId = pixelId && /^[a-zA-Z0-9]+$/.test(pixelId.trim()) ? pixelId.trim() : null;

  useEffect(() => {
    if (!sanitizedPixelId) return;
    let interval: NodeJS.Timeout;
    const checkTtq = () => {
      if (typeof window !== "undefined" && (window as any).ttq) {
        setScriptLoaded(true);
        if (interval) clearInterval(interval);
      }
    };
    checkTtq();
    if (!scriptLoaded) {
      interval = setInterval(checkTtq, 200);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sanitizedPixelId, scriptLoaded]);

  const trackPageView = useCallback(
    () => {
      if (!sanitizedPixelId) return;
      import("@/lib/tiktok").then(({ ttEvent }) => {
        ttEvent("PageView");
      });
    },
    [sanitizedPixelId]
  );

  useEffect(() => {
    if (!sanitizedPixelId || !scriptLoaded) return;
    // The inline script already calls ttq.page() on initial load;
    // Still call ttEvent("PageView") for CAPI deduplication & SPA route transitions
    if (isFirstRender.current) {
      isFirstRender.current = false;
      import("@/lib/tiktok").then(({ ttEvent }) => {
        ttEvent("PageView", { _skipBrowserPageCall: true });
      });
      return;
    }
    trackPageView();
  }, [pathname, searchParams, trackPageView, sanitizedPixelId, scriptLoaded]);

  if (!sanitizedPixelId) {
    return null;
  }

  return (
    <>
      <Script
        id="tiktok-pixel"
        strategy="afterInteractive"
        onReady={() => setScriptLoaded(true)}
        dangerouslySetInnerHTML={{
          __html: `
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var a=d.createElement("script");a.type="text/javascript",a.async=!0,a.src=r+"?sdkid="+e+"&lib="+t;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(a,s)};
              ttq.load('${sanitizedPixelId}');
              ttq.page();
            }(window, document, 'ttq');
          `,
        }}
      />
    </>
  );
}

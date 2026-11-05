"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellRing, Send, CheckCircle2, AlertCircle, Smartphone, Laptop, MessageSquare } from "lucide-react";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface NotificationSettingsDialogProps {
  openControlled?: boolean;
  onOpenControlledChange?: (open: boolean) => void;
  hideTriggerButton?: boolean;
}

export function NotificationSettingsDialog({
  openControlled,
  onOpenControlledChange,
  hideTriggerButton = false,
}: NotificationSettingsDialogProps = {}) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isReseller = role === "reseller";

  const isControlled = openControlled !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isControlled ? openControlled : internalOpen;
  const setIsOpen = isControlled ? (onOpenControlledChange || (() => {})) : setInternalOpen;
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);

  function playNotificationSound() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.warn("Audio playback not allowed:", e);
    }
  }

  useEffect(() => {
    let active = true;
    const checkExistingSubscription = async () => {
      try {
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.ready;
          if (reg && active) {
            const sub = await reg.pushManager.getSubscription();
            if (active) setIsSubscribed(!!sub);
            // Re-sync existing browser subscription with the currently logged-in user/role
            // so switching accounts on the same browser never leaks notifications across roles
            if (sub && session?.user) {
              fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  subscription: sub,
                  userAgent: navigator.userAgent,
                }),
              }).catch(() => {});
            }
          }
        }
      } catch (e) {
        console.error("Error checking subscription:", e);
      }
    };

    if (typeof window !== "undefined" && "Notification" in window) {
      void checkExistingSubscription();
    }

    return () => {
      active = false;
    };
  }, [session?.user]);

  const handleSubscribePush = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      toast.error("Push notifications are not supported in this browser.");
      return;
    }

    setIsRegistering(true);
    try {
      // 1. Request browser permission
      const result = await Notification.requestPermission();

      if (result !== "granted") {
        toast.error("Notification permission denied. Please allow notifications in your browser settings.");
        return;
      }

      // 2. Register Service Worker (/sw.js or /push-sw.js)
      let reg: ServiceWorkerRegistration;
      try {
        reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
      }
      await navigator.serviceWorker.ready;

      // 3. Convert VAPID Public Key and Subscribe
      const vapidKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        "BKc8CDjOGVJXcupFb2GIDVaMJ7QstKD-Wb7YlTKt53GcE803xq5f57zboWjBymnLx5TsY9dgE4eETMrcDUpdJiY";

      const convertedKey = urlBase64ToUint8Array(vapidKey);

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });

      // 4. Save to Backend Database
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription,
          userAgent: navigator.userAgent,
        }),
      });

      if (!res.ok) throw new Error("Failed to save push subscription.");

      setIsSubscribed(true);
      playNotificationSound();
      toast.success(
        isReseller
          ? "Alerts enabled! You will now receive instant audio and push alerts when new orders arrive."
          : "Push notifications successfully enabled! Real-time alerts will sound on new orders."
      );
    } catch (err: any) {
      console.error("Subscription error:", err);
      toast.error(err.message || "Failed to enable push notifications.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleTestPush = async () => {
    setIsTestingPush(true);
    playNotificationSound();
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Test push notification sent successfully!");
        if ("serviceWorker" in navigator) {
          try {
            const reg = await navigator.serviceWorker.ready;
            await reg.showNotification("🔔 টেস্ট পুশ নোটিফিকেশন", {
              body: "অভিনন্দন! আপনার ডিভাইসে নোটিফিকেশন সফলভাবে কাজ করছে।",
              icon: "/favicon.ico",
              badge: "/favicon.ico",
              requireInteraction: true,
            });
          } catch (swErr) {
            console.error("ServiceWorker showNotification error:", swErr);
          }
        }
      } else {
        toast.error(data.error || "Failed to send test push notification.");
      }
    } catch (e: any) {
      toast.error(e.message || "Push notification test failed.");
    } finally {
      setIsTestingPush(false);
    }
  };

  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    try {
      const res = await fetch("/api/telegram/test", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Test Telegram notification sent successfully!");
      } else {
        toast.error(data.message || "Failed to send Telegram test message.");
      }
    } catch (e: any) {
      toast.error(e.message || "Telegram connection error.");
    } finally {
      setIsTestingTelegram(false);
    }
  };

  return (
    <>
      {!hideTriggerButton && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="relative rounded-full h-9 w-9 bg-background/80 hover:bg-accent border shadow-sm"
          title={isReseller ? "Reseller Order Alerts" : "Instant Order Notification Settings"}
        >
          {isSubscribed ? (
            <BellRing className="h-4 w-4 text-emerald-600 animate-pulse" />
          ) : (
            <Bell className="h-4 w-4 text-muted-foreground" />
          )}
          {isSubscribed && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  {isReseller ? "Order Alert Settings" : "Instant Order Alert Settings"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {isReseller
                    ? "Receive instant sound and push notifications on mobile and desktop whenever customers order."
                    : "Receive instant audio alerts and push notifications on mobile and laptop whenever a new order arrives."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Section 1: Browser / Mobile Web Push */}
            <div className="p-3.5 rounded-xl border bg-card/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    {isReseller ? "Mobile & Browser Audio Alerts" : "Browser Push Notifications"}
                  </span>
                </div>
                {isSubscribed ? (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <AlertCircle className="h-3 w-3" /> Inactive
                  </Badge>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {isReseller
                  ? "Receive sound alerts and instant popups even when your browser is closed or running in background."
                  : "Audio notifications and order alerts will appear in the background even if your device browser is minimized."}
              </p>

              <div className="flex gap-2 pt-1">
                {!isSubscribed ? (
                  <Button
                    onClick={handleSubscribePush}
                    disabled={isRegistering}
                    className="w-full text-xs font-semibold h-8"
                    size="sm"
                  >
                    <Smartphone className="h-3.5 w-3.5 mr-1.5" />
                    {isRegistering ? "Enabling..." : "Enable Alerts on this Device"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleTestPush}
                    disabled={isTestingPush}
                    className="w-full text-xs h-8"
                    size="sm"
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    {isTestingPush ? "Sending..." : "Send Test Push Alert"}
                  </Button>
                )}
              </div>
            </div>

            {/* Section 2: Telegram Bot Alert (Only visible for Admins) */}
            {!isReseller && (
              <div className="p-3.5 rounded-xl border bg-card/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-sky-500" />
                    <span className="text-xs font-bold text-foreground">Telegram Bot Instant Alerts</span>
                  </div>
                  <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-300 text-[10px]">
                    Bot Connected
                  </Badge>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Instant Telegram notifications containing customer name, phone, full address, total amount, and ordered item breakdown.
                </p>

                <Button
                  variant="outline"
                  onClick={handleTestTelegram}
                  disabled={isTestingTelegram}
                  className="w-full text-xs h-8 border-sky-200 text-sky-700 hover:bg-sky-50"
                  size="sm"
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  {isTestingTelegram ? "Sending..." : "Send Test Telegram Alert"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

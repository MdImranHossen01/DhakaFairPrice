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

export function NotificationSettingsDialog() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isReseller = role === "reseller";

  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
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
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
      checkExistingSubscription();
    }
  }, []);

  const checkExistingSubscription = async () => {
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          setIsSubscribed(!!sub);
        }
      }
    } catch (e) {
      console.error("Error checking subscription:", e);
    }
  };

  const handleSubscribePush = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      toast.error("আপনার ব্রাউজারে পুশ নোটিফিকেশন সাপোর্ট করে না।");
      return;
    }

    setIsRegistering(true);
    try {
      // 1. Request browser permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        toast.error("নোটিফিকেশন পারমিশন দেওয়া হয়নি। ব্রাউজার সেটিংসে গিয়ে Allow করুন।");
        return;
      }

      // 2. Register Service Worker (/push-sw.js)
      const reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
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

      if (!res.ok) throw new Error("সাবস্ক্রিপশন সেভ করা যায়নি।");

      setIsSubscribed(true);
      playNotificationSound();
      toast.success(
        isReseller
          ? "অ্যালার্ট চালু হয়েছে! আপনার স্টোরে নতুন অর্ডার আসলে সাথে সাথে শব্দসহ নোটিফিকেশন পাবেন।"
          : "পুশ নোটিফিকেশন সফলভাবে চালু হয়েছে! নতুন অর্ডার আসলে সাথে সাথে নোটিফিকেশন পাবেন।"
      );
    } catch (err: any) {
      console.error("Subscription error:", err);
      toast.error(err.message || "পুশ নোটিফিকেশন চালু করা সম্ভব হয়নি।");
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
        toast.success("টেস্ট পুশ নোটিফিকেশন পাঠানো হয়েছে!");
      } else {
        toast.error(data.error || "টেস্ট পুশ নোটিফিকেশন পাঠানো যায়নি।");
      }
    } catch (e: any) {
      toast.error(e.message || "টেস্ট ফেইল করেছে।");
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
        toast.success("টেলিগ্রামে টেস্ট নোটিফিকেশন সফলভাবে পাঠানো হয়েছে!");
      } else {
        toast.error(data.message || "টেলিগ্রাম টেস্ট ফেইল করেছে।");
      }
    } catch (e: any) {
      toast.error(e.message || "টেলিগ্রাম কানেকশন এরর।");
    } finally {
      setIsTestingTelegram(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="relative rounded-full h-9 w-9 bg-background/80 hover:bg-accent border shadow-sm"
        title={isReseller ? "রিসেলার অর্ডার পুশ অ্যালার্ট" : "ইনস্ট্যান্ট অর্ডার নোটিফিকেশন সেটিংস"}
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  {isReseller ? "রিসেলার অর্ডার অ্যালার্ট সেটিংস" : "ইনস্ট্যান্ট অর্ডার অ্যালার্ট সেটিংস"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {isReseller
                    ? "আপনার স্টোরে কাস্টমার অর্ডার দিলে সাথে সাথে মোবাইল ও পিসিতে শব্দসহ অ্যালার্ট পান।"
                    : "নতুন অর্ডার আসার সাথে সাথে মোবাইল ও ল্যাপটপে নোটিফিকেশন ও সাউন্ড পান।"}
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
                    {isReseller ? "মোবাইল ও ব্রাউজার সাউন্ড অ্যালার্ট" : "ব্রাউজার পুশ নোটিফিকেশন"}
                  </span>
                </div>
                {isSubscribed ? (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] gap-1">
                    <CheckCircle2 className="h-3 w-3" /> সক্রিয়
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <AlertCircle className="h-3 w-3" /> নিষ্ক্রিয়
                  </Badge>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {isReseller
                  ? "আপনার মোবাইল বা ল্যাপটপের ব্রাউজার বন্ধ থাকলেও ব্যাকগ্রাউন্ডে শব্দসহ আপনার স্টোরের অর্ডার ভেসে উঠবে।"
                  : "আপনার ফোন বা পিসির ব্রাউজার বন্ধ থাকলেও ব্যাকগ্রাউন্ডে অডিও সাউন্ডসহ নোটিফিকেশন স্ক্রিনে ভেসে উঠবে।"}
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
                    {isRegistering ? "চালু হচ্ছে..." : "এই ডিভাইসে অ্যালার্ট চালু করুন"}
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
                    {isTestingPush ? "পাঠানো হচ্ছে..." : "টেস্ট পুশ নোটিফিকেশন পাঠান"}
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
                    <span className="text-xs font-bold text-foreground">টেলিগ্রাম বট ইনস্ট্যান্ট অ্যালার্ট</span>
                  </div>
                  <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-300 text-[10px]">
                    বট কানেক্টেড
                  </Badge>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  যেকোনো অর্ডার আসার সাথে সাথে টেলিগ্রামে সম্পূর্ণ কাস্টমার নাম, ফোন, ঠিকানা, টাকার পরিমাণ ও প্রোডাক্ট তালিকা মেসেজ চলে যাবে।
                </p>

                <Button
                  variant="outline"
                  onClick={handleTestTelegram}
                  disabled={isTestingTelegram}
                  className="w-full text-xs h-8 border-sky-200 text-sky-700 hover:bg-sky-50"
                  size="sm"
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  {isTestingTelegram ? "পাঠানো হচ্ছে..." : "টেলিগ্রামে টেস্ট নোটিফিকেশন পাঠান"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

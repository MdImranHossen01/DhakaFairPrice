'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles,
  Check,
  X,
  ShieldCheck,
  Zap,
  Puzzle,
  PhoneCall,
  Truck,
  Wallet,
  CreditCard,
  Lock,
  Rocket,
  ChevronDown,
  ArrowRight,
  Star,
  Crown,
  Sprout,
  Package,
  Layers,
  FileText,
  Wrench,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  ExternalLink,
  Store,
  PackageCheck,
  Laptop,
  Activity,
  Code2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function ResellerProgramPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const packages = [
    {
      id: 'starter',
      name: 'Starter',
      icon: Sprout,
      iconColor: 'text-emerald-400',
      tagline: 'ছোট ব্যবসার জন্য আদর্শ শুরু',
      regularSetup: 2300,
      offerSetup: 1500,
      savingsPct: '৩৫%',
      monthlyFee: 370,
      yearlySavings: '৳১,১৭০ + ১ মাস ফ্রি',
      yearlyTotal: 5570,
      popular: false,
      btnColor: 'bg-purple-600 hover:bg-purple-700 text-white',
      features: [
        { text: '১,০০০ প্রোডাক্ট আপলোড লিমিট', highlight: false },
        { text: '৫০০ মাসিক অর্ডার ম্যানেজমেন্ট', highlight: false },
        { text: '৩০০ অটো প্রোডাক্ট আপলোড', highlight: false },
        { text: 'Fraud Order Guard', highlight: false },
        { text: 'Incomplete Order Management', highlight: false },
        { text: 'সেন্ট্রাল কুরিয়ার ডেলিভারি ও ফুলফিলমেন্ট', highlight: false },
        { text: 'bKash / Nagad / Rocket পেমেন্ট গেটওয়ে', highlight: false },
        { text: 'Server-Side Tracking (CAPI, Pixel, GA4) - ফ্রি', highlight: true },
        { text: 'Swapnobaz Next.js Store Admin Panel', highlight: false },
        { text: 'Website Video Tutorial', highlight: false },
        { text: '১টি Logo Design', highlight: false },
        { text: '৩টি Cover Photo Design', highlight: false },
        { text: 'Auto Call: ০.৫০ টাকা/কল', highlight: false },
        { text: 'Next.js আল্ট্রাফাস্ট কম লেটেন্সি সার্ভার', highlight: false },
        { text: 'ড্র্যাগ & ড্রপ লাইভ স্টোর বিল্ডার', highlight: false },
        { text: 'আনলিমিটেড ল্যান্ডিং পেজ বিল্ডার', highlight: false },
        { text: 'ডিসকাউন্ট / কুপন ম্যানেজমেন্ট', highlight: false },
        { text: 'আনলিমিটেড ব্যান্ডউইথ ও ক্লাউড সিডিএন', highlight: false },
        { text: 'কোনো হিডেন চার্জ নেই', highlight: true },
        { text: 'কাস্টম ফিচার অন্তর্ভুক্ত নয়', excluded: true },
      ],
    },
    {
      id: 'business',
      name: 'Business',
      icon: Rocket,
      iconColor: 'text-pink-400',
      tagline: 'বিক্রি বাড়াতে চাইলে এটাই পারফেক্ট',
      regularSetup: 4800,
      offerSetup: 2500,
      savingsPct: '৪৮%',
      monthlyFee: 690,
      yearlySavings: '৳২,৯৯০ + ১ মাস ফ্রি',
      yearlyTotal: 10090,
      popular: true,
      btnColor: 'bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:opacity-95 text-white shadow-lg shadow-pink-500/25',
      features: [
        { text: '২,০০০ প্রোডাক্ট আপলোড লিমিট', highlight: false },
        { text: '২,০০০ মাসিক অর্ডার ম্যানেজমেন্ট', highlight: false },
        { text: '৫০০ অটো প্রোডাক্ট আপলোড', highlight: false },
        { text: 'Fraud Order Guard', highlight: false },
        { text: 'Incomplete Order Management', highlight: false },
        { text: 'সেন্ট্রাল কুরিয়ার ডেলিভারি ও ফুলফিলমেন্ট', highlight: false },
        { text: 'bKash / Nagad / Rocket পেমেন্ট গেটওয়ে', highlight: false },
        { text: 'Server-Side Tracking (CAPI, Pixel, GA4) - ফ্রি', highlight: true },
        { text: 'Swapnobaz Next.js Store Admin Panel', highlight: false },
        { text: 'Website Video Tutorial', highlight: false },
        { text: '১টি Logo Design', highlight: false },
        { text: '৫টি Cover Photo Design', highlight: false },
        { text: 'Auto Call: ০.৪৫ টাকা/কল', highlight: false },
        { text: 'Next.js আল্ট্রাফাস্ট কম লেটেন্সি সার্ভার', highlight: false },
        { text: 'ড্র্যাগ & ড্রপ লাইভ স্টোর বিল্ডার', highlight: false },
        { text: 'আনলিমিটেড ল্যান্ডিং পেজ বিল্ডার', highlight: false },
        { text: 'ডিসকাউন্ট / কুপন ম্যানেজমেন্ট', highlight: false },
        { text: 'আনলিমিটেড ব্যান্ডউইথ ও ক্লাউড সিডিএন', highlight: false },
        { text: 'কোনো হিডেন চার্জ নেই', highlight: true },
        { text: 'সর্বোচ্চ ২টি কাস্টম ফিচার', highlight: false },
      ],
    },
    {
      id: 'professional',
      name: 'Professional',
      icon: Crown,
      iconColor: 'text-amber-400',
      tagline: 'বড় স্কেলে ব্যবসা করতে চাইলে',
      regularSetup: 7800,
      offerSetup: 3500,
      savingsPct: '৫৫%',
      monthlyFee: 1190,
      yearlySavings: '৳৫,৪১০ + ১ মাস ফ্রি',
      yearlyTotal: 16590,
      popular: false,
      btnColor: 'bg-purple-600 hover:bg-purple-700 text-white',
      features: [
        { text: '৪,০০০ প্রোডাক্ট আপলোড লিমিট', highlight: false },
        { text: '৫,০০০ মাসিক অর্ডার ম্যানেজমেন্ট', highlight: false },
        { text: '৮০০ অটো প্রোডাক্ট আপলোড', highlight: false },
        { text: 'Fraud Order Guard', highlight: false },
        { text: 'Incomplete Order Management', highlight: false },
        { text: 'সেন্ট্রাল কুরিয়ার ডেলিভারি ও ফুলফিলমেন্ট', highlight: false },
        { text: 'bKash / Nagad / Rocket পেমেন্ট গেটওয়ে', highlight: false },
        { text: 'Server-Side Tracking (CAPI, Pixel, GA4) - ফ্রি', highlight: true },
        { text: 'Swapnobaz Next.js Store Admin Panel', highlight: false },
        { text: 'Website Video Tutorial', highlight: false },
        { text: '১টি Logo Design', highlight: false },
        { text: '১০টি Cover Photo Design', highlight: false },
        { text: 'Auto Call: ০.৪০ টাকা/কল', highlight: false },
        { text: 'Next.js আল্ট্রাফাস্ট কম লেটেন্সি সার্ভার', highlight: false },
        { text: 'ড্র্যাগ & ড্রপ লাইভ স্টোর বিল্ডার', highlight: false },
        { text: 'আনলিমিটেড ল্যান্ডিং পেজ বিল্ডার', highlight: false },
        { text: 'ডিসকাউন্ট / কুপন ম্যানেজমেন্ট', highlight: false },
        { text: 'আনলিমিটেড ব্যান্ডউইথ ও ক্লাউড সিডিএন', highlight: false },
        { text: 'কোনো হিডেন চার্জ নেই', highlight: true },
        { text: 'সর্বোচ্চ ৪টি কাস্টম ফিচার', highlight: false },
      ],
    },
  ];

  const whyChooseUs = [
    {
      icon: Zap,
      iconColor: 'text-amber-400',
      title: 'Next.js ব্লেজিং স্পিড',
      desc: 'Next.js আল্ট্রা-ফাস্ট আর্কিটেকচারে আপনার সাইট লোড হবে চোখের পলকে — কাস্টমার ড্রপ কমে সেল বাড়বে',
    },
    {
      icon: Puzzle,
      iconColor: 'text-emerald-400',
      title: 'লাইভ স্টোর বিল্ডার',
      desc: 'কোনো কোডিং ছাড়া সহজেই ব্যানার, লেআউট ও কালার কাস্টমাইজ করে ব্র্যান্ড স্টোর তৈরি করুন',
    },
    {
      icon: ShieldCheck,
      iconColor: 'text-sky-400',
      title: 'Fraud Order Guard',
      desc: 'অটোমেটিক ফ্রড ও ফেইক অর্ডার ফিল্টার — আপনার সময়, প্যাকেজিং খরচ ও রিটার্ন লস বাঁচাবে',
    },
    {
      icon: Activity,
      iconColor: 'text-purple-400',
      title: 'ফ্রি Server-Side Tracking',
      desc: 'Facebook Conversion API, Pixel, TikTok ও GA4 সার্ভার সাইড ট্র্যাকিং সম্পূর্ণ বিনামূল্যে অন্তর্ভুক্ত',
    },
    {
      icon: PhoneCall,
      iconColor: 'text-rose-400',
      title: 'অটো কল সুবিধা',
      desc: 'অর্ডার আসার সাথে সাথে স্বয়ংক্রিয়ভাবে কাস্টমারকে ভয়েস কলে কনফার্ম করার প্রিমিয়াম প্রযুক্তি',
    },
    {
      icon: Package,
      iconColor: 'text-amber-300',
      title: 'সেন্ট্রাল কুরিয়ার ও ফুলফিলমেন্ট',
      desc: 'অর্ডার আসা মাত্রই স্বপ্নবাজ সেন্ট্রাল হাব থেকে প্যাকেজিং ও সারাদেশে কুরিয়ার ডেলিভারি সম্পন্ন',
    },
  ];

  const workflowSteps = [
    {
      step: 1,
      icon: FileText,
      title: 'প্যাকেজ সিলেক্ট করুন',
      desc: 'আপনার ব্যবসার সাইজ অনুযায়ী প্যাকেজ বেছে নিন',
      time: '১ মিনিট',
    },
    {
      step: 2,
      icon: CreditCard,
      title: 'পেমেন্ট সম্পন্ন করুন',
      desc: 'bKash, Nagad বা Rocket এ সহজেই পে করুন',
      time: '২ মিনিট',
    },
    {
      step: 3,
      icon: Wrench,
      title: 'আমরা সেটআপ করি',
      desc: 'আমাদের টিম আপনার সাইট ডিজাইন ও সেটআপ করবে',
      time: '১-৩ দিন',
    },
    {
      step: 4,
      icon: Rocket,
      title: 'সাইট লাইভ!',
      desc: 'আপনার ওয়েবসাইট চালু — অর্ডার আসা শুরু!',
      time: 'এখনই',
    },
  ];

  const faqs = [
    {
      q: 'মাসিক প্ল্যানে কি যেকোনো সময় বাতিল করা যাবে?',
      a: 'হ্যাঁ, মাসিক প্ল্যানে কোনো দীর্ঘমেয়াদি চুক্তি নেই। আপনি যেকোনো সময় সাবস্ক্রিপশন বন্ধ বা পরিবর্তন করতে পারবেন।',
    },
    {
      q: 'বাৎসরিক প্ল্যানে "১ মাস ফ্রি" মানে কী?',
      a: 'বাৎসরিক প্ল্যান নিলে আপনি ১২ মাসের জন্য মাত্র ১১ মাসের ফি পরিশোধ করবেন — অর্থাৎ সম্পূর্ণ ১ মাসের মাসিক চার্জ সম্পূর্ণ ফ্রি পাচ্ছেন!',
    },
    {
      q: 'আমাদের ওয়েবসাইট কি WordPress নাকি Next.js?',
      a: 'Swapnobaz প্ল্যাটফর্ম ১০০% আধুনিক Next.js টেকনোলজিতে তৈরি। এটি সাধারণ WordPress ওয়েবসাইটের চেয়ে বহুগুণ দ্রুতগতির, সিকিউর এবং মোবাইল-অপ্টিমাইজড।',
    },
    {
      q: 'Server-Side Tracking কি সত্যিই ফ্রি?',
      a: 'হ্যাঁ! Facebook Conversion API, Meta Pixel, Google Analytics 4, TikTok Pixel ও Microsoft Clarity সার্ভার সাইড ট্র্যাকিং সকল প্যাকেজের সাথে সম্পূর্ণ ফ্রিতে সেটআপ করে দেওয়া হয়।',
    },
    {
      q: 'ওয়েবসাইট সেটআপ কতদিনে হয়?',
      a: 'অর্ডার ও পেমেন্ট কনফার্ম করার ১ থেকে ৩ কার্যদিবসের মধ্যে আপনার সম্পূর্ণ প্রস্তুত ওয়েবসাইট হ্যান্ডওভার করা হয়।',
    },
    {
      q: 'Auto Call কিভাবে কাজ করে?',
      a: 'ওয়েবসাইটে কাস্টমার অর্ডার করার সাথে সাথে সিস্টেম অটোমেটিক কাস্টমারের নম্বরে কল করে অর্ডার কনফার্মেশনের জন্য ভয়েস প্রম্পট পাঠাবে।',
    },
    {
      q: 'ডোমেইন ও হোস্টিং কি প্যাকেজে অন্তর্ভুক্ত?',
      a: 'হ্যাঁ, প্রিমিয়াম সাবডোমেন ও ক্লাউড হোস্টিং প্যাকেজের সাথে সম্পূর্ণ ফ্রি। আপনি চাইলে আপনার নিজস্ব কাস্টম ডোমেইনও (.com/.shop) ফ্রিতে কানেক্ট করতে পারবেন।',
    },
  ];

  return (
    <div className="min-h-screen bg-[#240645] text-white selection:bg-pink-500 selection:text-white font-sans overflow-x-hidden">
      
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[700px] h-[700px] bg-purple-600/20 rounded-full blur-[140px]" />
        <div className="absolute top-[30%] right-10 w-[600px] h-[600px] bg-pink-600/15 rounded-full blur-[160px]" />
        <div className="absolute bottom-10 left-1/3 w-[800px] h-[800px] bg-indigo-700/20 rounded-full blur-[180px]" />
      </div>

      <div className="relative z-10">

        {/* ── 1. Original Beautiful Hero Banner Section ── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-amber-500/10 via-purple-950/40 to-transparent py-14 sm:py-20 border-b border-white/10">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
              
              {/* Left Content */}
              <div className="space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-amber-500/15 text-amber-300 border border-amber-500/30 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold tracking-wide">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Reseller Partnership Program
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-white tracking-tight leading-tight sm:leading-tight">
                  Launch Your Own{' '}
                  <span className="text-amber-400 underline decoration-amber-400/40 decoration-wavy underline-offset-8">
                    E-Commerce Brand
                  </span>{' '}
                  with Zero Risk
                </h1>

                <p className="text-purple-200/90 text-sm sm:text-base md:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
                  Source thousands of quality products at wholesale rates, set your prices, and earn instant profits. We handle sourcing, storage, packaging, and door-to-door delivery!
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                  <Button asChild size="lg" className="w-full sm:w-auto font-bold text-base px-8 py-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 hover:shadow-xl transition-all">
                    <Link href="/reseller/register" className="flex items-center gap-2">
                      <Store className="h-5 w-5" />
                      Register Free as Reseller
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="w-full sm:w-auto font-semibold px-6 py-6 rounded-xl border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md">
                    <Link href="#packages">
                      View Packages & Pricing
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Right Hero Image */}
              <div className="relative flex justify-center">
                <div className="relative w-full max-w-md lg:max-w-lg xl:max-w-xl aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20 bg-purple-950/50 backdrop-blur-sm">
                  <Image
                    src="/assets/images/sectionbanner/reseller-section.webp"
                    alt="Reseller Program"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    priority
                  />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── 2. Pricing Packages Header & Value Badges ── */}
        <section id="packages" className="pt-16 pb-10 px-4">
          <div className="max-w-5xl mx-auto text-center space-y-6">
            
            {/* Top Offer Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-xs sm:text-sm font-semibold text-pink-300 shadow-lg">
              <span>🔥</span>
              <span>সীমিত সময়ের অফার চলছে</span>
            </div>

            {/* Main Title */}
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              আপনার ব্যবসার জন্য সেরা <br className="hidden sm:inline" />
              Next.js ওয়েবসাইট প্যাকেজ <span className="text-purple-300">বেছে নিন</span>
            </h2>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-purple-200/80 max-w-2xl mx-auto leading-relaxed">
              মাসিক অথবা বাৎসরিক — আপনার সুবিধামতো প্ল্যান বেছে নিন। বাৎসরিক প্যাকেজে পাচ্ছেন সম্পূর্ণ ১ মাস ফ্রি!
            </p>

            {/* Feature Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs sm:text-sm font-medium backdrop-blur-sm">
                <span className="text-amber-400">⚡</span>
                <span>Next.js সুপারফাস্ট সার্ভার</span>
              </div>
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs sm:text-sm font-medium backdrop-blur-sm">
                <span className="text-emerald-400">📊</span>
                <span>ফ্রি Server-Side Tracking</span>
              </div>
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs sm:text-sm font-medium backdrop-blur-sm">
                <span className="text-rose-400">🚫</span>
                <span>কোনো হিডেন চার্জ নেই</span>
              </div>
            </div>

            {/* 3 Value Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 max-w-4xl mx-auto">
              <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center hover:bg-white/10 transition-all">
                <div className="text-2xl mb-2">🔒</div>
                <h4 className="font-bold text-sm sm:text-base">SSL সিকিউরিটি</h4>
                <p className="text-xs text-purple-200/70 mt-0.5">এনক্রিপ্টেড কানেকশন</p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center hover:bg-white/10 transition-all">
                <div className="text-2xl mb-2">🚀</div>
                <h4 className="font-bold text-sm sm:text-base">Next.js স্পিড</h4>
                <p className="text-xs text-purple-200/70 mt-0.5">আল্ট্রা-ফাস্ট কম লেটেন্সি</p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center hover:bg-white/10 transition-all">
                <div className="text-2xl mb-2">💳</div>
                <h4 className="font-bold text-sm sm:text-base">সহজ পেমেন্ট</h4>
                <p className="text-xs text-purple-200/70 mt-0.5">bKash / Nagad / Rocket</p>
              </div>
            </div>

          </div>
        </section>

        {/* ── 3. Pricing Cards & Billing Toggle ── */}
        <section className="py-8 px-4">
          <div className="max-w-7xl mx-auto">

            {/* Toggle Container */}
            <div className="flex flex-col items-center justify-center gap-3 mb-10">
              <div className="p-1.5 bg-black/40 border border-white/15 rounded-full inline-flex items-center backdrop-blur-md shadow-inner">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-purple-950 shadow-md'
                      : 'text-purple-200/70 hover:text-white'
                  }`}
                >
                  মাসিক
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${
                    billingCycle === 'yearly'
                      ? 'bg-white text-purple-950 shadow-md'
                      : 'text-purple-200/70 hover:text-white'
                  }`}
                >
                  <span>বাৎসরিক</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900 text-purple-200 font-extrabold">
                    ১ মাস ফ্রি
                  </span>
                </button>
              </div>
              <p className="text-xs text-purple-200/60 text-center">
                নিচের সবগুলো প্যাকেজের মূল্য এখানের সিলেকশন অনুযায়ী পরিবর্তিত হবে
              </p>
            </div>

            {/* 3 Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
              {packages.map((pkg) => {
                const Icon = pkg.icon;
                return (
                  <div
                    key={pkg.id}
                    className={`rounded-3xl bg-white text-slate-900 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 relative ${
                      pkg.popular
                        ? 'ring-4 ring-purple-400 md:-translate-y-2'
                        : 'border border-white/20'
                    }`}
                  >
                    {/* Top Popular Banner */}
                    {pkg.popular && (
                      <div className="bg-purple-900 text-amber-300 py-1.5 px-4 text-center text-xs font-bold flex items-center justify-center gap-1.5">
                        <Star className="h-3.5 w-3.5 fill-amber-300" />
                        <span>সবচেয়ে জনপ্রিয় প্যাকেজ</span>
                      </div>
                    )}

                    <div className="p-6 sm:p-7 flex-1 flex flex-col">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-3xl">
                          <Icon className={`h-8 w-8 ${pkg.iconColor}`} />
                        </div>
                      </div>

                      <h3 className="text-2xl font-black text-slate-900">{pkg.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 mb-4">{pkg.tagline}</p>

                      {/* Setup Price */}
                      <div className="space-y-1 mb-4">
                        <p className="text-xs text-slate-400 line-through">
                          নিয়মিত সেটআপ চার্জ: ৳{pkg.regularSetup.toLocaleString()}
                        </p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl sm:text-4xl font-black text-slate-900">
                            ৳ {pkg.offerSetup.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">সেটআপ (এককালীন)</span>
                        </div>
                        <div className="pt-1">
                          <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                            ✔ {pkg.savingsPct} সাশ্রয়
                          </span>
                        </div>
                      </div>

                      {/* Monthly or Yearly Fee Info */}
                      <div className="py-2 px-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 mb-6">
                        {billingCycle === 'monthly' ? (
                          <p>
                            মাসিক চার্জ: <strong className="text-slate-900">৳{pkg.monthlyFee}</strong> (সেটআপের পরবর্তী মাস থেকে নেয়া হবে)
                          </p>
                        ) : (
                          <p>
                            বাৎসরিক মোট: <strong className="text-slate-900">৳{pkg.yearlyTotal.toLocaleString()}</strong> ({pkg.yearlySavings})
                          </p>
                        )}
                      </div>

                      {/* CTA Button */}
                      <Button
                        asChild
                        size="lg"
                        className={`w-full font-bold text-sm sm:text-base py-6 rounded-2xl mb-6 ${pkg.btnColor}`}
                      >
                        <Link href={`/reseller/register?plan=${pkg.id}&billing=${billingCycle}`}>
                          এই প্যাকেজ নিন <ArrowRight className="h-4 w-4 ml-2 inline" />
                        </Link>
                      </Button>

                      {/* Features List Header */}
                      <div className="border-t border-slate-100 pt-5 mt-auto">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                          মূল সুবিধাসমূহ
                        </p>
                        <ul className="space-y-2.5 text-xs text-slate-700">
                          {pkg.features.map((feat, idx) => (
                            <li
                              key={idx}
                              className={`flex items-start gap-2 ${
                                feat.highlight
                                  ? 'bg-emerald-50 text-emerald-900 font-semibold p-1.5 rounded-lg -mx-1.5'
                                  : feat.excluded
                                  ? 'text-slate-400'
                                  : ''
                              }`}
                            >
                              {feat.excluded ? (
                                <span className="text-slate-300 shrink-0 font-bold mt-0.5">—</span>
                              ) : (
                                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                              )}
                              <span>{feat.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        {/* ── 4. Why Choose Us / কেন আমাদের বেছে নেবেন? ── */}
        <section className="py-16 sm:py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center space-y-2 mb-12">
              <h2 className="text-2xl sm:text-4xl font-black">কেন আমাদের বেছে নেবেন?</h2>
              <p className="text-sm sm:text-base text-purple-200/70">
                আমরা শুধু ওয়েবসাইট বানাই না — আপনার ব্যবসার ডিজিটাল পার্টনার হই
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {whyChooseUs.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all flex flex-col items-center text-center space-y-3"
                  >
                    <div className="p-3.5 rounded-2xl bg-white/10 text-white">
                      <Icon className={`h-6 w-6 ${item.iconColor}`} />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white">{item.title}</h3>
                    <p className="text-xs sm:text-sm text-purple-200/70 leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 5. Workflow Timeline Steps ── */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            
            <div className="relative">
              {/* Connecting line (Desktop) */}
              <div className="hidden md:block absolute top-10 left-16 right-16 h-0.5 bg-white/20 z-0" />

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
                {workflowSteps.map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <div key={idx} className="flex flex-col items-center text-center space-y-3">
                      {/* Step Circle */}
                      <div className="h-20 w-20 rounded-full bg-purple-700/80 border-2 border-purple-400/50 flex items-center justify-center text-white shadow-xl backdrop-blur-md">
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <h4 className="font-bold text-base text-white">{step.title}</h4>
                      <p className="text-xs text-purple-200/70 max-w-[220px] leading-relaxed">
                        {step.desc}
                      </p>
                      <span className="text-[11px] px-3 py-1 rounded-full bg-white/10 text-purple-200 font-semibold border border-white/15">
                        {step.time}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </section>

        {/* ── 6. Detailed Comparison Table (Extended Width & Reduced Side Gap) ── */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            
            <div className="text-center space-y-2 mb-10">
              <h2 className="text-2xl sm:text-4xl font-black">তিনটি প্যাকেজের তুলনা</h2>
              <p className="text-xs sm:text-sm text-purple-200/70">
                উপরে মাসিক/বাৎসরিক টগল পরিবর্তন করলে কার্ডগুলোর মূল্য বদলে যাবে
              </p>
            </div>

            {/* Comparison Table Card */}
            <div className="rounded-3xl overflow-hidden border border-white/15 bg-white text-slate-900 shadow-2xl overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-purple-900 text-white font-bold text-xs sm:text-base border-b border-purple-950">
                    <th className="p-4 sm:p-5 w-2/5">ফিচার</th>
                    <th className="p-4 sm:p-5 text-center w-1/5">🌱 STARTER</th>
                    <th className="p-4 sm:p-5 text-center w-1/5">🚀 BUSINESS</th>
                    <th className="p-4 sm:p-5 text-center w-1/5">👑 PROFESSIONAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  
                  {/* Category: Pricing */}
                  <tr className="bg-purple-50/80 font-bold text-purple-950">
                    <td colSpan={4} className="p-3.5 px-6 text-xs sm:text-sm">
                      💰 প্রাইসিং
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">নিয়মিত সেটআপ চার্জ</td>
                    <td className="p-3.5 text-center text-slate-700">৳২,৩০০</td>
                    <td className="p-3.5 text-center text-slate-700">৳৪,৮০০</td>
                    <td className="p-3.5 text-center text-slate-700">৳৭,৮০০</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">অফার সেটআপ চার্জ</td>
                    <td className="p-3.5 text-center font-bold text-slate-900">৳১,৫০০</td>
                    <td className="p-3.5 text-center font-bold text-slate-900">৳২,৫০০</td>
                    <td className="p-3.5 text-center font-bold text-slate-900">৳৩,৫০০</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">সাশ্রয়ের হার</td>
                    <td className="p-3.5 text-center font-bold text-emerald-600">৩৫%</td>
                    <td className="p-3.5 text-center font-bold text-emerald-600">৪৮%</td>
                    <td className="p-3.5 text-center font-bold text-emerald-600">৫৫%</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">মাসিক চার্জ</td>
                    <td className="p-3.5 text-center font-bold text-purple-900">৳৩৭০</td>
                    <td className="p-3.5 text-center font-bold text-purple-900">৳৬৯০</td>
                    <td className="p-3.5 text-center font-bold text-purple-900">৳১,১৯০</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">বাৎসরিক মোট (সেটআপ + ১১ মাস)</td>
                    <td className="p-3.5 text-center font-bold text-slate-900">৳৫,৫৭০</td>
                    <td className="p-3.5 text-center font-bold text-slate-900">৳১০,০৯০</td>
                    <td className="p-3.5 text-center font-bold text-slate-900">৳১৬,৫৯০</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">বাৎসরিকে সাশ্রয়</td>
                    <td className="p-3.5 text-center text-xs text-purple-700">৳১,১৭০ + ১ মাস ফ্রি</td>
                    <td className="p-3.5 text-center text-xs text-purple-700">৳২,৯৯০ + ১ মাস ফ্রি</td>
                    <td className="p-3.5 text-center text-xs text-purple-700">৳৫,৪১০ + ১ মাস ফ্রি</td>
                  </tr>

                  {/* Category: Performance & Builder */}
                  <tr className="bg-purple-50/80 font-bold text-purple-950">
                    <td colSpan={4} className="p-3.5 px-6 text-xs sm:text-sm">
                      ⚙️ পারফরম্যান্স ও টেকনোলজি
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">Next.js সুপারফাস্ট ও কম লেটেন্সি আর্কিটেকচার</td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">ড্র্যাগ & ড্রপ লাইভ স্টোর বিল্ডার</td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">আনলিমিটেড ল্যান্ডিং পেজ বিল্ডার</td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">আনলিমিটেড ব্যান্ডউইথ ও গ্লোবাল সিডিএন</td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                  </tr>

                  {/* Category: E-Commerce Features */}
                  <tr className="bg-purple-50/80 font-bold text-purple-950">
                    <td colSpan={4} className="p-3.5 px-6 text-xs sm:text-sm">
                      🛒 ই-কমার্স ফিচার
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">প্রোডাক্ট আপলোড লিমিট</td>
                    <td className="p-3.5 text-center font-bold text-slate-800">১,০০০</td>
                    <td className="p-3.5 text-center font-bold text-slate-800">২,০০০</td>
                    <td className="p-3.5 text-center font-bold text-slate-800">৪,০০০</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">মাসিক অর্ডার ম্যানেজমেন্ট</td>
                    <td className="p-3.5 text-center font-bold text-slate-800">৫০০</td>
                    <td className="p-3.5 text-center font-bold text-slate-800">২,০০০</td>
                    <td className="p-3.5 text-center font-bold text-slate-800">৫,০০০</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">অটো প্রোডাক্ট আপলোড (মাদার ক্যাটালগ থেকে)</td>
                    <td className="p-3.5 text-center font-bold text-slate-800">৩০০</td>
                    <td className="p-3.5 text-center font-bold text-slate-800">৫০০</td>
                    <td className="p-3.5 text-center font-bold text-slate-800">৮০০</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">ডিসকাউন্ট / কুপন ম্যানেজমেন্ট</td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">Fraud Order Guard (ফেক অর্ডার রোধ)</td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">Incomplete Order Management (ড্রপ অর্ডার রিকভারি)</td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">সেন্ট্রাল কুরিয়ার ডেলিভারি ও ফুলফিলমেন্ট (হ্যান্ডল্ড বাই স্বপ্নবাজ)</td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">bKash / Nagad / Rocket পেমেন্ট গেটওয়ে</td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                  </tr>

                  {/* Category: Design, Tracking & Support */}
                  <tr className="bg-purple-50/80 font-bold text-purple-950">
                    <td colSpan={4} className="p-3.5 px-6 text-xs sm:text-sm">
                      🎨 ট্র্যাকিং, ডিজাইন ও সাপোর্ট
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600 font-semibold text-purple-950">Server-Side Tracking (FB CAPI, Pixel, GA4, TikTok)</td>
                    <td className="p-3.5 text-center font-bold text-emerald-600">ফ্রি অন্তর্ভুক্ত</td>
                    <td className="p-3.5 text-center font-bold text-emerald-600">ফ্রি অন্তর্ভুক্ত</td>
                    <td className="p-3.5 text-center font-bold text-emerald-600">ফ্রি অন্তর্ভুক্ত</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">Swapnobaz Store Admin Panel</td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">Website Video Tutorial</td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3.5 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">Logo Design</td>
                    <td className="p-3.5 text-center font-bold text-slate-800">১টি</td>
                    <td className="p-3.5 text-center font-bold text-slate-800">১টি</td>
                    <td className="p-3.5 text-center font-bold text-slate-800">১টি</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">Cover Photo Design</td>
                    <td className="p-3.5 text-center font-bold text-slate-800">৩টি</td>
                    <td className="p-3.5 text-center font-bold text-slate-800">৫টি</td>
                    <td className="p-3.5 text-center font-bold text-slate-800">১০টি</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">কাস্টম ফিচার</td>
                    <td className="p-3.5 text-center text-slate-300 font-bold">—</td>
                    <td className="p-3.5 text-center font-bold text-purple-900">সর্বোচ্চ ২টি</td>
                    <td className="p-3.5 text-center font-bold text-purple-900">সর্বোচ্চ ৪টি</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600">Auto Call রেট</td>
                    <td className="p-3.5 text-center font-semibold text-slate-800">০.৫০ ৳/কল</td>
                    <td className="p-3.5 text-center font-semibold text-slate-800">০.৪৫ ৳/কল</td>
                    <td className="p-3.5 text-center font-semibold text-slate-800">০.৪০ ৳/কল</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 px-6 text-slate-600 font-bold">হিডেন চার্জ</td>
                    <td className="p-3.5 text-center font-bold text-emerald-700">নেই</td>
                    <td className="p-3.5 text-center font-bold text-emerald-700">নেই</td>
                    <td className="p-3.5 text-center font-bold text-emerald-700">নেই</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </section>

        {/* ── 7. FAQ Accordion ── */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-2 mb-10">
              <h2 className="text-2xl sm:text-4xl font-black">সচরাচর জিজ্ঞাসা</h2>
              <p className="text-xs sm:text-sm text-purple-200/70">
                প্যাকেজ সম্পর্কে সাধারণ প্রশ্নগুলোর উত্তর
              </p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => toggleFaq(idx)}
                      className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-white hover:bg-white/5 transition-colors"
                    >
                      <span>{faq.q}</span>
                      <div
                        className={`h-7 w-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 bg-white/20' : ''
                        }`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-xs sm:text-sm text-purple-200/80 leading-relaxed border-t border-white/10 pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 8. Important Information Box / গুরুত্বপূর্ণ তথ্য ── */}
        <section className="py-12 pb-24 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="rounded-3xl bg-white text-slate-900 p-6 sm:p-8 shadow-2xl space-y-4">
              <div className="flex items-center gap-2 text-rose-600 font-black text-lg sm:text-xl">
                <span>📌</span>
                <h3>গুরুত্বপূর্ণ তথ্য</h3>
              </div>

              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>
                    <strong>মাসিক প্লান:</strong> এখন শুধু সেটআপ চার্জ পরিশোধ করুন। ওয়েবসাইট সেটআপের পরবর্তী মাস থেকে মাসিক ফি নেয়া হবে, চাইলে একসাথেও দিতে পারবেন।
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>
                    <strong>বাৎসরিক প্লান:</strong> সেটআপ চার্জ + ১১ মাসের চার্জ একসাথে এখনই পরিশোধ করুন — সম্পূর্ণ ১২শ মাস সম্পূর্ণ ফ্রি!
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>
                    <strong>কোনো হিডেন চার্জ নেই</strong> — সেটআপ চার্জ, মাসিক/বাৎসরিক চার্জ সবকিছু আগে থেকেই স্পষ্টভাবে দেখানো হয়েছে।
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>
                    <strong>Server-Side Tracking</strong> (Facebook Conversion API, Meta Pixel, TikTok, GA4 ও Microsoft Clarity): <strong>সম্পূর্ণ ফ্রিতে সকল প্যাকেজের সাথে অন্তর্ভুক্ত!</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>
                    <strong>প্রতি Auto Call-এর সর্বোচ্চ সময়সীমা ৫০ সেকেন্ড!</strong> কল রেটে সার্ভার ও কলিং-সংক্রান্ত সকল চার্জ অন্তর্ভুক্ত।
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>
                    <strong>কাস্টম ফিচার</strong> বলতে বিদ্যমান Next.js সিস্টেমের সাথে সামঞ্জস্যপূর্ণ অতিরিক্ত ফিচার ডেভেলপমেন্ট বোঝানো হয়েছে। প্রয়োজনে আলাদা চার্জ প্রযোজ্য হতে পারে।
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

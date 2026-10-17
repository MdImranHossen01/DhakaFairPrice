'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import {
  Sparkles,
  Check,
  ChevronDown,
  ArrowRight,
  Star,
  Store,
  Edit3,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEFAULT_RESELLER_PROGRAM_DATA } from '@/lib/default-reseller-program';
import { IResellerProgramData, IResellerPackage, IFaqItem } from '@/types/reseller-program';

import { IconRenderer } from '@/components/reseller-program/IconRenderer';
import { AdminToolbar } from '@/components/reseller-program/AdminToolbar';
import { EditHeroDialog } from '@/components/reseller-program/EditHeroDialog';
import { EditPricingHeaderDialog } from '@/components/reseller-program/EditPricingHeaderDialog';
import { EditPackageDialog } from '@/components/reseller-program/EditPackageDialog';
import { EditWhyChooseUsDialog } from '@/components/reseller-program/EditWhyChooseUsDialog';
import { EditWorkflowDialog } from '@/components/reseller-program/EditWorkflowDialog';
import { EditComparisonTableDialog } from '@/components/reseller-program/EditComparisonTableDialog';
import { EditFaqDialog } from '@/components/reseller-program/EditFaqDialog';
import { EditImportantInfoDialog } from '@/components/reseller-program/EditImportantInfoDialog';

export default function ResellerProgramPage() {
  const { data: session } = useSession();

  // Role check: Admin or Super Admin
  const userRole = (session?.user as any)?.role;
  const userEmail = session?.user?.email?.toLowerCase();
  const isAdminOrSuperAdmin =
    userRole === 'admin' ||
    userRole === 'super_admin' ||
    userEmail === 'imranshuvo101@gmail.com';

  // Page State
  const [pageData, setPageData] = useState<IResellerProgramData>(DEFAULT_RESELLER_PROGRAM_DATA);
  const [savedData, setSavedData] = useState<IResellerProgramData>(DEFAULT_RESELLER_PROGRAM_DATA);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Edit Mode & Loading states
  const [isEditMode, setIsEditMode] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Dialog states
  const [heroDialogOpen, setHeroDialogOpen] = useState<boolean>(false);
  const [pricingHeaderDialogOpen, setPricingHeaderDialogOpen] = useState<boolean>(false);
  const [packageDialogOpen, setPackageDialogOpen] = useState<boolean>(false);
  const [editingPackage, setEditingPackage] = useState<IResellerPackage | null>(null);
  const [whyChooseDialogOpen, setWhyChooseDialogOpen] = useState<boolean>(false);
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState<boolean>(false);
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState<boolean>(false);
  const [faqDialogOpen, setFaqDialogOpen] = useState<boolean>(false);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);
  const [importantInfoDialogOpen, setImportantInfoDialogOpen] = useState<boolean>(false);

  // Fetch initial data from server
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/reseller-program');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setPageData(json.data);
            setSavedData(json.data);
          }
        }
      } catch (err) {
        console.error('Failed to load reseller program data:', err);
      }
    }
    loadData();
  }, []);

  const updatePageData = (updater: (prev: IResellerProgramData) => IResellerProgramData) => {
    setPageData((prev) => {
      const next = updater(prev);
      setHasUnsavedChanges(true);
      return next;
    });
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // ── SAVE HANDLER ──
  const handleSave = async () => {
    const confirmation = await Swal.fire({
      title: 'পরিবর্তন সংরক্ষণ করবেন?',
      text: 'রিসেলার প্রোগ্রাম পেজের সমস্ত কাস্টমাইজেশন ডেটাবেজে সংরক্ষণ করা হবে।',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'হ্যাঁ, সংরক্ষণ করুন',
      cancelButtonText: 'বাতিল',
      confirmButtonColor: '#7c3aed',
      cancelButtonColor: '#6b7280',
    });

    if (!confirmation.isConfirmed) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/reseller-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pageData),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setSavedData(pageData);
        setHasUnsavedChanges(false);
        Swal.fire({
          title: 'সফলভাবে সংরক্ষিত!',
          text: 'রিসেলার প্রোগ্রাম পেজের নতুন তথ্য সফলভাবে সংরক্ষিত ও লাইভ হয়েছে।',
          icon: 'success',
          confirmButtonText: 'ঠিক আছে',
          confirmButtonColor: '#7c3aed',
        });
      } else {
        throw new Error(result.message || 'সংরক্ষণ ব্যর্থ হয়েছে');
      }
    } catch (error: any) {
      console.error('Save error:', error);
      Swal.fire({
        title: 'ত্রুটি!',
        text: error.message || 'সংরক্ষণে সমস্যা হয়েছে। আবার চেষ্টা করুন।',
        icon: 'error',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ── RESET TO SAVED ──
  const handleReset = async () => {
    const res = await Swal.fire({
      title: 'পূর্বাবস্থায় ফিরে যাবেন?',
      text: 'অসংরক্ষিত সমস্ত পরিবর্তন বাতিল হয়ে যাবে।',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'হ্যাঁ, বাতিল করুন',
      cancelButtonText: 'না',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
    });

    if (res.isConfirmed) {
      setPageData(savedData);
      setHasUnsavedChanges(false);
      toast.info('পূর্বাবস্থায় ফিরিয়ে নেওয়া হয়েছে');
    }
  };

  // ── RESTORE DEFAULTS ──
  const handleRestoreDefaults = async () => {
    const res = await Swal.fire({
      title: 'ডিফল্ট তথ্যে ফিরিয়ে নেবেন?',
      text: 'এটি পেজের সমস্ত তথ্য মূল ডিফল্ট কনটেন্টে ফিরিয়ে আনবে। এরপর আপনাকে "সেভ করুন" এ ক্লিক করতে হবে।',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'হ্যাঁ, ডিফল্ট আনুন',
      cancelButtonText: 'বাতিল',
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
    });

    if (res.isConfirmed) {
      setPageData(DEFAULT_RESELLER_PROGRAM_DATA);
      setHasUnsavedChanges(true);
      toast.success('ডিফল্ট কনটেন্ট লোড করা হয়েছে');
    }
  };

  // ── PACKAGE ACTIONS ──
  const handleOpenAddPackage = () => {
    setEditingPackage(null);
    setPackageDialogOpen(true);
  };

  const handleOpenEditPackage = (pkg: IResellerPackage) => {
    setEditingPackage(pkg);
    setPackageDialogOpen(true);
  };

  const handleSavePackage = (savedPkg: IResellerPackage) => {
    updatePageData((prev) => {
      const exists = prev.packages.some((p) => p.id === savedPkg.id);
      let updatedPackages: IResellerPackage[];
      if (exists) {
        updatedPackages = prev.packages.map((p) => (p.id === savedPkg.id ? savedPkg : p));
      } else {
        updatedPackages = [...prev.packages, savedPkg];
      }
      return { ...prev, packages: updatedPackages };
    });
    toast.success(`প্যাকেজ "${savedPkg.name}" আপডেট হয়েছে`);
  };

  const handleDeletePackage = async (pkgId: string, pkgName: string) => {
    const res = await Swal.fire({
      title: `প্যাকেজ মুছবেন?`,
      text: `আপনি কি নিশ্চিতভাবে "${pkgName}" প্যাকেজটি মুছে ফেলতে চান?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'হ্যাঁ, মুছুন',
      cancelButtonText: 'বাতিল',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
    });

    if (res.isConfirmed) {
      updatePageData((prev) => ({
        ...prev,
        packages: prev.packages.filter((p) => p.id !== pkgId),
      }));
      toast.success(`প্যাকেজ "${pkgName}" মুছে ফেলা হয়েছে`);
    }
  };

  // ── FAQ ACTIONS ──
  const handleOpenAddFaq = () => {
    setActiveFaqIndex(null);
    setFaqDialogOpen(true);
  };

  const handleOpenEditFaq = (idx: number) => {
    setActiveFaqIndex(idx);
    setFaqDialogOpen(true);
  };

  const handleDeleteFaq = async (idx: number) => {
    const res = await Swal.fire({
      title: 'FAQ মুছবেন?',
      text: 'এই প্রশ্নোত্তরটি তালিকা থেকে মুছে ফেলা হবে।',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'হ্যাঁ, মুছুন',
      cancelButtonText: 'বাতিল',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
    });

    if (res.isConfirmed) {
      updatePageData((prev) => ({
        ...prev,
        faqs: {
          ...prev.faqs,
          items: prev.faqs.items.filter((_, i) => i !== idx),
        },
      }));
      toast.success('FAQ মুছে ফেলা হয়েছে');
    }
  };

  const { hero, pricingHeader, packages, whyChooseUs, workflow, comparisonTable, faqs, importantInfo } =
    pageData;

  const showEditControls = isAdminOrSuperAdmin && isEditMode;

  return (
    <div className="min-h-screen bg-[#240645] text-white selection:bg-pink-500 selection:text-white font-sans overflow-x-hidden">
      
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[700px] h-[700px] bg-purple-600/20 rounded-full blur-[140px]" />
        <div className="absolute top-[30%] right-10 w-[600px] h-[600px] bg-pink-600/15 rounded-full blur-[160px]" />
        <div className="absolute bottom-10 left-1/3 w-[800px] h-[800px] bg-indigo-700/20 rounded-full blur-[180px]" />
      </div>

      {/* ── ADMIN TOOLBAR (Visible only to Admin / Super Admin) ── */}
      {isAdminOrSuperAdmin && (
        <AdminToolbar
          isEditMode={isEditMode}
          onToggleEditMode={setIsEditMode}
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
          onSave={handleSave}
          onReset={handleReset}
          onRestoreDefaults={handleRestoreDefaults}
          onAddPackage={handleOpenAddPackage}
          onAddFaq={handleOpenAddFaq}
          userRole={userRole}
          userEmail={userEmail}
        />
      )}

      <div className="relative z-10">

        {/* ── 1. Hero Banner Section ── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-amber-500/10 via-purple-950/40 to-transparent py-14 sm:py-20 border-b border-white/10">
          
          {showEditControls && (
            <div className="container mx-auto px-4 max-w-7xl mb-4 flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => setHeroDialogOpen(true)}
                className="bg-purple-600/90 hover:bg-purple-700 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 border border-purple-400/40"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>হিরো ব্যানার এডিট করুন</span>
              </Button>
            </div>
          )}

          <div className="container mx-auto px-4 max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
              
              {/* Left Content */}
              <div className="space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-amber-500/15 text-amber-300 border border-amber-500/30 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold tracking-wide">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  {hero.badgeText}
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-white tracking-tight leading-tight sm:leading-tight">
                  {hero.titlePart1}{' '}
                  <span className="text-amber-400 underline decoration-amber-400/40 decoration-wavy underline-offset-8">
                    {hero.titleHighlight}
                  </span>{' '}
                  {hero.titlePart2}
                </h1>

                <p className="text-purple-200/90 text-sm sm:text-base md:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
                  {hero.subheading}
                </p>

                {hero.benefits && hero.benefits.length > 0 && (
                  <ul className="space-y-2.5 text-left max-w-xl mx-auto lg:mx-0 pt-1">
                    {hero.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm sm:text-base text-purple-100 font-medium">
                        <Check className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                  <Button asChild size="lg" className="w-full sm:w-auto font-bold text-base px-8 py-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 hover:shadow-xl transition-all">
                    <Link href={hero.registerBtnLink || '/reseller/register'} className="flex items-center gap-2">
                      <Store className="h-5 w-5" />
                      {hero.registerBtnText}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="w-full sm:w-auto font-semibold px-6 py-6 rounded-xl border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md">
                    <Link href={hero.viewPackagesBtnLink || '#packages'}>
                      {hero.viewPackagesBtnText}
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Right Hero Image */}
              <div className="relative flex justify-center items-center w-full">
                <div className="relative w-full max-w-[420px] sm:max-w-[480px] lg:max-w-[500px] aspect-square rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20 bg-purple-950/50 backdrop-blur-sm">
                  <Image
                    src={hero.heroImage || '/assets/images/sectionbanner/reseller-section.webp'}
                    alt="Reseller Program"
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 500px"
                    className="object-cover w-full h-full"
                    unoptimized
                    priority
                  />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── 2. Pricing Packages Header & Value Badges ── */}
        <section id="packages" className="pt-16 pb-10 px-4">
          <div className="max-w-5xl mx-auto text-center space-y-6 relative">
            
            {showEditControls && (
              <div className="flex justify-end mb-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setPricingHeaderDialogOpen(true)}
                  className="bg-purple-600/90 hover:bg-purple-700 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 border border-purple-400/40"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>হেডার ও ব্যাজ এডিট করুন</span>
                </Button>
              </div>
            )}

            {/* Top Offer Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-xs sm:text-sm font-semibold text-pink-300 shadow-lg">
              <span>{pricingHeader.offerBadge}</span>
            </div>

            {/* Main Title */}
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              {pricingHeader.titlePart1} <br className="hidden sm:inline" />
              <span className="text-purple-300">{pricingHeader.titleHighlight}</span>{' '}
              {pricingHeader.titlePart2}
            </h2>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-purple-200/80 max-w-2xl mx-auto leading-relaxed">
              {pricingHeader.subtitle}
            </p>

            {/* Feature Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              {pricingHeader.featureBadges?.map((badge, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs sm:text-sm font-medium backdrop-blur-sm"
                >
                  <span>{badge}</span>
                </div>
              ))}
            </div>

            {/* 3 Value Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 max-w-4xl mx-auto">
              {pricingHeader.valueCards?.map((vc, idx) => (
                <div
                  key={idx}
                  className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center hover:bg-white/10 transition-all"
                >
                  <div className="text-2xl mb-2">{vc.emoji}</div>
                  <h4 className="font-bold text-sm sm:text-base">{vc.title}</h4>
                  <p className="text-xs text-purple-200/70 mt-0.5">{vc.desc}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ── 3. Pricing Cards & Billing Toggle ── */}
        <section className="py-8 px-4">
          <div className="max-w-7xl mx-auto">

            {/* Toggle Container */}
            <div className="flex flex-col items-center justify-center gap-3 mb-8">
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

            {/* Admin Add Package Button */}
            {showEditControls && (
              <div className="flex justify-center mb-8">
                <Button
                  type="button"
                  onClick={handleOpenAddPackage}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-5 rounded-2xl shadow-xl flex items-center gap-2 border border-emerald-400/40"
                >
                  <Plus className="h-5 w-5" />
                  <span>নতুন প্যাকেজ যোগ করুন</span>
                </Button>
              </div>
            )}

            {/* Pricing Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
              {packages?.map((pkg) => (
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

                  {/* Admin Edit Package Controls */}
                  {showEditControls && (
                    <div className="p-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white">
                      <span className="text-[11px] font-bold text-purple-300 px-2">
                        আইডি: {pkg.id}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEditPackage(pkg)}
                          className="h-7 px-2 text-xs text-purple-200 hover:text-white hover:bg-purple-950"
                        >
                          <Edit3 className="h-3 w-3 mr-1" /> এডিট
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                          className="h-7 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="p-6 sm:p-7 flex-1 flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-3xl">
                        <IconRenderer
                          name={pkg.icon}
                          className={`h-8 w-8 ${pkg.iconColor || 'text-purple-600'}`}
                        />
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
                      className={`w-full font-bold text-sm sm:text-base py-6 rounded-2xl mb-6 ${
                        pkg.btnColor || 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      <Link href={`/reseller/register?plan=${pkg.id}&billing=${billingCycle}`}>
                        এই প্যাকেজ নিন <ArrowRight className="h-4 w-4 ml-2 inline" />
                      </Link>
                    </Button>

                    {/* Features List */}
                    <div className="border-t border-slate-100 pt-5 mt-auto">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                        মূল সুবিধাসমূহ
                      </p>
                      <ul className="space-y-2.5 text-xs text-slate-700">
                        {pkg.features?.map((feat, idx) => (
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
              ))}
            </div>

          </div>
        </section>

        {/* ── 4. Why Choose Us / কেন আমাদের বেছে নেবেন? ── */}
        <section className="py-16 sm:py-20 px-4">
          <div className="max-w-7xl mx-auto">
            
            <div className="text-center space-y-2 mb-12 relative">
              {showEditControls && (
                <div className="flex justify-end mb-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setWhyChooseDialogOpen(true)}
                    className="bg-purple-600/90 hover:bg-purple-700 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 border border-purple-400/40"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>কেন আমাদের বেছে নেবেন এডিট</span>
                  </Button>
                </div>
              )}

              <h2 className="text-2xl sm:text-4xl font-black">{whyChooseUs.title}</h2>
              <p className="text-sm sm:text-base text-purple-200/70">
                {whyChooseUs.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {whyChooseUs.items?.map((item, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all flex flex-col items-center text-center space-y-3"
                >
                  <div className="p-3.5 rounded-2xl bg-white/10 text-white">
                    <IconRenderer
                      name={item.icon}
                      className={`h-6 w-6 ${item.iconColor || 'text-purple-300'}`}
                    />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-purple-200/70 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. Workflow Timeline Steps ── */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            
            {showEditControls && (
              <div className="flex justify-end mb-4">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setWorkflowDialogOpen(true)}
                  className="bg-purple-600/90 hover:bg-purple-700 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 border border-purple-400/40"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>স্টেপস / টাইমলাইন এডিট</span>
                </Button>
              </div>
            )}

            <div className="relative">
              {/* Connecting line (Desktop) */}
              <div className="hidden md:block absolute top-10 left-16 right-16 h-0.5 bg-white/20 z-0" />

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
                {workflow.steps?.map((step, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center space-y-3">
                    <div className="h-20 w-20 rounded-full bg-purple-700/80 border-2 border-purple-400/50 flex items-center justify-center text-white shadow-xl backdrop-blur-md">
                      <IconRenderer name={step.icon} className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="font-bold text-base text-white">{step.title}</h4>
                    <p className="text-xs text-purple-200/70 max-w-[220px] leading-relaxed">
                      {step.desc}
                    </p>
                    <span className="text-[11px] px-3 py-1 rounded-full bg-white/10 text-purple-200 font-semibold border border-white/15">
                      {step.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* ── 6. Detailed Comparison Table ── */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            
            <div className="text-center space-y-2 mb-10 relative">
              {showEditControls && (
                <div className="flex justify-end mb-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setComparisonDialogOpen(true)}
                    className="bg-purple-600/90 hover:bg-purple-700 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 border border-purple-400/40"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>তুলনা টেবিল এডিট করুন</span>
                  </Button>
                </div>
              )}

              <h2 className="text-2xl sm:text-4xl font-black">{comparisonTable.title}</h2>
              <p className="text-xs sm:text-sm text-purple-200/70">
                {comparisonTable.subtitle}
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
                  {comparisonTable.categories?.map((cat, catIdx) => (
                    <React.Fragment key={catIdx}>
                      <tr className="bg-purple-50/80 font-bold text-purple-950">
                        <td colSpan={4} className="p-3.5 px-6 text-xs sm:text-sm">
                          {cat.name}
                        </td>
                      </tr>

                      {cat.rows?.map((row, rowIdx) => {
                        const renderVal = (v: any) => {
                          if (v === true) {
                            return <Check className="h-4 w-4 text-emerald-600 mx-auto" />;
                          }
                          if (v === false) {
                            return <span className="text-slate-300 font-bold">—</span>;
                          }
                          return <span>{v}</span>;
                        };

                        return (
                          <tr key={rowIdx}>
                            <td className="p-3.5 px-6 text-slate-600">{row.feature}</td>
                            <td className="p-3.5 text-center text-slate-700 font-medium">
                              {renderVal(row.starter)}
                            </td>
                            <td className="p-3.5 text-center text-slate-700 font-medium">
                              {renderVal(row.business)}
                            </td>
                            <td className="p-3.5 text-center text-slate-700 font-medium">
                              {renderVal(row.professional)}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </section>

        {/* ── 7. FAQ Accordion ── */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-2 mb-10 relative">
              {showEditControls && (
                <div className="flex justify-center sm:justify-end gap-2 mb-4">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleOpenAddFaq}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>নতুন FAQ যোগ করুন</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setActiveFaqIndex(null);
                      setFaqDialogOpen(true);
                    }}
                    className="bg-purple-600/90 hover:bg-purple-700 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 border border-purple-400/40"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>FAQ তালিকা এডিট</span>
                  </Button>
                </div>
              )}

              <h2 className="text-2xl sm:text-4xl font-black">{faqs.title}</h2>
              <p className="text-xs sm:text-sm text-purple-200/70">
                {faqs.subtitle}
              </p>
            </div>

            <div className="space-y-3">
              {faqs.items?.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md overflow-hidden transition-all relative group"
                  >
                    {showEditControls && (
                      <div className="absolute top-3.5 right-14 z-20 flex items-center gap-1 bg-slate-900/90 rounded-lg px-2 py-0.5 border border-purple-500/40 opacity-90 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditFaq(idx);
                          }}
                          className="text-[11px] text-purple-200 hover:text-white flex items-center gap-1"
                        >
                          <Edit3 className="h-3 w-3" /> এডিট
                        </button>
                        <span className="text-slate-600">|</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFaq(idx);
                          }}
                          className="text-[11px] text-rose-400 hover:text-rose-300"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => toggleFaq(idx)}
                      className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-white hover:bg-white/5 transition-colors pr-24"
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

        {/* ── 8. Important Information Box ── */}
        <section className="py-12 pb-24 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="rounded-3xl bg-white text-slate-900 p-6 sm:p-8 shadow-2xl space-y-4 relative">
              
              {showEditControls && (
                <div className="absolute top-4 right-4">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setImportantInfoDialogOpen(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>গুরুত্বপূর্ণ তথ্য এডিট</span>
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2 text-rose-600 font-black text-lg sm:text-xl">
                <span>📌</span>
                <h3>{importantInfo.title}</h3>
              </div>

              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                {importantInfo.items?.map((itemText, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold">•</span>
                    <span>{itemText}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

      </div>

      {/* ── EDIT DIALOGS (Modal Editors) ── */}
      <EditHeroDialog
        open={heroDialogOpen}
        onOpenChange={setHeroDialogOpen}
        heroData={hero}
        onSave={(updated) => updatePageData((prev) => ({ ...prev, hero: updated }))}
      />

      <EditPricingHeaderDialog
        open={pricingHeaderDialogOpen}
        onOpenChange={setPricingHeaderDialogOpen}
        pricingHeaderData={pricingHeader}
        onSave={(updated) => updatePageData((prev) => ({ ...prev, pricingHeader: updated }))}
      />

      <EditPackageDialog
        open={packageDialogOpen}
        onOpenChange={setPackageDialogOpen}
        pkg={editingPackage}
        onSave={handleSavePackage}
      />

      <EditWhyChooseUsDialog
        open={whyChooseDialogOpen}
        onOpenChange={setWhyChooseDialogOpen}
        data={whyChooseUs}
        onSave={(updated) => updatePageData((prev) => ({ ...prev, whyChooseUs: updated }))}
      />

      <EditWorkflowDialog
        open={workflowDialogOpen}
        onOpenChange={setWorkflowDialogOpen}
        data={workflow}
        onSave={(updated) => updatePageData((prev) => ({ ...prev, workflow: updated }))}
      />

      <EditComparisonTableDialog
        open={comparisonDialogOpen}
        onOpenChange={setComparisonDialogOpen}
        data={comparisonTable}
        onSave={(updated) => updatePageData((prev) => ({ ...prev, comparisonTable: updated }))}
      />

      <EditFaqDialog
        open={faqDialogOpen}
        onOpenChange={setFaqDialogOpen}
        data={faqs}
        activeFaqIndex={activeFaqIndex}
        onSave={(updated) => updatePageData((prev) => ({ ...prev, faqs: updated }))}
      />

      <EditImportantInfoDialog
        open={importantInfoDialogOpen}
        onOpenChange={setImportantInfoDialogOpen}
        data={importantInfo}
        onSave={(updated) => updatePageData((prev) => ({ ...prev, importantInfo: updated }))}
      />

    </div>
  );
}

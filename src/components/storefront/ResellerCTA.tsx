'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import { CheckCircle2, ArrowRight, Store, Sparkles, Edit3 } from 'lucide-react';
import { DEFAULT_RESELLER_PROGRAM_DATA } from '@/lib/default-reseller-program';
import { IResellerProgramData } from '@/types/reseller-program';
import { EditHeroDialog } from '@/components/reseller-program/EditHeroDialog';

export function ResellerCTA() {
  const { data: session } = useSession();

  // Role check: Admin or Super Admin
  const userRole = (session?.user as any)?.role;
  const userEmail = session?.user?.email?.toLowerCase();
  const isAdminOrSuperAdmin =
    userRole === 'admin' ||
    userRole === 'super_admin' ||
    userEmail === 'imranshuvo101@gmail.com';

  const [hero, setHero] = useState<IResellerProgramData['hero']>(DEFAULT_RESELLER_PROGRAM_DATA.hero);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [, setIsSaving] = useState<boolean>(false);

  // Fetch dynamic hero data from MongoDB (/api/reseller-program)
  useEffect(() => {
    let isMounted = true;
    async function fetchHeroData() {
      try {
        const res = await fetch('/api/reseller-program');
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.success && json.data?.hero) {
            setHero(json.data.hero);
          }
        }
      } catch (err) {
        console.error('Failed to load reseller hero data:', err);
      }
    }
    fetchHeroData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Save handler for inline modal editing
  const handleSaveHero = async (updatedHero: IResellerProgramData['hero']) => {
    const confirmation = await Swal.fire({
      title: 'রিসেলার সেকশন আপডেট করবেন?',
      text: 'হোম পেজ এবং রিসেলার প্রোগ্রাম পেজ — উভয় স্থানেই এই পরিবর্তন সাথে সাথে কার্যকর হবে।',
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
        body: JSON.stringify({ hero: updatedHero }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setHero(updatedHero);
        setDialogOpen(false);
        Swal.fire({
          title: 'সফলভাবে সংরক্ষিত!',
          text: 'হোম পেজ ও রিসেলার প্রোগ্রাম পেজ উভয় জায়গায় নতুন তথ্য সফলভাবে আপডেট হয়েছে।',
          icon: 'success',
          confirmButtonText: 'ঠিক আছে',
          confirmButtonColor: '#7c3aed',
        });
      } else {
        throw new Error(result.message || 'সংরক্ষণ ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      console.error('Save hero error:', err);
      Swal.fire({
        title: 'ত্রুটি!',
        text: err.message || 'সংরক্ষণে সমস্যা হয়েছে। আবার চেষ্টা করুন।',
        icon: 'error',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const benefits =
    hero.benefits && Array.isArray(hero.benefits) && hero.benefits.length > 0
      ? hero.benefits
      : DEFAULT_RESELLER_PROGRAM_DATA.hero.benefits || [];

  return (
    <section className="container px-4 mx-auto my-8 relative">
      {/* ── Admin Edit Trigger ── */}
      {isAdminOrSuperAdmin && (
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md border border-purple-400/40 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>✏️ রিসেলার সেকশন এডিট করুন (হোম + রিসেলার পেজ)</span>
          </button>
        </div>
      )}

      {/* ── Reseller Card ── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-background to-primary/5 shadow-lg p-6 sm:p-8 md:p-12">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10">
          {/* Left: Text Content */}
          <div className="space-y-6 order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3.5 py-1.5 rounded-full text-xs md:text-sm font-semibold tracking-wide border border-primary/20">
              <Store className="h-4 w-4" />
              {hero.badgeText || 'Reseller Partnership'}
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight leading-tight">
                {hero.titlePart1 || 'Launch Your Own'}{' '}
                <span className="text-primary underline decoration-primary/30 decoration-wavy underline-offset-4">
                  {hero.titleHighlight || 'E-Commerce Business'}
                </span>{' '}
                {hero.titlePart2 || 'with Zero Capital'}
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                {hero.subheading}
              </p>
            </div>

            {benefits.length > 0 && (
              <ul className="space-y-2.5">
                {benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-foreground/90 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={hero.registerBtnLink || '/reseller/register'}
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm sm:text-base py-3 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              >
                <Sparkles className="h-4 w-4" />
                {hero.registerBtnText || 'Join as a Reseller'}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={hero.viewPackagesBtnLink || '/reseller-program'}
                className="inline-flex items-center justify-center gap-2 border border-border bg-card/60 hover:bg-accent hover:text-accent-foreground text-foreground font-semibold text-sm sm:text-base py-3 px-5 rounded-xl transition-all duration-200"
              >
                {hero.viewPackagesBtnText || 'Learn More'}
              </Link>
            </div>
          </div>

          {/* Right: Image */}
          <div className="relative order-1 lg:order-2 flex justify-center">
            <div className="relative w-full aspect-[16/10] sm:aspect-[4/3] rounded-2xl overflow-hidden shadow-xl border border-border/80 bg-muted">
              <Image
                src={hero.heroImage || '/assets/images/sectionbanner/reseller-section.webp'}
                alt={hero.titleHighlight || 'Reseller Program'}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Inline Edit Dialog ── */}
      <EditHeroDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        heroData={hero}
        onSave={handleSaveHero}
      />
    </section>
  );
}

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShoppingCart,
  Heart,
  User,
  Search,
  Menu,
  Mic,
  MicOff,
  LayoutDashboard,
  LogOut,
  Settings,
  Package,
  Truck,
  ChevronDown,
  X,
  Sparkles
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ModeToggle } from '@/components/mode-toggle';
import { useAppSelector } from '@/store/hooks';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { Logo } from '@/components/ui/logo';
import { useSettings } from '@/components/SettingsProvider';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Swal from 'sweetalert2';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/blog', label: 'Blogs' },
  { href: '/contact', label: 'Contact' },
];

export default function NavbarV1({ initialCategories = [], initialBrands = [] }: { initialCategories?: any[]; initialBrands?: any[] }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [liveResults, setLiveResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [megaMenuHovered, setMegaMenuHovered] = useState<string | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<any>(null);
  const megaMenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const { data: session, status } = useSession();
  const { totalQuantity: cartCount } = useAppSelector((state) => state.cart);
  const { items: wishlistItems } = useAppSelector((state) => state.wishlist);
  const wishlistCount = wishlistItems.length;
  const settings = useSettings();

  const [categories, setCategories] = useState<any[]>(initialCategories);
  const [brands, setBrands] = useState<any[]>(initialBrands);
  const [profile, setProfile] = useState<any>(null);

  // Monitor scroll for sticky style transitions with rock-solid hysteresis
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          if (currentScrollY > 120) {
            setIsScrolled(true);
          } else if (currentScrollY < 40) {
            setIsScrolled(false);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync / Re-fetch categories & brands in background if needed
  useEffect(() => {
    if (initialCategories.length > 0) {
      setCategories(initialCategories);
    }
    if (initialBrands.length > 0) {
      setBrands(initialBrands);
    }
    const controller = new AbortController();
    async function fetchData() {
      try {
        const [catsRes, brandsRes] = await Promise.all([
          fetch('/api/categories', { signal: controller.signal }),
          fetch('/api/brands?all=true', { signal: controller.signal })
        ]);
        if (catsRes.ok) {
          const data = await catsRes.json();
          setCategories(data.filter((c: any) => c.isActive));
        }
        if (brandsRes.ok) {
          const brandData = await brandsRes.json();
          setBrands(brandData.filter((b: any) => b.isActive));
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error('Failed to fetch categories/brands', e);
        }
      }
    }
    fetchData();
    return () => controller.abort();
  }, [initialCategories, initialBrands]);

  // Fetch profile
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    if (status === 'authenticated') {
      fetch('/api/user/profile', { signal: controller.signal })
        .then(res => {
          if (!res.ok) return null;
          return res.json();
        })
        .then(data => {
          if (isMounted && data) setProfile(data);
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            console.warn('Could not load user profile data');
          }
        });
    } else {
      const timer = setTimeout(() => {
        if (isMounted) {
          setProfile((prev: any) => prev !== null ? null : prev);
        }
      }, 0);
      return () => {
        isMounted = false;
        controller.abort();
        clearTimeout(timer);
      };
    }

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [status]);

  // Voice Search Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) { }
        recognitionRef.current.onstart = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current = null;
      }
      setIsListening(false);
    };
  }, []);

  const getParentId = (catObj: any) => {
    if (!catObj.parentCategory) return null;
    if (typeof catObj.parentCategory === 'object') {
      return catObj.parentCategory._id;
    }
    return catObj.parentCategory;
  };

  // Reverse the main categories so they appear in chronological order (Women, Men, Kids', Home Décor...)
  const mainCategories = categories.filter(c => !getParentId(c)).reverse();
  const visibleMainCategories = mainCategories.slice(0, 8);
  const moreMainCategories = mainCategories.slice(8);

  const getSubcategories = (catId: string) => {
    return categories.filter(c => getParentId(c) === catId);
  };

  const getChildren = (subId: string) => {
    return categories.filter(c => getParentId(c) === subId);
  };

  const handleMegaMenuEnter = (catId: string) => {
    if (megaMenuTimeoutRef.current) {
      clearTimeout(megaMenuTimeoutRef.current);
      megaMenuTimeoutRef.current = null;
    }
    setMegaMenuHovered(catId);
  };

  const handleMegaMenuLeave = () => {
    if (megaMenuTimeoutRef.current) {
      clearTimeout(megaMenuTimeoutRef.current);
    }
    megaMenuTimeoutRef.current = setTimeout(() => {
      setMegaMenuHovered(null);
    }, 200);
  };

  const handleCloseMegaMenu = () => {
    if (megaMenuTimeoutRef.current) {
      clearTimeout(megaMenuTimeoutRef.current);
      megaMenuTimeoutRef.current = null;
    }
    setMegaMenuHovered(null);
  };

  useEffect(() => {
    return () => {
      if (megaMenuTimeoutRef.current) {
        clearTimeout(megaMenuTimeoutRef.current);
      }
    };
  }, []);

  // Live search debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      debounceRef.current = setTimeout(() => {
        setLiveResults([]);
        setShowDropdown(false);
      }, 0);
      return;
    }
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(trimmed)}&limit=6`);
        if (res.ok) {
          const data = await res.json();
          setLiveResults(data.products || []);
          setShowDropdown(true);
        }
      } catch {
        // silent
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/shop?search=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm('');
      setShowDropdown(false);
      setLiveResults([]);
    }
  };

  const handleResultClick = () => {
    setShowDropdown(false);
    setSearchTerm('');
    setLiveResults([]);
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      Swal.fire({
        title: 'Voice Search Unsupported',
        text: 'Voice search is not supported in your browser. Please use Google Chrome for the best experience.',
        icon: 'info',
        confirmButtonColor: 'var(--primary)'
      });
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      setIsListening(false);
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please enable it in browser settings.');
      } else if (event.error === 'network') {
        toast.error('Network error. Please check your connection.');
      } else if (event.error === 'no-speech') {
        toast.info('No speech detected. Please try again.');
      }
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchTerm(transcript);
      router.push(`/shop?search=${encodeURIComponent(transcript.trim())}`);
    };

    recognition.start();
  };
  return (
    <>
      {/* ── Navbar Wrapper ── */}
      <header className={`sticky top-0 z-50 w-full transition-all duration-300 border-b border-muted/30 lg:border-b-0 ${isScrolled
        ? 'bg-background/95 backdrop-blur-md shadow-md lg:border-b lg:border-border/30 lg:py-1'
        : 'bg-background lg:py-1.5'
        }`}>
        <div className="w-full px-2 lg:px-6 relative">

          {/* ── Mobile Layout (Single Row) — V1 Style ── */}
          <div className="relative flex h-14 items-center justify-between px-1 lg:hidden">

            {/* Mobile Menu Trigger — Left */}
            <div className="flex items-center">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle mobile menu</span>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 bg-background text-foreground border-r border-border">
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', paddingBottom: '64px' }} className="md:pb-0">
                    <div className="px-6 py-[6px]" style={{ flexShrink: 0 }}>
                      <Logo onClick={() => setMobileOpen(false)} />
                    </div>
                    <nav style={{ flex: 1, overflowY: 'auto' }} className="px-6 pb-4 flex flex-col gap-6">
                      <div className="space-y-4 border-t pt-4 font-medium tracking-tight">
                        {navItems.map((item, index) => {
                          const isActive = pathname === item.href;
                          return (
                            <React.Fragment key={item.href}>
                              <Link
                                href={item.href}
                                className={`block px-4 py-2 rounded-xl transition-all ${isActive ? 'bg-primary text-white font-bold shadow-lg shadow-primary/20' : 'hover:text-primary font-medium'}`}
                                onClick={() => setMobileOpen(false)}
                              >
                                {item.label}
                              </Link>
                              {index === 0 && (
                                <Accordion type="single" collapsible>
                                  <AccordionItem value="cats" className="border-none">
                                    <AccordionTrigger className="py-2 hover:no-underline uppercase text-[12px] font-bold tracking-[0.2em] text-left">Categories</AccordionTrigger>
                                    <AccordionContent className="pt-2 pl-4 flex flex-col gap-3">
                                      {mainCategories.map((cat) => {
                                        const subs = getSubcategories(cat._id);
                                        if (subs.length === 0) {
                                          return (
                                            <Link key={cat._id} href={`/shop?category=${cat.slug}`} onClick={() => setMobileOpen(false)} className="hover:text-primary text-[11px] font-bold uppercase tracking-[0.1em]">
                                              {cat.name}
                                            </Link>
                                          );
                                        }
                                        return (
                                          <Accordion key={cat._id} type="single" collapsible>
                                            <AccordionItem value={cat._id} className="border-none">
                                              <AccordionTrigger className="py-1 hover:no-underline text-[11px] font-bold uppercase tracking-[0.1em] text-left hover:text-primary">{cat.name}</AccordionTrigger>
                                              <AccordionContent className="pl-3 flex flex-col gap-2">
                                                <Link href={`/shop?category=${cat.slug}`} onClick={() => setMobileOpen(false)} className="text-[10px] font-bold text-muted-foreground hover:text-primary uppercase tracking-wider">All {cat.name}</Link>
                                                {subs.map((sub) => (
                                                  <Link key={sub._id} href={`/shop?category=${sub.slug}`} onClick={() => setMobileOpen(false)} className="text-[10px] font-bold text-muted-foreground hover:text-primary uppercase tracking-wider">{sub.name}</Link>
                                                ))}
                                              </AccordionContent>
                                            </AccordionItem>
                                          </Accordion>
                                        );
                                      })}
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              )}
                              {index === 0 && (
                                <Accordion type="single" collapsible>
                                  <AccordionItem value="brands" className="border-none">
                                    <AccordionTrigger className="py-2 hover:no-underline uppercase text-[12px] font-bold tracking-[0.2em] text-left">Brands</AccordionTrigger>
                                    <AccordionContent className="pt-2 pl-4 flex flex-col gap-3">
                                      {brands.length > 0 ? (
                                        brands.map((b) => (
                                          <Link key={b._id} href={`/shop?brand=${b.slug || b.name}`} onClick={() => setMobileOpen(false)} className="hover:text-primary text-[11px] font-bold uppercase tracking-[0.1em]">{b.name}</Link>
                                        ))
                                      ) : (
                                        <span className="text-[11px] text-muted-foreground italic">No brands available</span>
                                      )}
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </nav>
                    <div style={{ flexShrink: 0 }} className="px-4 py-3 border-t border-border bg-background flex gap-2">
                    <Link href="/reseller-program" onClick={() => setMobileOpen(false)} className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-primary text-primary text-xs font-bold py-2 hover:bg-primary hover:text-white transition-colors">
                        <Sparkles className="h-3.5 w-3.5" />
                        Be a Reseller
                      </Link>
                      {!session && (
                        <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-primary text-white text-xs font-bold py-2 hover:bg-primary/90 transition-colors">
                          <User className="h-3.5 w-3.5" />
                          Login
                        </Link>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Logo — Absolutely Centered (V1 style) */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
              <Logo
                imageClassName="size-8"
                textClassName="text-lg whitespace-nowrap"
                sizes="32px"
              />
            </div>

            {/* Right: Theme Toggle Button */}
            <div className="flex items-center justify-end">
              <ModeToggle />
            </div>
          </div>

          {/* ── Desktop Layout: Normal (2 Rows) vs Scrolled (1 Row like Aarong) ── */}
          {isScrolled ? (
            /* 1-Row Compact Sticky Desktop Layout */
            <div className="hidden lg:flex items-center justify-between gap-4 xl:gap-6 w-full animate-in fade-in duration-200">
              {/* Left: Compact Logo Image */}
              <div className="flex items-center shrink-0">
                <Link href="/" className="relative block w-[44px] h-[44px] xl:w-[48px] xl:h-[48px] transition-transform hover:scale-105">
                  <Image
                    src={settings.logoUrl || "/logo.webp"}
                    alt={`${settings.brandName || "Swapnobaz"} Logo`}
                    fill
                    sizes="48px"
                    className="object-contain"
                    priority
                  />
                </Link>
              </div>

              {/* Center: Category Navigation Menu Tabs */}
              <div className="flex-1 flex justify-center min-w-0">
                <nav className="flex items-center gap-3.5 xl:gap-4 flex-nowrap">
                  {/* 1. Main Categories (First 8) */}
                  {visibleMainCategories.map((cat) => {
                    const subs = getSubcategories(cat._id);
                    return (
                      <div
                        key={cat._id}
                        className="py-1"
                        onMouseEnter={() => handleMegaMenuEnter(cat._id)}
                        onMouseLeave={handleMegaMenuLeave}
                      >
                        <Link
                          href={`/shop?category=${cat.slug}`}
                          onClick={handleCloseMegaMenu}
                          className="text-[12px] xl:text-[13px] font-medium uppercase tracking-[0.1em] text-foreground/85 hover:text-primary transition-colors flex items-center whitespace-nowrap"
                        >
                          {cat.name}
                        </Link>

                        {/* Mega Menu Dropdown */}
                        {subs.length > 0 && megaMenuHovered === cat._id && (
                          <div
                            onMouseEnter={() => handleMegaMenuEnter(cat._id)}
                            onMouseLeave={handleMegaMenuLeave}
                            className="absolute top-full left-0 right-0 w-full bg-background border-t border-b border-border shadow-2xl rounded-none p-6 flex gap-6 animate-in fade-in slide-in-from-top-2 duration-200 z-50 before:content-[''] before:absolute before:-top-4 before:left-0 before:right-0 before:h-4"
                          >
                            {/* Subcategories columns */}
                            <div className="flex-1 grid grid-cols-4 gap-6 max-h-[400px] overflow-y-auto pr-2">
                              {subs.map((sub) => {
                                const children = getChildren(sub._id);
                                return (
                                  <div key={sub._id} className="space-y-2">
                                    <Link
                                      href={`/shop?category=${sub.slug}`}
                                      onClick={handleCloseMegaMenu}
                                      className="text-xs font-semibold uppercase tracking-wider text-foreground hover:text-primary transition-colors block pb-1 border-b border-border/40"
                                    >
                                      {sub.name}
                                    </Link>
                                    {children.length > 0 && (
                                      <div className="flex flex-col gap-1">
                                        {children.map((child) => (
                                          <Link
                                            key={child._id}
                                            href={`/shop?category=${child.slug}`}
                                            onClick={handleCloseMegaMenu}
                                            className="text-[12px] font-normal text-muted-foreground hover:text-primary transition-colors block py-0.5"
                                          >
                                            {child.name}
                                          </Link>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Right part: Category Banner Image */}
                            {cat.image && (
                              <div className="w-[200px] h-[280px] relative hidden xl:block flex-shrink-0 bg-muted">
                                <Image
                                  src={cat.image}
                                  alt={cat.name}
                                  fill
                                  sizes="200px"
                                  className="object-cover"
                                  priority
                                />
                                <div className="absolute inset-0 bg-black/10 hover:bg-black/0 transition-colors duration-300" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* 2. More Categories Dropdown (Visible only when categories > 8) */}
                  {moreMainCategories.length > 0 && (
                    <div
                      className="py-1 relative group/more"
                      onMouseEnter={() => handleMegaMenuEnter('more_categories')}
                      onMouseLeave={handleMegaMenuLeave}
                    >
                      <button
                        type="button"
                        className="text-[12px] xl:text-[13px] font-medium uppercase tracking-[0.14em] text-foreground/85 hover:text-primary transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
                      >
                        More <ChevronDown className="h-3 w-3 transition-transform group-hover/more:rotate-180" />
                      </button>

                      {megaMenuHovered === 'more_categories' && (
                        <div
                          onMouseEnter={() => handleMegaMenuEnter('more_categories')}
                          onMouseLeave={handleMegaMenuLeave}
                          className="absolute top-full right-0 mt-1 w-64 bg-background border border-border shadow-2xl rounded-xl p-3 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                        >
                          {moreMainCategories.map((mCat) => (
                            <Link
                              key={mCat._id}
                              href={`/shop?category=${mCat.slug}`}
                              onClick={handleCloseMegaMenu}
                              className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground hover:bg-muted/60 hover:text-primary rounded-lg transition-colors flex items-center justify-between"
                            >
                              <span>{mCat.name}</span>
                              <span className="text-[10px] text-muted-foreground font-normal">Explore →</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. Brands Tab with Dropdown */}
                  <div
                    className="py-1 relative group/brand"
                    onMouseEnter={() => handleMegaMenuEnter('brands_menu')}
                    onMouseLeave={handleMegaMenuLeave}
                  >
                    <Link
                      href="/shop"
                      onClick={handleCloseMegaMenu}
                      className="text-[12px] xl:text-[13px] font-semibold uppercase tracking-[0.14em] text-foreground/85 hover:text-primary transition-colors flex items-center gap-1 whitespace-nowrap"
                    >
                      Brand <ChevronDown className="h-3 w-3 transition-transform group-hover/brand:rotate-180" />
                    </Link>

                    {megaMenuHovered === 'brands_menu' && (
                      <div
                        onMouseEnter={() => handleMegaMenuEnter('brands_menu')}
                        onMouseLeave={handleMegaMenuLeave}
                        className="absolute top-full left-0 mt-1 w-60 bg-background border border-border shadow-2xl rounded-xl p-3 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150 max-h-72 overflow-y-auto"
                      >
                        <div className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-1 border-b border-border/50 mb-1">
                          Popular Brands
                        </div>
                        {brands.length > 0 ? (
                          brands.map((b) => (
                            <Link
                              key={b._id}
                              href={`/shop?brand=${b.slug || b.name}`}
                              onClick={handleCloseMegaMenu}
                              className="px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/60 hover:text-primary rounded-lg transition-colors flex items-center justify-between"
                            >
                              <span>{b.name}</span>
                              <span className="text-[10px] text-muted-foreground font-normal">Explore →</span>
                            </Link>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-muted-foreground italic">
                            No brands added yet
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 4. Shop Tab */}
                  <div className="py-1">
                    <Link
                      href="/shop"
                      onClick={handleCloseMegaMenu}
                      className={`text-[12px] xl:text-[13px] font-semibold uppercase tracking-[0.14em] transition-colors flex items-center whitespace-nowrap ${pathname === '/shop' ? 'text-primary' : 'text-foreground/85 hover:text-primary'}`}
                    >
                      Shop
                    </Link>
                  </div>
                </nav>
              </div>

              {/* Right: Utilities */}
              <div className="flex items-center gap-2 xl:gap-3 shrink-0">
                {/* Search Bar Container */}
                <div ref={searchContainerRef} className="relative">
                  <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                    <input
                      type="text"
                      placeholder={isListening ? "Listening..." : "Search..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-32 xl:w-44 h-8 pl-8 pr-7 text-xs bg-muted/40 border border-border/70 focus:border-primary focus:bg-background outline-none rounded-full transition-all"
                    />
                    <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />

                    <button
                      type="button"
                      onClick={handleVoiceSearch}
                      aria-label="Voice Search"
                      className={`absolute right-2 p-0.5 rounded-full text-muted-foreground hover:text-primary transition-colors ${isListening ? 'text-primary animate-pulse bg-primary/10' : ''}`}
                    >
                      {isListening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                    </button>
                  </form>

                  {/* Live Search Dropdown */}
                  {showDropdown && liveResults.length > 0 && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-background border border-border shadow-xl rounded-none overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="p-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border bg-muted/10">
                        Matches Found
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-border/60">
                        {liveResults.map((prod) => (
                          <Link
                            key={prod._id}
                            href={`/product/${prod.slug}`}
                            onClick={handleResultClick}
                            className="flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors"
                          >
                            <div className="relative h-10 w-10 flex-shrink-0 bg-muted">
                              <Image
                                src={prod.images?.[0] || '/placeholder.png'}
                                alt={prod.name}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-bold text-foreground truncate uppercase tracking-wide">
                                {prod.name}
                              </h5>
                              <p className="text-[10px] font-black text-primary mt-0.5">
                                ৳ {(prod.salePrice ?? prod.price).toLocaleString()}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                      <Link
                        href={`/shop?search=${encodeURIComponent(searchTerm)}`}
                        onClick={handleResultClick}
                        className="block text-center text-xs font-black uppercase tracking-widest text-primary p-2.5 border-t border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
                        See All Matches
                      </Link>
                    </div>
                  )}
                </div>



                {/* User Dropdown — V1 Role-Based */}
                <div className="flex items-center">
                  {status === 'authenticated' && session?.user ? (
                    <DropdownMenu>
                      <div className="relative group/avatar">
                        <DropdownMenuTrigger asChild>
                          <button
                            className="flex items-center px-2 py-1.5 rounded-xl transition-all cursor-pointer outline-none hover:scale-110"
                            aria-label="Account menu"
                          >
                            <div className="h-8 w-8 rounded-full border-2 border-primary/20 overflow-hidden group-hover/avatar:border-primary transition-all">
                              <Image
                                src={session.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user?.name || 'U')}`}
                                alt={session.user?.name || 'User'}
                                width={32}
                                height={32}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </button>
                        </DropdownMenuTrigger>
                        {/* Tooltip */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 bg-foreground text-background text-[11px] font-semibold rounded-md whitespace-nowrap opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                          {session.user?.name}
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45" />
                        </div>
                      </div>
                      <DropdownMenuContent align="end" className="w-56 mt-2">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel className="font-serif">
                            <div className="flex flex-col">
                              <span>{session.user?.name}</span>
                              <span className="text-xs font-normal text-muted-foreground truncate">{session.user?.email}</span>
                              {profile && (
                                <div className="mt-1.5 flex items-center gap-1.5 bg-primary/10 px-2 py-0.5 rounded-full w-fit border border-primary/20">
                                  <Package className="h-3 w-3 text-primary" />
                                  <span className="text-[10px] font-bold text-primary">৳{profile.walletBalance || 0} Tokens</span>
                                </div>
                              )}
                            </div>
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          {/* Role Based Navigation */}
                          {(session.user as any)?.role === 'super_admin' ? (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href="/admin/dashboard" className="cursor-pointer">
                                  <LayoutDashboard className="mr-2 h-4 w-4" /> Admin Dashboard
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href="/admin/system-design" className="cursor-pointer">
                                  <Settings className="mr-2 h-4 w-4" /> Infrastructure &amp; Marketing
                                </Link>
                              </DropdownMenuItem>
                            </>
                          ) : (session.user as any)?.role === 'admin' ? (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href="/admin/dashboard" className="cursor-pointer">
                                  <LayoutDashboard className="mr-2 h-4 w-4" /> Admin Dashboard
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href="/admin/orders" className="cursor-pointer">
                                  <Truck className="mr-2 h-4 w-4" /> Manage Orders
                                </Link>
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href="/dashboard" className="cursor-pointer">
                                  <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href="/track-order" className="cursor-pointer">
                                  <Truck className="mr-2 h-4 w-4" /> Track Order
                                </Link>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => signOut({ callbackUrl: window.location.origin })} className="text-destructive cursor-pointer">
                          <LogOut className="mr-2 h-4 w-4" /> Sign Out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Link
                      href="/login"
                      className="h-10 w-10 flex items-center justify-center rounded-xl transition-all cursor-pointer hover:text-primary"
                      aria-label="Log in"
                    >
                      <User className="h-5 w-5" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* 2-Row Default Desktop Layout */
            <div className="hidden lg:flex gap-3 items-center">

              {/* Logo Image Column */}
              <div className="flex items-center justify-center border-r border-border/10 pr-3 shrink-0">
                <Link href="/" className="relative block w-[64px] h-[64px] transition-transform hover:scale-105">
                  <Image
                    src={settings.logoUrl || "/logo.webp"}
                    alt={`${settings.brandName || "Swapnobaz"} Logo`}
                    fill
                    sizes="64px"
                    className="object-contain"
                    priority
                  />
                </Link>
              </div>

              {/* Content Column (Row 1 and Row 2) */}
              <div className="flex-1 flex flex-col justify-center gap-1">

                {/* Row 1: Logo Brand Name, Sub-Brands, Utilities */}
                <div className="flex items-center justify-between w-full border-b border-border/10 pb-1 gap-4">
                  {/* Logo Brand Name Text Only */}
                  <Link href="/" className="text-lg xl:text-xl uppercase text-foreground transition-colors hover:text-primary font-black tracking-tighter font-logo shrink-0">
                    {settings.brandName || "SWAPNOBAZ"}
                  </Link>

                  {/* Right-side Utilities */}
                  <div className="flex items-center gap-2 xl:gap-3">
                    {/* Search Bar Container */}
                    <div ref={searchContainerRef} className="relative">
                      <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                        <input
                          type="text"
                          placeholder={isListening ? "Listening..." : "Search products..."}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-44 xl:w-56 h-8 pl-8 pr-7 text-xs bg-muted/40 border border-border/70 focus:border-primary focus:bg-background outline-none rounded-full transition-all"
                        />
                        <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />

                        <button
                          type="button"
                          onClick={handleVoiceSearch}
                          aria-label="Voice Search"
                          className={`absolute right-2 p-0.5 rounded-full text-muted-foreground hover:text-primary transition-colors ${isListening ? 'text-primary animate-pulse bg-primary/10' : ''}`}
                        >
                          {isListening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                        </button>
                      </form>

                      {/* Live Search Dropdown */}
                      {showDropdown && liveResults.length > 0 && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-background border border-border shadow-xl rounded-none overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="p-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border bg-muted/10">
                            Matches Found
                          </div>
                          <div className="max-h-64 overflow-y-auto divide-y divide-border/60">
                            {liveResults.map((prod) => (
                              <Link
                                key={prod._id}
                                href={`/product/${prod.slug}`}
                                onClick={handleResultClick}
                                className="flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors"
                              >
                                <div className="relative h-10 w-10 flex-shrink-0 bg-muted">
                                  <Image
                                    src={prod.images?.[0] || '/placeholder.png'}
                                    alt={prod.name}
                                    fill
                                    sizes="40px"
                                    className="object-cover"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="text-xs font-bold text-foreground truncate uppercase tracking-wide">
                                    {prod.name}
                                  </h5>
                                  <p className="text-[10px] font-black text-primary mt-0.5">
                                    ৳ {(prod.salePrice ?? prod.price).toLocaleString()}
                                  </p>
                                </div>
                              </Link>
                            ))}
                          </div>
                          <Link
                            href={`/shop?search=${encodeURIComponent(searchTerm)}`}
                            onClick={handleResultClick}
                            className="block text-center text-xs font-black uppercase tracking-widest text-primary p-2.5 border-t border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                          >
                            See All Matches
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Wishlist Link */}
                    <Link href="/dashboard/wishlist" className="relative p-1.5 text-foreground hover:text-primary transition-colors">
                      <Heart className="h-4 w-4" />
                      {wishlistCount > 0 && (
                        <span className="absolute top-0 right-0 h-3.5 min-w-[14px] px-0.5 bg-primary text-primary-foreground text-[8px] font-black rounded-full flex items-center justify-center animate-bounce shadow-md">
                          {wishlistCount}
                        </span>
                      )}
                    </Link>

                    {/* Cart Drawer */}
                    <CartDrawer>
                      <button className="relative p-1.5 text-foreground hover:text-primary transition-colors">
                        <ShoppingCart className="h-4 w-4" />
                        {cartCount > 0 && (
                          <span className="absolute top-0 right-0 h-3.5 min-w-[14px] px-0.5 bg-primary text-primary-foreground text-[8px] font-black rounded-full flex items-center justify-center shadow-md">
                            {cartCount}
                          </span>
                        )}
                      </button>
                    </CartDrawer>

                    {/* Theme Toggle */}
                    <ModeToggle />

                    {/* User Dropdown — V1 Role-Based */}
                    <div className="flex items-center">
                      {status === 'authenticated' && session?.user ? (
                        <DropdownMenu>
                          <div className="relative group/avatar">
                            <DropdownMenuTrigger asChild>
                              <button
                                className="flex items-center p-1 rounded-xl transition-all cursor-pointer outline-none hover:scale-105"
                                aria-label="Account menu"
                              >
                                <div className="h-7 w-7 rounded-full border-2 border-primary/20 overflow-hidden group-hover/avatar:border-primary transition-all">
                                  <Image
                                    src={session.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user?.name || 'U')}`}
                                    alt={session.user?.name || 'User'}
                                    width={28}
                                    height={28}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              </button>
                            </DropdownMenuTrigger>
                            {/* Tooltip */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 bg-foreground text-background text-[11px] font-semibold rounded-md whitespace-nowrap opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                              {session.user?.name}
                              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45" />
                            </div>
                          </div>
                          <DropdownMenuContent align="end" className="w-56 mt-2">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel className="font-serif">
                                <div className="flex flex-col">
                                  <span>{session.user?.name}</span>
                                  <span className="text-xs font-normal text-muted-foreground truncate">{session.user?.email}</span>
                                  {profile && (
                                    <div className="mt-1.5 flex items-center gap-1.5 bg-primary/10 px-2 py-0.5 rounded-full w-fit border border-primary/20">
                                      <Package className="h-3 w-3 text-primary" />
                                      <span className="text-[10px] font-bold text-primary">৳{profile.walletBalance || 0} Tokens</span>
                                    </div>
                                  )}
                                </div>
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              {/* Role Based Navigation */}
                              {(session.user as any)?.role === 'super_admin' ? (
                                <>
                                  <DropdownMenuItem asChild>
                                    <Link href="/admin/dashboard" className="cursor-pointer">
                                      <LayoutDashboard className="mr-2 h-4 w-4" /> Admin Dashboard
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href="/admin/system-design" className="cursor-pointer">
                                      <Settings className="mr-2 h-4 w-4" /> Infrastructure &amp; Marketing
                                    </Link>
                                  </DropdownMenuItem>
                                </>
                              ) : (session.user as any)?.role === 'admin' ? (
                                <>
                                  <DropdownMenuItem asChild>
                                    <Link href="/admin/dashboard" className="cursor-pointer">
                                      <LayoutDashboard className="mr-2 h-4 w-4" /> Admin Dashboard
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href="/admin/orders" className="cursor-pointer">
                                      <Truck className="mr-2 h-4 w-4" /> Manage Orders
                                    </Link>
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <>
                                  <DropdownMenuItem asChild>
                                    <Link href="/dashboard" className="cursor-pointer">
                                      <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href="/track-order" className="cursor-pointer">
                                      <Truck className="mr-2 h-4 w-4" /> Track Order
                                    </Link>
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => signOut({ callbackUrl: window.location.origin })} className="text-destructive cursor-pointer">
                              <LogOut className="mr-2 h-4 w-4" /> Sign Out
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Link
                          href="/login"
                          className="h-8 w-8 flex items-center justify-center rounded-xl transition-all cursor-pointer hover:text-primary"
                          aria-label="Log in"
                        >
                          <User className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 2: Category Navigation Menu */}
                <div className="flex pt-0.5 pb-0.5">
                  <nav className="flex items-center gap-3.5 xl:gap-4 flex-nowrap">
                    {/* 1. Main Categories (First 8) */}
                    {visibleMainCategories.map((cat) => {
                      const subs = getSubcategories(cat._id);
                      return (
                        <div
                          key={cat._id}
                          className="py-1"
                          onMouseEnter={() => handleMegaMenuEnter(cat._id)}
                          onMouseLeave={handleMegaMenuLeave}
                        >
                          <Link
                            href={`/shop?category=${cat.slug}`}
                            onClick={handleCloseMegaMenu}
                            className="text-[12px] xl:text-[13px] font-medium uppercase tracking-[0.1em] text-foreground/85 hover:text-primary transition-colors flex items-center whitespace-nowrap"
                          >
                            {cat.name}
                          </Link>

                          {/* Mega Menu Dropdown */}
                          {subs.length > 0 && megaMenuHovered === cat._id && (
                            <div
                              onMouseEnter={() => handleMegaMenuEnter(cat._id)}
                              onMouseLeave={handleMegaMenuLeave}
                              className="absolute top-full left-0 right-0 w-full bg-background border-t border-b border-border shadow-2xl rounded-none p-6 flex gap-6 animate-in fade-in slide-in-from-top-2 duration-200 z-50 before:content-[''] before:absolute before:-top-4 before:left-0 before:right-0 before:h-4"
                            >
                              {/* Subcategories columns (Left part) */}
                              <div className="flex-1 grid grid-cols-4 gap-6 max-h-[400px] overflow-y-auto pr-2">
                                {subs.map((sub) => {
                                  const children = getChildren(sub._id);
                                  return (
                                    <div key={sub._id} className="space-y-2">
                                      <Link
                                        href={`/shop?category=${sub.slug}`}
                                        onClick={handleCloseMegaMenu}
                                        className="text-xs font-semibold uppercase tracking-wider text-foreground hover:text-primary transition-colors block pb-1 border-b border-border/40"
                                      >
                                        {sub.name}
                                      </Link>
                                      {children.length > 0 && (
                                        <div className="flex flex-col gap-1">
                                          {children.map((child) => (
                                            <Link
                                              key={child._id}
                                              href={`/shop?category=${child.slug}`}
                                              onClick={handleCloseMegaMenu}
                                              className="text-[12px] font-normal text-muted-foreground hover:text-primary transition-colors block py-0.5"
                                            >
                                              {child.name}
                                            </Link>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Right part: Category Banner Image (like Aarong) */}
                              {cat.image && (
                                <div className="w-[200px] h-[280px] relative hidden xl:block flex-shrink-0 bg-muted">
                                  <Image
                                    src={cat.image}
                                    alt={cat.name}
                                    fill
                                    sizes="200px"
                                    className="object-cover"
                                    priority
                                  />
                                  <div className="absolute inset-0 bg-black/10 hover:bg-black/0 transition-colors duration-300" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* 2. More Categories Dropdown (Visible only when categories > 8) */}
                    {moreMainCategories.length > 0 && (
                      <div
                        className="py-1 relative group/more"
                        onMouseEnter={() => handleMegaMenuEnter('more_categories')}
                        onMouseLeave={handleMegaMenuLeave}
                      >
                        <button
                          type="button"
                          className="text-[12px] xl:text-[13px] font-medium uppercase tracking-[0.14em] text-foreground/85 hover:text-primary transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
                        >
                          More <ChevronDown className="h-3 w-3 transition-transform group-hover/more:rotate-180" />
                        </button>

                        {megaMenuHovered === 'more_categories' && (
                          <div
                            onMouseEnter={() => handleMegaMenuEnter('more_categories')}
                            onMouseLeave={handleMegaMenuLeave}
                            className="absolute top-full right-0 mt-1 w-64 bg-background border border-border shadow-2xl rounded-xl p-3 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                          >
                            {moreMainCategories.map((mCat) => (
                              <Link
                                key={mCat._id}
                                href={`/shop?category=${mCat.slug}`}
                                onClick={handleCloseMegaMenu}
                                className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground hover:bg-muted/60 hover:text-primary rounded-lg transition-colors flex items-center justify-between"
                              >
                                <span>{mCat.name}</span>
                                <span className="text-[10px] text-muted-foreground font-normal">Explore →</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3. Brands Tab with Dropdown */}
                    <div
                      className="py-1 relative group/brand"
                      onMouseEnter={() => handleMegaMenuEnter('brands_menu')}
                      onMouseLeave={handleMegaMenuLeave}
                    >
                      <Link
                        href="/shop"
                        onClick={handleCloseMegaMenu}
                        className="text-[12px] xl:text-[13px] font-semibold uppercase tracking-[0.14em] text-foreground/85 hover:text-primary transition-colors flex items-center gap-1 whitespace-nowrap"
                      >
                        Brand <ChevronDown className="h-3 w-3 transition-transform group-hover/brand:rotate-180" />
                      </Link>

                      {megaMenuHovered === 'brands_menu' && (
                        <div
                          onMouseEnter={() => handleMegaMenuEnter('brands_menu')}
                          onMouseLeave={handleMegaMenuLeave}
                          className="absolute top-full left-0 mt-1 w-60 bg-background border border-border shadow-2xl rounded-xl p-3 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150 max-h-72 overflow-y-auto"
                        >
                          <div className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-1 border-b border-border/50 mb-1">
                            Popular Brands
                          </div>
                          {brands.length > 0 ? (
                            brands.map((b) => (
                              <Link
                                key={b._id}
                                href={`/shop?brand=${b.slug || b.name}`}
                                onClick={handleCloseMegaMenu}
                                className="px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/60 hover:text-primary rounded-lg transition-colors flex items-center justify-between"
                              >
                                <span>{b.name}</span>
                                <span className="text-[10px] text-muted-foreground font-normal">Explore →</span>
                              </Link>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-xs text-muted-foreground italic">
                              No brands added yet
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 4. Shop Tab */}
                    <div className="py-1">
                      <Link
                        href="/shop"
                        onClick={handleCloseMegaMenu}
                        className={`text-[12px] xl:text-[13px] font-semibold uppercase tracking-[0.14em] transition-colors flex items-center whitespace-nowrap ${pathname === '/shop' ? 'text-primary' : 'text-foreground/85 hover:text-primary'}`}
                      >
                        Shop
                      </Link>
                    </div>
                  </nav>
                </div>

              </div>

            </div>
          )}


        </div>
      </header>
    </>
  );
}

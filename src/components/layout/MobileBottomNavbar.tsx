'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  ShoppingBag,
  ShoppingCart,
  Search,
  User,
  X,
  Mic,
  MicOff,
  LayoutDashboard,
  Settings,
  Truck,
  LogOut,
  Package,
  ArrowRight
} from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import Swal from 'sweetalert2';
import { toast } from 'sonner';

export function MobileBottomNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { totalQuantity: cartCount } = useAppSelector((state) => state.cart);
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [profile, setProfile] = useState<any>(null);

  // Live search and Voice search state
  const [isListening, setIsListening] = useState(false);
  const [liveResults, setLiveResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto focus input on search open
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
    } else {
      setShowDropdown(false);
      setLiveResults([]);
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        setIsListening(false);
      }
    }
  }, [isSearchOpen, isListening]);

  // Live search debounced query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setLiveResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(trimmed)}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setLiveResults(data.products || []);
          setShowDropdown(true);
        }
      } catch {
        // silent fail
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  // Close search when route changes
  useEffect(() => {
    setIsSearchOpen(false);
    setShowDropdown(false);
  }, [pathname]);

  // Voice Search Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
      setIsListening(false);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/shop?search=${encodeURIComponent(searchTerm.trim())}`);
      setIsSearchOpen(false);
      setShowDropdown(false);
      setSearchTerm('');
    }
  };

  const handleResultClick = () => {
    setIsSearchOpen(false);
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
      setIsSearchOpen(false);
    };

    recognition.start();
  };

  useEffect(() => {
    if (session) {
      fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => setProfile(data))
        .catch(err => console.error('Failed to fetch profile', err));
    }
  }, [session]);

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/shop', label: 'Shop', icon: ShoppingBag },
  ];

  return (
    <>
      {/* ── Compact Floating Search Bar (Positioned Right Above Bottom Navbar) ── */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            ref={searchContainerRef}
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.96 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="md:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+8px)] left-2 right-2 z-[110]"
          >
            {/* Live Autocomplete Results Dropdown */}
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mb-2 bg-background/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl overflow-hidden max-h-[48vh] overflow-y-auto"
              >
                {isSearching ? (
                  <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground text-xs font-medium">
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    Searching products...
                  </div>
                ) : liveResults.length > 0 ? (
                  <>
                    <ul className="divide-y divide-border/40">
                      {liveResults.map((product) => {
                        const price = product.salePrice ?? product.price;
                        const image = product.images?.[0];
                        return (
                          <li key={product._id}>
                            <Link
                              href={`/product/${product.slug || product._id}`}
                              onClick={handleResultClick}
                              className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50 transition-colors group"
                            >
                              {image ? (
                                <div className="h-10 w-10 rounded-xl overflow-hidden flex-shrink-0 bg-muted border border-border/40">
                                  <Image src={image} alt={product.name} width={40} height={40} className="h-full w-full object-cover" />
                                </div>
                              ) : (
                                <div className="h-10 w-10 rounded-xl bg-muted flex-shrink-0 flex items-center justify-center">
                                  <Search className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">{product.name}</p>
                                <p className="text-[11px] text-primary font-bold">৳{price?.toLocaleString()}</p>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="border-t border-border/40 p-2 bg-muted/20">
                      <Link
                        href={`/shop?search=${encodeURIComponent(searchTerm.trim())}`}
                        onClick={handleResultClick}
                        className="flex items-center justify-center gap-1.5 text-xs font-bold text-primary hover:underline py-1"
                      >
                        <Search className="h-3.5 w-3.5" />
                        See all results for &ldquo;{searchTerm}&rdquo;
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center py-4 text-muted-foreground text-xs gap-1">
                    <Search className="h-4 w-4 opacity-40 mb-0.5" />
                    No products found for &ldquo;{searchTerm}&rdquo;
                  </div>
                )}
              </motion.div>
            )}

            {/* The Compact Search Bar */}
            <form
              onSubmit={handleSearch}
              className="flex items-center gap-1.5 bg-background/95 backdrop-blur-xl border border-border/80 shadow-2xl rounded-2xl p-1.5 ring-1 ring-black/5"
            >
              <div className="flex items-center justify-center pl-2.5 text-muted-foreground">
                <Search className="h-4 w-4 text-primary" />
              </div>

              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isListening ? 'Listening... Speak now' : 'Search products...'}
                className="flex-1 bg-transparent border-none text-xs sm:text-sm py-2 px-2 text-foreground placeholder:text-muted-foreground focus:outline-none"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Voice Search Button */}
              <button
                type="button"
                onClick={handleVoiceSearch}
                className={`p-2 rounded-xl transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30'
                    : 'text-primary hover:bg-primary/10'
                }`}
                aria-label="Voice search"
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!searchTerm.trim()}
                className="bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground p-2 rounded-xl transition-all shadow-sm"
                aria-label="Submit search"
              >
                <ArrowRight className="h-4 w-4" />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors"
                aria-label="Close search bar"
              >
                <X className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile Bottom Navigation Bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-background border-t border-muted/50 pb-[env(safe-area-inset-bottom,1.5rem)]">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href && !isSearchOpen;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={`Go to ${item.label}`}
                className={`flex flex-col items-center justify-center gap-1 min-w-[64px] transition-all relative ${
                  isActive ? 'text-primary scale-110' : 'text-muted-foreground'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    className="absolute -bottom-0.5 w-8 h-0.5 bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}

          {/* Cart Item */}
          <CartDrawer>
            <div 
              aria-label="Open cart drawer"
              role="button"
              className="flex flex-col items-center justify-center gap-1 min-w-[64px] text-muted-foreground relative cursor-pointer active:scale-95 transition-transform"
            >
              <div className="relative">
                <ShoppingCart className="h-5 w-5 stroke-[1.5]" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-background">
                    {cartCount}
                  </span>
                )}
              </div>
            </div>
          </CartDrawer>

          {/* Search Toggle Item */}
          <button
            onClick={() => setIsSearchOpen((prev) => !prev)}
            aria-label="Search products"
            className={`flex flex-col items-center justify-center gap-1 min-w-[64px] transition-all relative active:scale-95 transition-transform ${
              isSearchOpen ? 'text-primary scale-110' : 'text-muted-foreground'
            }`}
          >
            <Search className={`h-5 w-5 ${isSearchOpen ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
            {isSearchOpen && (
              <motion.div
                layoutId="bottom-nav-indicator"
                className="absolute -bottom-0.5 w-8 h-0.5 bg-primary rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>

          {/* Account Item */}
          {session ? (
            <Sheet open={isAccountOpen} onOpenChange={setIsAccountOpen}>
              <SheetTrigger asChild>
                <button 
                  aria-label="User account menu"
                  className="flex flex-col items-center justify-center gap-1 min-w-[64px] text-muted-foreground active:scale-95 transition-transform outline-none"
                >
                  <div className="h-6 w-6 rounded-full border border-primary/50 overflow-hidden">
                    <Image
                      src={session.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user?.name || '')}`}
                      alt={session.user?.name || 'User'}
                      width={24}
                      height={24}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-[2rem] border-t-0 p-6 bg-background z-[150] max-h-[85vh] overflow-y-auto">

                <div className="flex flex-col gap-6">
                  {/* Profile Header */}
                  <div className="flex items-center gap-4 border-b border-muted/50 pb-4">
                    <div className="h-14 w-14 rounded-full border-2 border-primary/50 overflow-hidden">
                      <Image
                        src={session.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user?.name || '')}`}
                        alt={session.user?.name || 'User'}
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-lg leading-tight truncate">{session.user?.name}</span>
                      <span className="text-xs text-muted-foreground truncate">{session.user?.email}</span>
                      {profile && (
                        <div className="mt-1.5 flex items-center gap-1.5 bg-primary/10 px-2.5 py-0.5 rounded-full w-fit border border-primary/20">
                          <Package className="h-3.5 w-3.5 text-primary" />
                          <span className="text-[11px] font-black text-primary">৳{profile.walletBalance || 0} Tokens</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions/Links */}
                  <div className="flex flex-col gap-1.5">
                    {/* Role Based Navigation */}
                    {(session.user as any)?.role === 'super_admin' && (
                      <>
                        <Link
                          href="/admin/dashboard"
                          onClick={() => setIsAccountOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted text-sm font-medium transition-colors"
                        >
                          <LayoutDashboard className="h-5 w-5 text-primary" /> Admin Dashboard
                        </Link>
                        <Link
                          href="/admin/system-design"
                          onClick={() => setIsAccountOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted text-sm font-medium transition-colors"
                        >
                          <Settings className="h-5 w-5 text-primary" /> Infrastructure & Marketing
                        </Link>
                      </>
                    )}

                    {(session.user as any)?.role === 'admin' && (
                      <>
                        <Link
                          href="/admin/dashboard"
                          onClick={() => setIsAccountOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted text-sm font-medium transition-colors"
                        >
                          <LayoutDashboard className="h-5 w-5 text-primary" /> Admin Dashboard
                        </Link>
                        <Link
                          href="/admin/orders"
                          onClick={() => setIsAccountOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted text-sm font-medium transition-colors"
                        >
                          <Truck className="h-5 w-5 text-primary" /> Manage Orders
                        </Link>
                      </>
                    )}

                    {(session.user as any)?.role === 'user' && (
                      <>
                        <Link
                          href="/dashboard"
                          onClick={() => setIsAccountOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted text-sm font-medium transition-colors"
                        >
                          <LayoutDashboard className="h-5 w-5 text-primary" /> Dashboard
                        </Link>

                        <Link
                          href="/track-order"
                          onClick={() => setIsAccountOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted text-sm font-medium transition-colors"
                        >
                          <Truck className="h-5 w-5 text-primary" /> Track Order
                        </Link>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => signOut({ callbackUrl: window.location.origin })}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-destructive/10 text-sm font-medium text-destructive transition-colors border border-destructive/20 mt-2"
                  >
                    <LogOut className="h-5 w-5" /> Sign Out
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <Link
              href="/login"
              aria-label="Go to login page"
              className={`flex flex-col items-center justify-center gap-1 min-w-[64px] transition-all relative ${
                pathname === '/login' && !isSearchOpen ? 'text-primary scale-110' : 'text-muted-foreground'
              } active:scale-95 transition-transform`}
            >
              <User className={`h-5 w-5 ${pathname === '/login' && !isSearchOpen ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}

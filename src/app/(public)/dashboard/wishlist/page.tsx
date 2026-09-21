'use client';

import { useState, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import { ProductCard } from '@/components/storefront/ProductCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Heart, Loader2, ShoppingBag } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function WishlistPage() {
  const { status } = useSession();
  const wishlistIds = useAppSelector((state) => state.wishlist.items);
  const isHydrated = useAppSelector((state) => state.wishlist.isHydrated);

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isHydrated || status === 'loading') return;

    const controller = new AbortController();
    let isMounted = true;

    async function fetchWishlistProducts() {
      setLoading(true);
      try {
        let url = '';
        if (status === 'authenticated') {
          url = '/api/wishlist';
        } else if (wishlistIds.length > 0) {
          url = `/api/products?ids=${wishlistIds.join(',')}`;
        }

        if (url) {
          const res = await fetch(url, { signal: controller.signal });
          if (res.ok) {
            const data = await res.json();
            const productsArray = data.products || data;
            if (isMounted) setProducts(Array.isArray(productsArray) ? productsArray : []);
          } else {
            throw new Error(`Failed to fetch: ${res.status}`);
          }
        } else {
          if (isMounted) setProducts([]);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error fetching wishlist products:', error);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchWishlistProducts();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [wishlistIds, isHydrated, status]);

  if (!isHydrated || (loading && products.length === 0)) {
    return (
      <div className="flex h-[40vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-xs sm:text-sm text-muted-foreground animate-pulse">Loading your wishlist...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2 text-foreground">
            <Heart className="h-6 w-6 text-rose-500 fill-rose-500 shrink-0" />
            My Wishlist
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            {products.length === 0
              ? "Your wishlist is empty."
              : `${products.length} item${products.length === 1 ? '' : 's'} saved in your wishlist`}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="h-8 text-xs self-start sm:self-auto">
          <Link href="/shop">Continue Shopping</Link>
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-muted/20 rounded-2xl border-2 border-dashed border-border/80">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <ShoppingBag className="h-6 w-6 text-muted-foreground opacity-50" />
          </div>
          <h2 className="text-base sm:text-lg font-bold mb-1 text-foreground">No items found</h2>
          <p className="text-muted-foreground mb-4 text-center max-w-sm text-xs">
            Looks like you haven't added anything to your wishlist yet.
            Explore our shop to find items you love!
          </p>
          <Button
            asChild
            size="sm"
            className="rounded-full px-6 font-bold text-xs h-9"
          >
            <Link href="/shop">Go to Shop</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 md:gap-6">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

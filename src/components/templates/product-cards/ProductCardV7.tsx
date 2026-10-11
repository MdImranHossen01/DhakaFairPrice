/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Eye, Heart } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleWishlist } from '@/store/slices/wishlistSlice';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QuickViewModal } from './QuickViewModal';
import { ProductActionMenu } from './ProductActionMenu';
import { fbEvent } from '@/lib/fpixel';
import { ttEvent } from '@/lib/tiktok';

interface ProductCardProps {
  product: {
    _id: string;
    name: string;
    slug: string;
    price: number;
    salePrice?: number;
    images: string[];
    isFeatured?: boolean;
    isNewArrival?: boolean;
    isTrending?: boolean;
    stock: number;
    categories?: any[];
    variants?: any[];
    ratings?: number;
    numReviews?: number;
    sku?: string;
  };
  isFlashSale?: boolean;
  priority?: boolean;
  layout?: string;
}

export default function ProductCardV7({ product: initialProduct, isFlashSale, priority, layout }: ProductCardProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { data: session, status } = useSession();
  const wishlist = useAppSelector((state) => state.wishlist.items);
  const isInWishlist = wishlist.includes(initialProduct._id);

  const firstVariant = initialProduct.variants && initialProduct.variants.length > 0 ? initialProduct.variants[0] : null;
  const product = firstVariant ? {
    ...initialProduct,
    price: firstVariant.price ?? initialProduct.price,
    salePrice: firstVariant.salePrice ?? initialProduct.salePrice,
    stock: firstVariant.stock ?? initialProduct.stock,
    sku: firstVariant.sku ?? initialProduct.sku,
    images: firstVariant.image ? [firstVariant.image, ...initialProduct.images.filter((img: string) => img !== firstVariant.image)] : initialProduct.images
  } : initialProduct;

  const [showQuickViewModal, setShowQuickViewModal] = useState(false);

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (status !== 'authenticated') {
      toast.error('Please login to add to wishlist');
      return;
    }
    dispatch(toggleWishlist(product._id));

    if (!isInWishlist) {
      const addToWishlistPayload = {
        content_name: product.name,
        content_category: product.categories?.[0]?.name || 'Uncategorized',
        content_ids: [product._id],
        content_type: 'product',
        value: product.salePrice || product.price,
        currency: 'BDT'
      };
      const trackingUser = {
        em: session?.user?.email || undefined,
        ph: (session?.user as any)?.phone || undefined,
        fn: session?.user?.name || undefined
      };
      fbEvent('AddToWishlist', addToWishlistPayload, trackingUser);
      ttEvent('AddToWishlist', addToWishlistPayload, trackingUser);
    }

    toast.success(isInWishlist ? 'Removed from wishlist' : 'Added to wishlist');
  };

  return (
    <div className="group relative flex flex-col font-body animate-in fade-in duration-500 bg-background">
      {/* Aspect 3/4 Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-muted w-full">
        <Link prefetch={true} href={`/product/${product.slug}`} className="relative block h-full w-full">
          <Image
            src={product.images?.[0] || '/placeholder.png'}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
          />
        </Link>

        {/* Absolute top-right heart icon */}
        <button
          onClick={handleWishlist}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 hover:bg-white text-foreground hover:text-primary transition-all duration-300 z-10 shadow-sm"
          title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={`h-4.5 w-4.5 ${isInWishlist ? 'fill-primary text-primary' : 'text-foreground'}`} />
        </button>

        {/* Absolute bottom quick view strip */}
        <button
          onClick={(e) => { e.preventDefault(); setShowQuickViewModal(true); }}
          className="absolute bottom-0 left-0 w-full bg-black/60 hover:bg-black/85 text-white py-2 text-center text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
        >
          <Eye className="h-4 w-4" /> QUICK VIEW
        </button>

        {/* Admin & Reseller Action Menu */}
        <ProductActionMenu product={product} className="top-3 left-3 bottom-auto" />
      </div>

      {/* Product Text details - Left aligned */}
      <div className="mt-3 flex flex-col gap-1.5 text-left px-1">
        <Link prefetch={true}
          href={`/product/${product.slug}`}
          className="text-xs sm:text-sm font-semibold text-foreground hover:text-primary transition-colors leading-snug line-clamp-2"
          title={product.name}
        >
          {product.name}
        </Link>

        <div className="flex items-center gap-2">
          {product.salePrice ? (
            <>
              <span className="text-xs sm:text-sm font-black text-foreground">Tk {Math.round(product.salePrice).toLocaleString()}</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground line-through font-normal">Tk {Math.round(product.price).toLocaleString()}</span>
            </>
          ) : (
            <span className="text-xs sm:text-sm font-black text-foreground">Tk {Math.round(product.price).toLocaleString()}</span>
          )}
        </div>
      </div>

      <QuickViewModal
        product={initialProduct}
        isOpen={showQuickViewModal}
        onClose={() => setShowQuickViewModal(false)}
      />
    </div>
  );
}

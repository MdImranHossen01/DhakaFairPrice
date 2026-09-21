/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ShoppingBag, Heart, Eye, MoreVertical, Edit, Trash2, Settings } from 'lucide-react';
import { RatingStars } from '@/components/ui/rating-stars';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addToCart } from '@/store/slices/cartSlice';
import { toggleWishlist } from '@/store/slices/wishlistSlice';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { fbEvent } from '@/lib/fpixel';
import { ttEvent } from '@/lib/tiktok';
import { QuickViewModal } from './QuickViewModal';
import { ProductActionMenu } from './ProductActionMenu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

export default function ProductCardV1({ product: initialProduct, isFlashSale, priority }: ProductCardProps) {
  const dispatch = useAppDispatch();
  const { data: session, status } = useSession();
  const wishlist = useAppSelector((state) => state.wishlist.items);
  const isInWishlist = wishlist.includes(initialProduct._id);
  const router = useRouter();
  const isAdmin = (session?.user as any)?.role === 'admin' || (session?.user as any)?.role === 'super_admin';

  const firstVariant = initialProduct.variants && initialProduct.variants.length > 0 ? initialProduct.variants[0] : null;
  const initialBasePrice = Number(initialProduct.price ?? (initialProduct as any).retailPrice ?? 0);
  const initialSalePrice = initialProduct.salePrice !== undefined && initialProduct.salePrice !== null
    ? Number(initialProduct.salePrice)
    : (initialProduct.price !== undefined ? Number(initialProduct.price) : Number((initialProduct as any).retailPrice ?? 0));

  const variantPrice = firstVariant && (firstVariant.price !== undefined && firstVariant.price !== null)
    ? Number(firstVariant.price)
    : initialBasePrice;
  const variantSalePrice = firstVariant && (firstVariant.salePrice !== undefined && firstVariant.salePrice !== null)
    ? Number(firstVariant.salePrice)
    : (firstVariant && firstVariant.price !== undefined ? Number(firstVariant.price) : initialSalePrice);

  const product = {
    ...initialProduct,
    price: isNaN(variantPrice) ? 0 : variantPrice,
    salePrice: isNaN(variantSalePrice) ? variantPrice : variantSalePrice,
    stock: firstVariant?.stock ?? initialProduct.stock ?? 0,
    sku: firstVariant?.sku ?? initialProduct.sku,
    images: firstVariant?.image ? [firstVariant.image, ...((initialProduct.images || []).filter((img: string) => img !== firstVariant.image))] : (initialProduct.images || [])
  };

  const hasVariants = initialProduct.variants && initialProduct.variants.length > 0;
  const [showQuickViewModal, setShowQuickViewModal] = useState(false);

  const discount = (product.price > 0 && product.salePrice && product.salePrice < product.price)
    ? Math.round(((product.price - product.salePrice) / product.price) * 100)
    : 0;

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasVariants) {
      setShowQuickViewModal(true);
    } else {
      executeAddToCart();
    }
  };

  const executeAddToCart = () => {
    const displayPrice = product.price;
    const displaySalePrice = product.salePrice;

    dispatch(addToCart({
      productId: product._id,
      name: product.name,
      price: (displaySalePrice !== undefined && displaySalePrice !== null) ? displaySalePrice : displayPrice,
      basePrice: displayPrice,
      quantity: 1,
      image: product.images?.[0]
    }));

    // Track AddToCart
    const addToCartPayload = {
      content_name: product.name,
      content_category: product.categories?.[0]?.name || 'Uncategorized',
      content_ids: [product._id],
      content_type: 'product',
      value: displaySalePrice ?? displayPrice,
      currency: 'BDT',
      quantity: 1
    };
    fbEvent('AddToCart', addToCartPayload);
    ttEvent('AddToCart', addToCartPayload);

    toast.success(`${product.name} added to cart`);
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (status === 'unauthenticated') {
      toast.error('Please login to save to wishlist');
      return;
    }

    // Optimistic update
    dispatch(toggleWishlist(product._id));
    const willBeInWishlist = !isInWishlist;

    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product._id }),
      });

      if (!res.ok) {
        throw new Error('Server error updating wishlist');
      }

      if (willBeInWishlist) {
        const addToWishlistPayload = {
          content_name: product.name,
          content_category: product.categories?.[0]?.name || 'Uncategorized',
          content_ids: [product._id],
          content_type: 'product',
          value: product.salePrice ?? product.price,
          currency: 'BDT'
        };
        fbEvent('AddToWishlist', addToWishlistPayload);
        ttEvent('AddToWishlist', addToWishlistPayload);
        toast.success('Added to wishlist');
      } else {
        toast.info('Removed from wishlist');
      }
    } catch {
      // Revert on failure
      dispatch(toggleWishlist(product._id));
      toast.error('Failed to update wishlist');
    }
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowQuickViewModal(true);
  };

  const handleDeleteProduct = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Delete "${product.name}"? This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--destructive, #ef4444)',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/products/${product.slug}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete product');
      }
      toast.success('Product removed successfully');
      router.refresh();
    } catch (err: any) {
      toast.error(`Error: ${err.message || 'Failed to delete product'}`);
    }
  };

  const mainCategory = product.categories && product.categories.length > 0 ? product.categories[0] : null;
  const categoryName = mainCategory?.name || 'Exclusive Collection';

  return (
    <div className="w-full bg-card border border-border/60 rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group flex flex-col h-full relative">
      {/* Image Area */}
      <div className="relative w-full aspect-[4/5] bg-muted/20 overflow-hidden">
        <Link prefetch={true} href={`/product/${product.slug}`} className="relative block h-full w-full">
          <Image
            src={product.images?.[0] || '/placeholder.png'}
            alt={product.name}
            fill
            className="object-cover w-full h-full object-center transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
          />
        </Link>

        {/* Unified Ribbon Badge (Top Left) */}
        {(isFlashSale || discount > 0 || product.isNewArrival || product.isFeatured) && (
          <div className="absolute top-0 left-0 overflow-hidden w-20 h-20 z-10 pointer-events-none">
            <div className={`absolute top-0 left-0 text-[8px] font-black py-0.5 w-28 text-center -rotate-45 -translate-x-8 translate-y-3.5 shadow-md uppercase tracking-wider ${isFlashSale
              ? 'bg-orange-600 text-white animate-pulse'
              : discount > 0
                ? 'bg-primary text-primary-foreground'
                : product.isNewArrival
                  ? 'bg-emerald-600 text-white'
                  : 'bg-secondary text-secondary-foreground'
              }`}>
              {isFlashSale
                ? 'Flash'
                : discount > 0
                  ? `${discount}% OFF`
                  : product.isNewArrival
                    ? 'New'
                    : 'Featured'}
            </div>
          </div>
        )}

        {/* Quick Actions (Wishlist & Quick View) */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
          <TooltipProvider>
            {/* Wishlist Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={handleFavorite}
                  className="w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm text-foreground hover:text-primary hover:bg-background shadow-md border border-border/40 flex items-center justify-center transition-all duration-200"
                  aria-label="Add to Wishlist"
                >
                  <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}</p>
              </TooltipContent>
            </Tooltip>

            {/* Quick View Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={handleQuickView}
                  className="w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm text-foreground hover:bg-primary hover:text-primary-foreground border border-border/40 shadow-md flex items-center justify-center transition-all duration-200"
                  aria-label="Quick View"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Quick View</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Admin & Reseller Action Menu */}
        <ProductActionMenu product={product} />
      </div>

      {/* Content Area */}
      <div className="px-[2px] py-2 md:px-3 md:py-4 flex flex-col justify-between flex-grow gap-2 md:gap-4">
        {/* Category & Title */}
        <div className="space-y-0.5 md:space-y-1 w-full">
          <Link href={`/shop?category=${mainCategory?.slug || ''}`} className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors block">
            {categoryName}
          </Link>
          <Link prefetch={true} href={`/product/${product.slug}`} className="block group/title">
            <h3 className="text-xs font-medium md:text-sm md:font-bold text-foreground line-clamp-2 min-h-[32px] md:min-h-[38px] group-hover/title:text-primary transition-colors leading-snug">
              {product.name}
            </h3>
          </Link>

          {/* Rating */}
          {(product.ratings ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <RatingStars rating={product.ratings || 0} starClassName="h-3 w-3" />
              <span className="text-[10px] text-muted-foreground font-bold">
                ({product.numReviews || 0})
              </span>
            </div>
          )}
        </div>

        {/* Price & Button Stack */}
        <div className="flex flex-col items-center gap-2 sm:gap-3 sm:flex-row sm:items-end sm:justify-between mt-auto pt-1 w-full">
          <div className="flex flex-col items-center sm:items-start">
            <span className="text-sm sm:text-[16px] font-black text-primary">
              Tk {Math.round(product.salePrice ?? product.price ?? 0).toLocaleString()}
            </span>
            {product.salePrice != null && product.salePrice < product.price && (
              <span className="text-[10px] sm:text-xs text-muted-foreground line-through decoration-primary/20">
                Tk {Math.round(product.price ?? 0).toLocaleString()}
              </span>
            )}
          </div>
          <Button
            onClick={handleAddToCartClick}
            disabled={product.stock === 0}
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors duration-200"
          >
            <ShoppingBag className="h-4 w-4" />
            {product.stock === 0 ? 'Out' : 'Add'}
          </Button>
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

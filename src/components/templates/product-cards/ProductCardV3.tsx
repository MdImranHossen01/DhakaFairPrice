/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ShoppingCart, Heart, Search, MoreVertical, Edit, Trash2, Settings, Layers } from 'lucide-react';
import { RatingStars } from '@/components/ui/rating-stars';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addToCart } from '@/store/slices/cartSlice';
import { toggleWishlist } from '@/store/slices/wishlistSlice';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
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
}

export default function ProductCardV3({ product: initialProduct, isFlashSale }: ProductCardProps) {
  const dispatch = useAppDispatch();
  const { data: session, status } = useSession();
  const wishlist = useAppSelector((state) => state.wishlist.items);
  const isInWishlist = wishlist.includes(initialProduct._id);
  const router = useRouter();
  const isAdmin = (session?.user as any)?.role === 'admin';

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
    if (hasVariants) {
      setShowQuickViewModal(true);
    } else {
      executeAddToCart();
    }
  };

  const executeAddToCart = () => {
    dispatch(addToCart({
      productId: product._id,
      name: product.name,
      price: product.salePrice ?? product.price,
      basePrice: product.price,
      quantity: 1,
      image: product.images?.[0]
    }));
    toast.success(`${product.name} added to cart`);
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
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

      toast.success(willBeInWishlist ? 'Saved to wishlist' : 'Removed from wishlist');
    } catch (err) {
      console.error('Wishlist error:', err);
      // Rollback
      dispatch(toggleWishlist(product._id));
      toast.error('Failed to sync wishlist. Please try again.');
    }
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowQuickViewModal(true);
  };

  const handleDeleteProduct = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await Swal.fire({
      title: 'Delete Product?',
      text: 'Are you sure you want to delete this product? This action is permanent.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
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

  return (
    <div
      className="group relative flex flex-col bg-background border border-neutral-200 dark:border-neutral-800 transition-all duration-300 hover:border-primary"
      data-aos="fade-up"
    >
      {/* Industrial Visual Container */}
      <div className="relative aspect-square overflow-hidden bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800">
        <Link prefetch={true} href={`/product/${product.slug}`} className="relative block h-full w-full">
          <Image
            src={product.images?.[0] || '/placeholder.png'}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {discount > 0 && (
            <div className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded shadow-sm uppercase tracking-tight">
              -{discount}%
            </div>
          )}
          {isFlashSale && (
            <div className="bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded shadow-sm uppercase tracking-tight animate-pulse">
              Flash Sale
            </div>
          )}
        </div>

        {/* Action Sidebar */}
        <div className="absolute top-0 right-0 h-full hidden md:flex flex-col border-l border-neutral-100 dark:border-neutral-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 bg-background/80 backdrop-blur-md">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleFavorite}
                  className="flex-1 px-3 hover:text-primary transition-colors border-b border-neutral-100 dark:border-neutral-800"
                >
                  <Heart className={`h-5 w-5 ${isInWishlist ? 'fill-primary text-primary' : ''}`} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleQuickView}
                  className="flex-1 px-3 hover:text-primary transition-colors border-b border-neutral-100 dark:border-neutral-800"
                >
                  <Search className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Quick View</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="flex-1 px-3 hover:text-primary transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    toast.info('Comparison feature coming soon');
                  }}
                >
                  <Layers className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Compare</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Admin & Reseller Action Menu */}
        <ProductActionMenu product={product} />
      </div>

      {/* Content Section */}
      <div className="px-[2px] py-2 md:p-4 flex flex-col gap-2 md:gap-4">
        <div className="space-y-1">
          {(product.isNewArrival || product.isFeatured) && (
            <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wide uppercase">
              {product.isNewArrival && <span className="text-primary">New Arrival</span>}
              {product.isFeatured && <span className="text-primary">Featured</span>}
            </div>
          )}
          <Link prefetch={true} href={`/product/${product.slug}`} className="block">
            <h3 className="text-xs font-medium md:text-base md:font-bold uppercase tracking-tight line-clamp-1 group-hover:text-primary transition-colors">
              {product.name}
            </h3>
          </Link>
          {(product.numReviews || 0) > 0 && (
            <div
              className="flex items-center gap-1.5 mt-1"
              aria-label={`${product.ratings || 0} out of 5 stars, ${product.numReviews || 0} reviews`}
            >
              <RatingStars rating={product.ratings || 0} starClassName="h-2.5 w-2.5" />
              <span className="text-[10px] text-muted-foreground font-semibold">({product.numReviews})</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-lg md:text-xl font-black text-primary">
                ৳{Math.round(product.salePrice ?? product.price ?? 0).toLocaleString()}
              </span>
              {product.salePrice != null && product.salePrice < product.price && (
                <span className="text-xs text-muted-foreground line-through opacity-60">
                  ৳{Math.round(product.price ?? 0).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="rounded-lg h-10 w-10 bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm"
                  onClick={handleAddToCartClick}
                  disabled={product.stock === 0}
                >
                  <ShoppingCart className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add to cart</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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


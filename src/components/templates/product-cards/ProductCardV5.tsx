/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ShoppingCart, Heart, Search, MoreVertical, Edit, Trash2, Settings, ArrowUpRight } from 'lucide-react';
import { RatingStars } from '@/components/ui/rating-stars';
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

export default function ProductCardV5({ product: initialProduct, isFlashSale }: ProductCardProps) {
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
  const [isHovered, setIsHovered] = useState(false);

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
      toast.error('Login to save');
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
        throw new Error('Server synchronization failed');
      }

      toast.success(willBeInWishlist ? 'Added to favorites' : 'Removed from favorites');
    } catch (err) {
      console.error('Wishlist error:', err);
      // Rollback
      dispatch(toggleWishlist(product._id));
      toast.error('Unable to sync collection. Please try again.');
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
        throw new Error(errorData.message || 'System rejection');
      }
      toast.success('Deleted');
      router.refresh();
    } catch (err: any) {
      toast.error(`Error: ${err.message || 'Purge failed'}`);
    }
  };

  return (
    <div
      className="group relative flex flex-col bg-transparent"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-aos="fade-up"
    >
      {/* Ethereal Floating Image Container */}
      <div className="relative aspect-[3/4] rounded-none overflow-hidden transition-all duration-700 group-hover:shadow-[0_40px_80px_-20px_rgba(var(--primary-rgb),0.25)] group-hover:-translate-y-4">
        <Link prefetch={true} href={`/product/${product.slug}`} className="relative block h-full w-full">
          <Image
            src={product.images?.[0] || '/placeholder.png'}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-[2000ms] group-hover:scale-110"
          />
        </Link>

        {/* Minimalist Floating Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          {discount > 0 && (
            <div className="bg-background/90 backdrop-blur-md text-primary text-[10px] font-black px-2 py-0.5 min-w-8 h-7 flex items-center justify-center rounded-full shadow-md border border-primary/20">
              -{discount}%
            </div>
          )}
        </div>

        {/* Action Float Menu */}
        <div className={`absolute bottom-3 right-3 hidden md:flex flex-col items-center gap-2 transition-all duration-300 z-20 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}`}>
          <TooltipProvider>
            {/* Favorites / Wishlist */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="h-9 w-9 rounded-full shadow-lg bg-background text-foreground hover:bg-primary hover:text-primary-foreground border border-border/60 transition-all duration-200"
                  onClick={handleFavorite}
                >
                  <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-primary text-primary' : 'text-foreground'}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{isInWishlist ? 'Remove from favorites' : 'Add to favorites'}</p>
              </TooltipContent>
            </Tooltip>

            {/* Quick View */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="h-9 w-9 rounded-full shadow-lg bg-background text-foreground hover:bg-primary hover:text-primary-foreground border border-border/60 transition-all duration-200"
                  onClick={handleQuickView}
                >
                  <Search className="h-4 w-4 text-foreground hover:text-inherit" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Quick View</p>
              </TooltipContent>
            </Tooltip>

            {/* Add to Cart - placed at the bottom */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="h-10 w-10 rounded-full shadow-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200"
                  onClick={handleAddToCartClick}
                  disabled={product.stock === 0}
                >
                  <ShoppingCart className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Add to cart</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Admin & Reseller Action Menu */}
        <ProductActionMenu product={product} className="top-4 right-4 bottom-auto" />
      </div>

      {/* Minimalist Content Section */}
      <div className="px-[2px] pt-3 space-y-2 md:pt-8 md:px-4 md:space-y-4">
        <div className="space-y-1 md:space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {product.isNewArrival && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                {product.isNewArrival ? 'New Season' : 'Essential'}
              </span>
            </div>
            <Link prefetch={true} href={`/product/${product.slug}`} className="text-muted-foreground hover:text-primary transition-colors">
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <Link prefetch={true} href={`/product/${product.slug}`} className="block">
            <h3 className="text-xs font-medium md:text-2xl md:font-bold tracking-tighter leading-tight hover:text-primary transition-colors line-clamp-1">
              {product.name}
            </h3>
          </Link>
          {(product.numReviews || 0) > 0 && (
            <div
              className="flex items-center gap-2"
              aria-label={`${product.ratings || 0} out of 5 stars, ${product.numReviews || 0} reviews`}
            >
              <RatingStars rating={product.ratings || 0} starClassName="h-3 w-3" />
              <span className="text-[10px] text-muted-foreground font-black tracking-widest">
                ({product.numReviews})
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-2xl font-black text-primary">
            ৳{Math.round(product.salePrice ?? product.price ?? 0)}
          </span>
          {product.salePrice != null && product.salePrice < product.price && (
            <span className="text-sm text-muted-foreground line-through opacity-40 font-bold">
              ৳{Math.round(product.price ?? 0)}
            </span>
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


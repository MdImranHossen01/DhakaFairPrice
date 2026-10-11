/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Heart, Minus, Plus, Share2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addToCart } from '@/store/slices/cartSlice';
import { toggleWishlist } from '@/store/slices/wishlistSlice';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import ReviewsSection from '@/components/storefront/ReviewsSection';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { generateHtml } from '@/lib/server-html';
import ShareDialog from '@/components/storefront/ShareDialog';
import { fbEvent } from '@/lib/fpixel';
import { ttEvent } from '@/lib/tiktok';

interface ProductDetailsV2ClientProps {
  product: any;
}

export default function ProductDetailsV2Client({ product }: ProductDetailsV2ClientProps) {
  const dispatch = useAppDispatch();
  const { data: session, status } = useSession();
  const wishlist = useAppSelector((state) => state.wishlist.items);
  const isInWishlist = wishlist.includes(product?._id);
  const router = useRouter();

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0, percentageX: 0, percentageY: 0 });
  const [showZoom, setShowZoom] = useState(false);
  const defaultVariant = product?.variants && product.variants.length > 0 ? product.variants[0] : null;
  const [selectedColor, setSelectedColor] = useState<string | null>(defaultVariant?.color || null);
  const [selectedSize, setSelectedSize] = useState<string | null>(defaultVariant?.size || null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [descriptionDrawerOpen, setDescriptionDrawerOpen] = useState(false);
  const [reviewsDrawerOpen, setReviewsDrawerOpen] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const [prevProductId, setPrevProductId] = useState<string | null>(null);
  const [prevSelectedColor, setPrevSelectedColor] = useState<string | null>(null);

  const uniqueColors = useMemo(() =>
    Array.from(new Set((product?.variants || []).map((v: any) => v.color))).filter(Boolean) as string[],
    [product?.variants]
  );

  const uniqueSizes = useMemo(() =>
    Array.from(new Set((product?.variants || []).map((v: any) => v.size))).filter(Boolean) as string[],
    [product?.variants]
  );

  const availableSizes = useMemo(() =>
    (product?.variants || [])
      .filter((v: any) => !selectedColor || v.color === selectedColor)
      .map((v: any) => v.size)
      .filter(Boolean) as string[],
    [product?.variants, selectedColor]
  );

  const activeVariant = useMemo(() =>
    (product?.variants || []).find(
      (v: any) =>
        (v.color || null) === (selectedColor || null) &&
        (v.size || null) === (selectedSize || null)
    ),
    [product?.variants, selectedColor, selectedSize]
  );

  const hasVariants = (uniqueColors.length > 0 || uniqueSizes.length > 0);
  const currentVariant = activeVariant || defaultVariant;

  const displayPrice = hasVariants ? (currentVariant?.price ?? 0) : product?.price;
  const displaySalePrice = hasVariants ? currentVariant?.salePrice : product?.salePrice;
  const displayStock = hasVariants ? (currentVariant?.stock ?? 0) : (product?.stock ?? 0);

  const allImages = useMemo(() => {
    if (activeVariant) {
      const activeImages = [
        ...(activeVariant.images || []),
        activeVariant.image
      ].filter(Boolean) as string[];
      if (activeImages.length > 0) {
        return Array.from(new Set(activeImages));
      }
    }
    return product?.images || [];
  }, [product?.images, activeVariant]);

  // Sync state when product changes
  if (product && product._id !== prevProductId) {
    setPrevProductId(product._id);
    setSelectedColor(uniqueColors[0] || null);
    setQuantity(1);
  }

  // Reset selected image when selected color changes
  if (selectedColor !== prevSelectedColor) {
    setPrevSelectedColor(selectedColor);
    setSelectedImage(0);
  }

  // Adjust size selection if current selectedSize is not available
  const currentSize = (selectedSize !== null && availableSizes.includes(selectedSize))
    ? selectedSize
    : (availableSizes[0] || null);

  if (selectedSize !== currentSize) {
    setSelectedSize(currentSize);
  }

  if (quantity > displayStock) {
    setQuantity(Math.max(1, displayStock));
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - left - 75; // Center lens
    const y = e.clientY - top - 75;

    // Constrain lens within bounds
    const boundedX = Math.max(0, Math.min(x, width - 150));
    const boundedY = Math.max(0, Math.min(y, height - 150));

    // Calculate background position percentages
    const percentageX = ((e.clientX - left) / width) * 100;
    const percentageY = ((e.clientY - top) / height) * 100;

    setZoomPos({
      x: boundedX,
      y: boundedY,
      percentageX,
      percentageY
    });
  };

  const handlePrevImage = () => {
    if (!allImages || allImages.length <= 1) return;
    setSelectedImage((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (!allImages || allImages.length <= 1) return;
    setSelectedImage((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  const activeImage = useMemo(() => {
    if (allImages && allImages.length > 0 && selectedImage < allImages.length) {
      return allImages[selectedImage];
    }
    return '/placeholder.png';
  }, [allImages, selectedImage]);

  const handleAddToCart = () => {
    if (displayStock <= 0) {
      toast.error('Product is out of stock');
      return false;
    }

    dispatch(addToCart({
      productId: product._id,
      name: product.name,
      price: displaySalePrice ?? displayPrice,
      basePrice: displayPrice,
      quantity,
      image: activeImage,
      color: selectedColor || undefined,
      size: selectedSize || undefined,
    }));

    // FB & TikTok Tracking
    const trackingPayload = {
      content_name: product.name,
      content_category: product.categories?.[0]?.name || 'Apparel',
      content_ids: [product._id],
      content_type: 'product',
      value: (displaySalePrice ?? displayPrice) * quantity,
      currency: 'BDT',
      quantity
    };
    const trackingUser = {
      em: session?.user?.email || undefined,
      ph: (session?.user as any)?.phone || undefined,
      fn: session?.user?.name || undefined
    };
    fbEvent('AddToCart', trackingPayload, trackingUser);
    ttEvent('AddToCart', trackingPayload, trackingUser);

    toast.success(`${quantity} ${quantity > 1 ? 'items' : 'item'} added to bag`);
    return true;
  };

  const handleBuyNow = () => {
    const success = handleAddToCart();
    if (success) {
      router.push('/checkout');
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setWhatsappNumber(data.socialLinks?.whatsapp || null);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    fetchSettings();
  }, []);

  const handleWhatsAppOrder = () => {
    if (!whatsappNumber) return;
    const finalPrice = Math.round(displaySalePrice ?? displayPrice);
    const message = encodeURIComponent(`Hi, I'm interested in ${product.name}. Price: ৳${finalPrice}`);

    // Parse whatsappNumber robustly
    let cleanNumber = (whatsappNumber || '').trim();
    let phone = '';

    if (cleanNumber.includes('wa.me/')) {
      const parts = cleanNumber.split('wa.me/');
      phone = parts[parts.length - 1];
    } else if (cleanNumber.includes('whatsapp.com/')) {
      const parts = cleanNumber.split('phone=');
      if (parts.length > 1) {
        phone = parts[1];
      } else {
        phone = cleanNumber.replace(/[^0-9]/g, '');
      }
    } else {
      phone = cleanNumber.replace(/[^0-9]/g, '');
    }

    phone = phone.split('?')[0].replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleWishlist = () => {
    if (status === 'unauthenticated') {
      toast.error('Please login to add to wishlist');
      return;
    }
    dispatch(toggleWishlist(product._id));
    toast.success(isInWishlist ? 'Removed from wishlist' : 'Added to wishlist');
  };

  // Default specifications for fashion clothes if product attributes are empty
  const displayAttributes = product?.attributes && product.attributes.length > 0
    ? product.attributes
    : [
      { key: 'Colour', value: selectedColor || 'Multicolor' },
      { key: 'Fabric', value: 'Cotton' },
      { key: 'Value Addition', value: 'Block Print' },
      { key: 'Cut /Fit', value: 'A-Line' },
      { key: 'Side Cut', value: 'Side Open' },
      { key: 'Collar/Neck', value: 'Band Collar' },
      { key: 'Sleeve', value: '3-Quarter Sleeve' },
      { key: 'Length', value: 'Long' },
      { key: 'Care', value: 'Hand Wash With Mild Detergent In Cold Water' }
    ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 font-jost text-foreground relative items-start w-full">

      {/* ── Left Half: Product Image Centered in Left Half ── */}
      <div className="flex flex-col items-center justify-center w-full px-2 sm:px-4">
        <div className="relative group/zoom w-full max-w-[480px] xl:max-w-[500px]">
          <div
            className="relative aspect-[3/4] max-h-[580px] bg-muted w-full overflow-hidden border border-border/40 cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setShowZoom(true)}
            onMouseLeave={() => setShowZoom(false)}
          >
            {allImages && allImages.length > 0 && selectedImage < allImages.length ? (
              <>
                <Image
                  src={allImages[selectedImage]}
                  alt={product?.name || 'Product apparel'}
                  fill
                  className="object-cover w-full h-full object-center"
                  priority
                />

                {/* Left / Right Chevron Navigation Arrows (Aarong Style) */}
                {allImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevImage();
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-1.5 text-foreground/70 hover:text-foreground hover:scale-110 transition-all outline-none"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-8 w-8 stroke-[1.2]" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextImage();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1.5 text-foreground/70 hover:text-foreground hover:scale-110 transition-all outline-none"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-8 w-8 stroke-[1.2]" />
                    </button>
                  </>
                )}

                {/* Zoom Lens overlay */}
                {showZoom && (
                  <div
                    className="absolute border border-primary/30 bg-primary/10 shadow-inner pointer-events-none hidden lg:block"
                    style={{
                      width: '150px',
                      height: '150px',
                      left: `${zoomPos.x}px`,
                      top: `${zoomPos.y}px`,
                    }}
                  />
                )}
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground italic">
                No images available
              </div>
            )}
          </div>

          {/* External Zoom Preview window */}
          {showZoom && allImages && allImages.length > 0 && allImages[selectedImage] && (
            <div
              className="absolute left-[105%] top-0 w-full h-full border-2 border-border/80 bg-background shadow-2xl z-50 pointer-events-none overflow-hidden hidden lg:block animate-in fade-in zoom-in-95 duration-200"
            >
              <div
                className="w-full h-full bg-no-repeat"
                style={{
                  backgroundImage: `url(${allImages[selectedImage]})`,
                  backgroundSize: '250%',
                  backgroundPosition: `${zoomPos.percentageX}% ${zoomPos.percentageY}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* Thumbnails list */}
        {allImages && allImages.length > 1 && (
          <div className="flex gap-2.5 overflow-auto pt-3 pb-1 scrollbar-none w-full max-w-[480px] xl:max-w-[500px] justify-center">
            {allImages.map((img: string, i: number) => (
              <button
                key={i}
                type="button"
                className={`relative h-16 w-12 flex-shrink-0 border-2 overflow-hidden transition-all ${selectedImage === i ? 'border-primary shadow-sm' : 'border-border/60 hover:border-primary/50'
                  }`}
                onClick={() => setSelectedImage(i)}
                aria-label={`View product thumbnail image ${i + 1}`}
              >
                <Image
                  src={img}
                  alt={`Product thumbnail ${i + 1}`}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Right Half: Info with px-4 padding ── */}
      <div className="w-full px-4 lg:px-6 xl:px-8 space-y-4">
        {/* Title */}
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-normal text-foreground leading-snug">
            {product?.name}
          </h1>

          {/* Price */}
          <div className="flex items-center gap-2 pt-2">
            {displaySalePrice ? (
              <>
                <span className="text-base sm:text-lg font-medium text-foreground">Tk {Math.round(displaySalePrice).toLocaleString()}</span>
                <span className="text-sm text-muted-foreground line-through font-normal">Tk {Math.round(displayPrice ?? 0).toLocaleString()}</span>
              </>
            ) : (
              <span className="text-base sm:text-lg font-medium text-foreground">Tk {Math.round(displayPrice ?? 0).toLocaleString()}</span>
            )}
          </div>
        </div>

        {/* Variant Selectors (Color / Size) */}
        {hasVariants && (
          <div className="space-y-3 pt-1">
            {uniqueColors.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-foreground">Color: <span className="font-normal text-muted-foreground">{selectedColor}</span></span>
                <div className="flex flex-wrap gap-2">
                  {uniqueColors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`px-3 py-1 text-xs border transition-all ${selectedColor === c
                          ? 'border-primary bg-primary text-primary-foreground font-semibold'
                          : 'border-border hover:border-foreground text-foreground bg-transparent'
                        }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {uniqueSizes.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-foreground">Size</span>
                <select
                  value={selectedSize || ''}
                  onChange={(e) => setSelectedSize(e.target.value || null)}
                  className="w-full h-10 px-3 bg-background border border-border/80 focus:border-foreground outline-none text-xs text-foreground"
                >
                  <option value="" disabled>Select Size</option>
                  {uniqueSizes.map((s) => (
                    <option key={s} value={s} disabled={!availableSizes.includes(s)}>
                      {s} {!availableSizes.includes(s) && '(Out of stock)'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Quantity */}
        <div className="space-y-1.5 pt-1">
          <span className="text-xs font-medium text-foreground block">Quantity</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-border/80 h-10 w-fit">
              <button
                type="button"
                disabled={quantity <= 1}
                onClick={() => setQuantity(q => q - 1)}
                className="h-full px-4 hover:bg-muted text-foreground transition-colors disabled:opacity-30"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-10 text-center text-xs font-medium">{quantity}</span>
              <button
                type="button"
                disabled={quantity >= displayStock}
                onClick={() => setQuantity(q => q + 1)}
                className="h-full px-4 hover:bg-muted text-foreground transition-colors disabled:opacity-30"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            {displayStock <= 0 ? (
              <span className="text-xs font-semibold uppercase text-destructive tracking-wider ml-1">Out of stock</span>
            ) : displayStock <= 5 ? (
              <span className="text-xs text-orange-600 font-medium ml-1">Only {displayStock} left in stock</span>
            ) : null}
          </div>
        </div>

        {/* Accordion / Meta Info section (Aarong Style) */}
        <div className="pt-2 divide-y divide-border/60 border-y border-border/60 text-xs">
          {/* Product Code */}
          {product?.sku && (
            <div className="py-3 flex items-center justify-between text-foreground">
              <span className="font-medium text-foreground">Product Code</span>
              <span className="text-muted-foreground font-mono">{product.sku}</span>
            </div>
          )}

          {/* Product Description Drawer Trigger */}
          <div
            onClick={() => setDescriptionDrawerOpen(true)}
            className="py-3 flex items-center justify-between text-foreground hover:text-primary transition-colors cursor-pointer"
          >
            <span className="font-medium">Product Description</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Reviews Drawer Trigger */}
          <div
            onClick={() => setReviewsDrawerOpen(true)}
            className="py-3 flex items-center justify-between text-foreground hover:text-primary transition-colors cursor-pointer"
          >
            <span className="font-medium">Reviews</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Action buttons section */}
        <div className="space-y-2 pt-1">
          {/* Row 1: ADD TO BAG, Heart, Share */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAddToCart}
              disabled={displayStock <= 0}
              className="flex-1 h-11 bg-foreground hover:bg-foreground/90 text-background rounded-none font-bold text-xs uppercase tracking-[0.2em] shadow-sm transition duration-200 disabled:bg-neutral-400"
            >
              {displayStock <= 0 ? 'OUT OF STOCK' : 'ADD TO BAG'}
            </Button>

            <button
              type="button"
              onClick={handleWishlist}
              className={`h-11 w-11 border border-border/80 flex items-center justify-center transition-colors hover:border-foreground ${isInWishlist ? 'border-primary text-primary bg-primary/5' : 'text-foreground'}`}
              title="Wishlist"
            >
              <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-current' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setIsShareOpen(true)}
              className="h-11 w-11 border border-border/80 hover:border-foreground text-foreground flex items-center justify-center transition-colors"
              title="Share Product"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>

          {/* Row 2: Buy Now and Order via WhatsApp */}
          <div className={`grid gap-2 ${whatsappNumber ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            <Button
              onClick={handleBuyNow}
              disabled={displayStock <= 0}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-none font-bold text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] shadow-sm transition duration-200 disabled:bg-neutral-400"
            >
              BUY NOW
            </Button>

            {whatsappNumber && (
              <Button
                type="button"
                variant="outline"
                onClick={handleWhatsAppOrder}
                className="w-full h-11 rounded-none border-2 border-[#075E54] text-[#075E54] hover:bg-[#075E54] hover:text-white font-bold text-xs uppercase tracking-[0.1em] sm:tracking-[0.15em] flex items-center justify-center gap-2 transition duration-200"
              >
                <svg
                  className="h-4 w-4 fill-current"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.067 2.877 1.215 3.076.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Order via WhatsApp
              </Button>
            )}
          </div>
        </div>

      </div>

      {/* ── Slide-Out Description Specification Drawer ── */}
      <AnimatePresence>
        {descriptionDrawerOpen && (
          <>
            {/* Drawer Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDescriptionDrawerOpen(false)}
              className="fixed inset-0 bg-black z-50 pointer-events-auto"
            />
            {/* Drawer Sidebar Body */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[450px] md:w-[500px] bg-background text-foreground shadow-2xl p-6 md:p-8 overflow-y-auto z-50 flex flex-col gap-6"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="font-black text-sm uppercase tracking-widest text-foreground">PRODUCT DESCRIPTION</h3>
                <button
                  onClick={() => setDescriptionDrawerOpen(false)}
                  className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Rich Description */}
              <div className="text-xs text-muted-foreground leading-relaxed space-y-4">
                <div dangerouslySetInnerHTML={{ __html: generateHtml(product?.description) }} />
              </div>

              {/* Specifications List Table */}
              <div className="space-y-4 pt-4 border-t border-border/60">
                <h4 className="font-black text-xs uppercase tracking-wider text-foreground">Specifications</h4>
                <div className="border border-border/80 divide-y divide-border/60 text-xs rounded-none overflow-hidden">
                  {displayAttributes.map((attr: any, idx: number) => (
                    <div
                      key={attr.key || idx}
                      className={`grid grid-cols-5 p-3 ${idx % 2 === 0 ? 'bg-muted/15' : 'bg-transparent'}`}
                    >
                      <span className="col-span-2 font-bold text-foreground/80 uppercase tracking-wide text-[10px]">{attr.key}</span>
                      <span className="col-span-3 text-muted-foreground">{attr.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Product Reviews Drawer */}
      <AnimatePresence>
        {reviewsDrawerOpen && (
          <>
            {/* Drawer Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setReviewsDrawerOpen(false)}
              className="fixed inset-0 bg-black z-50 pointer-events-auto"
            />
            {/* Drawer Sidebar Body */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] md:w-[540px] bg-background text-foreground shadow-2xl p-6 md:p-8 overflow-y-auto z-50 flex flex-col gap-6"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="font-black text-sm uppercase tracking-widest text-foreground">CUSTOMER REVIEWS</h3>
                <button
                  onClick={() => setReviewsDrawerOpen(false)}
                  className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Reviews Content */}
              <div className="pt-2">
                <ReviewsSection productId={product._id} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ShareDialog
        isOpen={isShareOpen}
        onOpenChange={setIsShareOpen}
        title={product?.name || ''}
      />
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Minus,
  Plus,
  Share2,
  Loader2,
} from 'lucide-react';
import { resellerFbEvent, resellerTtEvent } from '@/lib/reseller-pixel';
import { generateHtml } from '@/lib/server-html';
import { RatingStars } from '@/components/ui/rating-stars';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Suspense } from 'react';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CURRENCY_SYMBOL = '৳';

interface ResellerProductDetailsClientProps {
  product: any;
  subdomain: string;
  deliveryInside: number;
  deliveryOutside: number;
  metaPixelId?: string;
}

export default function ResellerProductDetailsClient({
  product,
  subdomain,
  deliveryInside,
  deliveryOutside,
  metaPixelId,
}: ResellerProductDetailsClientProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0, percentageX: 0, percentageY: 0 });
  const [showZoom, setShowZoom] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('description');
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const uniqueColors = useMemo(() =>
    Array.from(new Set((product.variants || []).map((v: any) => v.color))).filter(Boolean) as string[],
    [product.variants]
  );

  const uniqueSizes = useMemo(() =>
    Array.from(new Set((product.variants || []).map((v: any) => v.size))).filter(Boolean) as string[],
    [product.variants]
  );

  const availableSizes = useMemo(() =>
    (product.variants || [])
      .filter((v: any) => (!selectedColor || v.color === selectedColor) && (v.stock || 0) > 0)
      .map((v: any) => v.size)
      .filter(Boolean) as string[],
    [product.variants, selectedColor]
  );

  const activeVariant = useMemo(() =>
    (product.variants || []).find(
      (v: any) =>
        String(v.color || '').trim() === String(selectedColor || '').trim() &&
        String(v.size || '').trim() === String(selectedSize || '').trim()
    ),
    [product.variants, selectedColor, selectedSize]
  );

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
    return product.images || [];
  }, [product.images, activeVariant]);

  useEffect(() => {
    setSelectedImage(0);
  }, [activeVariant]);

  useEffect(() => {
    if (!product) return;
    const initialColor = uniqueColors[0] || null;
    setSelectedColor(initialColor);
    const initialSizes = (product.variants || [])
      .filter((v: any) => !initialColor || v.color === initialColor)
      .map((v: any) => v.size)
      .filter(Boolean);
    setSelectedSize(initialSizes[0] || null);
    setSelectedImage(0);
    setQuantity(1);

    // Track ViewContent
    const viewContentPayload = {
      content_name: product.name,
      content_category: product.categories?.[0]?.name || 'Uncategorized',
      content_ids: [product._id],
      content_type: 'product',
      value: product.retailPrice ?? product.price ?? 0,
      currency: 'BDT'
    };
    resellerFbEvent(subdomain, 'ViewContent', viewContentPayload, {}, undefined, metaPixelId);
    resellerTtEvent(subdomain, 'ViewContent', viewContentPayload);
  }, [product?._id, uniqueColors, product.variants, subdomain]);

  useEffect(() => {
    if (selectedSize == null || !availableSizes.includes(selectedSize)) {
      setSelectedSize(availableSizes[0] || null);
    }
    const activeImg = activeVariant?.images?.[0] || activeVariant?.image;
    if (activeImg) {
      const variantImgIndex = (allImages || []).findIndex((img: string) => img === activeImg);
      if (variantImgIndex !== -1) {
        setSelectedImage(variantImgIndex);
      }
    }
  }, [selectedColor, selectedSize, availableSizes, activeVariant, allImages]);

  const hasVariants = (uniqueColors.length > 0 || uniqueSizes.length > 0);
  const currentVariant = activeVariant || (product.variants?.[0] ?? null);

  const displayPrice = hasVariants ? (currentVariant?.price ?? product.retailPrice ?? product.price ?? 0) : (product.retailPrice ?? product.price ?? 0);
  const displaySalePrice = hasVariants ? (currentVariant?.salePrice ?? undefined) : undefined;
  const displayStock = hasVariants ? (currentVariant?.stock ?? 0) : (product.stock ?? 0);

  const discount = (displayPrice > 0 && displaySalePrice && displaySalePrice < displayPrice)
    ? Math.max(0, Math.round(((displayPrice - displaySalePrice) / displayPrice) * 100))
    : 0;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const lensWidth = 150;
    const lensHeight = 150;
    let x = e.clientX - left;
    let y = e.clientY - top;
    x = Math.max(lensWidth / 2, Math.min(x, width - lensWidth / 2));
    y = Math.max(lensHeight / 2, Math.min(y, height - lensHeight / 2));
    const percentageX = ((x - lensWidth / 2) / (width - lensWidth)) * 100;
    const percentageY = ((y - lensHeight / 2) / (height - lensHeight)) * 100;
    setZoomPos({ x: x - lensWidth / 2, y: y - lensHeight / 2, percentageX, percentageY });
  };

  const addToResellerCart = (buyNow = false) => {
    if (uniqueColors.length > 0 && !selectedColor) {
      toast.error('দয়া করে একটি রং নির্বাচন করুন');
      return;
    }
    if (uniqueSizes.length > 0 && !selectedSize) {
      toast.error('দয়া করে একটি সাইজ নির্বাচন করুন');
      return;
    }
    const stock = displayStock || 0;
    if (stock <= 0) {
      toast.error('এই পণ্যটি স্টকে নেই');
      return;
    }

    setIsAddingToCart(true);
    try {
      const cartKey = `rscart_${subdomain}`;
      const existing = JSON.parse(localStorage.getItem(cartKey) || '[]');
      const finalQty = Math.min(stock, quantity);

      const existingIdx = existing.findIndex((i: any) =>
        i.resellerProductId === product._id &&
        (i.color || null) === (selectedColor || null) &&
        (i.size || null) === (selectedSize || null)
      );

      const finalPrice = displaySalePrice && displaySalePrice > 0 ? displaySalePrice : displayPrice;
      const cartItem = {
        productId: product.productId || product._id,
        resellerProductId: product._id,
        name: product.name,
        price: finalPrice,
        image: activeVariant?.images?.[0] || activeVariant?.image || product.images?.[0] || '',
        color: selectedColor || undefined,
        size: selectedSize || undefined,
        quantity: finalQty,
      };

      if (existingIdx >= 0) {
        existing[existingIdx].quantity = Math.min(stock, existing[existingIdx].quantity + finalQty);
      } else {
        existing.push(cartItem);
      }

      localStorage.setItem(cartKey, JSON.stringify(existing));
      window.dispatchEvent(new Event('reseller-cart-updated'));

      // Track AddToCart
      const addToCartPayload = {
        content_name: product.name,
        content_category: product.categories?.[0]?.name || 'Uncategorized',
        content_ids: [product._id],
        content_type: 'product',
        value: finalPrice * finalQty,
        currency: 'BDT',
        quantity: finalQty,
      };
      resellerFbEvent(subdomain, 'AddToCart', addToCartPayload, {}, undefined, metaPixelId);
      resellerTtEvent(subdomain, 'AddToCart', addToCartPayload);

      toast.success(`${product.name} added to cart!`);

      if (buyNow) {
        window.location.href = '/checkout';
      }
    } catch {
      toast.error('Failed to add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      {/* Gallery Section */}
      <div className="space-y-4">
        <div className="relative group/zoom">
          <div
            className="relative aspect-square overflow-hidden rounded-xl border bg-white cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setShowZoom(true)}
            onMouseLeave={() => setShowZoom(false)}
          >
            {allImages && allImages.length > 0 && selectedImage < allImages.length ? (
              <>
                <Image
                  src={allImages[selectedImage]}
                  alt={product.name}
                  width={400}
                  height={400}
                  priority
                  loading="eager"
                  fetchPriority="high"
                  sizes="(max-width: 768px) 100vw, 400px"
                  className="h-full w-full object-contain p-4"
                />
                {showZoom && (
                  <div
                    className="absolute border border-primary/30 bg-primary/10 shadow-inner pointer-events-none hidden lg:block"
                    style={{ width: '150px', height: '150px', left: `${zoomPos.x}px`, top: `${zoomPos.y}px` }}
                  />
                )}
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground italic">
                No images available
              </div>
            )}

            {discount > 0 && (
              <div className="absolute top-4 left-4">
                <Badge variant="destructive" className="font-bold text-sm px-3 h-8 shadow-lg">-{discount}% OFF</Badge>
              </div>
            )}
          </div>

          {/* Zoom Preview */}
          {showZoom && allImages && allImages.length > 0 && allImages[selectedImage] && (
            <div className="absolute left-full ml-10 top-0 w-[120%] h-full border-2 border-primary/20 rounded-2xl bg-white shadow-2xl z-50 pointer-events-none overflow-hidden hidden lg:block animate-in fade-in zoom-in-95 duration-200">
              <div
                className="w-full h-full bg-no-repeat"
                style={{
                  backgroundImage: `url(${allImages[selectedImage]})`,
                  backgroundSize: '300%',
                  backgroundPosition: `${zoomPos.percentageX}% ${zoomPos.percentageY}%`,
                }}
              />
              <div className="absolute top-4 left-4">
                <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm shadow-sm font-bold uppercase tracking-tight text-[8px]">
                  Micro-Zoom 3.0x
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Thumbnails */}
        <div className="flex gap-4 overflow-auto pb-2 scrollbar-none">
          {allImages?.map((img: string, i: number) => (
            <button
              key={i}
              className={`relative h-20 w-20 flex-shrink-0 rounded-md border-2 overflow-hidden transition-all ${selectedImage === i ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-muted hover:border-primary/50'}`}
              onClick={() => setSelectedImage(i)}
              aria-label={`View product thumbnail image ${i + 1}`}
            >
              <Image src={img} alt="" width={80} height={80} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Product Info */}
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight">{product.name}</h1>
          <div className="flex items-center gap-4 py-2">
            <div className="flex items-center gap-1">
              <RatingStars rating={product.ratings || 0} />
              <span className="text-sm font-bold ml-1">{(product.ratings || 0).toFixed(1)}</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{product.numReviews || 0}</span>
              <span>Reviews</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: product.name, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('লিংক কপি হয়েছে!');
                }
              }}
              className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* Price */}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-4">
            <span className="text-3xl font-extrabold text-primary">
              {CURRENCY_SYMBOL}{Math.round(displaySalePrice || displayPrice)}
            </span>
            {displaySalePrice && displaySalePrice !== displayPrice && (
              <span className="text-xl text-muted-foreground line-through font-medium">
                {CURRENCY_SYMBOL}{Math.round(displayPrice)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${displayStock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {displayStock > 0 ? `In Stock (${displayStock})` : 'Out of Stock'}
            </span>
          </div>
        </div>

        <Separator />

        {/* Variant Selection */}
        <div className="space-y-6">
          {uniqueColors.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase tracking-wider">Color:</span>
                <span className="text-sm text-primary font-medium">{selectedColor}</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {uniqueColors.map((color) => {
                  const isOutOfStock = product.variants
                    ?.filter((v: any) => v.color === color)
                    .every((v: any) => (v.stock || 0) <= 0);
                  const variantWithImage = product.variants?.find(
                    (v: any) => v.color === color && (v.image || (v.images && v.images.length > 0))
                  );
                  const imageUrl = variantWithImage?.images?.[0] || variantWithImage?.image;

                  return (
                    <button
                      key={color}
                      disabled={isOutOfStock}
                      onClick={() => setSelectedColor(color)}
                      title={color}
                      className={`relative rounded-lg overflow-hidden transition-all duration-200 border-2 ${
                        selectedColor === color
                          ? 'border-primary ring-2 ring-primary/20 scale-105 shadow-md'
                          : isOutOfStock
                            ? 'border-dashed border-muted bg-muted/20 opacity-40 cursor-not-allowed'
                            : 'border-muted hover:border-primary/50'
                      } ${imageUrl ? 'p-0.5 w-14 h-14' : 'px-4 py-2 text-xs font-bold'}`}
                    >
                      {imageUrl ? (
                        <div className="relative w-full h-full rounded-md overflow-hidden bg-white">
                          <Image src={imageUrl} alt={color} fill sizes="56px" className="object-contain p-0.5" />
                          {isOutOfStock && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <span className="text-[8px] font-black uppercase text-white tracking-tighter">Out</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          {color}
                          {isOutOfStock && <span className="block text-[8px] mt-0.5 opacity-50">Sold Out</span>}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {uniqueSizes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase tracking-wider">Size:</span>
                <span className="text-sm text-primary font-medium">{selectedSize || 'Select Size'}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {uniqueSizes.map((sizeName, i) => {
                  const isAvailable = availableSizes.includes(sizeName);
                  return (
                    <button
                      key={i}
                      disabled={!isAvailable}
                      onClick={() => setSelectedSize(sizeName)}
                      className={`min-w-[48px] h-12 flex flex-col items-center justify-center rounded-xl border-2 font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100 disabled:cursor-not-allowed ${
                        selectedSize === sizeName
                          ? 'border-primary bg-primary/5 ring-4 ring-primary/10 text-primary'
                          : isAvailable
                            ? 'border-muted hover:border-primary/30 text-muted-foreground'
                            : 'border-muted/50 border-dashed text-muted-foreground/30'
                      }`}
                    >
                      <span className="text-sm">{sizeName}</span>
                      {!isAvailable && <span className="text-[8px] font-black uppercase text-destructive mt-[-2px]">Out</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Attributes */}
          {product.attributes && product.attributes.length > 0 && (
            <div className="space-y-3 pt-2">
              {product.attributes?.map((attr: any, i: number) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-xs font-bold min-w-[80px] uppercase tracking-wider text-muted-foreground">{attr.key}:</span>
                  <span className="text-xs font-medium">{attr.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 py-8 sm:py-6 border-t">
          <div className="flex items-center gap-4">
            <div className="flex items-center border rounded-full overflow-hidden h-12 bg-muted/50">
              <Button
                variant="ghost"
                size="icon"
                className="h-full rounded-none px-4 hover:bg-muted"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-bold">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-full rounded-none px-4 hover:bg-muted"
                onClick={() => setQuantity(Math.min(displayStock || 0, quantity + 1))}
                disabled={quantity >= (displayStock || 0)}
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              size="lg"
              variant="outline"
              className="h-14 rounded-full font-black text-[10px] sm:text-sm uppercase tracking-[0.1em] sm:tracking-[0.2em] border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all hover:scale-[1.02] active:scale-95"
              onClick={() => addToResellerCart(false)}
              disabled={(displayStock || 0) === 0 || isAddingToCart}
            >
              {isAddingToCart ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-5 w-5 hidden sm:block" />}
              Add to Cart
            </Button>
            <Button
              size="lg"
              className="h-14 rounded-full font-black text-[10px] sm:text-sm uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-primary/25"
              onClick={() => addToResellerCart(true)}
              disabled={(displayStock || 0) === 0 || isAddingToCart}
            >
              Buy Now
            </Button>
          </div>

          {/* Delivery Info */}
          <div className="rounded-xl border bg-muted/30 p-4 space-y-1.5 text-sm mt-2">
            <p className="font-semibold flex items-center gap-2">🚚 Delivery Charge</p>
            <p>Inside Dhaka: <strong className="text-primary">{CURRENCY_SYMBOL}{deliveryInside}</strong></p>
            <p>Outside Dhaka: <strong className="text-primary">{CURRENCY_SYMBOL}{deliveryOutside}</strong></p>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="col-span-full mt-10 md:mt-16">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 mb-6 md:mb-8 h-auto">
            <TabsTrigger
              value="description"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 md:px-6 py-3 md:py-4 font-bold uppercase tracking-wider text-xs md:text-sm text-muted-foreground data-[state=active]:text-foreground"
            >
              Description
            </TabsTrigger>
            <TabsTrigger
              value="delivery"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 md:px-6 py-3 md:py-4 font-bold uppercase tracking-wider text-xs md:text-sm text-muted-foreground data-[state=active]:text-foreground"
            >
              Delivery
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="animate-in fade-in-50 duration-500">
            {product.description ? (
              <div
                className="ProseMirror !p-0 max-w-none text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: generateHtml(product.description) }}
              />
            ) : (
              <p className="text-muted-foreground text-sm">No description added.</p>
            )}
          </TabsContent>

          <TabsContent value="delivery" className="animate-in fade-in-50 duration-500">
            <div className="max-w-md space-y-4 text-sm">
              <div className="rounded-xl border p-4 space-y-3">
                <h3 className="font-bold text-base">📦 Delivery Information</h3>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Inside Dhaka</span>
                  <span className="font-bold text-primary">{CURRENCY_SYMBOL}{deliveryInside}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Outside Dhaka</span>
                  <span className="font-bold text-primary">{CURRENCY_SYMBOL}{deliveryOutside}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Delivery usually takes 2-5 working days.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

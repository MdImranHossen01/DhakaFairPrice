'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addToCart } from '@/store/slices/cartSlice';
import { toast } from 'sonner';
import { validateAndAddToCart } from '@/lib/cart-seller';
import Image from 'next/image';

interface QuickAddModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickAddModal({ product, isOpen, onClose }: QuickAddModalProps) {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.items);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  // Derive available options from variants
  const uniqueColors = useMemo(() =>
    Array.from(new Set((product.variants || []).map((v: any) => v.color))).filter(Boolean) as string[],
    [product.variants]
  );

  const uniqueSizes = useMemo(() =>
    Array.from(new Set((product.variants || []).map((v: any) => v.size))).filter(Boolean) as string[],
    [product.variants]
  );

  const prevIsOpenRef = useRef(false);

  const availableSizes = useMemo(() =>
    (product.variants || [])
      .filter((v: any) => !selectedColor || String(v.color || '').trim().toLowerCase() === String(selectedColor).trim().toLowerCase())
      .map((v: any) => v.size)
      .filter(Boolean) as string[],
    [product.variants, selectedColor]
  );

  const activeVariant = useMemo(() =>
    (product.variants || []).find(
      (v: any) =>
        String(v.color || '').trim().toLowerCase() === String(selectedColor || '').trim().toLowerCase() &&
        String(v.size || '').trim().toLowerCase() === String(selectedSize || '').trim().toLowerCase()
    ),
    [product.variants, selectedColor, selectedSize]
  );

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      const defaultVar = product.variants && product.variants.length > 0 ? product.variants[0] : null;
      const initialColor = defaultVar?.color || uniqueColors[0] || null;
      setSelectedColor(initialColor);

      const initialSizes = (product.variants || [])
        .filter((v: any) => !initialColor || String(v.color || '').trim().toLowerCase() === String(initialColor).trim().toLowerCase())
        .map((v: any) => v.size)
        .filter(Boolean);
      const initialSize = defaultVar?.size || initialSizes[0] || null;
      setSelectedSize(initialSize);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, product._id]);

  useEffect(() => {
    if (selectedSize && availableSizes.length > 0) {
      const match = availableSizes.some(s => String(s).trim().toLowerCase() === String(selectedSize).trim().toLowerCase());
      if (!match) {
        setSelectedSize(availableSizes[0] || null);
      }
    }
  }, [selectedColor, availableSizes]);

  const hasVariants = Boolean(product.variants && product.variants.length > 0);
  const displayPrice = Number(activeVariant?.price || product.price || 0);
  const rawActiveSale = activeVariant?.salePrice !== undefined && activeVariant?.salePrice !== null ? Number(activeVariant.salePrice) : undefined;
  const rawProdSale = product.salePrice !== undefined && product.salePrice !== null ? Number(product.salePrice) : undefined;
  const effectiveSale = hasVariants
    ? (rawActiveSale !== undefined && rawActiveSale > 0 && rawActiveSale < displayPrice ? rawActiveSale : undefined)
    : (rawProdSale !== undefined && rawProdSale > 0 && rawProdSale < displayPrice ? rawProdSale : undefined);
  const hasDiscount = effectiveSale !== undefined;
  const finalPrice = hasDiscount ? effectiveSale! : displayPrice;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (uniqueColors.length > 0 && !selectedColor) {
      toast.error('Please select a color');
      return;
    }
    if (uniqueSizes.length > 0 && !selectedSize) {
      toast.error('Please select a size');
      return;
    }

    const itemToAdd = {
      productId: (product as any).productId || product._id,
      resellerProductId: (product as any).productId ? product._id : undefined,
      name: product.name,
      price: finalPrice,
      basePrice: displayPrice,
      quantity: 1,
      image: activeVariant?.image || product.images?.[0],
      color: selectedColor || undefined,
      size: selectedSize || undefined,
      uploadedBy: product.uploadedBy ? String(product.uploadedBy) : null,
    };

    await validateAndAddToCart({
      cartItems,
      newItem: itemToAdd,
      dispatch,
      onSuccess: () => {
        toast.success(`${product.name} added to cart`);
        onClose();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="text-xl">Select Options</DialogTitle>
          <DialogDescription>
            Choose your preferred options before adding to cart.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-4 py-4 border-b">
          <div className="h-16 w-16 overflow-hidden rounded-md border flex-shrink-0">
            <Image 
              src={activeVariant?.image || product.images?.[0] || '/placeholder.jpg'} 
              alt={product.name} 
              width={64}
              height={64}
              className="h-full w-full object-cover" 
            />
          </div>
          <div className="flex flex-col justify-center">
            <h4 className="font-semibold line-clamp-1">{product.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-bold text-primary">
                ৳{Math.round(finalPrice)}
              </span>
              {hasDiscount && (
                <span className="text-xs line-through text-muted-foreground">
                  ৳{Math.round(displayPrice)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 py-4">
          {/* Colors Selection */}
          {uniqueColors.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Color: <span className="text-foreground">{selectedColor}</span></span>
              <div className="flex flex-wrap gap-2">
                {uniqueColors.map((colorName, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.preventDefault(); setSelectedColor(colorName); }}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-all ${
                      selectedColor === colorName
                        ? 'border-primary bg-primary/10 text-primary font-bold'
                        : 'hover:border-primary/50'
                    }`}
                  >
                    {colorName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sizes Selection */}
          {uniqueSizes.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Size: <span className="text-foreground">{selectedSize || 'Select...'}</span></span>
              <div className="flex flex-wrap gap-2">
                {uniqueSizes.map((sizeName, i) => {
                  const isAvailable = availableSizes.includes(sizeName);
                  return (
                    <button
                      key={i}
                      disabled={!isAvailable}
                      onClick={(e) => { e.preventDefault(); setSelectedSize(sizeName); }}
                      className={`min-w-[40px] px-2 py-1.5 text-sm rounded-md border transition-all ${
                        selectedSize === sizeName
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : !isAvailable 
                            ? 'opacity-40 grayscale cursor-not-allowed bg-muted'
                            : 'hover:border-primary/50'
                      }`}
                    >
                      {sizeName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        <div className="pt-2">
          <Button 
            className="w-full font-bold uppercase tracking-wider" 
            onClick={handleAddToCart}
            disabled={(activeVariant?.stock ?? product.stock) === 0}
          >
            <ShoppingCart className="mr-2 h-4 w-4" /> 
            {(activeVariant?.stock ?? product.stock) === 0 ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


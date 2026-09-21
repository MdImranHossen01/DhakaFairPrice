'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, ShoppingCart, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Variant {
  _id?: string;
  color?: string;
  size?: string;
  price: number;
  salePrice?: number;
  purchasePrice?: number;
  stock: number;
  sku?: string;
  image?: string;
  images?: string[];
}

interface Props {
  productId: string;
  resellerProductId: string;
  name: string;
  price: number;
  image: string;
  stock: number;
  subdomain: string;
  variants?: Variant[];
}

export function ResellerAddToCart({
  productId,
  resellerProductId,
  name,
  price,
  image,
  stock,
  subdomain,
  variants = [],
}: Props) {
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const hasVariants = variants && variants.length > 0;
  const uniqueColors = hasVariants
    ? (Array.from(new Set(variants.map((v) => v.color).filter(Boolean))) as string[])
    : [];
  const uniqueSizes = hasVariants
    ? (Array.from(new Set(variants.map((v) => v.size).filter(Boolean))) as string[])
    : [];

  const getVariantKey = (v: Variant, idx: number) =>
    v._id || `${v.color || ''}_${v.size || ''}_${idx}`;

  const updateQuantity = (key: string, val: number, maxStock: number) => {
    setQuantities((prev) => ({
      ...prev,
      [key]: Math.max(0, Math.min(maxStock, val)),
    }));
  };

  const addBulkToCart = async (buyNow = false) => {
    setLoading(true);
    try {
      const cartKey = `rscart_${subdomain}`;
      const existing = JSON.parse(localStorage.getItem(cartKey) || '[]');
      
      let addedAny = false;
      
      variants.forEach((v, idx) => {
        const key = getVariantKey(v, idx);
        const qtyVal = quantities[key] || 0;
        if (qtyVal > 0) {
          addedAny = true;
          const existingIdx = existing.findIndex((i: any) => 
            i.resellerProductId === resellerProductId && 
            i.color === v.color && 
            i.size === v.size
          );
          
          if (existingIdx >= 0) {
            existing[existingIdx].quantity = Math.min(v.stock, existing[existingIdx].quantity + qtyVal);
          } else {
            existing.push({
              productId,
              resellerProductId,
              name,
              price: price, // Reseller selling price
              image: v.image || image, // Variant image or product image
              color: v.color,
              size: v.size,
              quantity: Math.min(v.stock, qtyVal),
            });
          }
        }
      });
      
      if (!addedAny) {
        toast.error('দয়া করে অন্তত একটি ভেরিয়েন্টের পরিমাণ নির্বাচন করুন');
        setLoading(false);
        return;
      }
      
      localStorage.setItem(cartKey, JSON.stringify(existing));
      window.dispatchEvent(new Event('reseller-cart-updated'));
      toast.success('নির্বাচিত পণ্যসমূহ কার্টে যোগ করা হয়েছে!');
      
      if (buyNow) {
        window.location.href = '/checkout';
      } else {
        setQuantities({});
      }
    } catch {
      toast.error('কার্টে যোগ করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (buyNow = false) => {
    setLoading(true);
    try {
      const cartKey = `rscart_${subdomain}`;
      const existing = JSON.parse(localStorage.getItem(cartKey) || '[]');
      const idx = existing.findIndex((i: any) => i.resellerProductId === resellerProductId && !i.color && !i.size);
      if (idx >= 0) {
        existing[idx].quantity = Math.min(stock, existing[idx].quantity + qty);
      } else {
        existing.push({ productId, resellerProductId, name, price, image, quantity: Math.min(stock, qty) });
      }
      localStorage.setItem(cartKey, JSON.stringify(existing));
      window.dispatchEvent(new Event('reseller-cart-updated'));
      toast.success(`${name} কার্টে যোগ হয়েছে!`);
      if (buyNow) {
        window.location.href = '/checkout';
      }
    } catch {
      toast.error('কার্টে যোগ করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  // If variants exist, render the B2B bulk grid/table UI
  if (hasVariants) {
    const totalQty = Object.values(quantities).reduce((a, b) => a + b, 0);
    const totalAmount = totalQty * price;
    const hasColors = uniqueColors.length > 0;
    const hasSizes = uniqueSizes.length > 0;

    return (
      <div className="space-y-6">
        <div className="bg-muted/10 p-3 rounded-xl border border-dashed flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">B2B Bulk Order Mode (Grid)</span>
          <span className="text-xs font-bold text-primary">৳{price} / Unit</span>
        </div>

        {/* 1. Both Color and Size exist (2D Grid) */}
        {hasColors && hasSizes && (
          <div className="hidden md:block overflow-hidden rounded-2xl border bg-background shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="p-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted/20">Color / Size</th>
                    {uniqueSizes.map((size) => (
                      <th
                        key={size}
                        className="p-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center"
                      >
                        {size}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uniqueColors.map((color) => (
                    <tr key={color} className="border-b last:border-0 hover:bg-muted/5 transition-colors">
                      <td className="p-3.5 font-bold text-sm bg-muted/5">{color}</td>
                      {uniqueSizes.map((size) => {
                        const variant = variants.find((v) => v.color === color && v.size === size);
                        if (!variant) {
                          return <td key={size} className="p-3.5 text-center text-muted-foreground/30">-</td>;
                        }
                        const variantIdx = variants.indexOf(variant);
                        const key = getVariantKey(variant, variantIdx);
                        const qtyVal = quantities[key] || 0;
                        const isOutOfStock = variant.stock === 0;

                        return (
                          <td key={size} className="p-3.5">
                            <div className="flex flex-col items-center gap-1.5">
                              {isOutOfStock ? (
                                <span className="text-[10px] text-destructive font-black uppercase tracking-wider bg-destructive/10 px-2 py-0.5 rounded">
                                  Out
                                </span>
                              ) : (
                                <>
                                  <div className="flex items-center border rounded-lg overflow-hidden h-8 bg-background shadow-sm">
                                    <button
                                      type="button"
                                      onClick={() => updateQuantity(key, qtyVal - 1, variant.stock)}
                                      className="px-2 hover:bg-muted transition-colors font-bold text-sm h-full border-r"
                                    >
                                      −
                                    </button>
                                    <input
                                      type="number"
                                      value={qtyVal || ''}
                                      placeholder="0"
                                      onChange={(e) =>
                                        updateQuantity(
                                          key,
                                          parseInt(e.target.value, 10) || 0,
                                          variant.stock
                                        )
                                      }
                                      className="w-10 text-center font-bold text-xs h-full focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateQuantity(key, qtyVal + 1, variant.stock)}
                                      className="px-2 hover:bg-muted transition-colors font-bold text-sm h-full border-l"
                                    >
                                      +
                                    </button>
                                  </div>
                                  <span className="text-[9px] text-muted-foreground font-medium">Stock: {variant.stock}</span>
                                </>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. Only Color or Only Size exists (1D Table) */}
        {(!hasColors || !hasSizes) && (
          <div className="hidden md:block overflow-hidden rounded-2xl border bg-background shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="p-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {hasColors ? 'Color' : 'Size'}
                  </th>
                  <th className="p-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Stock</th>
                  <th className="p-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant, idx) => {
                  const key = getVariantKey(variant, idx);
                  const qtyVal = quantities[key] || 0;
                  const isOutOfStock = variant.stock === 0;

                  return (
                    <tr key={key} className="border-b last:border-0 hover:bg-muted/5 transition-colors">
                      <td className="p-3.5 font-bold text-sm">{variant.color || variant.size}</td>
                      <td className="p-3.5 text-sm text-center text-muted-foreground font-medium">
                        {isOutOfStock ? (
                          <span className="text-xs text-destructive font-black uppercase tracking-wider bg-destructive/10 px-2 py-0.5 rounded">
                            Out of stock
                          </span>
                        ) : (
                          `${variant.stock} units`
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="flex justify-center">
                          {!isOutOfStock && (
                            <div className="flex items-center border rounded-lg overflow-hidden h-8 bg-background shadow-sm">
                              <button
                                type="button"
                                onClick={() => updateQuantity(key, qtyVal - 1, variant.stock)}
                                className="px-2 hover:bg-muted transition-colors font-bold text-sm h-full border-r"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                value={qtyVal || ''}
                                placeholder="0"
                                onChange={(e) =>
                                  updateQuantity(
                                    key,
                                    parseInt(e.target.value, 10) || 0,
                                    variant.stock
                                  )
                                }
                                className="w-12 text-center font-bold text-xs h-full focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                onClick={() => updateQuantity(key, qtyVal + 1, variant.stock)}
                                className="px-2 hover:bg-muted transition-colors font-bold text-sm h-full border-l"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. Mobile Card List representation */}
        <div className="block md:hidden space-y-2.5">
          {variants.map((variant, idx) => {
            const key = getVariantKey(variant, idx);
            const qtyVal = quantities[key] || 0;
            const isOutOfStock = variant.stock === 0;
            const labelText = [variant.color, variant.size].filter(Boolean).join(' / ');

            return (
              <div key={key} className="rounded-xl border p-3.5 bg-background shadow-sm hover:border-primary/25 transition-all">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-sm text-foreground">{labelText}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Stock: {variant.stock} units</p>
                  </div>
                  <div>
                    {isOutOfStock ? (
                      <span className="text-[10px] text-destructive font-bold uppercase tracking-wider bg-destructive/10 px-2.5 py-1 rounded-full">
                        Out of stock
                      </span>
                    ) : (
                      <div className="flex items-center border rounded-lg overflow-hidden h-8 bg-background shadow-sm">
                        <button
                          type="button"
                          onClick={() => updateQuantity(key, qtyVal - 1, variant.stock)}
                          className="px-2.5 hover:bg-muted transition-colors font-bold text-sm h-full border-r"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={qtyVal || ''}
                          placeholder="0"
                          onChange={(e) =>
                            updateQuantity(
                              key,
                              parseInt(e.target.value, 10) || 0,
                              variant.stock
                            )
                          }
                          className="w-10 text-center font-bold text-xs h-full focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateQuantity(key, qtyVal + 1, variant.stock)}
                          className="px-2.5 hover:bg-muted transition-colors font-bold text-sm h-full border-l"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. Real-time Selection Summary & Actions */}
        {totalQty > 0 && (
          <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Selected Total:</p>
              <p className="text-xl font-black text-foreground mt-0.5">
                {totalQty} Units <span className="text-sm font-normal text-muted-foreground ml-1.5">(Total: ৳{totalAmount.toLocaleString()})</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:w-auto w-full">
              <Button
                variant="outline"
                size="lg"
                onClick={() => addBulkToCart(false)}
                disabled={loading}
                className="font-bold rounded-xl h-11"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
                Add to Cart
              </Button>
              <Button
                size="lg"
                onClick={() => addBulkToCart(true)}
                disabled={loading}
                className="font-bold rounded-xl h-11"
              >
                <Zap className="h-4 w-4 mr-2" />
                Buy Now
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback representation for single-variant / simple products
  if (stock === 0) {
    return (
      <Button disabled size="lg" className="w-full">
        স্টক শেষ
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      {/* Quantity selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">পরিমাণ:</span>
        <div className="flex items-center border rounded-lg overflow-hidden">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="px-3 py-2 hover:bg-muted transition-colors text-lg font-bold"
          >
            −
          </button>
          <span className="px-4 py-2 font-semibold border-x">{qty}</span>
          <button
            onClick={() => setQty((q) => Math.min(stock, q + 1))}
            className="px-3 py-2 hover:bg-muted transition-colors text-lg font-bold"
          >
            +
          </button>
        </div>
        <span className="text-xs text-muted-foreground">(স্টক: {stock})</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={() => addToCart(false)}
          disabled={loading}
          className="w-full"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
          কার্টে যোগ
        </Button>
        <Button
          size="lg"
          onClick={() => addToCart(true)}
          disabled={loading}
          className="w-full"
        >
          <Zap className="h-4 w-4 mr-2" />
          এখনই কিনুন
        </Button>
      </div>
    </div>
  );
}

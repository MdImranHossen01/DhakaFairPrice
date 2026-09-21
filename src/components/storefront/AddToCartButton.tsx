'use client';

import { useCart } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

interface AddToCartButtonProps {
  product: any;
  className?: string;
}

export function AddToCartButton({ product, className }: AddToCartButtonProps) {
  const { addItem } = useCart();

  const handleAddToCart = () => {
    const res = addItem({
      productId: product._id || product.id,
      name: product.name,
      price: product.salePrice ?? product.price,
      quantity: 1,
      image: product.images?.[0],
      uploadedBy: product.uploadedBy || (product.productId?.uploadedBy) || null,
    });
    if (res.success) {
      toast.success(`${product.name} added to cart`);
    } else {
      toast.error(res.error);
    }
  };

  return (
    <Button 
      onClick={handleAddToCart} 
      className={className}
    >
      <ShoppingCart className="mr-2 h-4 w-4" />
      Add to Cart
    </Button>
  );
}


import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addToCart, removeFromCart, clearCart } from '@/store/slices/cartSlice';

export const useCart = () => {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.cart.items);
  const itemsCount = useAppSelector((state) => state.cart.totalQuantity);
  const totalAmount = useAppSelector((state) => state.cart.totalAmount);

  const addItem = (item: any) => {
    if (items.length > 0) {
      const existingUploader = items[0].uploadedBy || null;
      const newUploader = item.uploadedBy || null;
      if (existingUploader !== newUploader) {
        return { success: false, error: 'You cannot mix products from different suppliers in the same cart. Please clear your cart or checkout your current items first.' };
      }
    }
    dispatch(addToCart(item));
    return { success: true };
  };

  const removeItem = (productId: string, color?: string, size?: string) => {
    dispatch(removeFromCart({ productId, color, size }));
  };

  const clear = () => {
    dispatch(clearCart());
  };

  return {
    items,
    itemsCount,
    totalAmount,
    addItem,
    removeItem,
    clear,
  };
};


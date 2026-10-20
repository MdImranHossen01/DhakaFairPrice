/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addToCart, removeFromCart, clearCart } from '@/store/slices/cartSlice';
import Swal from 'sweetalert2';

export const useCart = () => {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.cart.items);
  const itemsCount = useAppSelector((state) => state.cart.totalQuantity);
  const totalAmount = useAppSelector((state) => state.cart.totalAmount);

  const addItem = async (item: any) => {
    if (items.length > 0) {
      const existingUploader = items[0].uploadedBy ? String(items[0].uploadedBy) : 'mother';
      const newUploader = item.uploadedBy ? String(item.uploadedBy) : 'mother';
      if (existingUploader !== newUploader) {
        const result = await Swal.fire({
          title: 'ভিন্ন শপের পণ্য!',
          text: 'আপনার কার্টে ইতোমধ্যে অন্য একটি শপের পণ্য রয়েছে। প্রতিটি শপের পণ্য আলাদা লোকেশন থেকে পাঠানো হয়, তাই একসাথে অর্ডার করা সম্ভব নয়। আপনি কি আগের কার্ট মুছে শুধুমাত্র এই পণ্যটি যোগ করতে চান?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'হ্যাঁ, কার্ট ক্লিয়ার করে যোগ করুন',
          cancelButtonText: 'না, বাতিল করুন',
          confirmButtonColor: '#f97316',
          cancelButtonColor: '#6b7280',
        });

        if (result.isConfirmed) {
          dispatch(clearCart());
          dispatch(addToCart(item));
          return { success: true };
        }
        return { success: false, error: 'ভিন্ন শপের পণ্য একসাথে কার্টে রাখা যাবে না।' };
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

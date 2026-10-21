import Swal from 'sweetalert2';
import { clearCart, addToCart } from '@/store/slices/cartSlice';
import { toast } from 'sonner';

export interface CartItemInput {
  productId: string;
  name: string;
  price: number;
  basePrice?: number;
  quantity: number;
  image?: string;
  color?: string;
  size?: string;
  uploadedBy?: string | null;
  sellerName?: string;
  [key: string]: any;
}

/**
 * Validates whether a new item can be added to the current cart.
 * If existing items belong to a different seller/uploader, it alerts the user
 * with SweetAlert2 and offers to clear the cart and add the new item.
 */
export async function validateAndAddToCart({
  cartItems,
  newItem,
  dispatch,
  onSuccess,
}: {
  cartItems: any[];
  newItem: CartItemInput;
  dispatch: any;
  onSuccess?: () => void;
}): Promise<boolean> {
  // Prevent duplicate item/variant additions
  const isAlreadyInCart = (cartItems || []).some((item: any) => {
    const isSameProduct = String(item.productId) === String(newItem.productId);
    const itemColor = (item.color || '').trim().toLowerCase();
    const newColor = (newItem.color || '').trim().toLowerCase();
    const itemSize = (item.size || '').trim().toLowerCase();
    const newSize = (newItem.size || '').trim().toLowerCase();

    return isSameProduct && itemColor === newColor && itemSize === newSize;
  });

  if (isAlreadyInCart) {
    toast.info('Already added to cart');
    return false;
  }

  if (cartItems && cartItems.length > 0) {
    const existingSeller = cartItems[0].uploadedBy ? String(cartItems[0].uploadedBy) : 'mother';
    const newSeller = newItem.uploadedBy ? String(newItem.uploadedBy) : 'mother';

    if (existingSeller !== newSeller) {
      const result = await Swal.fire({
        title: 'ভিন্ন শপের পণ্য!',
        text: 'আপনার কার্টে ইতোমধ্যে অন্য একটি শপের পণ্য রয়েছে। প্রতিটি শপের পণ্য ভিন্ন লোকেশন থেকে পাঠানো হয়, তাই একসাথে অর্ডার করা সম্ভব নয়। আপনি কি আগের কার্ট মুছে শুধুমাত্র এই পণ্যটি যোগ করতে চান?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'হ্যাঁ, কার্ট ক্লিয়ার করে যোগ করুন',
        cancelButtonText: 'না, বাতিল করুন',
        confirmButtonColor: '#f97316',
        cancelButtonColor: '#6b7280',
      });

      if (result.isConfirmed) {
        dispatch(clearCart());
        dispatch(addToCart(newItem));
        onSuccess?.();
        return true;
      }
      return false;
    }
  }

  dispatch(addToCart(newItem));
  onSuccess?.();
  return true;
}

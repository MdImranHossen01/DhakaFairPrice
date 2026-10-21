import { Middleware } from '@reduxjs/toolkit';
import { getResellerSubdomain } from '@/lib/cart-key';

export const cartMiddleware: Middleware = (store) => (next) => (action: any) => {
  const result = next(action);

  // Define cart-related action types
  const cartActions = [
    'cart/addToCart',
    'cart/updateQuantity',
    'cart/removeFromCart',
    'cart/clearCart'
  ];

  if (cartActions.includes(action.type)) {
    const cartState = (store.getState() as any).cart;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const sub = getResellerSubdomain();
        if (sub) {
          const cartKey = `rscart_${sub}`;
          const formattedResellerItems = cartState.items.map((item: any) => ({
            productId: item.productId,
            resellerProductId: item.resellerProductId || item.productId,
            name: item.name,
            price: item.price,
            originalPrice: item.basePrice || item.price,
            image: item.image || '',
            quantity: item.quantity,
            color: item.color,
            size: item.size,
            uploadedBy: item.uploadedBy,
            sellerName: item.sellerName,
          }));
          localStorage.setItem(cartKey, JSON.stringify(formattedResellerItems));
          window.dispatchEvent(new Event('reseller-cart-updated'));
        } else {
          localStorage.setItem('cart', JSON.stringify({
            items: cartState.items,
            totalQuantity: cartState.totalQuantity,
            totalAmount: cartState.totalAmount
          }));
        }
      } catch (e) {
        console.error('Failed to save cart to localStorage:', e);
      }
    }
  }

  return result;
};



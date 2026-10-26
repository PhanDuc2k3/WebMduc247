import { createContext, useState, useEffect, useContext, useCallback, type ReactNode } from "react";
import { orderV2Api, type CartLine } from "../api/orderV2Api";

type CartContextType = {
  cart: CartLine[]; cartCount: number; loading: boolean;
  fetchCart: () => Promise<void>;
};
export const CartContext = createContext<CartContextType>({
  cart: [], cartCount: 0, loading: false, fetchCart: async () => {},
});
export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchCart = useCallback(async () => {
    setLoading(true);
    try { setCart((await orderV2Api.cart()).items); }
    catch { setCart([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void fetchCart();
    window.addEventListener("cartV2Changed", fetchCart);
    window.addEventListener("identityUpdated", fetchCart);
    return () => { window.removeEventListener("cartV2Changed", fetchCart); window.removeEventListener("identityUpdated", fetchCart); };
  }, [fetchCart]);
  return <CartContext.Provider value={{
    cart, cartCount: cart.reduce((total, line) => total + line.quantity, 0), loading, fetchCart,
  }}>{children}</CartContext.Provider>;
}
export const useCart = () => useContext(CartContext);

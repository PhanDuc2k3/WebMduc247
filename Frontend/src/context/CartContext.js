import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useState, useEffect, useContext, useCallback } from "react";
import { orderV2Api } from "../api/orderV2Api";
export const CartContext = createContext({
    cart: [], cartCount: 0, loading: false, fetchCart: async () => { },
});
export function CartProvider({ children }) {
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);
    const fetchCart = useCallback(async () => {
        setLoading(true);
        try {
            setCart((await orderV2Api.cart()).items);
        }
        catch {
            setCart([]);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        void fetchCart();
        window.addEventListener("cartV2Changed", fetchCart);
        window.addEventListener("identityUpdated", fetchCart);
        return () => { window.removeEventListener("cartV2Changed", fetchCart); window.removeEventListener("identityUpdated", fetchCart); };
    }, [fetchCart]);
    return _jsx(CartContext.Provider, { value: {
            cart, cartCount: cart.reduce((total, line) => total + line.quantity, 0), loading, fetchCart,
        }, children: children });
}
export const useCart = () => useContext(CartContext);

import React, { createContext, useState, useEffect, useContext, type ReactNode } from "react";
import axiosClient from "../api/axiosClient";
import { getSocket } from "../socket";

interface CartItem {
  productId: string;
  quantity: number;
  variation: { color: string; name: string; additionalPrice?: number };
}

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  addToCart: (item: CartItem) => void;
  fetchCart: () => void;
  loading: boolean;
}

export const CartContext = createContext<CartContextType>({
  cart: [],
  cartCount: 0,
  addToCart: () => {},
  fetchCart: () => {},
  loading: false,
});

interface Props {
  children: ReactNode;
}

export const CartProvider: React.FC<Props> = ({ children }) => {
  const storedCart = localStorage.getItem("cart");
  const initialCart: CartItem[] = storedCart ? JSON.parse(storedCart) : [];

  const [cart, setCart] = useState<CartItem[]>(initialCart);
  const [cartCount, setCartCount] = useState(
    initialCart.reduce((sum, i) => sum + i.quantity, 0)
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);

  // --- Emit cart update via socket (queue if not connected)
  const emitCartUpdate = (uid: string, cartData: CartItem[]) => {
    const socket = getSocket();
    const count = cartData.reduce((sum, i) => sum + i.quantity, 0);
    if (!socket) return;

    if (!socket.connected) {
      socket.once("connect", () => {
        socket.emit("cartUpdated", { userId: uid, cart: cartData, cartCount: count });
      });
      socket.connect();
    } else {
      socket.emit("cartUpdated", { userId: uid, cart: cartData, cartCount: count });
    }
  };

  // --- Add to cart
  const addToCart = (item: CartItem) => {
    let newCart: CartItem[];

    const exist = cart.find((i) => i.productId === item.productId);
    if (exist) {
      newCart = cart.map((i) =>
        i.productId === item.productId
          ? { ...i, quantity: i.quantity + item.quantity }
          : i
      );
    } else {
      newCart = [...cart, item];
    }

    const newCount = newCart.reduce((sum, i) => sum + i.quantity, 0);

    // --- Update state and localStorage
    setCart(newCart);
    setCartCount(newCount);
    localStorage.setItem("cart", JSON.stringify(newCart));

    console.log("[Cart] Added item:", item, "New cart:", newCart, "Count:", newCount);

    // --- Emit socket if logged in
    if (userId) {
      emitCartUpdate(userId, newCart);
    }
  };


  // --- Fetch cart from API
  const fetchCart = async () => {
    // Chỉ fetch nếu đã có userId (đã đăng nhập)
    if (!userId) return; 
    setLoading(true);
    try {
      const res = await axiosClient.get(`/api/cart`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const apiCart: CartItem[] = res.data.items || [];
      const newCount = apiCart.reduce((sum, i) => sum + i.quantity, 0);

      setCart(apiCart);
      setCartCount(newCount);
      localStorage.setItem("cart", JSON.stringify(apiCart));

      // BỔ SUNG QUAN TRỌNG: Phát sự kiện socket sau khi fetch thành công
      // để đồng bộ hóa cart count trên các thiết bị/tab khác.
      emitCartUpdate(userId, apiCart); 

      console.log("[Cart] Fetched from API:", apiCart);
    } catch (err) {
      console.warn("[Cart] Fetch cart failed", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Parse userId from token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const uid = payload.userId || payload.id || payload._id || payload.sub;
      setUserId(uid || null);
    } catch (err) {
      console.warn("[Cart] Token parse error", err);
      setUserId(null);
    }
  }, []);

  // --- Socket connect + join room + listen cartUpdated
  useEffect(() => {
    if (!userId) return;

    const socket = getSocket();

    if (!socket.connected) socket.connect();

    socket.on("connect", () => {
      console.log("[Cart] Socket connected:", socket.id);
      setSocketConnected(true);
      socket.emit("joinUserCart", userId);
    });

    socket.on("disconnect", () => {
      console.log("[Cart] Socket disconnected");
      setSocketConnected(false);
    });

    const handler = (data: { cart: CartItem[]; cartCount: number }) => {
      console.log("[Cart] Received cartUpdated:", data);
      setCart(data.cart);
      setCartCount(data.cartCount);
      localStorage.setItem("cart", JSON.stringify(data.cart));
    };

    socket.on("cartUpdated", handler);

    // Fetch initial cart from API
    fetchCart();

    return () => {
      socket.off("cartUpdated", handler);
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [userId]);

  return (
    <CartContext.Provider value={{ cart, cartCount, addToCart, fetchCart, loading }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
import React, { createContext, useState, useEffect, useContext, type ReactNode } from "react";
import axiosClient from "../api/axiosClient";
import { getSocket } from "../socket";

interface CartItem {
  productId: string;
  quantity: number;
  variation?: { color?: string; size?: string; additionalPrice?: number };
  price?: number; // ✅ Thêm để tính tổng tiền
  salePrice?: number;
}

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  addToCart: (item: CartItem) => void;
  fetchCart: () => void;
  updateQuantityLocal: (id: string, qty: number) => void; // ✅ Thêm để cập nhật số lượng realtime
  loading: boolean;
}

export const CartContext = createContext<CartContextType>({
  cart: [],
  cartCount: 0,
  addToCart: () => {},
  fetchCart: () => {},
  updateQuantityLocal: () => {},
  loading: false,
});

interface Props {
  children: ReactNode;
}

export const CartProvider: React.FC<Props> = ({ children }) => {
  // ✅ Fix lỗi JSON không phải mảng
  const storedCart = localStorage.getItem("cart");
  let parsedCart;
  try {
    parsedCart = JSON.parse(storedCart || "[]");
    if (!Array.isArray(parsedCart)) parsedCart = [];
  } catch {
    parsedCart = [];
  }

  const initialCart: CartItem[] = parsedCart;

  const [cart, setCart] = useState<CartItem[]>(initialCart);
  const [cartCount, setCartCount] = useState(
    Array.isArray(initialCart)
      ? initialCart.reduce((sum, i) => sum + i.quantity, 0)
      : 0
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);

  // --- Emit cart update qua socket
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

    // --- Update state và localStorage
    setCart(newCart);
    setCartCount(newCount);
    localStorage.setItem("cart", JSON.stringify(newCart));

    console.log("[Cart] Added item:", item, "New cart:", newCart, "Count:", newCount);

    // --- Emit socket nếu đã đăng nhập
    if (userId) {
      emitCartUpdate(userId, newCart);
    }
  };

  // --- Cập nhật số lượng local để UI (và OrderSummary) cập nhật ngay lập tức
  const updateQuantityLocal = (itemId: string, newQuantity: number) => {
    setCart((prevCart) => {
      const updatedCart = prevCart.map((item) =>
        item.productId === itemId
          ? { ...item, quantity: newQuantity }
          : item
      );
      const newCount = updatedCart.reduce((sum, i) => sum + i.quantity, 0);
      setCartCount(newCount);
      localStorage.setItem("cart", JSON.stringify(updatedCart));
      return updatedCart;
    });
  };

  // --- Fetch cart từ API
  const fetchCart = async () => {
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

      // 🔄 Đồng bộ socket
      emitCartUpdate(userId, apiCart);

      console.log("[Cart] Fetched from API:", apiCart);
    } catch (err) {
      console.warn("[Cart] Fetch cart failed", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Lấy userId từ token
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

  // --- Kết nối socket + nghe cartUpdated
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
      setCart(data.cart || []);
      setCartCount(data.cartCount || 0);
      localStorage.setItem("cart", JSON.stringify(data.cart || []));
    };

    socket.on("cartUpdated", handler);
    fetchCart();

    return () => {
      socket.off("cartUpdated", handler);
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [userId]);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        addToCart,
        fetchCart,
        updateQuantityLocal, // ✅ thêm
        loading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};

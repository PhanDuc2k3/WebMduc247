import React, { createContext, useState, useEffect, type ReactNode } from "react";
import axiosClient from "../api/axiosClient";
import { io, Socket } from "socket.io-client";
import { useContext } from "react";

interface CartItem {
  productId: string;
  quantity: number;
  variation: { color: string; name: string; additionalPrice?: number };
}

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  fetchCart: () => void;
}

export const CartContext = createContext<CartContextType>({
  cart: [],
  cartCount: 0,
  fetchCart: () => {},
});

interface Props {
  children: ReactNode;
}

let socket: Socket | null = null;

export const CartProvider: React.FC<Props> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchCart = async () => {
    if (!userId) return;
    try {
      const res = await axiosClient.get(`/api/cart/${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setCart(res.data.items);
      setCartCount(res.data.items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0));
      console.log("📦 Cart fetched:", res.data.items);
    } catch (err) {
      console.error("❌ Lỗi fetch cart:", err);
    }
  };

  useEffect(() => {
    // decode JWT để lấy userId
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserId(payload.id); // hoặc payload.user._id tùy backend
      } catch (err) {
        console.warn("⚠️ Không thể decode token:", err);
      }
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    // tạo socket 1 lần
    if (!socket) {
      socket = io("http://localhost:5000"); // URL backend
      socket.on("connect", () => console.log("🔌 User connected:", socket?.id));
      socket.on("disconnect", () => console.log("❌ User disconnected"));
    }

    socket.emit("joinUserCart", userId);
    console.log("📥 Socket joined cart room for userId:", userId);

    socket.on("cartUpdated", (updatedCart: CartItem[]) => {
      console.log("📡 Cart updated received:", updatedCart);
      setCart(updatedCart);
      setCartCount(updatedCart.reduce((sum, item) => sum + item.quantity, 0));
    });

    fetchCart();

    return () => {
      socket?.off("cartUpdated");
    };
  }, [userId]);

  return (
    <CartContext.Provider value={{ cart, cartCount, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
};
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};

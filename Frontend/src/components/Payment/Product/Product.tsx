import React, { useEffect, useState } from "react";

interface CartItem {
  _id: string;
  productId: string;
  storeId: string;
  name: string;
  imageUrl: string;
  price: number;
  salePrice?: number;
  quantity: number;
  variation?: {
    color?: string;
    size?: string;
    additionalPrice?: number;
  };
  subtotal: number;
}

const Product = () => {
  const [items, setItems] = useState<CartItem[]>([]);
  const token = localStorage.getItem("token");

  // 📌 Gọi API lấy giỏ hàng
  useEffect(() => {
    if (!token) {
      console.warn("⚠️ Chưa đăng nhập, không thể lấy giỏ hàng!");
      return;
    }

    const fetchCart = async () => {
      try {
        console.log("👉 Fetch giỏ hàng với token:", token);

        const res = await fetch("http://localhost:5000/api/cart", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`❌ API Error ${res.status}: ${errorText}`);
        }

        const data = await res.json();
        console.log("✅ Cart API response:", data);

        setItems(data.items || []);
      } catch (err) {
        console.error("🔥 Lỗi khi fetch giỏ hàng:", err);
      }
    };

    fetchCart();
  }, [token]);

  return (
    <div className="bg-white p-4 rounded-md shadow-sm border space-y-4">
      <h2 className="text-base font-semibold text-gray-800">
        Sản phẩm đã chọn ({items.length})
      </h2>

      {items.map((item) => (
        <div
          key={item._id}
          className="flex border rounded-md p-4 bg-gray-50"
        >
          <img
            src={
              item.imageUrl.startsWith("http")
                ? item.imageUrl
                : `http://localhost:5000${item.imageUrl}`
            }
            alt={item.name}
            className="w-20 h-20 object-cover rounded-md mr-4"
          />
          <div className="flex-1 space-y-1 text-sm">
            <p className="font-semibold">{item.name}</p>
            <p className="text-gray-500">
              Phân loại:{" "}
              {item.variation
                ? `${item.variation.color || ""} ${item.variation.size || ""}`
                : "Mặc định"}
            </p>
            <div className="flex justify-between items-center mt-2">
              <p className="line-through text-gray-400">
                {item.price.toLocaleString("vi-VN")}₫
              </p>
              <p className="text-red-600 font-bold">
                {(item.salePrice ?? item.price).toLocaleString("vi-VN")}₫
              </p>
              <p>x{item.quantity}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Product;

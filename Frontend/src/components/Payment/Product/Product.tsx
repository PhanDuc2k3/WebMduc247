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

interface ProductProps {
  selectedItems: string[]; // ✅ Nhận từ trang Checkout
}

const Product: React.FC<ProductProps> = ({ selectedItems }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const token = localStorage.getItem("token");

  // 📦 Lấy giỏ hàng từ API
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

  // 📦 Lọc sản phẩm theo danh sách được chọn
  const filteredItems = items.filter((item) => selectedItems.includes(item._id));

  return (
    <div className="bg-white p-4 rounded-md shadow-sm border space-y-4">
      <h2 className="text-base font-semibold text-gray-800">
        Sản phẩm đã chọn ({filteredItems.length})
      </h2>

      {filteredItems.length === 0 ? (
        <p className="text-gray-500">Không có sản phẩm nào được chọn để thanh toán.</p>
      ) : (
        filteredItems.map((item) => (
          <div
            key={item._id}
            className="flex border rounded-md p-4 bg-gray-50"
          >
            {/* Hình ảnh sản phẩm */}
            <img
              src={
                item.imageUrl.startsWith("http")
                  ? item.imageUrl
                  : `http://localhost:5000${item.imageUrl}`
              }
              alt={item.name}
              className="w-20 h-20 object-cover rounded-md mr-4"
            />

            {/* Thông tin sản phẩm */}
            <div className="flex-1 space-y-1 text-sm">
              <p className="font-semibold">{item.name}</p>
              <p className="text-gray-500">
                Phân loại:{" "}
                {item.variation
                  ? `${item.variation.color || ""} ${item.variation.size || ""}`
                  : "Mặc định"}
              </p>

              {/* Giá sản phẩm */}
              <div className="flex justify-between items-center mt-2">
                {item.salePrice ? (
                  <>
                    <p className="line-through text-gray-400">
                      {item.price.toLocaleString("vi-VN")}₫
                    </p>
                    <p className="text-red-600 font-bold">
                      {item.salePrice.toLocaleString("vi-VN")}₫
                    </p>
                  </>
                ) : (
                  <p className="text-red-600 font-bold">
                    {item.price.toLocaleString("vi-VN")}₫
                  </p>
                )}
                <p>x{item.quantity}</p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default Product;

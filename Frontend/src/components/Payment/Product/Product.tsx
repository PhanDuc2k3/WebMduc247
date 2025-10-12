import React, { useEffect, useState } from "react";
import cartApi from "../../../api/cartApi"; // dùng cartApi

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
  selectedItems: string[]; // Nhận từ trang Checkout
}

const Product: React.FC<ProductProps> = ({ selectedItems }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchCart = async () => {
      setLoading(true);
      try {
        const { data } = await cartApi.getCart(); // ✅ dùng cartApi
        setItems(data.items || []);
        console.log("✅ Cart API response:", data);
      } catch (err) {
        console.error("🔥 Lỗi khi fetch giỏ hàng:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, []);

  const filteredItems = items.filter((item) => selectedItems.includes(item._id));

  if (loading) return <p>Đang tải giỏ hàng...</p>;

  return (
    <div className="bg-white p-4 rounded-md shadow-sm border space-y-4">
      <h2 className="text-base font-semibold text-gray-800">
        Sản phẩm đã chọn ({filteredItems.length})
      </h2>

      {filteredItems.length === 0 ? (
        <p className="text-gray-500">Không có sản phẩm nào được chọn để thanh toán.</p>
      ) : (
        filteredItems.map((item) => (
          <div key={item._id} className="flex border rounded-md p-4 bg-gray-50">
<img
  src={item.imageUrl.startsWith("http")
    ? item.imageUrl
    : `${import.meta.env.VITE_API_URL}${item.imageUrl}`}
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

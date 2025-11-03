import React from "react";

interface CartItem {
  _id: string;
  productId: string | { _id: string };
  storeId: string | { _id: string };
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
  selectedItems: CartItem[]; // Nhận mảng sản phẩm từ trang Checkout
}

const Product: React.FC<ProductProps> = ({ selectedItems }) => {
  // Không cần fetch từ API nữa, dùng trực tiếp từ props
  const filteredItems = Array.isArray(selectedItems) ? selectedItems : [];

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-b-2 border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <span>📦</span> Sản phẩm đã chọn ({filteredItems.length})
        </h2>
        <p className="text-gray-600 text-sm mt-1">Xem lại các sản phẩm trong đơn hàng</p>
      </div>
      <div className="p-6 space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border-2 border-gray-200">
            <div className="text-6xl mb-4">🛒</div>
            <p className="text-gray-500 text-lg font-medium mb-2">Chưa có sản phẩm nào</p>
            <p className="text-gray-400 text-sm">Vui lòng chọn sản phẩm từ giỏ hàng</p>
          </div>
        ) : (
          filteredItems.map((item, index) => (
            <div 
              key={item._id} 
              className="flex border-2 border-gray-200 rounded-2xl p-5 bg-gradient-to-br from-white to-gray-50 hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <img
                src={item.imageUrl.startsWith("http")
                  ? item.imageUrl
                  : `${import.meta.env.VITE_API_URL}${item.imageUrl}`}
                alt={item.name}
                className="w-24 h-24 object-cover rounded-xl mr-5 shadow-lg border-2 border-gray-200"
                loading="lazy"
              />
              <div className="flex-1 space-y-2">
                <p className="font-bold text-lg text-gray-900">{item.name}</p>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border-2 border-blue-300">
                    {item.variation
                      ? `${item.variation.color || ""} ${item.variation.size || ""}`
                      : "Mặc định"}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <div className="flex items-center gap-2">
                    {item.salePrice ? (
                      <>
                        <p className="line-through text-gray-400 text-sm">
                          {item.price.toLocaleString("vi-VN")}₫
                        </p>
                        <p className="text-2xl font-bold text-red-600">
                          {item.salePrice.toLocaleString("vi-VN")}₫
                        </p>
                      </>
                    ) : (
                      <p className="text-2xl font-bold text-red-600">
                        {item.price.toLocaleString("vi-VN")}₫
                      </p>
                    )}
                  </div>
                  <span className="px-4 py-2 bg-purple-100 text-purple-700 font-bold rounded-xl border-2 border-purple-300">
                    x{item.quantity}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Product;

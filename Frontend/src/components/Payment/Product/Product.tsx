import React from "react";
import { Package, ShoppingCart } from "lucide-react";

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
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 sm:p-6 border-b-2 border-gray-200">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
          <Package className="w-5 h-5 sm:w-6 sm:h-6" />
          Sản phẩm đã chọn ({filteredItems.length})
        </h2>
        <p className="text-gray-600 text-xs sm:text-sm mt-1">Xem lại các sản phẩm trong đơn hàng</p>
      </div>
      <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 sm:py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl sm:rounded-2xl border-2 border-gray-200">
            <ShoppingCart className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 text-gray-400" />
            <p className="text-gray-500 text-base sm:text-lg font-medium mb-2">Chưa có sản phẩm nào</p>
            <p className="text-gray-400 text-xs sm:text-sm">Vui lòng chọn sản phẩm từ giỏ hàng</p>
          </div>
        ) : (
          filteredItems.map((item, index) => (
            <div 
              key={item._id} 
              className="flex flex-col sm:flex-row border-2 border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-white to-gray-50 hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-fade-in-up gap-3 sm:gap-0"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <img
                src={item.imageUrl.startsWith("http")
                  ? item.imageUrl
                  : `${import.meta.env.VITE_API_URL}${item.imageUrl}`}
                alt={item.name}
                className="w-full sm:w-24 h-48 sm:h-24 object-cover rounded-lg sm:rounded-xl sm:mr-5 shadow-lg border-2 border-gray-200 self-center sm:self-auto"
                loading="lazy"
              />
              <div className="flex-1 space-y-2">
                <p className="font-bold text-base sm:text-lg text-gray-900 break-words">{item.name}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border-2 border-blue-300">
                    {item.variation
                      ? `${item.variation.color || ""} ${item.variation.size || ""}`.trim()
                      : "Mặc định"}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-3 gap-2 sm:gap-0">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Tính giá đơn vị bao gồm additionalPrice */}
                      {(() => {
                        const basePrice = item.salePrice || item.price || 0;
                        const additionalPrice = item.variation?.additionalPrice || 0;
                        const unitPrice = basePrice + additionalPrice;
                        const totalPrice = item.subtotal || (unitPrice * item.quantity);
                        
                        return (
                          <>
                            {item.salePrice ? (
                              <>
                                <p className="line-through text-gray-400 text-xs sm:text-sm">
                                  {(item.price + additionalPrice).toLocaleString("vi-VN")}₫
                                </p>
                                <p className="text-xl sm:text-2xl font-bold text-red-600">
                                  {unitPrice.toLocaleString("vi-VN")}₫
                                </p>
                              </>
                            ) : (
                              <p className="text-xl sm:text-2xl font-bold text-red-600">
                                {unitPrice.toLocaleString("vi-VN")}₫
                              </p>
                            )}
                            {additionalPrice > 0 && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded border border-orange-300">
                                +{additionalPrice.toLocaleString("vi-VN")}₫
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    {/* Hiển thị tổng giá nếu quantity > 1 */}
                    {item.quantity > 1 && (
                      <p className="text-xs sm:text-sm text-gray-600">
                        Tổng: <span className="font-bold text-gray-900">{(item.subtotal || 0).toLocaleString("vi-VN")}₫</span>
                      </p>
                    )}
                  </div>
                  <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-100 text-purple-700 font-bold rounded-lg sm:rounded-xl border-2 border-purple-300 text-sm sm:text-base w-fit">
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

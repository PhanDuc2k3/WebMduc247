// OrderProduct.tsx
import React from "react";
import { Package, ShoppingBag, Palette, Ruler, BarChart } from "lucide-react";

interface Variation {
  color?: string;
  size?: string;
  additionalPrice?: number;
}

interface OrderItem {
  _id: string;
  name: string;
  imageUrl?: string;
  price: number;
  salePrice?: number;
  quantity: number;
  subtotal: number;
  variation?: Variation;
}

interface OrderProductProps {
  items: OrderItem[];
}

const serverHost = "http://localhost:5000";

export default function OrderProduct({ items }: OrderProductProps) {
  if (!items || items.length === 0) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 p-8 sm:p-12 text-center animate-fade-in">
        <Package className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 text-gray-400" />
        <p className="text-gray-500 text-base sm:text-lg font-medium">Không có sản phẩm trong đơn hàng</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up">
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 sm:p-6 border-b-2 border-gray-200">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
          <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
          Sản phẩm đặt hàng ({items.length})
        </h2>
        <p className="text-gray-600 text-xs sm:text-sm mt-1">Danh sách sản phẩm trong đơn hàng</p>
      </div>
      <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        {items.map((item, index) => (
          <div
            key={item._id}
            className="flex flex-col sm:flex-row sm:justify-between sm:items-start border-2 border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:shadow-lg transition-all duration-300 transform hover:scale-105 animate-fade-in-up bg-gradient-to-br from-white to-gray-50 gap-3 sm:gap-0"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
              {item.imageUrl ? (
                <img
                  src={
                    item.imageUrl.startsWith("/uploads")
                      ? `${serverHost}${item.imageUrl}`
                      : item.imageUrl
                  }
                  alt={item.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg sm:rounded-xl shadow-lg border-2 border-gray-200 flex-shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg sm:rounded-xl flex items-center justify-center text-gray-500 shadow-lg flex-shrink-0">
                  <Package className="w-10 h-10 sm:w-12 sm:h-12 text-gray-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-base sm:text-lg font-bold text-gray-900 mb-2 break-words">{item.name}</p>
                {item.variation && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {item.variation.color && (
                      <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border-2 border-blue-300 flex items-center gap-1 w-fit">
                        <Palette className="w-3 h-3" />
                        {item.variation.color}
                      </span>
                    )}
                    {item.variation.size && (
                      <span className="px-2 sm:px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg border-2 border-purple-300 flex items-center gap-1 w-fit">
                        <Ruler className="w-3 h-3" />
                        {item.variation.size}
                      </span>
                    )}
                    {item.variation.additionalPrice && (
                      <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg border-2 border-green-300">
                        +{item.variation.additionalPrice.toLocaleString("vi-VN")}₫
                      </span>
                    )}
                  </div>
                )}
                <p className="text-xs sm:text-sm font-semibold text-gray-600 flex items-center gap-1">
                  <BarChart className="w-3 h-3 sm:w-4 sm:h-4" />
                  Số lượng: <span className="text-purple-600 font-bold">{item.quantity}</span>
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right sm:ml-4 flex-shrink-0">
              <div className="mb-2">
                <p className="text-base sm:text-lg font-bold text-green-600">
                  {item.salePrice
                    ? item.salePrice.toLocaleString("vi-VN") + "₫"
                    : item.price.toLocaleString("vi-VN") + "₫"}
                </p>
                {item.salePrice && (
                  <p className="text-xs sm:text-sm line-through text-gray-400">
                    {item.price.toLocaleString("vi-VN")}₫
                  </p>
                )}
              </div>
              <p className="text-sm sm:text-base font-bold text-gray-900 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 rounded-lg sm:rounded-xl border-2 border-blue-300 w-fit sm:w-auto">
                Tổng: {item.subtotal.toLocaleString("vi-VN")}₫
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

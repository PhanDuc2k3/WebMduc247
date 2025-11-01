// OrderProduct.tsx
import React from "react";

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
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-12 text-center animate-fade-in">
        <div className="text-6xl mb-4">📦</div>
        <p className="text-gray-500 text-lg font-medium">Không có sản phẩm trong đơn hàng</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up">
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-b-2 border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <span>🛍️</span> Sản phẩm đặt hàng ({items.length})
        </h2>
        <p className="text-gray-600 text-sm mt-1">Danh sách sản phẩm trong đơn hàng</p>
      </div>
      <div className="p-6 space-y-4">
        {items.map((item, index) => (
          <div
            key={item._id}
            className="flex justify-between items-start border-2 border-gray-200 rounded-2xl p-5 hover:shadow-lg transition-all duration-300 transform hover:scale-105 animate-fade-in-up bg-gradient-to-br from-white to-gray-50"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start space-x-4 flex-1">
              {item.imageUrl ? (
                <img
                  src={
                    item.imageUrl.startsWith("/uploads")
                      ? `${serverHost}${item.imageUrl}`
                      : item.imageUrl
                  }
                  alt={item.name}
                  className="w-24 h-24 object-cover rounded-xl shadow-lg border-2 border-gray-200"
                  loading="lazy"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex items-center justify-center text-gray-500 text-2xl shadow-lg">
                  📦
                </div>
              )}
              <div className="flex-1">
                <p className="text-lg font-bold text-gray-900 mb-2">{item.name}</p>
                {item.variation && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {item.variation.color && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border-2 border-blue-300">
                        🎨 {item.variation.color}
                      </span>
                    )}
                    {item.variation.size && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg border-2 border-purple-300">
                        📏 {item.variation.size}
                      </span>
                    )}
                    {item.variation.additionalPrice && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg border-2 border-green-300">
                        +{item.variation.additionalPrice.toLocaleString("vi-VN")}₫
                      </span>
                    )}
                  </div>
                )}
                <p className="text-sm font-semibold text-gray-600">
                  <span>📊</span> Số lượng: <span className="text-purple-600 font-bold">{item.quantity}</span>
                </p>
              </div>
            </div>

            <div className="text-right ml-4">
              <div className="mb-2">
                <p className="text-lg font-bold text-green-600">
                  {item.salePrice
                    ? item.salePrice.toLocaleString("vi-VN") + "₫"
                    : item.price.toLocaleString("vi-VN") + "₫"}
                </p>
                {item.salePrice && (
                  <p className="text-sm line-through text-gray-400">
                    {item.price.toLocaleString("vi-VN")}₫
                  </p>
                )}
              </div>
              <p className="text-base font-bold text-gray-900 px-4 py-2 bg-blue-50 rounded-xl border-2 border-blue-300">
                Tổng: {item.subtotal.toLocaleString("vi-VN")}₫
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

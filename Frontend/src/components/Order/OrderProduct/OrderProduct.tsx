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
  if (!items || items.length === 0)
    return <div>Không có sản phẩm trong đơn hàng</div>;

  return (
    <div className="max-w-4xl mx-10 p-6 bg-white rounded-lg shadow-md mt-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Sản phẩm đặt hàng</h2>

      {items.map((item) => (
        <div
          key={item._id}
          className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4 last:mb-0 last:border-none"
        >
          <div className="flex items-start space-x-4">
            {item.imageUrl ? (
              <img
                src={
                  item.imageUrl.startsWith("/uploads")
                    ? `${serverHost}${item.imageUrl}`
                    : item.imageUrl
                }
                alt={item.name}
                className="w-20 h-20 object-cover rounded"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                No Image
              </div>
            )}
            <div>
              <p className="text-base font-medium text-gray-900">{item.name}</p>
              {item.variation && (
                <p className="text-sm text-gray-600">
                  Phân loại:{" "}
                  {item.variation.color && `Màu: ${item.variation.color}`}
                  {item.variation.size && `, Size: ${item.variation.size}`}
                  {item.variation.additionalPrice
                    ? ` (+${item.variation.additionalPrice.toLocaleString("vi-VN")}₫)`
                    : ""}
                </p>
              )}
              <p className="text-sm text-gray-600">Số lượng: {item.quantity}</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-base font-semibold text-gray-900">
              {item.salePrice
                ? item.salePrice.toLocaleString("vi-VN") + "₫"
                : item.price.toLocaleString("vi-VN") + "₫"}
            </p>
            <p className="text-sm text-gray-500">
              Tổng: {item.subtotal.toLocaleString("vi-VN")}₫
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

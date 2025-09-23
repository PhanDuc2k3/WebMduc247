import React from "react";
import { Heart } from "lucide-react";

interface ProductInfoProps {
  colors: string[];
  storages: string[];
  quantity: number;
  setQuantity: (n: number) => void;
}

const ProductInfo: React.FC<ProductInfoProps> = ({
  colors,
  storages,
  quantity,
  setQuantity,
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Tiêu đề & đánh giá */}
      <div>
        <h1 className="text-2xl font-semibold">iPhone 15 Pro Max 256GB - Chính hãng VNA</h1>
        <div className="text-sm text-gray-600 mt-1">⭐ 4.8 (1234 đánh giá)</div>
      </div>

      {/* Giá */}
      <div className="text-red-600 text-xl font-bold">
        29.990.000₫
        <span className="text-gray-500 line-through text-base ml-2">
          34.990.000₫
        </span>
      </div>

      {/* Màu sắc */}
      <div>
        <h3 className="font-medium mb-2">Chọn màu sắc:</h3>
        <div className="flex gap-2 flex-wrap">
          {colors.map((color) => (
            <button
              key={color}
              className="px-3 py-1 border rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      {/* Dung lượng */}
      <div>
        <h3 className="font-medium mb-2">Chọn dung lượng:</h3>
        <div className="flex gap-2 flex-wrap">
          {storages.map((s) => (
            <button
              key={s}
              className={`px-3 py-1 border rounded hover:bg-gray-100 ${
                s === "256GB" ? "border-blue-500 bg-blue-50" : ""
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Số lượng */}
      <div>
        <h3 className="font-medium mb-2">Số lượng:</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-8 h-8 border rounded text-lg font-bold flex items-center justify-center"
          >
            -
          </button>
          <span className="min-w-[32px] text-center">{quantity}</span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="w-8 h-8 border rounded text-lg font-bold flex items-center justify-center"
          >
            +
          </button>
        </div>
      </div>

      {/* Nút hành động */}
      <div className="flex gap-3 flex-wrap">
        <button className="flex items-center gap-1 px-4 py-2 border rounded hover:bg-gray-100">
          <Heart size={18} />
          Yêu thích
        </button>
        <button className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
          Thêm vào giỏ
        </button>
        <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
          Mua ngay
        </button>
      </div>

      {/* Thông tin thêm */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-700">
        <div className="bg-gray-50 p-3 rounded border">📦 Bảo hành chính hãng 12 tháng</div>
        <div className="bg-gray-50 p-3 rounded border">🚚 Miễn phí vận chuyển (Đơn từ 500K)</div>
        <div className="bg-gray-50 p-3 rounded border">💳 Miễn phí trả góp</div>
      </div>

      {/* Người bán */}
      <div className="text-sm text-gray-600">
        Người bán: <span className="font-medium">TechZone</span> - Hà Nội
      </div>
    </div>
  );
};

export default ProductInfo;

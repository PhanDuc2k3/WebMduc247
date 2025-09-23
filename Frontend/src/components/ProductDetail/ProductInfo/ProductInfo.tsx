import React, { useState } from "react";
import { Heart } from "lucide-react";

interface ProductInfoProps {
  product: any;
  quantity: number;
  setQuantity: (n: number) => void;
}

const ProductInfo: React.FC<ProductInfoProps> = ({ product, quantity, setQuantity }) => {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedStorage, setSelectedStorage] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<any | null>(null);

  const colors: string[] =
    Array.from(new Set(product.variations?.map((v: any) => v.color) || [])) || [];

  const storages: string[] =
    Array.from(
      new Set(
        product.variations?.flatMap((v: any) => v.options?.map((opt: any) => opt.name) || []) || []
      )
    ) || [];

  const basePrice = product.salePrice || product.price;

  const finalPrice = selectedOption
    ? basePrice + (selectedOption.additionalPrice || 0)
    : basePrice;

  const handleSelectStorage = (storage: string) => {
    setSelectedStorage(storage);
    if (selectedColor) {
      const variation = product.variations.find((v: any) => v.color === selectedColor);
      if (variation) {
        const opt = variation.options.find((o: any) => o.name === storage);
        setSelectedOption(opt || null);
      }
    } else {
      setSelectedOption(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{product.name}</h1>
        <div className="text-sm text-gray-600 mt-1">
          ⭐ {product.rating || 0} ({product.reviewsCount || 0} đánh giá)
        </div>
      </div>

      <div className="text-red-600 text-xl font-bold">
        {finalPrice?.toLocaleString("vi-VN")}₫
        {product.salePrice && (
          <span className="text-gray-500 line-through text-base ml-2">
            {product.price?.toLocaleString("vi-VN")}₫
          </span>
        )}
      </div>

      <div>
        <h3 className="font-medium mb-2">Chọn màu sắc:</h3>
        <div className="flex gap-2 flex-wrap">
          {colors.map((color, idx) => (
            <button
              key={`${color}-${idx}`}
              onClick={() => {
                setSelectedColor(color);
                setSelectedStorage(null);
                setSelectedOption(null);
              }}
              className={`px-3 py-1 border rounded focus:outline-none transition ${
                selectedColor === color ? "border-blue-500 bg-blue-50" : "hover:bg-gray-100"
              }`}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-2">Chọn dung lượng:</h3>
        <div className="flex gap-2 flex-wrap">
          {storages.map((s, idx) => (
            <button
              key={`${s}-${idx}`}
              onClick={() => handleSelectStorage(s)}
              className={`px-3 py-1 border rounded focus:outline-none transition ${
                selectedStorage === s ? "border-blue-500 bg-blue-50" : "hover:bg-gray-100"
              }`}
            >
              {s}
              {selectedColor &&
                (() => {
                  const variation = product.variations.find((v: any) => v.color === selectedColor);
                  const opt = variation?.options.find((o: any) => o.name === s);
                  return opt?.additionalPrice > 0 ? (
                    <span className="ml-1 text-sm text-gray-500">
                      (+{opt.additionalPrice.toLocaleString("vi-VN")}₫)
                    </span>
                  ) : null;
                })()}
            </button>
          ))}
        </div>
      </div>

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

      <div className="text-sm text-gray-600">
        Người bán: <span className="font-medium">{product.store?.name || "Không rõ"}</span>
      </div>
    </div>
  );
};

export default ProductInfo;

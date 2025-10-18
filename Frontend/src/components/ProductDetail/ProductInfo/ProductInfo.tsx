import React, { useState, useMemo } from "react";
import { Heart } from "lucide-react";
import axiosClient from "../../../api/axiosClient";

interface VariationOption {
  name: string;
  additionalPrice?: number;
}

interface Variation {
  color: string;
  options: VariationOption[];
}

interface Product {
  _id: string;
  name: string;
  price: number;
  salePrice?: number;
  rating?: number;
  reviewsCount?: number;
  store?: { name: string };
  variations?: Variation[];
}

interface ProductInfoProps {
  product: Product;
  quantity: number;
  setQuantity: (n: number) => void;
}

const ProductInfo: React.FC<ProductInfoProps> = ({ product, quantity, setQuantity }) => {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedStorage, setSelectedStorage] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<VariationOption | null>(null);
  const [loading, setLoading] = useState(false);

  const colors: string[] = Array.from(new Set(product.variations?.map(v => v.color) || []));

  const availableStorages = selectedColor
    ? product.variations?.find(v => v.color === selectedColor)?.options.map(o => o.name) || []
    : [];

  const basePrice = product.salePrice ?? product.price;

  const finalPrice = useMemo(() => {
    return selectedOption ? basePrice + (selectedOption.additionalPrice || 0) : basePrice;
  }, [basePrice, selectedOption]);

  const handleSelectStorage = (storage: string) => {
    setSelectedStorage(storage);
    if (selectedColor) {
      const variation = product.variations?.find(v => v.color === selectedColor);
      const opt = variation?.options.find(o => o.name === storage);
      setSelectedOption(opt || null);
    } else {
      setSelectedOption(null);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedColor || !selectedStorage || !selectedOption) {
      alert("Vui lòng chọn màu sắc và dung lượng trước khi thêm vào giỏ hàng!");
      return;
    }
    try {
      setLoading(true);
      await axiosClient.post(
        "/api/cart/add",
        {
          productId: product._id,
          quantity,
          variation: {
            color: selectedColor,
            size: selectedStorage,
            additionalPrice: selectedOption.additionalPrice || 0,
          },
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      alert("✅ Đã thêm vào giỏ hàng!");
    } catch (err) {
      console.error("❌ Lỗi thêm giỏ hàng:", err);
      alert("❌ Có lỗi khi thêm vào giỏ hàng");
    } finally {
      setLoading(false);
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
        {finalPrice.toLocaleString("vi-VN")}₫
        {product.salePrice && (
          <span className="text-gray-500 line-through text-base ml-2">
            {product.price.toLocaleString("vi-VN")}₫
          </span>
        )}
      </div>

      <div>
        <h3 className="font-medium mb-2">Sản phẩm:</h3>
        <div className="flex gap-2 flex-wrap">
          {colors.map(color => (
            <button
              key={color}
              onClick={() => {
                setSelectedColor(color);
                setSelectedStorage(null);
                setSelectedOption(null);
              }}
              className={`px-3 py-1 border rounded transition ${
                selectedColor === color
                  ? "border-blue-500 bg-blue-50"
                  : "hover:bg-gray-100"
              }`}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      {selectedColor && (
        <div>
          <h3 className="font-medium mb-2">Chọn loại:</h3>
          <div className="flex gap-2 flex-wrap">
            {availableStorages.map(s => {
              const variation = product.variations?.find(v => v.color === selectedColor);
              const opt = variation?.options.find(o => o.name === s);
              return (
                <button
                  key={s}
                  onClick={() => handleSelectStorage(s)}
                  className={`px-3 py-1 border rounded transition ${
                    selectedStorage === s
                      ? "border-blue-500 bg-blue-50"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {s}
                  {opt?.additionalPrice ? (
                    <span className="ml-1 text-sm text-gray-500">
                      (+{opt.additionalPrice.toLocaleString("vi-VN")}₫)
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
          <Heart size={18} /> Yêu thích
        </button>
        <button
          onClick={handleAddToCart}
          disabled={loading}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
        >
          {loading ? "Đang thêm..." : "Thêm vào giỏ"}
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

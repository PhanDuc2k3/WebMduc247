import React, { useState, useMemo } from "react";
import { Heart, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import axiosClient from "../../../api/axiosClient";
import { toast } from "react-toastify"; 
import "react-toastify/dist/ReactToastify.css";
import { useCart } from "../../../context/CartContext"; // <--- BỔ SUNG: Import hook useCart

interface VariationOption {
  name: string;
  additionalPrice?: number;
  _id: string;
}

interface Variation {
  color: string;
  _id: string;
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

const ProductInfo: React.FC<ProductInfoProps> = ({
  product,
  quantity,
  setQuantity,
}) => {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedStorage, setSelectedStorage] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<VariationOption | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  
  const { fetchCart } = useCart(); // <--- BỔ SUNG: Lấy hàm fetchCart từ CartContext

  const colors: string[] = Array.from(
    new Set(product.variations?.map((v) => v.color) || [])
  );

  const availableStorages = selectedColor
    ? product.variations
        ?.find((v) => v.color === selectedColor)
        ?.options.map((o) => o.name) || []
    : [];

  const basePrice = product.salePrice ?? product.price;
  const finalPrice = useMemo(() => {
    return selectedOption
      ? basePrice + (selectedOption.additionalPrice || 0)
      : basePrice;
  }, [basePrice, selectedOption]);

  const handleSelectStorage = (storage: string) => {
    setSelectedStorage(storage);
    if (selectedColor) {
      const variation = product.variations?.find(
        (v) => v.color === selectedColor
      );
      const opt = variation?.options.find((o) => o.name === storage);
      setSelectedOption(opt || null);
    } else {
      setSelectedOption(null);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedColor || !selectedStorage || !selectedOption) {
      toast.warning(
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-yellow-500" size={18} />
          <span>Vui lòng chọn màu sắc và dung lượng!</span>
        </div>
      );
      return;
    }

    const variation = product.variations?.find(
      (v) => v.color === selectedColor
    );
    const option = variation?.options.find((o) => o.name === selectedStorage);

    if (!variation || !option) return;

    const payload = {
      productId: product._id,
      quantity,
      variationId: variation._id,
      optionId: option._id,
    };

    try {
      setLoading(true);

      await axiosClient.post("/api/cart/add", payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      fetchCart(); // <--- GỌI HÀM NÀY ĐỂ CẬP NHẬT CART COUNT TRONG CONTEXT VÀ TRÊN HEADER

      toast.success(
        <div className="flex items-center gap-2">
          <span>Đã thêm vào giỏ hàng!</span>
        </div>
      );
    } catch {
      toast.error(
        <div className="flex items-center gap-2">
          <span>Lỗi khi thêm vào giỏ hàng!</span>
        </div>
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 bg-white p-6 lg:p-8 rounded-2xl shadow-lg border border-gray-100">
      {/* Tên sản phẩm */}
      <div className="animate-fade-in-down">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3 gradient-text">
          {product.name}
        </h1>
        <div className="flex items-center gap-3 text-base text-gray-600">
          <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full">
            <span className="text-yellow-500 text-lg">⭐</span>
            <span className="font-semibold">{product.rating || 0}</span>
          </div>
          <span className="text-gray-500">
            ({product.reviewsCount || 0} đánh giá)
          </span>
        </div>
      </div>

      {/* Giá */}
      <div className="animate-fade-in-up delay-100">
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-3xl lg:text-4xl font-bold text-red-600">
            {finalPrice.toLocaleString("vi-VN")}₫
          </span>
          {product.salePrice && (
            <span className="text-gray-400 line-through text-xl">
              {product.price.toLocaleString("vi-VN")}₫
            </span>
          )}
        </div>
        {product.salePrice && (
          <span className="inline-block bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-semibold">
            🔥 Giảm {Math.round((1 - product.salePrice / product.price) * 100)}%
          </span>
        )}
      </div>

      {/* Chọn màu */}
      <div className="animate-fade-in-up delay-200">
        <h3 className="font-bold text-lg mb-3 text-gray-900 flex items-center gap-2">
          <span>🎨</span> Màu sắc
        </h3>
        <div className="flex gap-3 flex-wrap">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => {
                setSelectedColor(color);
                setSelectedStorage(null);
                setSelectedOption(null);
              }}
              className={`px-5 py-2.5 border-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                selectedColor === color
                  ? "border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 shadow-md"
                  : "border-gray-200 hover:border-blue-300 hover:bg-gray-50 text-gray-700"
              }`}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      {/* Chọn loại */}
      {selectedColor && (
        <div className="animate-fade-in-up delay-300">
          <h3 className="font-bold text-lg mb-3 text-gray-900 flex items-center gap-2">
            <span>💾</span> Dung lượng / Phiên bản
          </h3>
          <div className="flex gap-3 flex-wrap">
            {availableStorages.map((s) => {
              const variation = product.variations?.find(
                (v) => v.color === selectedColor
              );
              const opt = variation?.options.find((o) => o.name === s);
              return (
                <button
                  key={s}
                  onClick={() => handleSelectStorage(s)}
                  className={`px-5 py-2.5 border-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                    selectedStorage === s
                      ? "border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 shadow-md"
                      : "border-gray-200 hover:border-blue-300 hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {s}
                  {opt?.additionalPrice ? (
                    <span className="ml-2 text-sm text-blue-600 font-bold">
                      (+{opt.additionalPrice.toLocaleString("vi-VN")}₫)
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Số lượng */}
      <div className="animate-fade-in-up delay-400">
        <h3 className="font-bold text-lg mb-3 text-gray-900 flex items-center gap-2">
          <span>🔢</span> Số lượng
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-12 h-12 border-2 border-gray-300 rounded-xl text-xl font-bold flex items-center justify-center hover:bg-gray-100 hover:border-blue-400 transition-all duration-300 transform hover:scale-110"
          >
            −
          </button>
          <span className="min-w-[60px] text-center text-xl font-bold text-gray-900 bg-gray-50 px-4 py-2 rounded-xl border-2 border-gray-200">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="w-12 h-12 border-2 border-gray-300 rounded-xl text-xl font-bold flex items-center justify-center hover:bg-gray-100 hover:border-blue-400 transition-all duration-300 transform hover:scale-110"
          >
            +
          </button>
        </div>
      </div>

      {/* Nút hành động */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up delay-500 pt-4 border-t border-gray-200">
        <button className="flex items-center justify-center gap-2 px-6 py-3.5 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-red-400 hover:text-red-600 transition-all duration-300 transform hover:scale-105">
          <Heart size={20} className={selectedColor ? "fill-red-500 text-red-500" : ""} /> 
          <span>Yêu thích</span>
        </button>
        <button
          onClick={handleAddToCart}
          disabled={loading}
          className="flex-1 px-6 py-3.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-bold hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span> Đang thêm...
            </span>
          ) : (
            "🛒 Thêm vào giỏ"
          )}
        </button>
        <button className="flex-1 px-6 py-3.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
          ⚡ Mua ngay
        </button>
      </div>

      {/* Người bán */}
      <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-200 animate-fade-in-up delay-600">
        <span className="font-semibold text-gray-700">🏪 Người bán:</span>{" "}
        <span className="font-bold text-blue-600">{product.store?.name || "Không rõ"}</span>
      </div>
    </div>
  );
};

export default ProductInfo;
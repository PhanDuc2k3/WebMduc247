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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ✅ KHÔNG còn ToastContainer ở đây */}

      {/* Tên sản phẩm */}
      <div>
        <h1 className="text-2xl font-semibold">{product.name}</h1>
        <div className="text-sm text-gray-600 mt-1">
          ⭐ {product.rating || 0} ({product.reviewsCount || 0} đánh giá)
        </div>
      </div>

      {/* Giá */}
      <div className="text-red-600 text-xl font-bold">
        {finalPrice.toLocaleString("vi-VN")}₫
        {product.salePrice && (
          <span className="text-gray-500 line-through text-base ml-2">
            {product.price.toLocaleString("vi-VN")}₫
          </span>
        )}
      </div>

      {/* Chọn màu */}
      <div>
        <h3 className="font-medium mb-2">Sản phẩm:</h3>
        <div className="flex gap-2 flex-wrap">
          {colors.map((color) => (
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

      {/* Chọn loại */}
      {selectedColor && (
        <div>
          <h3 className="font-medium mb-2">Chọn loại:</h3>
          <div className="flex gap-2 flex-wrap">
            {availableStorages.map((s) => {
              const variation = product.variations?.find(
                (v) => v.color === selectedColor
              );
              const opt = variation?.options.find((o) => o.name === s);
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

      {/* Người bán */}
      <div className="text-sm text-gray-600">
        Người bán:{" "}
        <span className="font-medium">{product.store?.name || "Không rõ"}</span>
      </div>
    </div>
  );
};

export default ProductInfo;
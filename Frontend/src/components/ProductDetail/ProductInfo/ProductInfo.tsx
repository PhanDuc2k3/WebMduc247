import React, { useState, useMemo, useEffect } from "react";
import { Heart, AlertTriangle, Star, Flame, Palette, Package, Hash, ShoppingCart, Zap, Store, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../../api/axiosClient";
import { toast } from "react-toastify"; 
import "react-toastify/dist/ReactToastify.css";
import { useCart } from "../../../context/CartContext";
import favoriteApi from "../../../api/favoriteApi";

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
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const navigate = useNavigate();
  
  const { fetchCart } = useCart();
  
  // Kiểm tra trạng thái yêu thích
  useEffect(() => {
    const checkFavorite = async () => {
      const token = localStorage.getItem("token");
      if (!token || !product._id) return;
      
      try {
        const res = await favoriteApi.checkFavorite(product._id);
        setIsFavorite(res.data.isFavorite);
      } catch (err) {
        // Nếu chưa đăng nhập, không hiển thị lỗi
        if ((err as any).response?.status !== 401) {
          console.error("Lỗi kiểm tra yêu thích:", err);
        }
      }
    };
    
    checkFavorite();
  }, [product._id]);

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
        "Vui lòng chọn loại 1 và loại 2!",
        { containerId: "general-toast" }
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

      fetchCart();

      toast.success(
        "Đã thêm vào giỏ hàng!",
        { containerId: "general-toast" }
      );
    } catch {
      toast.error(
        "Lỗi khi thêm vào giỏ hàng!",
        { containerId: "general-toast" }
      );
    } finally {
      setLoading(false);
    }
  };

  // Handler cho nút "Mua ngay"
  const handleBuyNow = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.warning("Vui lòng đăng nhập để mua hàng!", { containerId: "general-toast" });
      return;
    }

    if (!selectedColor || !selectedStorage || !selectedOption) {
      toast.warning(
        "Vui lòng chọn loại 1 và loại 2!",
        { containerId: "general-toast" }
      );
      return;
    }

    const variation = product.variations?.find(
      (v) => v.color === selectedColor
    );
    const option = variation?.options.find((o) => o.name === selectedStorage);

    if (!variation || !option) return;

    try {
      setLoading(true);

      // Tính giá và subtotal
      const basePrice = product.salePrice ?? product.price;
      const additionalPrice = option.additionalPrice || 0;
      const unitPrice = basePrice + additionalPrice;
      const subtotal = unitPrice * quantity;

      // Tạo checkout item trực tiếp (không thêm vào cart)
      const checkoutItem = {
        _id: `temp-${Date.now()}`, // ID tạm thời
        productId: product._id,
        storeId: product.store?._id || product.storeId || null,
        name: product.name,
        imageUrl: product.images?.[0] || "",
        price: product.price,
        salePrice: product.salePrice,
        quantity: quantity,
        variation: {
          color: selectedColor,
          size: selectedStorage,
          additionalPrice: additionalPrice,
          variationId: variation._id,
          optionId: option._id,
        },
        subtotal: subtotal,
      };

      // Lưu vào localStorage để checkout
      localStorage.setItem("checkoutItems", JSON.stringify([checkoutItem]));
      
      // Chuyển đến checkout
      navigate("/checkout");
    } catch (err: any) {
      console.error("Lỗi mua ngay:", err);
      toast.error(
        err.response?.data?.message || "Lỗi khi thực hiện mua ngay!",
        { containerId: "general-toast" }
      );
    } finally {
      setLoading(false);
    }
  };

  // Handler cho nút "Yêu thích"
  const handleToggleFavorite = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.warning("Vui lòng đăng nhập để thêm vào yêu thích!", { containerId: "general-toast" });
      return;
    }

    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        // Xóa khỏi yêu thích
        await favoriteApi.removeFavorite({ productId: product._id });
        setIsFavorite(false);
        toast.success("Đã xóa khỏi yêu thích", { containerId: "general-toast" });
      } else {
        // Thêm vào yêu thích
        const res = await favoriteApi.addFavorite({ productId: product._id });
        // Kiểm tra response - có thể đã tồn tại (status 200) hoặc mới tạo (status 201)
        setIsFavorite(true);
        toast.success(res.data?.message || "Đã thêm vào yêu thích", { containerId: "general-toast" });
      }
    } catch (err: any) {
      console.error("Lỗi yêu thích:", err);
      
      // Xử lý các loại lỗi khác nhau
      const errorMessage = err.response?.data?.message || err.message || "Lỗi khi cập nhật yêu thích!";
      const statusCode = err.response?.status;
      
      // Nếu đã yêu thích rồi (409 Conflict) - coi như success và set isFavorite = true
      if (statusCode === 409 || statusCode === 200 || errorMessage.includes("Đã yêu thích") || errorMessage.includes("đã yêu thích")) {
        setIsFavorite(true);
        toast.success("Đã thêm vào yêu thích", { containerId: "general-toast" });
        return; // Thoát sớm để không hiển thị error
      }
      
      // Các lỗi khác
      toast.error("Không thể cập nhật yêu thích. Vui lòng thử lại sau.", { containerId: "general-toast" });
    } finally {
      setFavoriteLoading(false);
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
            <Star className="text-yellow-500" size={18} fill="currentColor" />
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
          <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-semibold">
            <Flame size={16} />
            <span>Giảm {Math.round((1 - product.salePrice / product.price) * 100)}%</span>
          </span>
        )}
      </div>

      {/* Chọn loại 1 */}
      <div className="animate-fade-in-up delay-200">
        <h3 className="font-bold text-lg mb-3 text-gray-900">
          Loại 1
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

      {/* Chọn loại 2 */}
      {selectedColor && (
        <div className="animate-fade-in-up delay-300">
          <h3 className="font-bold text-lg mb-3 text-gray-900">
            Loại 2
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
          <Hash size={20} className="text-gray-700" />
          <span>Số lượng</span>
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
        <button 
          onClick={handleToggleFavorite}
          disabled={favoriteLoading}
          className={`flex items-center justify-center gap-2 px-6 py-3.5 border-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
            isFavorite
              ? "border-red-400 bg-red-50 text-red-600"
              : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-red-400 hover:text-red-600"
          }`}
        >
          <Heart 
            size={20} 
            className={isFavorite ? "fill-red-500 text-red-500" : ""} 
          /> 
          <span>{favoriteLoading ? "..." : "Yêu thích"}</span>
        </button>
        <button
          onClick={handleAddToCart}
          disabled={loading}
          className="flex-1 px-6 py-3.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-bold hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" size={18} /> Đang thêm...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <ShoppingCart size={18} />
              <span>Thêm vào giỏ</span>
            </span>
          )}
        </button>
        <button 
          onClick={handleBuyNow}
          disabled={loading}
          className="flex-1 px-6 py-3.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" size={18} /> Đang xử lý...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Zap size={18} />
              <span>Mua ngay</span>
            </span>
          )}
        </button>
      </div>

      {/* Người bán */}
      <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-200 animate-fade-in-up delay-600">
        <div className="flex items-center gap-2">
          <Store size={16} className="text-gray-700" />
          <span className="font-semibold text-gray-700">Người bán:</span>{" "}
          <span className="font-bold text-blue-600">{product.store?.name || "Không rõ"}</span>
        </div>
      </div>
    </div>
  );
};

export default ProductInfo;
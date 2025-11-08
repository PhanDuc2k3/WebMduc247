import React, { useState } from "react";
import { Minus, Plus, X, Loader2 } from "lucide-react";
import axiosClient from "../../../api/axiosClient";
import { toast } from "react-toastify";
import { useCart } from "../../../context/CartContext";

interface Variation {
  color?: string;
  size?: string; // Giả sử 'size' là tên trường trong variation
  additionalPrice?: number;
}

export interface CartItemType {
  _id: string; // ID của Cart Item (itemId)
  name: string;
  imageUrl?: string;
  price: number;
  salePrice?: number;
  quantity: number;
  subtotal: number;
  variation?: Variation;
}

interface CartItemProps {
  item: CartItemType;
  selected: boolean;
  onSelect: (id: string) => void;
  // onUpdateQty đã bị loại bỏ
  onRemove: (id: string) => void;
}

const CartItem: React.FC<CartItemProps> = ({
  item,
  selected,
  onSelect,
  onRemove,
}) => {
  const [loading, setLoading] = useState(false);
  const { fetchCart } = useCart(); // Lấy hàm fetchCart từ Context

  const getFullUrl = (path?: string) => {
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    return path?.startsWith("http") ? path : `${baseUrl}${path}`;
  };

const [localQuantity, setLocalQuantity] = useState(item.quantity);

const handleUpdateQuantity = async (newQuantity: number) => {
  if (newQuantity < 1 || loading) return;

  // ✅ Cập nhật số lượng và thành tiền tạm thời để UI phản hồi tức thì
  const updatedSubtotal = (item.salePrice ?? item.price) * newQuantity;
  setLocalQuantity(newQuantity);
  item.subtotal = updatedSubtotal;

  setLoading(true);

  try {
    const token = localStorage.getItem("token");
    if (!token) return;

    await axiosClient.put(
      `/api/cart/update`,
      { itemId: item._id, quantity: newQuantity },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // ✅ Đồng bộ lại từ server (nếu cần, đảm bảo chính xác)
    fetchCart();
  } catch (error) {
    console.error(error);
    toast.error("Cập nhật số lượng thất bại.");
    // Revert lại nếu có lỗi
    setLocalQuantity(item.quantity);
    item.subtotal = (item.salePrice ?? item.price) * item.quantity;
  } finally {
    setLoading(false);
  }
};

  const currentPrice = item.salePrice ?? item.price;
  const discountPercent = item.salePrice ? Math.round((1 - item.salePrice / item.price) * 100) : 0;

  return (
    <div className={`bg-white rounded-xl md:rounded-2xl border-2 transition-all duration-300 hover:shadow-lg group overflow-hidden ${
      selected ? "bg-gradient-to-br from-blue-50/50 to-purple-50/50 border-blue-400 shadow-md" : "border-gray-200 hover:border-gray-300"
    } animate-fade-in-up`}>
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-5 md:p-6">
        {/* Left Section: Checkbox + Image */}
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Checkbox */}
          <div className="flex-shrink-0 pt-1">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelect(item._id)}
              className="w-5 h-5 sm:w-6 sm:h-6 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer transition-all duration-300 accent-blue-600 hover:scale-110 touch-manipulation"
            />
          </div>

          {/* Product image */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 flex-shrink-0 rounded-lg md:rounded-xl overflow-hidden border-2 border-gray-200 group-hover:border-blue-400 transition-all duration-300 bg-gray-100">
            <img
              src={getFullUrl(item.imageUrl)}
              alt={item.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
            />
            {discountPercent > 0 && (
              <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-red-600 text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full shadow-lg">
                -{discountPercent}%
              </span>
            )}
          </div>
        </div>

        {/* Middle Section: Product Info */}
        <div className="flex-1 min-w-0 space-y-3 sm:space-y-4">
          {/* Product name */}
          <h3 className="font-bold text-base sm:text-lg md:text-xl text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors duration-300">
            {item.name}
          </h3>
          
          {/* Variations */}
          {(item.variation?.color || item.variation?.size) && (
            <div className="flex flex-wrap gap-2">
              {item.variation?.color && (
                <span className="inline-flex items-center text-xs sm:text-sm bg-blue-100 text-blue-700 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full font-semibold border border-blue-200">
                  {item.variation.color}
                </span>
              )}
              {item.variation?.size && (
                <span className="inline-flex items-center text-xs sm:text-sm bg-purple-100 text-purple-700 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full font-semibold border border-purple-200">
                  {item.variation.size}
                </span>
              )}
              {item.variation?.additionalPrice && item.variation.additionalPrice > 0 && (
                <span className="inline-flex items-center text-xs sm:text-sm bg-green-100 text-green-700 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full font-semibold border border-green-200">
                  +{item.variation.additionalPrice.toLocaleString("vi-VN")}₫
                </span>
              )}
            </div>
          )}

          {/* Price */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="flex items-baseline gap-2 sm:gap-3">
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-red-600">
                {currentPrice.toLocaleString("vi-VN")}₫
              </span>
              {item.salePrice && (
                <span className="text-sm sm:text-base text-gray-400 line-through">
                  {item.price.toLocaleString("vi-VN")}₫
                </span>
              )}
            </div>

            {/* Total amount */}
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm text-gray-600 font-medium">Thành tiền:</span>
              <span className="text-base sm:text-lg md:text-xl font-bold text-blue-600">
                {item.subtotal.toLocaleString("vi-VN")}₫
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: Quantity + Remove */}
        <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-start gap-4 sm:gap-3 border-t sm:border-t-0 sm:border-l border-gray-200 pt-4 sm:pt-0 sm:pl-4 sm:ml-4">
          {/* Quantity controls */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-1 sm:gap-2 border-2 border-gray-200 rounded-lg md:rounded-xl bg-white shadow-sm">
              <button
                onClick={() => handleUpdateQuantity(localQuantity - 1)}
                disabled={localQuantity <= 1 || loading}
                className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center rounded-l-lg text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95 touch-manipulation"
                title="Giảm số lượng"
              >
                <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <span className="min-w-[3rem] sm:min-w-[3.5rem] text-center font-bold text-sm sm:text-base md:text-lg text-gray-900 bg-gray-50 px-2 sm:px-3 py-1 sm:py-1.5 border-x border-gray-200">
                {loading ? (
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mx-auto text-blue-600" />
                ) : (
                  localQuantity
                )}
              </span>

              <button
                onClick={() => handleUpdateQuantity(localQuantity + 1)}
                disabled={loading}
                className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center rounded-r-lg text-gray-600 hover:bg-green-50 hover:text-green-600 transition-all duration-300 transform hover:scale-105 active:scale-95 touch-manipulation"
                title="Tăng số lượng"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            
            {loading && (
              <span className="text-xs text-blue-600 animate-pulse">Đang cập nhật...</span>
            )}
          </div>

          {/* Remove button */}
          <button
            onClick={() => onRemove(item._id)}
            className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg md:rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600 border-2 border-gray-200 hover:border-red-300 transition-all duration-300 transform hover:scale-110 active:scale-95 touch-manipulation group/remove"
            title="Xóa sản phẩm"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 group-hover/remove:rotate-90 transition-transform duration-300" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
import React, { useState } from "react";
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
  if (newQuantity < 1) return;
  if (loading) return;
  
  setLocalQuantity(newQuantity); // cập nhật tạm UI ngay
  setLoading(true);

  try {
    const token = localStorage.getItem("token");
    if (!token) return;

    await axiosClient.put(`/api/cart/update`, { itemId: item._id, quantity: newQuantity }, { headers: { Authorization: `Bearer ${token}` } });
    fetchCart(); // fetch chính xác từ backend
  } catch (error) {
    console.error(error);
    toast.error("Cập nhật số lượng thất bại.");
    setLocalQuantity(item.quantity); // revert nếu fail
  } finally {
    setLoading(false);
  }
};
  return (
    <div className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-300 hover:shadow-lg group ${
      selected ? "bg-gradient-to-r from-blue-50 to-purple-50 border-blue-400 shadow-md" : "bg-white border-gray-200 hover:border-gray-300"
    } animate-fade-in-up`}>
      {/* Checkbox */}
      <div className="relative">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(item._id)}
          className="w-6 h-6 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer transition-all duration-300 accent-blue-600 hover:scale-110"
        />
        {selected && (
          <span className="absolute inset-0 flex items-center justify-center text-blue-600 pointer-events-none">
            ✓
          </span>
        )}
      </div>

      {/* Product image */}
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 rounded-xl overflow-hidden border-2 border-gray-200 group-hover:border-blue-400 transition-all duration-300">
        <img
          src={getFullUrl(item.imageUrl)}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
        {item.salePrice && (
          <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            -{Math.round((1 - item.salePrice / item.price) * 100)}%
          </span>
        )}
      </div>

      {/* Product info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors duration-300">
          {item.name}
        </h3>
        
        {(item.variation?.color || item.variation?.size) && (
          <div className="flex flex-wrap gap-2 mb-3">
            {item.variation?.color && (
              <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
                {item.variation.color}
              </span>
            )}
            {item.variation?.size && (
              <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold">
                {item.variation.size}
              </span>
            )}
            {item.variation?.additionalPrice && item.variation.additionalPrice > 0 && (
              <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                +{item.variation.additionalPrice.toLocaleString("vi-VN")}₫
              </span>
            )}
          </div>
        )}

        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-xl font-bold text-red-600">
            {(item.salePrice ?? item.price).toLocaleString("vi-VN")}₫
          </span>
          {item.salePrice && (
            <span className="text-sm text-gray-400 line-through">
              {item.price.toLocaleString("vi-VN")}₫
            </span>
          )}
        </div>
        
        <div className="text-sm font-semibold text-gray-600">
          Thành tiền: <span className="text-lg text-blue-600">{item.subtotal.toLocaleString("vi-VN")}₫</span>
        </div>
      </div>

      {/* Quantity controls */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 border-2 border-gray-200 rounded-xl p-1 bg-gray-50">
          <button
            onClick={() => handleUpdateQuantity(localQuantity - 1)}
            disabled={localQuantity <= 1 || loading}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-xl font-bold text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-110 active:scale-95 border-2 border-transparent"
          >
            −
          </button>

          <span className="w-12 text-center font-bold text-lg text-gray-900 bg-white px-3 py-1 rounded-lg border-2 border-gray-200">
            {localQuantity}
          </span>

          <button
            onClick={() => handleUpdateQuantity(localQuantity + 1)}
            disabled={loading}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-xl font-bold text-gray-600 hover:bg-green-50 hover:text-green-600 hover:border-green-300 transition-all duration-300 transform hover:scale-110 active:scale-95 border-2 border-transparent"
          >
            +
          </button>
        </div>
        
        {loading && (
          <span className="text-xs text-blue-600 animate-pulse">Đang cập nhật...</span>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={() => onRemove(item._id)}
        className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-300 border-2 border-transparent transition-all duration-300 transform hover:scale-110 active:scale-95 group/remove"
        title="Xóa sản phẩm"
      >
        <span className="text-xl group-hover/remove:rotate-90 transition-transform duration-300">×</span>
      </button>
    </div>
  );
};

export default CartItem;
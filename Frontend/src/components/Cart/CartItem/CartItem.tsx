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
    <div className="flex items-center px-6 py-4 border-b last:border-b-0">
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onSelect(item._id)}
        className="mr-4 w-5 h-5"
      />

      {/* Product image */}
      <img
        src={getFullUrl(item.imageUrl)}
        alt={item.name}
        className="w-20 h-20 object-cover rounded border mr-4"
      />

      {/* Product info */}
      <div className="flex-1">
        <div className="font-medium text-gray-900">{item.name}</div>
        <div className="text-sm text-gray-500">
          {item.variation?.color && <span>Màu: {item.variation.color} </span>}
          {item.variation?.size && <span>| {item.variation.size}</span>}
          {item.variation?.additionalPrice && item.variation.additionalPrice > 0 && (
            <span className="ml-1 text-gray-500">
              (+{item.variation.additionalPrice.toLocaleString("vi-VN")}₫)
            </span>
          )}
        </div>
        <div className="text-red-500 font-bold">
          Đơn giá: {(item.salePrice ?? item.price).toLocaleString("vi-VN")}₫
        </div>
        <div className="text-gray-600 text-sm">
          Thành tiền: {item.subtotal.toLocaleString("vi-VN")}₫
        </div>
      </div>

      {/* Quantity controls */}
      <div className="flex items-center gap-2 mx-6">
<div className="flex items-center gap-2 mx-6">
  <button
    onClick={() => handleUpdateQuantity(localQuantity - 1)}
    disabled={localQuantity <= 1 || loading}
    className="w-10 h-10 flex items-center justify-center border rounded-lg text-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
  >
    -
  </button>

  <span className="w-10 text-center font-medium text-gray-800">{localQuantity}</span>

  <button
    onClick={() => handleUpdateQuantity(localQuantity + 1)}
    disabled={loading}
    className="w-10 h-10 flex items-center justify-center border rounded-lg text-lg text-gray-600 hover:bg-gray-100 transition-all"
  >
    +
  </button>
</div>

      </div>

      {/* Remove button */}
      <button
        onClick={() => onRemove(item._id)}
        className="ml-4 text-gray-400 hover:text-red-500 transition"
      >
        ✕
      </button>
    </div>
  );
};

export default CartItem;
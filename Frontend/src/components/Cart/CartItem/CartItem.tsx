import React from "react";

interface CartItemProps {
  item: any;
  selected: boolean;
  onSelect: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}

const CartItem: React.FC<CartItemProps> = ({
  item,
  selected,
  onSelect,
  onUpdateQty,
  onRemove,
}) => {
  return (
    <div className="flex items-center px-6 py-4 border-b last:border-b-0">
      {/* Checkbox chọn sản phẩm */}
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onSelect(item._id)}
        className="mr-4 w-5 h-5"
      />

      <img
        src={`http://localhost:5000${item.imageUrl}`}
        alt={item.name}
        className="w-20 h-20 object-cover rounded border mr-4"
      />

      <div className="flex-1">
        <div className="font-medium text-gray-900">{item.name}</div>
        <div className="text-sm text-gray-500">
          {item.variation?.color && <span>Màu: {item.variation.color} </span>}
          {item.variation?.size && <span>| {item.variation.size}</span>}
          {item.variation?.additionalPrice &&
            item.variation.additionalPrice > 0 && (
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

      <div className="flex items-center gap-2 mx-6">
        <button
          onClick={() => onUpdateQty(item._id, item.quantity - 1)}
          className="w-8 h-8 border rounded text-lg text-gray-600 hover:bg-gray-100"
        >
          -
        </button>
        <span className="w-8 text-center">{item.quantity}</span>
        <button
          onClick={() => onUpdateQty(item._id, item.quantity + 1)}
          className="w-8 h-8 border rounded text-lg text-gray-600 hover:bg-gray-100"
        >
          +
        </button>
      </div>

      <button
        onClick={() => onRemove(item._id)}
        className="ml-4 text-gray-400 hover:text-red-500"
      >
        ✕
      </button>
    </div>
  );
};

export default CartItem;

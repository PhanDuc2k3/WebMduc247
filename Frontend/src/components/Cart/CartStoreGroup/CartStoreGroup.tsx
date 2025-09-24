import React from "react";
import CartItem from "../CartItem/CartItem";

const CartStoreGroup = ({ store, items, selectedItems, onSelect, onUpdateQty, onRemove }: any) => {
  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header cửa hàng */}
      <div className="flex items-center justify-between px-6 py-3 border-b">
        <div className="flex items-center gap-2">
          {store.logoUrl && (
            <img
              src={store.logoUrl}
              alt={store.name}
              className="w-8 h-8 rounded-full border"
            />
          )}
          <span className="font-semibold text-gray-800">{store.name}</span>
        </div>
      </div>

      {/* Sản phẩm */}
      {items.map((item: any) => (
        <CartItem
          key={item._id}
          item={item}
          selected={selectedItems.includes(item._id)}
          onSelect={onSelect}
          onUpdateQty={onUpdateQty}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

export default CartStoreGroup;

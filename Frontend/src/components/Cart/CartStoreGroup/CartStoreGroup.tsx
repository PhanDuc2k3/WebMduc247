import React from "react";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import CartItem from "../CartItem/CartItem";
import type { CartItemType } from "../CartItem/CartItem";

interface GroupedCartItem extends CartItemType {
  storeId: string | { _id: string; name: string; logoUrl?: string };
}

interface Props {
  store: { _id?: string; name: string; logoUrl?: string };
  items: GroupedCartItem[];
  selectedItems: string[];
  onSelect: (id: string) => void;
  onUpdateQty?: (itemId: string, quantity: number) => void;
  onRemove: (id: string) => void;
  cart: { items: GroupedCartItem[] } | null;
}

const CartStoreGroup = ({ store, items, selectedItems, onSelect, onUpdateQty, onRemove, cart }: Props) => {
  const allSelected = items.every((item) => selectedItems.includes(item._id));
  
  // Lấy storeId của store này
  const getStoreId = (item: GroupedCartItem): string => {
    return typeof item.storeId === "string" ? item.storeId : item.storeId._id;
  };
  
  const currentStoreId = items.length > 0 ? getStoreId(items[0]) : null;
  
  // Kiểm tra xem có item từ cửa hàng khác đang được chọn không
  const hasOtherStoreSelected = cart?.items?.some((item) => {
    const itemStoreId = getStoreId(item);
    return itemStoreId !== currentStoreId && selectedItems.includes(item._id);
  }) || false;
  
  // Nếu có cửa hàng khác được chọn, disable checkbox của cửa hàng này
  const isDisabled = hasOtherStoreSelected;
  
  const handleToggleAll = () => {
    if (allSelected) {
      items.forEach((item) => {
        if (selectedItems.includes(item._id)) {
          onSelect(item._id);
        }
      });
    } else {
      // Nếu đã có cửa hàng khác được chọn, bỏ chọn tất cả cửa hàng khác trước
      if (hasOtherStoreSelected) {
        // Bỏ chọn tất cả item từ cửa hàng khác
        cart?.items?.forEach((item) => {
          const itemStoreId = getStoreId(item);
          if (itemStoreId !== currentStoreId && selectedItems.includes(item._id)) {
            onSelect(item._id);
          }
        });
      }
      // Sau đó chọn tất cả item từ cửa hàng này
      items.forEach((item) => {
        if (!selectedItems.includes(item._id)) {
          onSelect(item._id);
        }
      });
    }
  };

  const storeTotal = items.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <div className="cart-store animate-fade-in-up">
      {/* Header cửa hàng */}
      <div className="cart-store__header">
        <div className="flex items-center gap-3">
          <button type="button" className="cart-store__check" onClick={handleToggleAll} disabled={isDisabled} aria-label={allSelected ? "Bỏ chọn cửa hàng" : "Chọn cửa hàng"}>{allSelected ? <CheckCircle2 /> : <Circle />}</button>
          <div className="cart-store__logo">{store.logoUrl ? <img src={store.logoUrl} alt={store.name} /> : <span>{store.name.slice(0, 2).toUpperCase()}</span>}</div>
          <div className="flex flex-col">
            <span className="cart-store__name">{store.name}</span>
            <span className="cart-store__trusted">✓ Gian hàng uy tín · {items.length} sản phẩm · {storeTotal.toLocaleString("vi-VN")}₫</span>
          </div>
        </div>
        {currentStoreId && <Link className="cart-store__visit" to={`/store/${currentStoreId}`}>Xem shop <ExternalLink /></Link>}
      </div>

      {/* Sản phẩm */}
      <div className="cart-store__items">
        {items.map((item, index) => (
          <div
            key={item._id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <CartItem
              item={item}
              selected={selectedItems.includes(item._id)}
              onSelect={onSelect}
              onUpdateQty={onUpdateQty}
              onRemove={onRemove}
              disabled={isDisabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CartStoreGroup;

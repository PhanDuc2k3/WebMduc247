import React from "react";
import { CheckCircle2, Circle } from "lucide-react";
import CartItem from "../CartItem/CartItem";

const CartStoreGroup = ({ store, items, selectedItems, onSelect, onUpdateQty, onRemove, cart }: any) => {
  const allSelected = items.every((item: any) => selectedItems.includes(item._id));
  
  // Lấy storeId của store này
  const getStoreId = (item: any): string => {
    return typeof item.storeId === "string" ? item.storeId : item.storeId._id;
  };
  
  const currentStoreId = items.length > 0 ? getStoreId(items[0]) : null;
  
  // Kiểm tra xem có item từ cửa hàng khác đang được chọn không
  const hasOtherStoreSelected = cart?.items?.some((item: any) => {
    const itemStoreId = getStoreId(item);
    return itemStoreId !== currentStoreId && selectedItems.includes(item._id);
  }) || false;
  
  // Nếu có cửa hàng khác được chọn, disable checkbox của cửa hàng này
  const isDisabled = hasOtherStoreSelected;
  
  const handleToggleAll = () => {
    if (allSelected) {
      items.forEach((item: any) => {
        if (selectedItems.includes(item._id)) {
          onSelect(item._id);
        }
      });
    } else {
      // Nếu đã có cửa hàng khác được chọn, bỏ chọn tất cả cửa hàng khác trước
      if (hasOtherStoreSelected) {
        // Bỏ chọn tất cả item từ cửa hàng khác
        cart?.items?.forEach((item: any) => {
          const itemStoreId = getStoreId(item);
          if (itemStoreId !== currentStoreId && selectedItems.includes(item._id)) {
            onSelect(item._id);
          }
        });
      }
      // Sau đó chọn tất cả item từ cửa hàng này
      items.forEach((item: any) => {
        if (!selectedItems.includes(item._id)) {
          onSelect(item._id);
        }
      });
    }
  };

  const storeTotal = items.reduce((sum: number, item: any) => 
    selectedItems.includes(item._id) ? sum + item.subtotal : sum, 0
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 animate-fade-in-up">
      {/* Header cửa hàng */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b-2 border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            {store.logoUrl && (
              <>
                <div className="absolute inset-0 bg-blue-500 rounded-full blur opacity-30 animate-pulse"></div>
                <img
                  src={store.logoUrl}
                  alt={store.name}
                  className="relative w-12 h-12 rounded-full border-2 border-white shadow-lg object-cover"
                />
              </>
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-gray-900">{store.name}</span>
            <span className="text-xs text-gray-600">
              {items.length} sản phẩm • Tổng: <span className="font-bold text-blue-600">{storeTotal.toLocaleString("vi-VN")}₫</span>
            </span>
          </div>
        </div>
        
        <button
          onClick={handleToggleAll}
          disabled={isDisabled}
          className={`px-3 sm:px-4 py-2 rounded-lg md:rounded-xl border-2 text-xs sm:text-sm font-semibold transition-all duration-300 transform touch-manipulation flex items-center gap-1.5 sm:gap-2 ${
            isDisabled
              ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
              : "border-gray-300 hover:border-blue-500 hover:bg-blue-50 text-gray-700 hover:text-blue-600 hover:scale-105 active:scale-95"
          }`}
        >
          {allSelected ? (
            <>
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <span className="hidden sm:inline">Bỏ chọn tất cả</span>
              <span className="sm:hidden">Bỏ chọn</span>
            </>
          ) : (
            <>
              <Circle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Chọn tất cả</span>
            </>
          )}
        </button>
      </div>

      {/* Sản phẩm */}
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {items.map((item: any, index: number) => (
          <div
            key={item._id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <CartItem
              item={item}
              selected={selectedItems.includes(item._id)}
              onSelect={onSelect}
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

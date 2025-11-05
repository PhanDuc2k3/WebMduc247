import React from "react";
import type { AvailableVoucher } from "../../../api/voucherApi";

interface VoucherBoxProps {
  subtotal: number;
  shippingFee: number;
  selectedItems?: string[]; // IDs của các sản phẩm được chọn
  onPreview: (productDiscount: number, productCode: string | null, freeshipDiscount: number, freeshipCode: string | null) => void;
  onOpenPopup: () => void; // Callback để mở popup
  selectedProductVoucher: AvailableVoucher | null; // Voucher đã chọn từ parent
  selectedFreeshipVoucher: AvailableVoucher | null; // Voucher đã chọn từ parent
  onRemoveProductVoucher: () => void; // Callback để xóa product voucher
  onRemoveFreeshipVoucher: () => void; // Callback để xóa freeship voucher
}

const VoucherBox: React.FC<VoucherBoxProps> = ({ 
  subtotal, 
  shippingFee, 
  selectedItems = [], 
  onPreview,
  onOpenPopup,
  selectedProductVoucher,
  selectedFreeshipVoucher,
  onRemoveProductVoucher,
  onRemoveFreeshipVoucher
}) => {

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-b-2 border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            Mã giảm giá
          </h2>
          <p className="text-gray-600 text-sm mt-1">Chọn voucher để áp dụng giảm giá</p>
        </div>
        <div className="p-6 space-y-4">
          <button
            onClick={() => {
              console.log("🔘 Click chọn voucher button");
              console.log("Subtotal:", subtotal);
              console.log("Selected items:", selectedItems);
              onOpenPopup(); // Gọi callback để mở popup từ parent
            }}
            className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Chọn voucher
          </button>

          {/* Hiển thị voucher đã chọn */}
          {selectedProductVoucher && (
            <div className="border-2 p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border-green-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-bold text-lg">{selectedProductVoucher.title}</div>
                  <div className="text-sm text-gray-600 mt-1">Giảm giá sản phẩm</div>
                  <div className="text-xs text-gray-500 mt-1">Mã: {selectedProductVoucher.code}</div>
                  <div className="text-red-600 font-semibold mt-1">
                    Giảm: {selectedProductVoucher.discount.toLocaleString("vi-VN")}₫
                  </div>
                </div>
                <button
                  onClick={onRemoveProductVoucher}
                  className="text-red-500 hover:text-red-700 text-lg font-bold ml-4"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {selectedFreeshipVoucher && (() => {
            // Tính discount cho freeship với shippingFee hiện tại
            let freeshipDiscount = 0;
            if (selectedFreeshipVoucher.discountType === "fixed") {
              freeshipDiscount = Math.min(selectedFreeshipVoucher.discountValue, shippingFee);
            } else {
              freeshipDiscount = Math.min(
                (shippingFee * selectedFreeshipVoucher.discountValue) / 100,
                selectedFreeshipVoucher.maxDiscount || shippingFee,
                shippingFee
              );
            }
            
            return (
              <div className="border-2 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-bold text-lg">{selectedFreeshipVoucher.title}</div>
                    <div className="text-sm text-gray-600 mt-1">Miễn phí vận chuyển</div>
                    <div className="text-xs text-gray-500 mt-1">Mã: {selectedFreeshipVoucher.code}</div>
                    <div className="text-red-600 font-semibold mt-1">
                      Giảm: {freeshipDiscount.toLocaleString("vi-VN")}₫
                    </div>
                  </div>
                  <button
                    onClick={onRemoveFreeshipVoucher}
                    className="text-red-500 hover:text-red-700 text-lg font-bold ml-4"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })()}

          {!selectedProductVoucher && !selectedFreeshipVoucher && (
            <div className="text-center text-gray-500 text-sm py-2">
              Chưa có voucher nào được chọn
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default VoucherBox;

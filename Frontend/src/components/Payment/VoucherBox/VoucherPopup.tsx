import React, { useState, useEffect } from "react";
import { X, XCircle } from "lucide-react";
import voucherApi from "../../../api/voucherApi";
import type { AvailableVoucher } from "../../../api/voucherApi";
import { toast } from "react-toastify";

interface VoucherPopupProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  shippingFee: number;
  selectedItems?: string[];
  selectedProductVoucher: AvailableVoucher | null;
  selectedFreeshipVoucher: AvailableVoucher | null;
  onSelectProduct: (voucher: AvailableVoucher | null) => void;
  onSelectFreeship: (voucher: AvailableVoucher | null) => void;
}

const VoucherPopup: React.FC<VoucherPopupProps> = ({
  isOpen,
  onClose,
  subtotal,
  shippingFee,
  selectedItems = [],
  selectedProductVoucher,
  selectedFreeshipVoucher,
  onSelectProduct,
  onSelectFreeship,
}) => {
  const [productVouchers, setProductVouchers] = useState<AvailableVoucher[]>([]);
  const [freeshipVouchers, setFreeshipVouchers] = useState<AvailableVoucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"product" | "freeship">("product");

  useEffect(() => {
    if (isOpen) {
      fetchAvailableVouchers();
    }
  }, [isOpen, subtotal, selectedItems]);

  const fetchAvailableVouchers = async () => {
    try {
      setLoading(true);
      const res = await voucherApi.getAvailableVouchersForCheckout({
        subtotal,
        selectedItems,
      });
      const data = res.data;
      console.log("✅ Available vouchers response:", data);
      console.log("Product vouchers:", data.productVouchers);
      console.log("Freeship vouchers:", data.freeshipVouchers);
      setProductVouchers(data.productVouchers || []);
      setFreeshipVouchers(data.freeshipVouchers || []);
    } catch (error: any) {
      console.error("Lỗi lấy danh sách voucher:", error);
      toast.error(
        "Không thể tải danh sách voucher. Vui lòng thử lại sau.",
        { containerId: "general-toast" }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProductVoucher = (voucher: AvailableVoucher) => {
    if (selectedProductVoucher?.code === voucher.code) {
      onSelectProduct(null);
    } else {
      onSelectProduct(voucher);
    }
  };

  const handleSelectFreeshipVoucher = (voucher: AvailableVoucher) => {
    if (selectedFreeshipVoucher?.code === voucher.code) {
      onSelectFreeship(null);
    } else {
      onSelectFreeship(voucher);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => {
        // Đóng popup khi click vào backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] overflow-hidden flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 sm:p-6 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl sm:text-2xl font-bold">Chọn voucher</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-gray-200 flex-shrink-0">
          <button
            onClick={() => setActiveTab("product")}
            className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 font-semibold text-sm sm:text-base transition-colors ${
              activeTab === "product"
                ? "bg-green-50 text-green-600 border-b-2 border-green-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Giảm giá sản phẩm ({productVouchers.length})
          </button>
          <button
            onClick={() => setActiveTab("freeship")}
            className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 font-semibold text-sm sm:text-base transition-colors ${
              activeTab === "freeship"
                ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Miễn phí vận chuyển ({freeshipVouchers.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base">Đang tải...</div>
          ) : activeTab === "product" ? (
            productVouchers.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base">
                Không có voucher giảm giá sản phẩm khả dụng
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {productVouchers.map((voucher) => {
                  const isSelected = selectedProductVoucher?.code === voucher.code;
                  return (
                    <div
                      key={voucher.id}
                      onClick={() => handleSelectProductVoucher(voucher)}
                      className={`border-2 rounded-lg sm:rounded-xl p-4 sm:p-5 cursor-pointer transition-all ${
                        isSelected
                          ? "border-green-500 bg-green-50 shadow-lg"
                          : "border-gray-200 hover:border-green-300 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                            <h3 className="font-bold text-base sm:text-lg break-words">{voucher.title}</h3>
                            <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold whitespace-nowrap">
                              {voucher.code}
                            </span>
                            {voucher.isGlobal && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs whitespace-nowrap">
                                Toàn hệ thống
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-xs sm:text-sm mb-2 break-words">{voucher.description}</p>
                          <p className="text-gray-500 text-xs mb-2 break-words">{voucher.condition}</p>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-1 text-xs sm:text-sm">
                            <span className="text-gray-600 break-words">
                              Áp dụng cho: {voucher.storeName}
                            </span>
                            {voucher.minOrderValue > 0 && (
                              <span className="text-gray-600 break-words">
                                Đơn tối thiểu: {voucher.minOrderValue.toLocaleString("vi-VN")}₫
                              </span>
                            )}
                          </div>
                          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                            <span className="text-red-600 font-bold text-lg sm:text-xl">
                              Giảm {voucher.discount.toLocaleString("vi-VN")}₫
                            </span>
                            {voucher.discountType === "percent" && (
                              <span className="text-gray-600 text-xs sm:text-sm sm:ml-2 break-words">
                                ({voucher.discountValue}% tối đa {voucher.maxDiscount?.toLocaleString("vi-VN")}₫)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-2 sm:ml-4 flex-shrink-0">
                          <div
                            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? "border-green-500 bg-green-500"
                                : "border-gray-300"
                            }`}
                          >
                            {isSelected && (
                              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : freeshipVouchers.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base">
              Không có voucher miễn phí vận chuyển khả dụng
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {freeshipVouchers.map((voucher) => {
                const isSelected = selectedFreeshipVoucher?.code === voucher.code;
                // Tính discount cho freeship với shippingFee hiện tại
                let freeshipDiscount = 0;
                if (voucher.discountType === "fixed") {
                  freeshipDiscount = Math.min(voucher.discountValue, shippingFee);
                } else {
                  freeshipDiscount = Math.min(
                    (shippingFee * voucher.discountValue) / 100,
                    voucher.maxDiscount || shippingFee,
                    shippingFee
                  );
                }

                return (
                  <div
                    key={voucher.id}
                    onClick={() => handleSelectFreeshipVoucher(voucher)}
                    className={`border-2 rounded-lg sm:rounded-xl p-4 sm:p-5 cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 shadow-lg"
                        : "border-gray-200 hover:border-blue-300 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                          <h3 className="font-bold text-base sm:text-lg break-words">{voucher.title}</h3>
                          <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold whitespace-nowrap">
                            {voucher.code}
                          </span>
                          {voucher.isGlobal && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs whitespace-nowrap">
                              Toàn hệ thống
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-xs sm:text-sm mb-2 break-words">{voucher.description}</p>
                        <p className="text-gray-500 text-xs mb-2 break-words">{voucher.condition}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-1 text-xs sm:text-sm">
                          <span className="text-gray-600 break-words">
                            Áp dụng cho: {voucher.storeName}
                          </span>
                          {voucher.minOrderValue > 0 && (
                            <span className="text-gray-600 break-words">
                              Đơn tối thiểu: {voucher.minOrderValue.toLocaleString("vi-VN")}₫
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                          <span className="text-red-600 font-bold text-lg sm:text-xl">
                            Giảm {freeshipDiscount.toLocaleString("vi-VN")}₫ phí vận chuyển
                          </span>
                          {voucher.discountType === "percent" && (
                            <span className="text-gray-600 text-xs sm:text-sm sm:ml-2 break-words">
                              ({voucher.discountValue}% tối đa {voucher.maxDiscount?.toLocaleString("vi-VN")}₫)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-2 sm:ml-4 flex-shrink-0">
                        <div
                          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? "border-blue-500 bg-blue-500"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 p-4 sm:p-6 flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-300 transition-colors text-sm sm:text-base"
          >
            Đóng
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg sm:rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoucherPopup;

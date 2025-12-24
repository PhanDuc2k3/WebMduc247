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
  selectedSystemVoucher: AvailableVoucher | null; // Voucher hệ thống
  selectedFreeshipVoucher: AvailableVoucher | null; // Voucher freeship
  selectedStoreVoucher: AvailableVoucher | null; // Voucher cửa hàng
  onSelectSystem: (voucher: AvailableVoucher | null) => void;
  onSelectFreeship: (voucher: AvailableVoucher | null) => void;
  onSelectStore: (voucher: AvailableVoucher | null) => void;
}

const VoucherPopup: React.FC<VoucherPopupProps> = ({
  isOpen,
  onClose,
  subtotal,
  shippingFee,
  selectedItems = [],
  selectedSystemVoucher,
  selectedFreeshipVoucher,
  selectedStoreVoucher,
  onSelectSystem,
  onSelectFreeship,
  onSelectStore,
}) => {
  const [productVouchers, setProductVouchers] = useState<AvailableVoucher[]>([]);
  const [freeshipVouchers, setFreeshipVouchers] = useState<AvailableVoucher[]>([]);
  const [storeVouchers, setStoreVouchers] = useState<AvailableVoucher[]>([]);
  const [systemVouchers, setSystemVouchers] = useState<AvailableVoucher[]>([]); // Voucher hệ thống (global)
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"system" | "freeship" | "store">("system");

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
      console.log("Store vouchers:", data.storeVouchers);
      
      // Phân loại voucher hệ thống (global = true) từ tất cả voucher
      const allVouchers = [...(data.productVouchers || []), ...(data.freeshipVouchers || [])];
      const system = allVouchers.filter((v: AvailableVoucher) => v.isGlobal);
      
      setProductVouchers(data.productVouchers || []);
      setFreeshipVouchers(data.freeshipVouchers || []);
      setStoreVouchers(data.storeVouchers || []);
      setSystemVouchers(system);
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

  const handleSelectSystemVoucher = (voucher: AvailableVoucher) => {
    if (selectedSystemVoucher?.code === voucher.code) {
      onSelectSystem(null);
    } else {
      onSelectSystem(voucher);
    }
  };

  const handleSelectFreeshipVoucher = (voucher: AvailableVoucher) => {
    if (selectedFreeshipVoucher?.code === voucher.code) {
      onSelectFreeship(null);
    } else {
      onSelectFreeship(voucher);
    }
  };

  const handleSelectStoreVoucher = (voucher: AvailableVoucher) => {
    if (selectedStoreVoucher?.code === voucher.code) {
      onSelectStore(null);
    } else {
      onSelectStore(voucher);
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
        <div className="bg-[#2F5FEB] text-white p-4 sm:p-6 flex items-center justify-between flex-shrink-0">
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
            onClick={() => setActiveTab("system")}
            className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 font-semibold text-sm sm:text-base transition-colors ${
              activeTab === "system"
                ? "bg-[#2F5FEB]/8 text-[#2F5FEB] border-b-2 border-[#2F5FEB]"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Voucher hệ thống ({systemVouchers.length})
          </button>
          <button
            onClick={() => setActiveTab("freeship")}
            className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 font-semibold text-sm sm:text-base transition-colors ${
              activeTab === "freeship"
                ? "bg-[#2F5FEB]/8 text-[#2F5FEB] border-b-2 border-[#2F5FEB]"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Voucher freeship ({freeshipVouchers.length})
          </button>
          <button
            onClick={() => setActiveTab("store")}
            className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 font-semibold text-sm sm:text-base transition-colors ${
              activeTab === "store"
                ? "bg-[#2F5FEB]/8 text-[#2F5FEB] border-b-2 border-[#2F5FEB]"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Voucher cửa hàng ({storeVouchers.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base">Đang tải...</div>
          ) : activeTab === "system" ? (
            systemVouchers.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base">
                Không có voucher hệ thống khả dụng
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {systemVouchers.map((voucher) => {
                  const isSelected = selectedSystemVoucher?.code === voucher.code;
                  // Tính discount dựa trên voucherType
                  let discount = voucher.discount;
                  if (voucher.voucherType === "freeship") {
                    if (voucher.discountType === "fixed") {
                      discount = Math.min(voucher.discountValue, shippingFee);
                    } else {
                      discount = Math.min(
                        (shippingFee * voucher.discountValue) / 100,
                        voucher.maxDiscount || shippingFee,
                        shippingFee
                      );
                    }
                  }
                  
                  return (
                    <div
                      key={voucher.id}
                      onClick={() => handleSelectSystemVoucher(voucher)}
                      className={`border-2 rounded-lg sm:rounded-xl p-4 sm:p-5 cursor-pointer transition-all ${
                        isSelected
                          ? "border-[#2F5FEB] bg-[#2F5FEB]/6 shadow-lg"
                          : "border-gray-200 hover:border-[#2F5FEB] hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                            <h3 className="font-bold text-base sm:text-lg break-words">{voucher.title}</h3>
                            <span className="px-2 sm:px-3 py-1 bg-[#2F5FEB]/10 text-[#2F5FEB] rounded-full text-xs font-semibold whitespace-nowrap">
                              {voucher.code}
                            </span>
                            <span className="px-2 py-1 bg-[#2F5FEB]/10 text-[#2F5FEB] rounded-full text-xs whitespace-nowrap">
                              Hệ thống
                            </span>
                            {voucher.voucherType === "freeship" && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs whitespace-nowrap">
                                Freeship
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
                              {voucher.voucherType === "freeship" 
                                ? `Giảm ${discount.toLocaleString("vi-VN")}₫ phí vận chuyển`
                                : `Giảm ${discount.toLocaleString("vi-VN")}₫`}
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
                                ? "border-[#2F5FEB] bg-[#2F5FEB]"
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
          ) : activeTab === "freeship" ? (
            freeshipVouchers.length === 0 ? (
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
                        ? "border-[#2F5FEB] bg-[#2F5FEB]/6 shadow-lg"
                        : "border-gray-200 hover:border-[#2F5FEB] hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                          <h3 className="font-bold text-base sm:text-lg break-words">{voucher.title}</h3>
                          <span className="px-2 sm:px-3 py-1 bg-[#2F5FEB]/10 text-[#2F5FEB] rounded-full text-xs font-semibold whitespace-nowrap">
                            {voucher.code}
                          </span>
                          {voucher.isGlobal && (
                            <span className="px-2 py-1 bg-[#2F5FEB]/10 text-[#2F5FEB] rounded-full text-xs whitespace-nowrap">
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
                              ? "border-[#2F5FEB] bg-[#2F5FEB]"
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
          ) : activeTab === "store" ? (
            storeVouchers.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base">
                Không có voucher cửa hàng khả dụng
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {storeVouchers.map((voucher) => {
                  const isSelected = selectedStoreVoucher?.code === voucher.code;
                  
                  // Tính discount
                  let discount = 0;
                  if (voucher.voucherType === "freeship") {
                    if (voucher.discountType === "fixed") {
                      discount = Math.min(voucher.discountValue, shippingFee);
                    } else {
                      discount = Math.min(
                        (shippingFee * voucher.discountValue) / 100,
                        voucher.maxDiscount || shippingFee,
                        shippingFee
                      );
                    }
                  } else {
                    discount = voucher.discount;
                  }

                  return (
                    <div
                      key={voucher.id}
                      onClick={() => handleSelectStoreVoucher(voucher)}
                      className={`border-2 rounded-lg sm:rounded-xl p-4 sm:p-5 cursor-pointer transition-all ${
                        isSelected
                          ? "border-[#2F5FEB] bg-[#2F5FEB]/6 shadow-lg"
                          : "border-gray-200 hover:border-[#2F5FEB] hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                            <h3 className="font-bold text-base sm:text-lg break-words">{voucher.title}</h3>
                            <span className="px-2 sm:px-3 py-1 bg-[#2F5FEB]/10 text-[#2F5FEB] rounded-full text-xs font-semibold whitespace-nowrap">
                              {voucher.code}
                            </span>
                            <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded-full text-xs whitespace-nowrap">
                              Cửa hàng
                            </span>
                            {voucher.voucherType === "freeship" && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs whitespace-nowrap">
                                Freeship
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
                              {voucher.voucherType === "freeship" 
                                ? `Giảm ${discount.toLocaleString("vi-VN")}₫ phí vận chuyển`
                                : `Giảm ${discount.toLocaleString("vi-VN")}₫`}
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
                                ? "border-[#2F5FEB] bg-[#2F5FEB]"
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
          ) : null}
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
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-[#2F5FEB] text-white rounded-lg sm:rounded-xl font-semibold hover:bg-[#244ACC] transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoucherPopup;

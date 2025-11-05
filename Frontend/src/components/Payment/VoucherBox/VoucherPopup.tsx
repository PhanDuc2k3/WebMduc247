import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import voucherApi from "../../../api/voucherApi";
import type { AvailableVoucher } from "../../../api/voucherApi";

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
      alert(error.response?.data?.message || "Lỗi khi tải danh sách voucher");
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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4"
      onClick={(e) => {
        // Đóng popup khi click vào backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Chọn voucher</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-gray-200">
          <button
            onClick={() => setActiveTab("product")}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              activeTab === "product"
                ? "bg-green-50 text-green-600 border-b-2 border-green-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Giảm giá sản phẩm ({productVouchers.length})
          </button>
          <button
            onClick={() => setActiveTab("freeship")}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              activeTab === "freeship"
                ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Miễn phí vận chuyển ({freeshipVouchers.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Đang tải...</div>
          ) : activeTab === "product" ? (
            productVouchers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Không có voucher giảm giá sản phẩm khả dụng
              </div>
            ) : (
              <div className="grid gap-4">
                {productVouchers.map((voucher) => {
                  const isSelected = selectedProductVoucher?.code === voucher.code;
                  return (
                    <div
                      key={voucher.id}
                      onClick={() => handleSelectProductVoucher(voucher)}
                      className={`border-2 rounded-xl p-5 cursor-pointer transition-all ${
                        isSelected
                          ? "border-green-500 bg-green-50 shadow-lg"
                          : "border-gray-200 hover:border-green-300 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg">{voucher.title}</h3>
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              {voucher.code}
                            </span>
                            {voucher.isGlobal && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                Toàn hệ thống
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{voucher.description}</p>
                          <p className="text-gray-500 text-xs mb-2">{voucher.condition}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-600">
                              Áp dụng cho: {voucher.storeName}
                            </span>
                            {voucher.minOrderValue > 0 && (
                              <span className="text-gray-600">
                                Đơn tối thiểu: {voucher.minOrderValue.toLocaleString("vi-VN")}₫
                              </span>
                            )}
                          </div>
                          <div className="mt-3">
                            <span className="text-red-600 font-bold text-xl">
                              Giảm {voucher.discount.toLocaleString("vi-VN")}₫
                            </span>
                            {voucher.discountType === "percent" && (
                              <span className="text-gray-600 ml-2">
                                ({voucher.discountValue}% tối đa {voucher.maxDiscount?.toLocaleString("vi-VN")}₫)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? "border-green-500 bg-green-500"
                                : "border-gray-300"
                            }`}
                          >
                            {isSelected && (
                              <div className="w-3 h-3 rounded-full bg-white" />
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
            <div className="text-center py-12 text-gray-500">
              Không có voucher miễn phí vận chuyển khả dụng
            </div>
          ) : (
            <div className="grid gap-4">
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
                    className={`border-2 rounded-xl p-5 cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 shadow-lg"
                        : "border-gray-200 hover:border-blue-300 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg">{voucher.title}</h3>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            {voucher.code}
                          </span>
                          {voucher.isGlobal && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                              Toàn hệ thống
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm mb-2">{voucher.description}</p>
                        <p className="text-gray-500 text-xs mb-2">{voucher.condition}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600">
                            Áp dụng cho: {voucher.storeName}
                          </span>
                          {voucher.minOrderValue > 0 && (
                            <span className="text-gray-600">
                              Đơn tối thiểu: {voucher.minOrderValue.toLocaleString("vi-VN")}₫
                            </span>
                          )}
                        </div>
                        <div className="mt-3">
                          <span className="text-red-600 font-bold text-xl">
                            Giảm {freeshipDiscount.toLocaleString("vi-VN")}₫ phí vận chuyển
                          </span>
                          {voucher.discountType === "percent" && (
                            <span className="text-gray-600 ml-2">
                              ({voucher.discountValue}% tối đa {voucher.maxDiscount?.toLocaleString("vi-VN")}₫)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? "border-blue-500 bg-blue-500"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-3 h-3 rounded-full bg-white" />
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
        <div className="border-t-2 border-gray-200 p-6 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoucherPopup;

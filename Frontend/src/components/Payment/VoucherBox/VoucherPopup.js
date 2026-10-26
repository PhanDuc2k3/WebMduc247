import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import { X, XCircle } from "lucide-react";
import voucherApi from "../../../api/voucherApi";
import { toast } from "react-toastify";
const VoucherPopup = ({ isOpen, onClose, subtotal, shippingFee, selectedItems = [], selectedSystemVoucher, selectedFreeshipVoucher, selectedStoreVoucher, onSelectSystem, onSelectFreeship, onSelectStore, }) => {
    const [productVouchers, setProductVouchers] = useState([]);
    const [freeshipVouchers, setFreeshipVouchers] = useState([]);
    const [storeVouchers, setStoreVouchers] = useState([]);
    const [systemVouchers, setSystemVouchers] = useState([]); // Voucher hệ thống (global)
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("system");
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
            const system = allVouchers.filter((v) => v.isGlobal);
            setProductVouchers(data.productVouchers || []);
            setFreeshipVouchers(data.freeshipVouchers || []);
            setStoreVouchers(data.storeVouchers || []);
            setSystemVouchers(system);
        }
        catch (error) {
            console.error("Lỗi lấy danh sách voucher:", error);
            toast.error("Không thể tải danh sách voucher. Vui lòng thử lại sau.", { containerId: "general-toast" });
        }
        finally {
            setLoading(false);
        }
    };
    const handleSelectSystemVoucher = (voucher) => {
        if (selectedSystemVoucher?.code === voucher.code) {
            onSelectSystem(null);
        }
        else {
            onSelectSystem(voucher);
        }
    };
    const handleSelectFreeshipVoucher = (voucher) => {
        if (selectedFreeshipVoucher?.code === voucher.code) {
            onSelectFreeship(null);
        }
        else {
            onSelectFreeship(voucher);
        }
    };
    const handleSelectStoreVoucher = (voucher) => {
        if (selectedStoreVoucher?.code === voucher.code) {
            onSelectStore(null);
        }
        else {
            onSelectStore(voucher);
        }
    };
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-0 sm:p-4", onClick: (e) => {
            // Đóng popup khi click vào backdrop
            if (e.target === e.currentTarget) {
                onClose();
            }
        }, children: _jsxs("div", { className: "bg-white rounded-none sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] overflow-hidden flex flex-col animate-scale-in", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "bg-[#4B5563] text-white p-4 sm:p-6 flex items-center justify-between flex-shrink-0", children: [_jsx("h2", { className: "text-xl sm:text-2xl font-bold", children: "Ch\u1ECDn voucher" }), _jsx("button", { onClick: onClose, className: "p-2 hover:bg-white/20 rounded-full transition-colors", children: _jsx(X, { className: "w-5 h-5 sm:w-6 sm:h-6" }) })] }), _jsxs("div", { className: "flex border-b-2 border-gray-200 flex-shrink-0", children: [_jsxs("button", { onClick: () => setActiveTab("system"), className: `flex-1 py-3 sm:py-4 px-4 sm:px-6 font-semibold text-sm sm:text-base transition-colors ${activeTab === "system"
                                ? "bg-[#4B5563]/8 text-[#4B5563] border-b-2 border-[#4B5563]"
                                : "text-gray-600 hover:bg-gray-50"}`, children: ["Voucher h\u1EC7 th\u1ED1ng (", systemVouchers.length, ")"] }), _jsxs("button", { onClick: () => setActiveTab("freeship"), className: `flex-1 py-3 sm:py-4 px-4 sm:px-6 font-semibold text-sm sm:text-base transition-colors ${activeTab === "freeship"
                                ? "bg-[#4B5563]/8 text-[#4B5563] border-b-2 border-[#4B5563]"
                                : "text-gray-600 hover:bg-gray-50"}`, children: ["Voucher freeship (", freeshipVouchers.length, ")"] }), _jsxs("button", { onClick: () => setActiveTab("store"), className: `flex-1 py-3 sm:py-4 px-4 sm:px-6 font-semibold text-sm sm:text-base transition-colors ${activeTab === "store"
                                ? "bg-[#4B5563]/8 text-[#4B5563] border-b-2 border-[#4B5563]"
                                : "text-gray-600 hover:bg-gray-50"}`, children: ["Voucher c\u1EEDa h\u00E0ng (", storeVouchers.length, ")"] })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-4 sm:p-6", children: loading ? (_jsx("div", { className: "text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base", children: "\u0110ang t\u1EA3i..." })) : activeTab === "system" ? (systemVouchers.length === 0 ? (_jsx("div", { className: "text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base", children: "Kh\u00F4ng c\u00F3 voucher h\u1EC7 th\u1ED1ng kh\u1EA3 d\u1EE5ng" })) : (_jsx("div", { className: "grid gap-3 sm:gap-4", children: systemVouchers.map((voucher) => {
                            const isSelected = selectedSystemVoucher?.code === voucher.code;
                            // Tính discount dựa trên voucherType
                            let discount = voucher.discount;
                            if (voucher.voucherType === "freeship") {
                                if (voucher.discountType === "fixed") {
                                    discount = Math.min(voucher.discountValue, shippingFee);
                                }
                                else {
                                    discount = Math.min((shippingFee * voucher.discountValue) / 100, voucher.maxDiscount || shippingFee, shippingFee);
                                }
                            }
                            return (_jsx("div", { onClick: () => handleSelectSystemVoucher(voucher), className: `border-2 rounded-lg sm:rounded-xl p-4 sm:p-5 cursor-pointer transition-all ${isSelected
                                    ? "border-[#4B5563] bg-[#4B5563]/6 shadow-lg"
                                    : "border-gray-200 hover:border-[#4B5563] hover:shadow-md"}`, children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2 sm:gap-3 mb-2", children: [_jsx("h3", { className: "font-bold text-base sm:text-lg break-words", children: voucher.title }), _jsx("span", { className: "px-2 sm:px-3 py-1 bg-[#4B5563]/10 text-[#4B5563] rounded-full text-xs font-semibold whitespace-nowrap", children: voucher.code }), _jsx("span", { className: "px-2 py-1 bg-[#4B5563]/10 text-[#4B5563] rounded-full text-xs whitespace-nowrap", children: "H\u1EC7 th\u1ED1ng" }), voucher.voucherType === "freeship" && (_jsx("span", { className: "px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs whitespace-nowrap", children: "Freeship" }))] }), _jsx("p", { className: "text-gray-600 text-xs sm:text-sm mb-2 break-words", children: voucher.description }), _jsx("p", { className: "text-gray-500 text-xs mb-2 break-words", children: voucher.condition }), _jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-1 text-xs sm:text-sm", children: [_jsxs("span", { className: "text-gray-600 break-words", children: ["\u00C1p d\u1EE5ng cho: ", voucher.storeName] }), voucher.minOrderValue > 0 && (_jsxs("span", { className: "text-gray-600 break-words", children: ["\u0110\u01A1n t\u1ED1i thi\u1EC3u: ", voucher.minOrderValue.toLocaleString("vi-VN"), "\u20AB"] }))] }), _jsxs("div", { className: "mt-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0", children: [_jsx("span", { className: "text-red-600 font-bold text-lg sm:text-xl", children: voucher.voucherType === "freeship"
                                                                ? `Giảm ${discount.toLocaleString("vi-VN")}₫ phí vận chuyển`
                                                                : `Giảm ${discount.toLocaleString("vi-VN")}₫` }), voucher.discountType === "percent" && (_jsxs("span", { className: "text-gray-600 text-xs sm:text-sm sm:ml-2 break-words", children: ["(", voucher.discountValue, "% t\u1ED1i \u0111a ", voucher.maxDiscount?.toLocaleString("vi-VN"), "\u20AB)"] }))] })] }), _jsx("div", { className: "ml-2 sm:ml-4 flex-shrink-0", children: _jsx("div", { className: `w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center ${isSelected
                                                    ? "border-[#4B5563] bg-[#4B5563]"
                                                    : "border-gray-300"}`, children: isSelected && (_jsx("div", { className: "w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white" })) }) })] }) }, voucher.id));
                        }) }))) : activeTab === "freeship" ? (freeshipVouchers.length === 0 ? (_jsx("div", { className: "text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base", children: "Kh\u00F4ng c\u00F3 voucher mi\u1EC5n ph\u00ED v\u1EADn chuy\u1EC3n kh\u1EA3 d\u1EE5ng" })) : (_jsx("div", { className: "grid gap-3 sm:gap-4", children: freeshipVouchers.map((voucher) => {
                            const isSelected = selectedFreeshipVoucher?.code === voucher.code;
                            // Tính discount cho freeship với shippingFee hiện tại
                            let freeshipDiscount = 0;
                            if (voucher.discountType === "fixed") {
                                freeshipDiscount = Math.min(voucher.discountValue, shippingFee);
                            }
                            else {
                                freeshipDiscount = Math.min((shippingFee * voucher.discountValue) / 100, voucher.maxDiscount || shippingFee, shippingFee);
                            }
                            return (_jsx("div", { onClick: () => handleSelectFreeshipVoucher(voucher), className: `border-2 rounded-lg sm:rounded-xl p-4 sm:p-5 cursor-pointer transition-all ${isSelected
                                    ? "border-[#4B5563] bg-[#4B5563]/6 shadow-lg"
                                    : "border-gray-200 hover:border-[#4B5563] hover:shadow-md"}`, children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2 sm:gap-3 mb-2", children: [_jsx("h3", { className: "font-bold text-base sm:text-lg break-words", children: voucher.title }), _jsx("span", { className: "px-2 sm:px-3 py-1 bg-[#4B5563]/10 text-[#4B5563] rounded-full text-xs font-semibold whitespace-nowrap", children: voucher.code }), voucher.isGlobal && (_jsx("span", { className: "px-2 py-1 bg-[#4B5563]/10 text-[#4B5563] rounded-full text-xs whitespace-nowrap", children: "To\u00E0n h\u1EC7 th\u1ED1ng" }))] }), _jsx("p", { className: "text-gray-600 text-xs sm:text-sm mb-2 break-words", children: voucher.description }), _jsx("p", { className: "text-gray-500 text-xs mb-2 break-words", children: voucher.condition }), _jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-1 text-xs sm:text-sm", children: [_jsxs("span", { className: "text-gray-600 break-words", children: ["\u00C1p d\u1EE5ng cho: ", voucher.storeName] }), voucher.minOrderValue > 0 && (_jsxs("span", { className: "text-gray-600 break-words", children: ["\u0110\u01A1n t\u1ED1i thi\u1EC3u: ", voucher.minOrderValue.toLocaleString("vi-VN"), "\u20AB"] }))] }), _jsxs("div", { className: "mt-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0", children: [_jsxs("span", { className: "text-red-600 font-bold text-lg sm:text-xl", children: ["Gi\u1EA3m ", freeshipDiscount.toLocaleString("vi-VN"), "\u20AB ph\u00ED v\u1EADn chuy\u1EC3n"] }), voucher.discountType === "percent" && (_jsxs("span", { className: "text-gray-600 text-xs sm:text-sm sm:ml-2 break-words", children: ["(", voucher.discountValue, "% t\u1ED1i \u0111a ", voucher.maxDiscount?.toLocaleString("vi-VN"), "\u20AB)"] }))] })] }), _jsx("div", { className: "ml-2 sm:ml-4 flex-shrink-0", children: _jsx("div", { className: `w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center ${isSelected
                                                    ? "border-[#4B5563] bg-[#4B5563]"
                                                    : "border-gray-300"}`, children: isSelected && (_jsx("div", { className: "w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white" })) }) })] }) }, voucher.id));
                        }) }))) : activeTab === "store" ? (storeVouchers.length === 0 ? (_jsx("div", { className: "text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base", children: "Kh\u00F4ng c\u00F3 voucher c\u1EEDa h\u00E0ng kh\u1EA3 d\u1EE5ng" })) : (_jsx("div", { className: "grid gap-3 sm:gap-4", children: storeVouchers.map((voucher) => {
                            const isSelected = selectedStoreVoucher?.code === voucher.code;
                            // Tính discount
                            let discount = 0;
                            if (voucher.voucherType === "freeship") {
                                if (voucher.discountType === "fixed") {
                                    discount = Math.min(voucher.discountValue, shippingFee);
                                }
                                else {
                                    discount = Math.min((shippingFee * voucher.discountValue) / 100, voucher.maxDiscount || shippingFee, shippingFee);
                                }
                            }
                            else {
                                discount = voucher.discount;
                            }
                            return (_jsx("div", { onClick: () => handleSelectStoreVoucher(voucher), className: `border-2 rounded-lg sm:rounded-xl p-4 sm:p-5 cursor-pointer transition-all ${isSelected
                                    ? "border-[#4B5563] bg-[#4B5563]/6 shadow-lg"
                                    : "border-gray-200 hover:border-[#4B5563] hover:shadow-md"}`, children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2 sm:gap-3 mb-2", children: [_jsx("h3", { className: "font-bold text-base sm:text-lg break-words", children: voucher.title }), _jsx("span", { className: "px-2 sm:px-3 py-1 bg-[#4B5563]/10 text-[#4B5563] rounded-full text-xs font-semibold whitespace-nowrap", children: voucher.code }), _jsx("span", { className: "px-2 py-1 bg-orange-100 text-orange-600 rounded-full text-xs whitespace-nowrap", children: "C\u1EEDa h\u00E0ng" }), voucher.voucherType === "freeship" && (_jsx("span", { className: "px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs whitespace-nowrap", children: "Freeship" }))] }), _jsx("p", { className: "text-gray-600 text-xs sm:text-sm mb-2 break-words", children: voucher.description }), _jsx("p", { className: "text-gray-500 text-xs mb-2 break-words", children: voucher.condition }), _jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-1 text-xs sm:text-sm", children: [_jsxs("span", { className: "text-gray-600 break-words", children: ["\u00C1p d\u1EE5ng cho: ", voucher.storeName] }), voucher.minOrderValue > 0 && (_jsxs("span", { className: "text-gray-600 break-words", children: ["\u0110\u01A1n t\u1ED1i thi\u1EC3u: ", voucher.minOrderValue.toLocaleString("vi-VN"), "\u20AB"] }))] }), _jsxs("div", { className: "mt-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0", children: [_jsx("span", { className: "text-red-600 font-bold text-lg sm:text-xl", children: voucher.voucherType === "freeship"
                                                                ? `Giảm ${discount.toLocaleString("vi-VN")}₫ phí vận chuyển`
                                                                : `Giảm ${discount.toLocaleString("vi-VN")}₫` }), voucher.discountType === "percent" && (_jsxs("span", { className: "text-gray-600 text-xs sm:text-sm sm:ml-2 break-words", children: ["(", voucher.discountValue, "% t\u1ED1i \u0111a ", voucher.maxDiscount?.toLocaleString("vi-VN"), "\u20AB)"] }))] })] }), _jsx("div", { className: "ml-2 sm:ml-4 flex-shrink-0", children: _jsx("div", { className: `w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center ${isSelected
                                                    ? "border-[#4B5563] bg-[#4B5563]"
                                                    : "border-gray-300"}`, children: isSelected && (_jsx("div", { className: "w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white" })) }) })] }) }, voucher.id));
                        }) }))) : null }), _jsxs("div", { className: "border-t-2 border-gray-200 p-4 sm:p-6 flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 flex-shrink-0", children: [_jsx("button", { onClick: onClose, className: "w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-300 transition-colors text-sm sm:text-base", children: "\u0110\u00F3ng" }), _jsx("button", { onClick: onClose, className: "w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-[#4B5563] text-white rounded-lg sm:rounded-xl font-semibold hover:bg-[#374151] transition-all shadow-lg hover:shadow-xl text-sm sm:text-base", children: "X\u00E1c nh\u1EADn" })] })] }) }));
};
export default VoucherPopup;

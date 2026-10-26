import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from "react";
import { Package, CheckCircle, XCircle } from "lucide-react";
import ConfirmDialog from "../../ui/ConfirmDialog";
import orderApi from "../../../api/orderApi";
import { toast } from "react-toastify";
const BuyerConfirmDelivery = ({ orderId, onConfirm }) => {
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const handleConfirmClick = () => {
        setShowConfirm(true);
    };
    const handleConfirm = async () => {
        setShowConfirm(false);
        setLoading(true);
        try {
            const response = await orderApi.confirmDelivery(orderId);
            toast.success(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CheckCircle, { className: "text-green-500", size: 18 }), _jsx("span", { children: "X\u00E1c nh\u1EADn nh\u1EADn h\u00E0ng th\u00E0nh c\u00F4ng!" })] }));
            onConfirm();
        }
        catch (err) {
            console.error("Lỗi xác nhận nhận hàng:", err);
            const errorMessage = err.response?.data?.message
                || err.message
                || "Lỗi khi xác nhận nhận hàng!";
            toast.error(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(XCircle, { className: "text-red-500", size: 18 }), _jsxs("span", { children: ["L\u1ED7i: ", errorMessage] })] }));
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up", children: [_jsxs("div", { className: "bg-[#4B5563]/5 p-4 sm:p-6 border-b-2 border-gray-200", children: [_jsxs("h2", { className: "text-xl sm:text-2xl font-bold text-[#4B5563] flex items-center gap-2 sm:gap-3", children: [_jsx(Package, { size: 20, className: "sm:w-6 sm:h-6 text-[#4B5563]" }), "X\u00E1c nh\u1EADn nh\u1EADn h\u00E0ng"] }), _jsx("p", { className: "text-gray-600 text-xs sm:text-sm mt-1", children: "\u0110\u01A1n h\u00E0ng \u0111\u00E3 \u0111\u01B0\u1EE3c giao, vui l\u00F2ng x\u00E1c nh\u1EADn b\u1EA1n \u0111\u00E3 nh\u1EADn \u0111\u01B0\u1EE3c h\u00E0ng" })] }), _jsx("div", { className: "p-4 sm:p-6", children: _jsx("button", { onClick: handleConfirmClick, disabled: loading, className: `w-full px-4 sm:px-6 py-2.5 sm:py-3 text-white text-sm sm:text-base font-bold rounded-lg sm:rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 ${loading
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-[#4B5563] hover:bg-[#374151]"}`, children: loading ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" }), _jsx("span", { children: "\u0110ang x\u00E1c nh\u1EADn..." })] })) : (_jsxs(_Fragment, { children: [_jsx(Package, { size: 18, className: "sm:w-5 sm:h-5" }), _jsx("span", { children: "\u0110\u00E3 nh\u1EADn h\u00E0ng" })] })) }) }), _jsx(ConfirmDialog, { open: showConfirm, onClose: () => setShowConfirm(false), onConfirm: handleConfirm, title: "X\u00E1c nh\u1EADn nh\u1EADn h\u00E0ng", message: "B\u1EA1n \u0111\u00E3 nh\u1EADn \u0111\u01B0\u1EE3c h\u00E0ng? X\u00E1c nh\u1EADn s\u1EBD chuy\u1EC3n \u0111\u01A1n h\u00E0ng sang tr\u1EA1ng th\u00E1i '\u0110\u00E3 nh\u1EADn h\u00E0ng' v\u00E0 b\u1EA1n c\u00F3 th\u1EC3 \u0111\u00E1nh gi\u00E1 s\u1EA3n ph\u1EA9m.", type: "info", loading: loading, confirmText: "X\u00E1c nh\u1EADn" })] }));
};
export default BuyerConfirmDelivery;

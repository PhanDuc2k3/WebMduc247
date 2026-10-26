import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// VoucherDashboard.tsx
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import ConfirmDialog from "../../ui/ConfirmDialog";
import { Percent, Truck, BadgeDollarSign, ShoppingCart, Plus, Pencil, Trash2, Search, } from "lucide-react";
import VoucherForm from "./VoucherForm";
import voucherApi from "../../../api/voucherApi";
const VoucherDashboard = () => {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState(null);
    const fetchVouchers = async () => {
        try {
            setLoading(true);
            // Dùng API mới để chỉ lấy voucher của cửa hàng của seller
            const res = await voucherApi.getVouchersBySellerStore();
            // Map từ VoucherType sang Voucher để có đầy đủ title & condition
            const mapped = (res.data || []).map((v) => ({
                ...v,
                title: v.title || v.code, // API chưa có title → dùng code
                condition: v.condition || "",
            }));
            setVouchers(mapped);
        }
        catch (err) {
            console.error("❌ Lỗi khi fetch vouchers:", err);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchVouchers();
    }, []);
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, voucherId: null });
    const deleteVoucherClick = (id) => {
        setDeleteConfirm({ open: true, voucherId: id });
    };
    const deleteVoucher = async () => {
        if (!deleteConfirm.voucherId)
            return;
        const id = deleteConfirm.voucherId;
        setDeleteConfirm({ open: false, voucherId: null });
        try {
            await voucherApi.deleteVoucher(id);
            setVouchers((prev) => prev.filter((v) => v._id !== id));
        }
        catch (err) {
            console.error("❌ Lỗi xóa voucher:", err);
        }
    };
    if (loading) {
        return (_jsxs("div", { className: "p-4 sm:p-8 text-center animate-fade-in", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-t-4 border-b-4 border-[#4B5563] mx-auto mb-4" }), _jsx("p", { className: "text-[#4B5563] text-sm sm:text-lg font-medium", children: "\u0110ang t\u1EA3i voucher..." })] }));
    }
    return (_jsxs("div", { className: "space-y-4 sm:space-y-6 animate-fade-in-up", children: [showForm &&
                createPortal(_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 sm:p-6 animate-fade-in", onClick: () => setShowForm(false), children: _jsxs("div", { className: "relative bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in", onClick: (e) => e.stopPropagation(), children: [_jsx("div", { className: "absolute -top-10 sm:-top-12 right-0", children: _jsx("button", { onClick: () => setShowForm(false), className: "text-white bg-[#4B5563] hover:bg-[#374151] px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-semibold transition-colors touch-manipulation shadow-lg", children: "\u2715 \u0110\u00F3ng" }) }), _jsx(VoucherForm, { voucher: editingVoucher || undefined, onSuccess: () => {
                                    fetchVouchers();
                                    setShowForm(false);
                                    setEditingVoucher(null);
                                }, onClose: () => {
                                    setShowForm(false);
                                    setEditingVoucher(null);
                                } })] }) }), document.body), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6", children: [_jsx(StatBox, { title: "T\u1ED5ng voucher", value: vouchers.length.toString(), percent: "+0%", icon: _jsx(BadgeDollarSign, { className: "w-5 h-5 sm:w-6 sm:h-6 text-white" }), color: "from-blue-500 to-cyan-600" }), _jsx(StatBox, { title: "\u0110ang ho\u1EA1t \u0111\u1ED9ng", value: vouchers.filter((v) => v.isActive).length.toString(), percent: "+0%", icon: _jsx(Percent, { className: "w-5 h-5 sm:w-6 sm:h-6 text-white" }), color: "from-green-500 to-emerald-600" }), _jsx(StatBox, { title: "L\u01B0\u1EE3t s\u1EED d\u1EE5ng", value: vouchers
                            .reduce((sum, v) => sum + (v.usedCount || 0), 0)
                            .toString(), percent: "+0%", icon: _jsx(ShoppingCart, { className: "w-5 h-5 sm:w-6 sm:h-6 text-white" }), color: "from-purple-500 to-pink-600" }), _jsx(StatBox, { title: "\u0110ang h\u1EBFt h\u1EA1n", value: vouchers
                            .filter((v) => new Date(v.endDate) < new Date())
                            .length.toString(), percent: "+0%", icon: _jsx(Truck, { className: "w-5 h-5 sm:w-6 sm:h-6 text-white" }), color: "from-orange-500 to-red-600" })] }), _jsxs("div", { className: "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4", children: [_jsxs("div", { className: "relative w-full sm:max-w-md", children: [_jsx("input", { type: "text", placeholder: "T\u00ECm ki\u1EBFm voucher...", className: "w-full px-4 sm:px-5 py-2.5 sm:py-3 pl-10 sm:pl-12 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#4B5563] focus:border-[#4B5563] outline-none bg-white transition-all duration-300" }), _jsx(Search, { className: "absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" })] }), _jsxs("button", { onClick: () => {
                            setEditingVoucher(null);
                            setShowForm(true);
                        }, className: "w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base bg-[#4B5563] text-white rounded-lg sm:rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#374151] transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 sm:hover:scale-105 touch-manipulation whitespace-nowrap", children: [_jsx(Plus, { className: "w-4 h-4 sm:w-5 sm:h-5" }), " ", _jsx("span", { children: "T\u1EA1o voucher m\u1EDBi" })] })] }), _jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden", children: [_jsxs("div", { className: "bg-[#4B5563]/5 p-4 sm:p-6 border-b-2 border-[#4B5563]/30", children: [_jsxs("h3", { className: "text-lg sm:text-xl md:text-2xl font-bold text-[#4B5563] flex items-center gap-2 sm:gap-3", children: [_jsx(BadgeDollarSign, { className: "w-5 h-5 sm:w-6 sm:h-6 text-[#4B5563]" }), _jsx("span", { children: "Danh s\u00E1ch voucher" })] }), _jsxs("p", { className: "text-gray-600 text-xs sm:text-sm mt-1", children: [vouchers.length, " voucher"] })] }), _jsx("div", { className: "overflow-x-auto no-scrollbar", children: _jsxs("table", { className: "w-full text-sm min-w-[700px]", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-gray-600 border-b border-gray-200 bg-gray-50", children: [_jsx("th", { className: "px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold", children: "M\u00E3" }), _jsx("th", { className: "px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold", children: "T\u00EAn" }), _jsx("th", { className: "px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold", children: "Lo\u1EA1i" }), _jsx("th", { className: "px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold", children: "Gi\u00E1 tr\u1ECB" }), _jsx("th", { className: "px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold", children: "H\u1EA1n s\u1EED d\u1EE5ng" }), _jsx("th", { className: "px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("th", { className: "px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold text-center", children: "Thao t\u00E1c" })] }) }), _jsx("tbody", { children: vouchers.length > 0 ? (vouchers.map((v, index) => (_jsxs("tr", { className: "border-b border-gray-100 hover:bg-blue-50 transition-all duration-200 animate-fade-in-up", style: { animationDelay: `${index * 0.05}s` }, children: [_jsx("td", { className: "px-3 sm:px-4 py-3 font-semibold text-xs sm:text-sm text-gray-900", children: v.code }), _jsx("td", { className: "px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900 truncate max-w-[150px] sm:max-w-none", children: v.title }), _jsx("td", { className: "px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-700", children: v.discountType === "percent" ? "Phần trăm" : "Số tiền" }), _jsx("td", { className: "px-3 sm:px-4 py-3", children: _jsx("span", { className: "font-bold text-xs sm:text-sm text-[#4B5563]", children: v.discountType === "percent"
                                                        ? `${v.discountValue}%`
                                                        : `${v.discountValue.toLocaleString("vi-VN")}₫` }) }), _jsx("td", { className: "px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-600", children: _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { children: new Date(v.startDate).toLocaleDateString("vi-VN") }), _jsx("span", { className: "text-gray-400", children: "\u2192" }), _jsx("span", { children: new Date(v.endDate).toLocaleDateString("vi-VN") })] }) }), _jsx("td", { className: "px-3 sm:px-4 py-3", children: _jsx("span", { className: `px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold border-2 whitespace-nowrap ${v.isActive
                                                        ? "bg-[#4B5563]/10 text-[#4B5563] border-[#4B5563]/40"
                                                        : "bg-gray-100 text-gray-700 border-gray-300"}`, children: v.isActive ? "Đang hoạt động" : "Ngừng hoạt động" }) }), _jsx("td", { className: "px-3 sm:px-4 py-3", children: _jsxs("div", { className: "flex items-center justify-center gap-1 sm:gap-2", children: [_jsx("button", { title: "Ch\u1EC9nh s\u1EEDa", onClick: () => {
                                                                setEditingVoucher(v);
                                                                setShowForm(true);
                                                            }, className: "w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#4B5563]/10 text-[#4B5563] hover:bg-[#4B5563]/20 hover:text-[#374151] active:scale-95 sm:hover:scale-110 flex items-center justify-center transition-all duration-300 touch-manipulation", children: _jsx(Pencil, { className: "w-4 h-4 sm:w-[18px] sm:h-[18px]" }) }), _jsx("button", { title: "X\u00F3a voucher", onClick: () => deleteVoucherClick(v._id), className: "w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 active:scale-95 sm:hover:scale-110 flex items-center justify-center transition-all duration-300 touch-manipulation", children: _jsx(Trash2, { className: "w-4 h-4 sm:w-[18px] sm:h-[18px]" }) })] }) })] }, v._id)))) : (_jsx("tr", { children: _jsxs("td", { colSpan: 7, className: "text-center py-8 sm:py-12", children: [_jsx("div", { className: "flex justify-center mb-4", children: _jsx(BadgeDollarSign, { className: "w-12 h-12 sm:w-16 sm:h-16 text-gray-400" }) }), _jsx("p", { className: "text-gray-500 text-sm sm:text-lg font-medium mb-2", children: "Ch\u01B0a c\u00F3 voucher n\u00E0o" }), _jsx("p", { className: "text-gray-400 text-xs sm:text-sm", children: "T\u1EA1o voucher m\u1EDBi \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u" })] }) })) })] }) })] }), _jsx(ConfirmDialog, { open: deleteConfirm.open, onClose: () => setDeleteConfirm({ open: false, voucherId: null }), onConfirm: deleteVoucher, title: "X\u00E1c nh\u1EADn x\u00F3a voucher", message: "B\u1EA1n c\u00F3 ch\u1EAFc mu\u1ED1n x\u00F3a voucher n\u00E0y kh\u00F4ng?", type: "danger", confirmText: "X\u00F3a" })] }));
};
const StatBox = ({ title, value, percent, icon, color }) => (_jsx("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 sm:active:scale-100 animate-fade-in-up touch-manipulation", children: _jsxs("div", { className: "p-4 sm:p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-3 sm:mb-4", children: [_jsx("div", { className: `w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg`, children: icon }), _jsx("span", { className: `text-xs font-bold px-2 sm:px-3 py-1 rounded-full whitespace-nowrap ${percent.startsWith("-") ? "bg-red-100 text-red-600 border-2 border-red-300" : "bg-green-100 text-green-600 border-2 border-green-300"}`, children: percent })] }), _jsx("div", { className: "text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 mb-1 break-words", children: value }), _jsx("div", { className: "text-xs sm:text-sm font-semibold text-gray-600", children: title })] }) }));
export default VoucherDashboard;

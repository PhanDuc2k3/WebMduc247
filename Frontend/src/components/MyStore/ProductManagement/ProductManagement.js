import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import AddProductPopup from "./AddProductPopup";
import ConfirmDialog from "../../ui/ConfirmDialog";
import productApi from "../../../api/productApi";
import { toast } from "react-toastify";
import { Eye, Edit, Trash2, Plus, Package, TrendingUp, Warehouse, Search, AlertCircle, RotateCcw, } from "lucide-react";
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const ProductManagement = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPopup, setShowPopup] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    // Confirm dialog state
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: "",
        message: "",
        type: "warning",
        onConfirm: () => { },
        loading: false,
    });
    // 🔹 Lấy danh sách sản phẩm
    const fetchProducts = async () => {
        try {
            setLoading(true);
            const res = await productApi.getMyProducts();
            console.log("[fetchProducts] 📥 Response:", res.data);
            const productsArray = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res.data?.data)
                    ? res.data.data
                    : [];
            console.log("[fetchProducts] 📦 Products array:", productsArray.length, "items");
            console.log("[fetchProducts] 📦 Product names:", productsArray.map((p) => p.name));
            const mapped = productsArray.map((p) => ({
                ...p,
                quantity: p.quantity ?? 0,
                images: (p.images || []).map((img) => img.startsWith("http") ? img : `${BASE_URL}${img.startsWith("/") ? img : "/" + img}`),
            }));
            console.log("[fetchProducts] ✅ Mapped products:", mapped.length);
            setProducts(mapped);
        }
        catch (err) {
            console.error("❌ Lỗi fetch sản phẩm:", err);
            toast.error("Không thể tải danh sách sản phẩm", { containerId: "general-toast" });
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchProducts();
    }, []);
    // 🔹 Thêm / sửa sản phẩm
    const handleAddOrUpdateProduct = async (newProduct, isEdit) => {
        // ✅ Tự động refresh danh sách sau khi thêm/sửa thành công
        await fetchProducts();
    };
    // 🔹 Mở popup sửa
    const handleEditClick = (product) => {
        setEditProduct(product);
        setShowPopup(true);
    };
    // 🔹 Xóa sản phẩm
    const handleDeleteProduct = (id) => {
        setConfirmDialog({
            open: true,
            title: "Xác nhận xóa sản phẩm",
            message: "Bạn có chắc chắn muốn ẩn sản phẩm này khỏi danh sách bán? Sản phẩm sẽ không hiển thị cho khách hàng nhưng vẫn được lưu trong hệ thống.",
            type: "danger",
            onConfirm: async () => {
                setConfirmDialog((prev) => ({ ...prev, loading: true }));
                try {
                    await productApi.deleteProduct(id);
                    setProducts((prev) => prev.map((p) => (p._id === id ? { ...p, isActive: false } : p)));
                    setConfirmDialog((prev) => ({ ...prev, open: false, loading: false }));
                    toast.success("Sản phẩm đã được ẩn khỏi danh sách bán", {
                        containerId: "general-toast",
                    });
                }
                catch (err) {
                    console.error("❌ Xóa thất bại:", err);
                    setConfirmDialog((prev) => ({ ...prev, loading: false }));
                    toast.error("Xóa sản phẩm thất bại", {
                        containerId: "general-toast",
                    });
                }
            },
            loading: false,
        });
    };
    // 🔹 Khôi phục sản phẩm (bán trở lại)
    const handleRestoreProduct = (id) => {
        setConfirmDialog({
            open: true,
            title: "Xác nhận bán trở lại",
            message: "Bạn có chắc chắn muốn khôi phục và bán trở lại sản phẩm này? Sản phẩm sẽ hiển thị lại cho khách hàng.",
            type: "info",
            onConfirm: async () => {
                setConfirmDialog((prev) => ({ ...prev, loading: true }));
                try {
                    await productApi.restoreProduct(id);
                    setProducts((prev) => prev.map((p) => (p._id === id ? { ...p, isActive: true } : p)));
                    setConfirmDialog((prev) => ({ ...prev, open: false, loading: false }));
                    toast.success("Sản phẩm đã được khôi phục và hiển thị trở lại", {
                        containerId: "general-toast",
                    });
                }
                catch (err) {
                    console.error("❌ Khôi phục thất bại:", err);
                    setConfirmDialog((prev) => ({ ...prev, loading: false }));
                    toast.error(err?.response?.data?.message || "Khôi phục sản phẩm thất bại", {
                        containerId: "general-toast",
                    });
                }
            },
            loading: false,
        });
    };
    if (loading) {
        return (_jsxs("div", { className: "p-4 sm:p-8 text-center animate-fade-in", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-t-4 border-b-4 border-blue-600 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 text-sm sm:text-lg font-medium", children: "\u0110ang t\u1EA3i s\u1EA3n ph\u1EA9m..." })] }));
    }
    return (_jsxs("div", { className: "space-y-4 sm:space-y-6 animate-fade-in-up", children: [showPopup && (_jsx(AddProductPopup, { open: showPopup, onClose: () => {
                    setShowPopup(false);
                    setEditProduct(null);
                }, onSubmit: async (newProduct) => {
                    const isEdit = Boolean(editProduct?._id);
                    await handleAddOrUpdateProduct(newProduct, isEdit);
                    setShowPopup(false);
                    setEditProduct(null);
                }, editProduct: editProduct })), _jsx(ConfirmDialog, { open: confirmDialog.open, onClose: () => setConfirmDialog((prev) => ({ ...prev, open: false })), onConfirm: confirmDialog.onConfirm, title: confirmDialog.title, message: confirmDialog.message, type: confirmDialog.type, loading: confirmDialog.loading, confirmText: confirmDialog.type === "danger" ? "Xóa" : "Xác nhận" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6", children: [_jsx(StatBox, { title: "T\u1ED5ng s\u1EA3n ph\u1EA9m", value: products.length.toString(), percent: "+0%", icon: _jsx(Package, { className: "w-5 h-5 sm:w-6 sm:h-6" }), color: "from-blue-500 to-cyan-600" }), _jsx(StatBox, { title: "T\u1ED3n kho th\u1EA5p", value: products.filter((p) => p.quantity < 15).length.toString(), percent: "-5%", icon: _jsx(Warehouse, { className: "w-5 h-5 sm:w-6 sm:h-6" }), color: "from-orange-500 to-red-600" }), _jsx(StatBox, { title: "T\u1ED5ng \u0111\u00E3 b\u00E1n", value: products.reduce((sum, p) => sum + (p.soldCount || 0), 0).toString(), percent: "+12%", icon: _jsx(TrendingUp, { className: "w-5 h-5 sm:w-6 sm:h-6" }), color: "from-green-500 to-emerald-600" }), _jsx(StatBox, { title: "T\u1ED5ng l\u01B0\u1EE3t xem", value: products.reduce((sum, p) => sum + (p.viewsCount || 0), 0).toString(), percent: "+8%", icon: _jsx(Eye, { className: "w-5 h-5 sm:w-6 sm:h-6" }), color: "from-purple-500 to-pink-600" })] }), _jsxs("div", { className: "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4", children: [_jsxs("div", { className: "relative w-full sm:max-w-md", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300" }), _jsx("input", { type: "text", placeholder: "T\u00ECm ki\u1EBFm s\u1EA3n ph\u1EA9m...", className: "relative w-full px-4 sm:px-5 py-2.5 sm:py-3 pl-10 sm:pl-12 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-300" }), _jsx(Search, { className: "absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" })] }), _jsxs("button", { onClick: () => {
                            setEditProduct(null);
                            setShowPopup(true);
                        }, className: "w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-[#2F5EE9] text-white rounded-lg sm:rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#374151] transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 sm:hover:scale-105 whitespace-nowrap touch-manipulation", children: [_jsx(Plus, { className: "w-4 h-4 sm:w-5 sm:h-5" }), " ", _jsx("span", { children: "Th\u00EAm s\u1EA3n ph\u1EA9m m\u1EDBi" })] })] }), _jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up", children: [_jsxs("div", { className: "bg-gradient-to-r from-gray-50 to-blue-50 p-4 sm:p-6 border-b-2 border-gray-200", children: [_jsxs("h3", { className: "text-lg sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3", children: [_jsx(Package, { className: "w-5 h-5 sm:w-6 sm:h-6 text-blue-600" }), _jsx("span", { children: "Danh s\u00E1ch s\u1EA3n ph\u1EA9m" })] }), _jsxs("p", { className: "text-gray-600 text-xs sm:text-sm mt-1", children: [products.length, " s\u1EA3n ph\u1EA9m"] })] }), _jsx("div", { className: "overflow-x-auto no-scrollbar", children: _jsxs("table", { className: "w-full min-w-[800px]", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-gray-600 border-b border-gray-200 bg-gray-50", children: [_jsx("th", { className: "px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold", children: "S\u1EA3n ph\u1EA9m" }), _jsx("th", { className: "px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold", children: "Gi\u00E1" }), _jsx("th", { className: "px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold", children: "T\u1ED3n kho" }), _jsx("th", { className: "px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold", children: "\u0110\u00E3 b\u00E1n" }), _jsx("th", { className: "px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("th", { className: "px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold", children: "L\u01B0\u1EE3t xem" }), _jsx("th", { className: "px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-center", children: "Thao t\u00E1c" })] }) }), _jsx("tbody", { children: products.length > 0 ? (products.map((p, index) => (_jsxs("tr", { className: "border-b border-gray-100 hover:bg-blue-50 transition-all duration-200 animate-fade-in-up", style: { animationDelay: `${index * 0.05}s` }, children: [_jsx("td", { className: "px-3 sm:px-6 py-3 sm:py-4", children: _jsxs("div", { className: "flex items-center gap-2 sm:gap-3", children: [_jsxs("div", { className: "relative flex-shrink-0", children: [_jsx("img", { src: (p.images && p.images.length > 0) ? p.images[0] : "/placeholder.png", alt: p.name || "Sản phẩm", className: "w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl object-cover border-2 border-gray-200 shadow-md", loading: "lazy" }), (p.quantity || 0) < 15 && (_jsx("div", { className: "absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 border-2 border-white", children: _jsx(AlertCircle, { className: "w-3 h-3 sm:w-4 sm:h-4" }) }))] }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "font-bold text-xs sm:text-sm text-gray-900 line-clamp-2", children: p.name }), _jsx("div", { className: "text-xs text-gray-500 mt-1 hidden sm:block", children: p._id ? p._id.slice(-8).toUpperCase() : "N/A" })] })] }) }), _jsx("td", { className: "px-3 sm:px-6 py-3 sm:py-4", children: _jsxs("span", { className: "font-bold text-xs sm:text-sm text-green-600", children: [(p.price || p.salePrice || 0).toLocaleString("vi-VN"), "\u20AB"] }) }), _jsx("td", { className: "px-3 sm:px-6 py-3 sm:py-4", children: _jsx("span", { className: `font-bold text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-lg ${(p.quantity || 0) < 15 ? "bg-red-100 text-red-700 border-2 border-red-300" : "text-gray-700"}`, children: p.quantity || 0 }) }), _jsx("td", { className: "px-3 sm:px-6 py-3 sm:py-4", children: _jsx("span", { className: "font-semibold text-xs sm:text-sm text-gray-700", children: p.soldCount || 0 }) }), _jsx("td", { className: "px-3 sm:px-6 py-3 sm:py-4", children: _jsx("span", { className: `px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold border-2 whitespace-nowrap ${p.isActive ? "bg-green-100 text-green-700 border-green-300" : "bg-yellow-100 text-yellow-700 border-yellow-300"}`, children: p.isActive ? "Hoạt động" : "Ngừng bán" }) }), _jsx("td", { className: "px-3 sm:px-6 py-3 sm:py-4", children: _jsx("span", { className: "font-semibold text-xs sm:text-sm text-blue-600", children: p.viewsCount || 0 }) }), _jsx("td", { className: "px-3 sm:px-6 py-3 sm:py-4", children: _jsxs("div", { className: "flex items-center justify-center gap-1 sm:gap-2", children: [_jsx("button", { title: "Xem chi ti\u1EBFt", className: "w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 active:scale-95 sm:hover:scale-110 flex items-center justify-center transition-all duration-300 touch-manipulation", children: _jsx(Eye, { className: "w-4 h-4 sm:w-[18px] sm:h-[18px]" }) }), _jsx("button", { title: "Ch\u1EC9nh s\u1EEDa", className: "w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700 active:scale-95 sm:hover:scale-110 flex items-center justify-center transition-all duration-300 touch-manipulation", onClick: () => handleEditClick(p), children: _jsx(Edit, { className: "w-4 h-4 sm:w-[18px] sm:h-[18px]" }) }), p.isActive ? (_jsx("button", { title: "X\u00F3a s\u1EA3n ph\u1EA9m", className: "w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 active:scale-95 sm:hover:scale-110 flex items-center justify-center transition-all duration-300 touch-manipulation", onClick: () => handleDeleteProduct(p._id), children: _jsx(Trash2, { className: "w-4 h-4 sm:w-[18px] sm:h-[18px]" }) })) : (_jsx("button", { title: "B\u00E1n tr\u1EDF l\u1EA1i", className: "w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-purple-100 text-purple-600 hover:bg-purple-200 hover:text-purple-700 active:scale-95 sm:hover:scale-110 flex items-center justify-center transition-all duration-300 touch-manipulation", onClick: () => handleRestoreProduct(p._id), children: _jsx(RotateCcw, { className: "w-4 h-4 sm:w-[18px] sm:h-[18px]" }) }))] }) })] }, p._id || `product-${index}`)))) : (_jsx("tr", { children: _jsxs("td", { colSpan: 7, className: "text-center py-8 sm:py-12", children: [_jsx("div", { className: "flex justify-center mb-4", children: _jsx(Package, { className: "w-12 h-12 sm:w-16 sm:h-16 text-gray-400" }) }), _jsx("p", { className: "text-gray-500 text-sm sm:text-lg font-medium mb-2", children: "Ch\u01B0a c\u00F3 s\u1EA3n ph\u1EA9m n\u00E0o" }), _jsx("p", { className: "text-gray-400 text-xs sm:text-sm", children: "H\u00E3y th\u00EAm s\u1EA3n ph\u1EA9m \u0111\u1EA7u ti\u00EAn c\u1EE7a b\u1EA1n" })] }) })) })] }) })] })] }));
};
// 🔹 Component thống kê nhỏ
const StatBox = ({ title, value, percent, icon, color }) => (_jsx("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 sm:active:scale-100 animate-fade-in-up touch-manipulation", children: _jsxs("div", { className: "p-4 sm:p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-3 sm:mb-4", children: [_jsx("div", { className: `w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg`, children: icon }), _jsx("span", { className: `text-xs font-bold px-2 sm:px-3 py-1 rounded-full whitespace-nowrap ${percent.startsWith("-") ? "bg-red-100 text-red-600 border-2 border-red-300" : "bg-green-100 text-green-600 border-2 border-green-300"}`, children: percent })] }), _jsx("div", { className: "text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 mb-1 break-words", children: value }), _jsx("div", { className: "text-xs sm:text-sm font-semibold text-gray-600", children: title })] }) }));
export default ProductManagement;

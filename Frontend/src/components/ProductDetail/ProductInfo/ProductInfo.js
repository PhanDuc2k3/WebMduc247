import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useMemo, useEffect } from "react";
import { Heart, AlertTriangle, Star, Flame, Palette, Package, Hash, ShoppingCart, Zap, Store, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../../api/axiosClient";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useCart } from "../../../context/CartContext";
import favoriteApi from "../../../api/favoriteApi";
const ProductInfo = ({ product, quantity, setQuantity, }) => {
    const [selectedColor, setSelectedColor] = useState(null);
    const [selectedStorage, setSelectedStorage] = useState(null);
    const [selectedOption, setSelectedOption] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);
    const navigate = useNavigate();
    const { fetchCart } = useCart();
    // Kiểm tra trạng thái yêu thích
    useEffect(() => {
        const checkFavorite = async () => {
            const token = localStorage.getItem("token");
            if (!token || !product._id)
                return;
            try {
                const res = await favoriteApi.checkFavorite(product._id);
                setIsFavorite(res.data.isFavorite);
            }
            catch (err) {
                // Nếu chưa đăng nhập, không hiển thị lỗi
                if (err.response?.status !== 401) {
                    console.error("Lỗi kiểm tra yêu thích:", err);
                }
            }
        };
        checkFavorite();
    }, [product._id]);
    const colors = Array.from(new Set(product.variations?.map((v) => v.color) || []));
    const availableStorages = selectedColor
        ? product.variations
            ?.find((v) => v.color === selectedColor)
            ?.options.map((o) => o.name) || []
        : [];
    const basePrice = product.salePrice ?? product.price;
    const finalPrice = useMemo(() => {
        return selectedOption
            ? basePrice + (selectedOption.additionalPrice || 0)
            : basePrice;
    }, [basePrice, selectedOption]);
    const handleSelectStorage = (storage) => {
        setSelectedStorage(storage);
        if (selectedColor) {
            const variation = product.variations?.find((v) => v.color === selectedColor);
            const opt = variation?.options.find((o) => o.name === storage);
            setSelectedOption(opt || null);
        }
        else {
            setSelectedOption(null);
        }
    };
    const handleAddToCart = async () => {
        if (!selectedColor || !selectedStorage || !selectedOption) {
            toast.warning("Vui lòng chọn loại 1 và loại 2!", { containerId: "general-toast" });
            return;
        }
        const variation = product.variations?.find((v) => v.color === selectedColor);
        const option = variation?.options.find((o) => o.name === selectedStorage);
        if (!variation || !option)
            return;
        const payload = {
            productId: product._id,
            quantity,
            variationId: variation._id,
            optionId: option._id,
        };
        try {
            setLoading(true);
            await axiosClient.post("/api/cart/add", payload, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            fetchCart();
            toast.success("Đã thêm vào giỏ hàng!", { containerId: "general-toast" });
        }
        catch {
            toast.error("Lỗi khi thêm vào giỏ hàng!", { containerId: "general-toast" });
        }
        finally {
            setLoading(false);
        }
    };
    // Handler cho nút "Mua ngay"
    const handleBuyNow = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            toast.warning("Vui lòng đăng nhập để mua hàng!", { containerId: "general-toast" });
            return;
        }
        if (!selectedColor || !selectedStorage || !selectedOption) {
            toast.warning("Vui lòng chọn loại 1 và loại 2!", { containerId: "general-toast" });
            return;
        }
        const variation = product.variations?.find((v) => v.color === selectedColor);
        const option = variation?.options.find((o) => o.name === selectedStorage);
        if (!variation || !option)
            return;
        try {
            setLoading(true);
            // Tính giá và subtotal
            const basePrice = product.salePrice ?? product.price;
            const additionalPrice = option.additionalPrice || 0;
            const unitPrice = basePrice + additionalPrice;
            const subtotal = unitPrice * quantity;
            // Tạo checkout item trực tiếp (không thêm vào cart)
            const checkoutItem = {
                _id: `temp-${Date.now()}`, // ID tạm thời
                productId: product._id,
                storeId: product.store?._id || product.storeId || null,
                name: product.name,
                imageUrl: product.images?.[0] || "",
                price: product.price,
                salePrice: product.salePrice,
                quantity: quantity,
                variation: {
                    color: selectedColor,
                    size: selectedStorage,
                    additionalPrice: additionalPrice,
                    variationId: variation._id,
                    optionId: option._id,
                },
                subtotal: subtotal,
            };
            // Lưu vào localStorage để checkout
            localStorage.setItem("checkoutItems", JSON.stringify([checkoutItem]));
            // Chuyển đến checkout
            navigate("/checkout");
        }
        catch (err) {
            console.error("Lỗi mua ngay:", err);
            toast.error(err.response?.data?.message || "Lỗi khi thực hiện mua ngay!", { containerId: "general-toast" });
        }
        finally {
            setLoading(false);
        }
    };
    // Handler cho nút "Yêu thích"
    const handleToggleFavorite = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            toast.warning("Vui lòng đăng nhập để thêm vào yêu thích!", { containerId: "general-toast" });
            return;
        }
        setFavoriteLoading(true);
        try {
            if (isFavorite) {
                // Xóa khỏi yêu thích
                await favoriteApi.removeFavorite({ productId: product._id });
                setIsFavorite(false);
                toast.success("Đã xóa khỏi yêu thích", { containerId: "general-toast" });
            }
            else {
                // Thêm vào yêu thích
                const res = await favoriteApi.addFavorite({ productId: product._id });
                // Kiểm tra response - có thể đã tồn tại (status 200) hoặc mới tạo (status 201)
                setIsFavorite(true);
                toast.success(res.data?.message || "Đã thêm vào yêu thích", { containerId: "general-toast" });
            }
        }
        catch (err) {
            console.error("Lỗi yêu thích:", err);
            // Xử lý các loại lỗi khác nhau
            const errorMessage = err.response?.data?.message || err.message || "Lỗi khi cập nhật yêu thích!";
            const statusCode = err.response?.status;
            // Nếu đã yêu thích rồi (409 Conflict) - coi như success và set isFavorite = true
            if (statusCode === 409 || statusCode === 200 || errorMessage.includes("Đã yêu thích") || errorMessage.includes("đã yêu thích")) {
                setIsFavorite(true);
                toast.success("Đã thêm vào yêu thích", { containerId: "general-toast" });
                return; // Thoát sớm để không hiển thị error
            }
            // Các lỗi khác
            toast.error("Không thể cập nhật yêu thích. Vui lòng thử lại sau.", { containerId: "general-toast" });
        }
        finally {
            setFavoriteLoading(false);
        }
    };
    return (_jsxs("div", { className: "max-w-4xl mx-auto space-y-6 bg-white p-6 lg:p-8 rounded-2xl shadow-lg border border-gray-100", children: [_jsxs("div", { className: "animate-fade-in-down", children: [_jsx("h1", { className: "text-3xl lg:text-4xl font-bold text-[#4B5563] mb-3", children: product.name }), _jsxs("div", { className: "flex items-center gap-3 text-base text-gray-600", children: [_jsxs("div", { className: "flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full", children: [_jsx(Star, { className: "text-yellow-500", size: 18, fill: "currentColor" }), _jsx("span", { className: "font-semibold", children: typeof product.rating === "number" ? product.rating : "Chưa có đánh giá" })] }), _jsxs("span", { className: "text-gray-500", children: ["(", product.reviewsCount || 0, " \u0111\u00E1nh gi\u00E1)"] })] })] }), _jsxs("div", { className: "animate-fade-in-up delay-100", children: [_jsxs("div", { className: "flex items-baseline gap-3 mb-2", children: [_jsxs("span", { className: "product-detail-price text-3xl lg:text-4xl font-bold text-red-600", children: [finalPrice.toLocaleString("vi-VN"), "\u20AB"] }), product.salePrice && (_jsxs("span", { className: "text-gray-400 line-through text-xl", children: [product.price.toLocaleString("vi-VN"), "\u20AB"] }))] }), product.salePrice && (_jsxs("span", { className: "product-detail-discount inline-flex items-center gap-1 bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-semibold", children: [_jsx(Flame, { size: 16 }), _jsxs("span", { children: ["Gi\u1EA3m ", Math.round((1 - product.salePrice / product.price) * 100), "%"] })] }))] }), _jsxs("div", { className: "animate-fade-in-up delay-200", children: [_jsx("h3", { className: "font-bold text-lg mb-3 text-gray-900", children: "M\u00E0u s\u1EAFc" }), _jsx("div", { className: "flex gap-3 flex-wrap", children: colors.map((color) => (_jsx("button", { onClick: () => {
                                setSelectedColor(color);
                                setSelectedStorage(null);
                                setSelectedOption(null);
                            }, className: `px-5 py-2.5 border-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${selectedColor === color
                                ? "border-[#4B5563] bg-[#4B5563]/5 text-[#4B5563] shadow-md"
                                : "border-gray-200 hover:border-[#4B5563]/60 hover:bg-gray-50 text-gray-700"}`, children: color }, color))) })] }), selectedColor && (_jsxs("div", { className: "animate-fade-in-up delay-300", children: [_jsx("h3", { className: "font-bold text-lg mb-3 text-gray-900", children: "Phi\u00EAn b\u1EA3n" }), _jsx("div", { className: "flex gap-3 flex-wrap", children: availableStorages.map((s) => {
                            const variation = product.variations?.find((v) => v.color === selectedColor);
                            const opt = variation?.options.find((o) => o.name === s);
                            return (_jsxs("button", { onClick: () => handleSelectStorage(s), className: `px-5 py-2.5 border-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${selectedStorage === s
                                    ? "border-[#4B5563] bg-[#4B5563]/5 text-[#4B5563] shadow-md"
                                    : "border-gray-200 hover:border-[#4B5563]/60 hover:bg-gray-50 text-gray-700"}`, children: [s, opt?.additionalPrice ? (_jsxs("span", { className: "ml-2 text-sm text-[#4B5563] font-bold", children: ["(+", opt.additionalPrice.toLocaleString("vi-VN"), "\u20AB)"] })) : null] }, s));
                        }) })] })), _jsxs("div", { className: "animate-fade-in-up delay-400", children: [_jsxs("h3", { className: "font-bold text-lg mb-3 text-gray-900 flex items-center gap-2", children: [_jsx(Hash, { size: 20, className: "text-gray-700" }), _jsx("span", { children: "S\u1ED1 l\u01B0\u1EE3ng" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: () => setQuantity(Math.max(1, quantity - 1)), className: "w-12 h-12 border-2 border-gray-300 rounded-xl text-xl font-bold flex items-center justify-center hover:bg-gray-100 hover:border-blue-400 transition-all duration-300 transform hover:scale-110", children: "\u2212" }), _jsx("span", { className: "min-w-[60px] text-center text-xl font-bold text-gray-900 bg-gray-50 px-4 py-2 rounded-xl border-2 border-gray-200", children: quantity }), _jsx("button", { onClick: () => setQuantity(quantity + 1), className: "w-12 h-12 border-2 border-gray-300 rounded-xl text-xl font-bold flex items-center justify-center hover:bg-gray-100 hover:border-blue-400 transition-all duration-300 transform hover:scale-110", children: "+" })] })] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-3 animate-fade-in-up delay-500 pt-4 border-t border-gray-200", children: [_jsxs("button", { onClick: handleToggleFavorite, disabled: favoriteLoading, className: `flex items-center justify-center gap-2 px-6 py-3.5 border-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${isFavorite
                            ? "border-red-400 bg-red-50 text-red-600"
                            : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-red-400 hover:text-red-600"}`, children: [_jsx(Heart, { size: 20, className: isFavorite ? "fill-red-500 text-red-500" : "" }), _jsx("span", { children: favoriteLoading ? "..." : "Yêu thích" })] }), _jsx("button", { onClick: handleAddToCart, disabled: loading, className: "product-detail-add flex-1 px-6 py-3.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105", children: loading ? (_jsxs("span", { className: "flex items-center justify-center gap-2", children: [_jsx(Loader2, { className: "animate-spin", size: 18 }), " \u0110ang th\u00EAm..."] })) : (_jsxs("span", { className: "flex items-center justify-center gap-2", children: [_jsx(ShoppingCart, { size: 18 }), _jsx("span", { children: "Th\u00EAm v\u00E0o gi\u1ECF" })] })) }), _jsx("button", { onClick: handleBuyNow, disabled: loading, className: "product-detail-buy flex-1 px-6 py-3.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105", children: loading ? (_jsxs("span", { className: "flex items-center justify-center gap-2", children: [_jsx(Loader2, { className: "animate-spin", size: 18 }), " \u0110ang x\u1EED l\u00FD..."] })) : (_jsxs("span", { className: "flex items-center justify-center gap-2", children: [_jsx(Zap, { size: 18 }), _jsx("span", { children: "Mua ngay" })] })) })] }), _jsx("div", { className: "text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-200 animate-fade-in-up delay-600", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Store, { size: 16, className: "text-gray-700" }), _jsx("span", { className: "font-semibold text-gray-700", children: "Ng\u01B0\u1EDDi b\u00E1n:" }), " ", _jsx("span", { className: "font-bold text-[#4B5563]", children: product.store?.name || "Không rõ" })] }) })] }));
};
export default ProductInfo;

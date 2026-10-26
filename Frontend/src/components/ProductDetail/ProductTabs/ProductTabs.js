import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { XCircle } from "lucide-react";
import reviewApi from "../../../api/apiReview";
import productApi from "../../../api/productApi"; // 🔹 Thêm API để lấy product
const ProductTabs = ({ productId }) => {
    const [active, setActive] = useState("mo-ta");
    const [reviews, setReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [product, setProduct] = useState(null);
    // 🔹 Lấy mô tả sản phẩm từ DB
    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await productApi.getProductById(productId);
                setProduct(res.data.data);
                console.log("data: ", res.data);
            }
            catch (err) {
                console.error("Lỗi khi fetch product:", err);
                toast.error("Không thể tải mô tả sản phẩm", { containerId: "general-toast" });
            }
        };
        fetchProduct();
    }, [productId]);
    // 🔹 Lấy đánh giá khi chọn tab "Đánh giá"
    useEffect(() => {
        const fetchReviews = async () => {
            if (active !== "danh-gia")
                return;
            try {
                setLoadingReviews(true);
                const res = await reviewApi.getReviewsByProduct(productId);
                setReviews(res.data);
            }
            catch (err) {
                console.error("Lỗi khi fetch reviews:", err);
                toast.error("Không thể tải đánh giá sản phẩm", { containerId: "general-toast" });
            }
            finally {
                setLoadingReviews(false);
            }
        };
        fetchReviews();
    }, [active, productId]);
    const tabs = [
        { id: "mo-ta", label: "Mô tả" },
        { id: "danh-gia", label: "Đánh giá" },
    ];
    const getFullUrl = (path) => path?.startsWith("http") ? path : `http://localhost:5000${path}`;
    return (_jsxs("div", { className: "w-full", children: [_jsx("div", { className: "flex space-x-3 bg-gradient-to-r from-gray-100 to-gray-50 p-2 rounded-2xl w-fit mb-8 shadow-md border border-gray-200", children: tabs.map((tab) => (_jsx("button", { onClick: () => setActive(tab.id), className: `px-8 py-3 text-base font-bold rounded-xl border-2 transition-all duration-300 transform hover:scale-105
              ${active === tab.id
                        ? "bg-[#4B5563] text-white border-[#4B5563] shadow-lg scale-105"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-[#4B5563]/10 hover:text-[#4B5563] hover:border-[#4B5563]"}`, children: tab.label }, tab.id))) }), _jsxs("div", { className: "p-8 bg-white border-2 border-gray-200 rounded-2xl shadow-lg text-base text-gray-800 leading-relaxed animate-fade-in-up", children: [active === "mo-ta" && (_jsx("div", { children: product ? (_jsx("p", { className: "text-gray-700", children: product.description })) : (_jsx("p", { className: "text-gray-400 italic", children: "\u0110ang t\u1EA3i m\u00F4 t\u1EA3..." })) })), active === "danh-gia" && (_jsxs("div", { className: "space-y-6", children: [_jsx("h3", { className: "font-semibold text-lg text-gray-800", children: "\u0110\u00E1nh gi\u00E1 t\u1EEB kh\u00E1ch h\u00E0ng" }), loadingReviews ? (_jsx("p", { children: "\u0110ang t\u1EA3i \u0111\u00E1nh gi\u00E1..." })) : reviews.length === 0 ? (_jsx("p", { className: "text-gray-500", children: "Ch\u01B0a c\u00F3 \u0111\u00E1nh gi\u00E1 n\u00E0o" })) : (reviews.map((r) => (_jsx("div", { className: "border-b pb-4", children: _jsxs("div", { className: "flex items-start gap-4", children: [r.userInfo.avatarUrl ? (_jsx("img", { src: getFullUrl(r.userInfo.avatarUrl), alt: r.userInfo.fullName, className: "w-10 h-10 rounded-full object-cover" })) : (_jsx("div", { className: "w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold", children: r.userInfo.fullName[0] })), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-semibold text-gray-800", children: r.userInfo.fullName }), _jsx("span", { className: "text-yellow-500 text-sm", children: "⭐".repeat(r.rating) })] }), _jsx("p", { className: "text-gray-700 text-sm mt-1", children: r.comment }), (r.images ?? []).length > 0 && (_jsx("div", { className: "flex gap-2 mt-2", children: (r.images ?? []).map((img, i) => (_jsx("img", { src: getFullUrl(img), alt: "review", className: "w-16 h-16 object-cover rounded" }, i))) })), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: new Date(r.createdAt).toLocaleDateString("vi-VN") })] })] }) }, r._id))))] }))] })] }));
};
export default ProductTabs;

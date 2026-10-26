import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CalendarDays, Eye, Tag } from "lucide-react";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import promotionApi from "../../api/promotionApi";
import { toast } from "react-toastify";
const PromotionDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [promotion, setPromotion] = useState(null);
    const [loading, setLoading] = useState(true);
    const hasIncreasedViewRef = useRef(false);
    useEffect(() => {
        const fetchPromotion = async () => {
            if (!id)
                return;
            try {
                setLoading(true);
                const res = await promotionApi.getPromotionById(id);
                setPromotion(res.data);
                // Chỉ tăng view một lần khi fetch thành công
                if (!hasIncreasedViewRef.current && res.data?._id) {
                    hasIncreasedViewRef.current = true;
                    try {
                        await promotionApi.increaseViews(id);
                        // Cập nhật lại views sau khi tăng
                        setPromotion(prev => prev ? { ...prev, views: (prev.views || 0) + 1 } : null);
                    }
                    catch (viewError) {
                        console.error("Error increasing views:", viewError);
                        // Không hiển thị lỗi cho user, chỉ log
                    }
                }
            }
            catch (error) {
                console.error("Error fetching promotion:", error);
                toast.error("Không tìm thấy tin tức khuyến mãi");
                navigate("/flash-sale");
            }
            finally {
                setLoading(false);
            }
        };
        fetchPromotion();
        // Reset flag khi id thay đổi
        return () => {
            hasIncreasedViewRef.current = false;
        };
    }, [id, navigate]);
    if (loading) {
        return (_jsx("div", { className: "w-full py-16 flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 text-lg font-medium", children: "\u0110ang t\u1EA3i..." })] }) }));
    }
    if (!promotion) {
        return null;
    }
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("vi-VN", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };
    const getImageUrl = (url) => {
        if (!url)
            return "/no-image.png";
        return url.startsWith("http") ? url : `${import.meta.env.VITE_API_URL}${url}`;
    };
    return (_jsx("div", { className: "w-full py-8 md:py-12", children: _jsxs("div", { className: "max-w-4xl mx-auto", children: [_jsx(ContentBreadcrumb, { items: [{ label: "Khuyến mãi", to: "/flash-sale" }, { label: promotion.title }] }), promotion.imageUrl && (_jsx("div", { className: "mb-8 rounded-2xl overflow-hidden shadow-2xl", children: _jsx("img", { src: getImageUrl(promotion.imageUrl), alt: promotion.title, className: "w-full h-96 object-cover" }) })), _jsxs("article", { className: "bg-white rounded-2xl shadow-xl border-2 border-gray-100 p-6 lg:p-8", children: [promotion.tags && promotion.tags.length > 0 && (_jsx("div", { className: "flex items-center gap-2 mb-4 flex-wrap", children: promotion.tags.map((tag, i) => (_jsxs("span", { className: "inline-flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg", children: [_jsx(Tag, { size: 12 }), tag] }, i))) })), _jsx("div", { className: "mb-4", children: _jsx("span", { className: "inline-block px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full text-sm font-bold", children: promotion.category }) }), _jsx("h1", { className: "text-3xl lg:text-4xl font-black text-gray-900 mb-6 gradient-text", children: promotion.title }), _jsxs("div", { className: "flex flex-wrap items-center gap-4 mb-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl", children: [_jsxs("div", { className: "flex items-center gap-2 text-gray-700 font-bold", children: [_jsx(CalendarDays, { size: 18, className: "text-blue-600" }), _jsxs("span", { children: [formatDate(promotion.startDate), " - ", formatDate(promotion.endDate)] })] }), _jsxs("div", { className: "flex items-center gap-2 text-gray-700 font-bold", children: [_jsx(Eye, { size: 18, className: "text-purple-600" }), _jsxs("span", { children: [promotion.views?.toLocaleString() || 0, " l\u01B0\u1EE3t xem"] })] })] }), _jsx("div", { className: "mb-6", children: _jsx("p", { className: "text-lg text-gray-700 leading-relaxed font-medium", children: promotion.description }) }), promotion.content && (_jsx("div", { className: "prose max-w-none", children: _jsx("div", { className: "text-gray-700 leading-relaxed", dangerouslySetInnerHTML: { __html: promotion.content.replace(/\n/g, "<br />") } }) }))] })] }) }));
};
export default PromotionDetail;

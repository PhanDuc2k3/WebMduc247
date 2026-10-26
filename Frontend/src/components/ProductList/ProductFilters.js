import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Star, MapPin, Tag } from "lucide-react";
const ProductFilters = ({ searchTerm, setSearchTerm, }) => {
    const [ratingOpen, setRatingOpen] = useState(false);
    const [regionOpen, setRegionOpen] = useState(false);
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [rating, setRating] = useState("Đánh giá cao nhất");
    const [region, setRegion] = useState("Tất cả khu vực");
    const [category, setCategory] = useState("Tất cả ngành hàng");
    const ratingRef = useRef(null);
    const regionRef = useRef(null);
    const categoryRef = useRef(null);
    const ratingOptions = ["Đánh giá cao nhất", "Đánh giá trung bình", "Mới nhất", "Cũ nhất"];
    const regionOptions = ["Tất cả khu vực", "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Cần Thơ", "Huế"];
    const categoryOptions = [
        "Tất cả ngành hàng",
        "Điện tử",
        "Thời trang",
        "Hoa quả",
        "Thực phẩm",
        "Gia dụng",
        "Mỹ phẩm",
        "Sách",
        "Đồ chơi",
        "Khác",
    ];
    // ✅ Tự đóng dropdown khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ratingRef.current && !ratingRef.current.contains(e.target))
                setRatingOpen(false);
            if (regionRef.current && !regionRef.current.contains(e.target))
                setRegionOpen(false);
            if (categoryRef.current && !categoryRef.current.contains(e.target))
                setCategoryOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    return (_jsx("div", { className: "bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-lg border border-gray-200", children: _jsxs("div", { className: "flex flex-wrap gap-4", children: [_jsxs("div", { className: "relative flex-1 min-w-[200px] max-w-[250px]", ref: ratingRef, children: [_jsxs("button", { onClick: () => {
                                setRatingOpen(!ratingOpen);
                                setRegionOpen(false);
                                setCategoryOpen(false);
                            }, className: "w-full flex justify-between items-center border-2 border-gray-200 rounded-xl px-4 py-3 bg-white text-sm text-gray-700 hover:border-[#4B5563] hover:shadow-md focus:outline-none transition-all duration-300 shadow-sm", children: [_jsxs("span", { className: "font-medium flex items-center gap-2", children: [_jsx(Star, { className: "w-4 h-4 text-yellow-500 fill-yellow-500" }), _jsx("span", { children: rating })] }), _jsx(ChevronDown, { className: `w-4 h-4 text-gray-400 transition-transform duration-300 ${ratingOpen ? "rotate-180 text-[#4B5563]" : ""}` })] }), ratingOpen && (_jsx("div", { className: "absolute z-[9999] mt-2 w-full bg-white border-2 border-gray-200 rounded-xl shadow-xl overflow-hidden animate-fade-in", children: ratingOptions.map((opt) => (_jsx("div", { onClick: () => {
                                    setRating(opt);
                                    setRatingOpen(false);
                                }, className: "px-4 py-3 text-sm text-gray-700 hover:bg-[#4B5563]/10 hover:text-[#4B5563] cursor-pointer transition-all duration-200 font-medium", children: opt }, opt))) }))] }), _jsxs("div", { className: "relative flex-1 min-w-[200px] max-w-[250px]", ref: regionRef, children: [_jsxs("button", { onClick: () => {
                                setRegionOpen(!regionOpen);
                                setRatingOpen(false);
                                setCategoryOpen(false);
                            }, className: "w-full flex justify-between items-center border-2 border-gray-200 rounded-xl px-4 py-3 bg-white text-sm text-gray-700 hover:border-[#4B5563] hover:shadow-md focus:outline-none transition-all duration-300 shadow-sm", children: [_jsxs("span", { className: "font-medium flex items-center gap-2", children: [_jsx(MapPin, { className: "w-4 h-4 text-red-500" }), _jsx("span", { children: region })] }), _jsx(ChevronDown, { className: `w-4 h-4 text-gray-400 transition-transform duration-300 ${regionOpen ? "rotate-180 text-[#4B5563]" : ""}` })] }), regionOpen && (_jsx("div", { className: "absolute z-[9999] mt-2 w-full bg-white border-2 border-gray-200 rounded-xl shadow-xl overflow-hidden animate-fade-in", children: regionOptions.map((opt) => (_jsx("div", { onClick: () => {
                                    setRegion(opt);
                                    setRegionOpen(false);
                                }, className: "px-4 py-3 text-sm text-gray-700 hover:bg-[#4B5563]/10 hover:text-[#4B5563] cursor-pointer transition-all duration-200 font-medium", children: opt }, opt))) }))] }), _jsxs("div", { className: "relative flex-1 min-w-[200px] max-w-[250px]", ref: categoryRef, children: [_jsxs("button", { onClick: () => {
                                setCategoryOpen(!categoryOpen);
                                setRegionOpen(false);
                                setRatingOpen(false);
                            }, className: "w-full flex justify-between items-center border-2 border-gray-200 rounded-xl px-4 py-3 bg-white text-sm text-gray-700 hover:border-[#4B5563] hover:shadow-md focus:outline-none transition-all duration-300 shadow-sm", children: [_jsxs("span", { className: "font-medium flex items-center gap-2", children: [_jsx(Tag, { className: "w-4 h-4 text-[#4B5563]" }), _jsx("span", { children: category })] }), _jsx(ChevronDown, { className: `w-4 h-4 text-gray-400 transition-transform duration-300 ${categoryOpen ? "rotate-180 text-[#4B5563]" : ""}` })] }), categoryOpen && (_jsx("div", { className: "absolute z-[9999] mt-2 w-full bg-white border-2 border-gray-200 rounded-xl shadow-xl overflow-hidden animate-fade-in max-h-60 overflow-y-auto custom-scrollbar", children: categoryOptions.map((opt) => (_jsx("div", { onClick: () => {
                                    setCategory(opt);
                                    setCategoryOpen(false);
                                }, className: "px-4 py-3 text-sm text-gray-700 hover:bg-[#4B5563]/10 hover:text-[#4B5563] cursor-pointer transition-all duration-200 font-medium", children: opt }, opt))) }))] })] }) }));
};
export default ProductFilters;

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Star, MapPin, Tag } from "lucide-react";
const StoreFilters = ({ onFilterChange }) => {
    const [ratingOpen, setRatingOpen] = useState(false);
    const [regionOpen, setRegionOpen] = useState(false);
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [rating, setRating] = useState("Đánh giá cao nhất");
    const [region, setRegion] = useState("Tất cả khu vực");
    const [category, setCategory] = useState("Tất cả ngành hàng");
    const ratingRef = useRef(null);
    const regionRef = useRef(null);
    const categoryRef = useRef(null);
    const ratingOptions = ["Đánh giá cao nhất", "Đánh giá trung bình"];
    const regionOptions = ["Tất cả khu vực", "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Cần Thơ", "Huế"];
    const categoryOptions = [
        "Tất cả ngành hàng",
        "Điện tử",
        "Thời trang",
        "Hoa quả",
        "Thực phẩm",
        "Gia dụng",
        "Mỹ phẩm",
        "Thể thao",
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
    // Gọi onFilterChange khi filter thay đổi
    useEffect(() => {
        onFilterChange({ rating, region, category });
    }, [rating, region, category, onFilterChange]);
    return (_jsx("div", { className: "canva-filter-bar bg-transparent p-0", children: _jsxs("div", { className: "flex flex-col sm:flex-row flex-wrap gap-2 md:gap-3 lg:gap-4", children: [_jsxs("div", { ref: ratingRef, className: "relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-[250px]", style: { zIndex: ratingOpen ? 101 : 50 }, children: [_jsxs("button", { onClick: () => {
                                setRatingOpen(!ratingOpen);
                                setRegionOpen(false);
                                setCategoryOpen(false);
                            }, className: "w-full flex justify-between items-center border-2 border-gray-200 rounded-lg md:rounded-xl px-3 py-2 md:px-4 md:py-3 bg-white text-xs md:text-sm text-gray-700 hover:border-[#4B5563] hover:shadow-md focus:outline-none transition-all duration-300 shadow-sm touch-manipulation", children: [_jsxs("span", { className: "font-medium truncate flex items-center gap-1.5 sm:gap-2", children: [_jsx(Star, { className: "w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" }), _jsx("span", { children: rating })] }), _jsx(ChevronDown, { className: `w-3 h-3 md:w-4 md:h-4 text-gray-400 transition-transform duration-300 flex-shrink-0 ml-2 ${ratingOpen ? "rotate-180 text-[#4B5563]" : ""}` })] }), ratingOpen && (_jsx("div", { className: "absolute top-full left-0 right-0 mt-2 w-full bg-white border-2 border-gray-200 rounded-lg md:rounded-xl shadow-2xl overflow-hidden", style: { zIndex: 101 }, children: ratingOptions.map((opt) => (_jsx("div", { onClick: () => {
                                    setRating(opt);
                                    setRatingOpen(false);
                                }, className: "px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm text-gray-700 hover:bg-[#4B5563]/10 hover:text-[#4B5563] cursor-pointer transition-all duration-200 font-medium", children: opt }, opt))) }))] }), _jsxs("div", { ref: regionRef, className: "relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-[250px]", style: { zIndex: regionOpen ? 101 : 50 }, children: [_jsxs("button", { onClick: () => {
                                setRegionOpen(!regionOpen);
                                setRatingOpen(false);
                                setCategoryOpen(false);
                            }, className: "w-full flex justify-between items-center border-2 border-gray-200 rounded-lg md:rounded-xl px-3 py-2 md:px-4 md:py-3 bg-white text-xs md:text-sm text-gray-700 hover:border-[#4B5563] hover:shadow-md focus:outline-none transition-all duration-300 shadow-sm touch-manipulation", children: [_jsxs("span", { className: "font-medium truncate flex items-center gap-1.5 sm:gap-2", children: [_jsx(MapPin, { className: "w-3 h-3 sm:w-4 sm:h-4 text-red-500 flex-shrink-0" }), _jsx("span", { children: region })] }), _jsx(ChevronDown, { className: `w-3 h-3 md:w-4 md:h-4 text-gray-400 transition-transform duration-300 flex-shrink-0 ml-2 ${regionOpen ? "rotate-180 text-[#4B5563]" : ""}` })] }), regionOpen && (_jsx("div", { className: "absolute top-full left-0 right-0 mt-2 w-full bg-white border-2 border-gray-200 rounded-lg md:rounded-xl shadow-2xl overflow-hidden max-h-48 md:max-h-60 overflow-y-auto custom-scrollbar", style: { zIndex: 101 }, children: regionOptions.map((opt) => (_jsx("div", { onClick: () => {
                                    setRegion(opt);
                                    setRegionOpen(false);
                                }, className: "px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm text-gray-700 hover:bg-[#4B5563]/10 hover:text-[#4B5563] cursor-pointer transition-all duration-200 font-medium", children: opt }, opt))) }))] }), _jsxs("div", { ref: categoryRef, className: "relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-[250px]", style: { zIndex: categoryOpen ? 101 : 50 }, children: [_jsxs("button", { onClick: () => {
                                setCategoryOpen(!categoryOpen);
                                setRegionOpen(false);
                                setRatingOpen(false);
                            }, className: "w-full flex justify-between items-center border-2 border-gray-200 rounded-lg md:rounded-xl px-3 py-2 md:px-4 md:py-3 bg-white text-xs md:text-sm text-gray-700 hover:border-[#4B5563] hover:shadow-md focus:outline-none transition-all duration-300 shadow-sm touch-manipulation", children: [_jsxs("span", { className: "font-medium truncate flex items-center gap-1.5 sm:gap-2", children: [_jsx(Tag, { className: "w-3 h-3 sm:w-4 sm:h-4 text-purple-500 flex-shrink-0" }), _jsx("span", { children: category })] }), _jsx(ChevronDown, { className: `w-3 h-3 md:w-4 md:h-4 text-gray-400 transition-transform duration-300 flex-shrink-0 ml-2 ${categoryOpen ? "rotate-180 text-[#4B5563]" : ""}` })] }), categoryOpen && (_jsx("div", { className: "absolute top-full left-0 right-0 mt-2 w-full bg-white border-2 border-gray-200 rounded-lg md:rounded-xl shadow-2xl overflow-hidden max-h-48 md:max-h-60 overflow-y-auto custom-scrollbar", style: { zIndex: 101 }, children: categoryOptions.map((opt) => (_jsx("div", { onClick: () => {
                                    setCategory(opt);
                                    setCategoryOpen(false);
                                }, className: "px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm text-gray-700 hover:bg-[#4B5563]/10 hover:text-[#4B5563] cursor-pointer transition-all duration-200 font-medium", children: opt }, opt))) }))] })] }) }));
};
export default StoreFilters;

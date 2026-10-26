import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Clock, ChevronRight, Zap } from "lucide-react";
import ProductCard from "../FeaturedProducts/ProductCard";
import axiosClient from "../../../api/axiosClient";
const FlashSale = () => {
    const [timeLeft, setTimeLeft] = useState({
        hours: 8,
        minutes: 45,
        seconds: 30,
    });
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef(null);
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await axiosClient.get("/api/products", { params: { limit: 20 } });
                const allProducts = res.data?.data ?? res.data?.products ?? res.data ?? [];
                const saleProducts = Array.isArray(allProducts)
                    ? allProducts.filter((p) => p.salePrice && p.salePrice < p.price)
                    : [];
                setProducts(saleProducts);
            }
            catch (err) {
                console.error("Lỗi tải flash sale:", err);
                setProducts([]);
            }
            finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                let { hours, minutes, seconds } = prev;
                if (seconds > 0) {
                    seconds--;
                }
                else {
                    seconds = 59;
                    if (minutes > 0) {
                        minutes--;
                    }
                    else {
                        minutes = 59;
                        if (hours > 0) {
                            hours--;
                        }
                        else {
                            hours = 23;
                        }
                    }
                }
                return { hours, minutes, seconds };
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);
    const formatTime = (num) => num.toString().padStart(2, "0");
    const scrollLeft = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: -400, behavior: "smooth" });
        }
    };
    const scrollRight = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: 400, behavior: "smooth" });
        }
    };
    return (_jsx("section", { className: "mt-3 sm:mt-6 lg:mt-8", children: _jsxs("div", { className: "bg-white rounded-lg sm:rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden", children: [_jsx("div", { className: "bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 px-3 sm:px-4 sm:px-6 md:px-8 py-3 sm:py-4 sm:py-5", children: _jsxs("div", { className: "flex items-center justify-between gap-2 sm:gap-3", children: [_jsxs("div", { className: "flex items-center gap-2 sm:gap-3 lg:gap-4 flex-shrink-0", children: [_jsxs("div", { className: "flex items-center gap-1.5 sm:gap-2", children: [_jsx(Zap, { className: "w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7 text-yellow-400 fill-yellow-400" }), _jsx("h3", { className: "text-white text-sm xs:text-base sm:text-lg md:text-2xl font-black tracking-wide", children: "FLASH SALE" })] }), _jsxs("div", { className: "flex items-center gap-1 sm:gap-1.5 bg-black/25 rounded-lg px-1.5 sm:px-2 xs:px-2 sm:px-3 py-1 sm:py-1.5", children: [_jsx(Clock, { className: "w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 text-white" }), _jsxs("div", { className: "flex gap-0.5 sm:gap-1", children: [_jsx("span", { className: "bg-white text-gray-700 font-bold px-1 sm:px-1.5 xs:px-1.5 py-0.5 rounded text-[10px] xs:text-xs sm:text-sm", children: formatTime(timeLeft.hours) }), _jsx("span", { className: "text-white font-bold text-[10px] xs:text-xs", children: ":" }), _jsx("span", { className: "bg-white text-gray-700 font-bold px-1 sm:px-1.5 xs:px-1.5 py-0.5 rounded text-[10px] xs:text-xs sm:text-sm", children: formatTime(timeLeft.minutes) }), _jsx("span", { className: "text-white font-bold text-[10px] xs:text-xs", children: ":" }), _jsx("span", { className: "bg-white text-gray-700 font-bold px-1 sm:px-1.5 xs:px-1.5 py-0.5 rounded text-[10px] xs:text-xs sm:text-sm animate-pulse", children: formatTime(timeLeft.seconds) })] })] })] }), _jsxs("div", { className: "flex items-center gap-1 sm:gap-2 lg:gap-3 flex-shrink-0", children: [_jsx("button", { onClick: scrollLeft, className: "w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 bg-white/20 hover:bg-white/35 rounded-full flex items-center justify-center transition-colors", "aria-label": "Cu\u1ED9n sang tr\u00E1i", children: _jsx(ChevronRight, { className: "w-4 h-4 xs:w-5 xs:h-5 text-white rotate-180" }) }), _jsx("button", { onClick: scrollRight, className: "w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 bg-white/20 hover:bg-white/35 rounded-full flex items-center justify-center transition-colors", "aria-label": "Cu\u1ED9n sang ph\u1EA3i", children: _jsx(ChevronRight, { className: "w-4 h-4 xs:w-5 xs:h-5 text-white" }) }), _jsxs(Link, { to: "/products?sale=true", className: "flex items-center gap-0.5 sm:gap-1 text-white font-semibold hover:text-yellow-300 transition-colors text-[10px] xs:text-xs sm:text-sm", children: ["Xem t\u1EA5t c\u1EA3 ", _jsx(ChevronRight, { className: "w-3 h-3 xs:w-4 xs:h-4" })] })] })] }) }), loading ? (_jsx("div", { className: "flex gap-2 sm:gap-3 p-3 sm:p-4 sm:p-6 overflow-hidden", children: [...Array(5)].map((_, i) => (_jsxs("div", { className: "flex-shrink-0 w-[150px] xs:w-[160px] sm:w-[180px] sm:w-[200px] md:w-[220px] bg-gray-100 rounded-lg sm:rounded-xl p-2 sm:p-3 animate-pulse", children: [_jsx("div", { className: "bg-gray-200 h-24 xs:h-28 sm:h-32 sm:h-40 md:h-48 rounded-lg mb-2 sm:mb-3" }), _jsx("div", { className: "bg-gray-200 h-3 sm:h-4 rounded w-3/4 mb-1.5 sm:mb-2" }), _jsx("div", { className: "bg-gray-200 h-3 sm:h-4 rounded w-1/2" })] }, i))) })) : products.length > 0 ? (_jsx("div", { ref: scrollRef, className: "flex gap-2 sm:gap-3 p-3 sm:p-4 sm:p-6 overflow-x-auto no-scrollbar scroll-smooth", children: products.slice(0, 10).map((prod) => {
                        const productForCard = {
                            ...prod,
                            store: typeof prod.store === "string"
                                ? prod.store
                                : prod.store?.name
                                    ? { name: prod.store.name }
                                    : { name: "Unknown" },
                        };
                        return (_jsx("div", { className: "flex-shrink-0 w-[150px] xs:w-[160px] sm:w-[180px] sm:w-[200px] md:w-[220px]", children: _jsx(ProductCard, { product: productForCard }) }, prod._id));
                    }) })) : (_jsx("div", { className: "p-8 text-center text-gray-500", children: "Kh\u00F4ng c\u00F3 s\u1EA3n ph\u1EA9m flash sale" }))] }) }));
};
export default FlashSale;

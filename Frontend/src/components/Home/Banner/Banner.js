import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
const demoBanners = [
    {
        _id: "1",
        title: "#Big Fashion Sale",
        subtitle: "Redefine Your Everyday Style",
        badge: "Limited Time Offer!",
        discount: "50%",
        ctaText: "Shop Now →",
        ctaLink: "/products",
        images: [
            "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=400&fit=crop",
            "https://images.unsplash.com/photo-1445205170230-053b83016050?w=300&h=300&fit=crop",
            "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=300&h=300&fit=crop",
        ],
    },
    {
        _id: "2",
        title: "New Season Collection",
        subtitle: "Discover the Latest Trends",
        badge: "Just Dropped!",
        discount: "30%",
        ctaText: "Explore Now →",
        ctaLink: "/products",
        images: [
            "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&h=400&fit=crop",
            "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=300&h=300&fit=crop",
            "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=300&h=300&fit=crop",
        ],
    },
    {
        _id: "3",
        title: "Summer Vibes",
        subtitle: "Light & Breezy Styles for Days",
        badge: "Summer Sale!",
        discount: "40%",
        ctaText: "Shop Summer →",
        ctaLink: "/products",
        images: [
            "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=400&fit=crop",
            "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=300&h=300&fit=crop",
            "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=300&h=300&fit=crop",
        ],
    },
];
const BannerSlider = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);
    const carouselRef = useRef(null);
    // Auto slide every 5 seconds
    React.useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % demoBanners.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);
    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? demoBanners.length - 1 : prev - 1));
    };
    const goToNext = () => {
        setCurrentIndex((prev) => (prev + 1) % demoBanners.length);
    };
    const handleTouchStart = (e) => {
        setTouchStart(e.targetTouches[0].clientX);
    };
    const handleTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };
    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd)
            return;
        const distance = touchStart - touchEnd;
        if (distance > 50)
            goToNext();
        if (distance < -50)
            goToPrevious();
    };
    const banner = demoBanners[currentIndex];
    return (_jsx("div", { className: "mt-3 sm:mt-6 lg:mt-8 relative px-1 sm:px-0", children: _jsxs("div", { ref: carouselRef, className: "relative rounded-lg xs:rounded-xl sm:rounded-2xl overflow-hidden w-full h-[160px] xs:h-[180px] sm:h-[220px] md:h-[280px] lg:h-[380px] shadow-xl", onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd, children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-br from-gray-700 via-gray-600 to-gray-800" }), _jsx("div", { className: "absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" }), _jsx("div", { className: "absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" }), _jsx("div", { className: "absolute top-1/2 left-1/4 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2" }), _jsxs("div", { className: "relative h-full flex flex-col lg:flex-row items-center justify-between px-4 xs:px-6 sm:px-10 lg:px-16 py-4 xs:py-5 sm:py-8", children: [_jsxs("div", { className: "flex-1 text-white z-10 text-center lg:text-left", children: [_jsxs("div", { className: "inline-flex items-center gap-1.5 xs:gap-2 bg-white/15 backdrop-blur-sm px-3 xs:px-4 sm:px-5 py-1.5 xs:py-2 rounded-full mb-2 xs:mb-3 sm:mb-4", children: [_jsx(ShoppingBag, { size: 12, className: "xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4" }), _jsx("span", { className: "text-[10px] xs:text-xs sm:text-sm font-semibold tracking-wide", children: banner.badge })] }), _jsx("h1", { className: "text-lg xs:text-xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black mb-1 sm:mb-2 leading-tight", children: banner.title }), _jsx("p", { className: "text-white/80 text-[10px] xs:text-xs sm:text-sm md:text-base mb-2 xs:mb-3 sm:mb-4 font-medium max-w-md mx-auto lg:mx-0", children: banner.subtitle }), _jsxs("div", { className: "flex items-center justify-center lg:justify-start gap-1 xs:gap-1.5 sm:gap-2 mb-3 xs:mb-4 sm:mb-5", children: [_jsx("span", { className: "text-xs xs:text-sm sm:text-xl md:text-2xl font-bold text-gray-200", children: "Up to" }), _jsx("span", { className: "text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black", children: banner.discount }), _jsx("span", { className: "text-xs xs:text-sm sm:text-xl md:text-2xl font-bold text-gray-200", children: "OFF!" })] }), _jsx(Link, { to: banner.ctaLink, className: "inline-block bg-gray-200 text-gray-800 font-bold px-4 xs:px-5 sm:px-8 lg:px-10 py-2 xs:py-2.5 sm:py-3 rounded-full hover:bg-white hover:shadow-2xl transition-all duration-300 shadow-xl transform hover:scale-105 text-[11px] xs:text-xs sm:text-sm md:text-base", children: banner.ctaText })] }), _jsx("div", { className: "hidden lg:flex flex-1 items-center justify-end z-10", children: _jsxs("div", { className: "relative w-[400px] h-[320px]", children: [_jsx("div", { className: "absolute top-0 right-0 w-48 h-48 rounded-2xl overflow-hidden shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500", children: _jsx("img", { src: banner.images[0], alt: "Fashion", className: "w-full h-full object-cover" }) }), _jsx("div", { className: "absolute bottom-8 right-24 w-36 h-36 rounded-2xl overflow-hidden shadow-2xl transform -rotate-6 hover:rotate-0 transition-transform duration-500", children: _jsx("img", { src: banner.images[1], alt: "Fashion", className: "w-full h-full object-cover" }) }), _jsx("div", { className: "absolute bottom-0 left-0 w-32 h-32 rounded-2xl overflow-hidden shadow-2xl transform rotate-6 hover:rotate-0 transition-transform duration-500", children: _jsx("img", { src: banner.images[2], alt: "Fashion", className: "w-full h-full object-cover" }) }), _jsx("div", { className: "absolute top-12 left-0 bg-gray-200 rounded-full w-16 h-16 flex items-center justify-center shadow-xl", children: _jsx("span", { className: "text-gray-800 font-black text-lg", children: banner.discount }) })] }) })] }), _jsx("button", { onClick: goToPrevious, className: "absolute left-1 xs:left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 bg-gray-200/90 hover:bg-gray-200 text-gray-800 rounded-full p-1.5 xs:p-2 sm:p-3 shadow-xl transition-all duration-300 hover:scale-110 active:scale-95", "aria-label": "Banner tr\u01B0\u1EDBc", children: _jsx(ChevronLeft, { className: "w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5" }) }), _jsx("button", { onClick: goToNext, className: "absolute right-1 xs:right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 bg-gray-200/90 hover:bg-gray-200 text-gray-800 rounded-full p-1.5 xs:p-2 sm:p-3 shadow-xl transition-all duration-300 hover:scale-110 active:scale-95", "aria-label": "Banner sau", children: _jsx(ChevronRight, { className: "w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5" }) }), _jsx("div", { className: "absolute bottom-2 xs:bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 xs:gap-2", children: demoBanners.map((_, index) => (_jsx("button", { onClick: () => setCurrentIndex(index), className: `w-5 xs:w-6 sm:w-10 h-1.5 xs:h-2 rounded-full transition-all duration-300 ${index === currentIndex
                            ? "bg-gray-200 w-5 xs:w-6 sm:w-12"
                            : "bg-white/40 hover:bg-white/60"}`, "aria-label": `Đi tới banner ${index + 1}` }, index))) })] }) }));
};
export default BannerSlider;

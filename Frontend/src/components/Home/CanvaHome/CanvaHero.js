import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Gift, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { showImageFallback } from "../../../utils/imageFallback";
const defaultSlides = [
    { kicker: "Mua sắm mỗi ngày", title: "Đại tiệc mua sắm MDUC247", description: "Khám phá sản phẩm từ nhiều gian hàng bạn yêu thích.", image: "/home/shopping-hero.png", alt: "Bàn mua sắm với máy tính và hộp quà", href: "/products", gradient: "linear-gradient(120deg, #4969d8, #a6a4ed)" },
    { kicker: "Phong cách mỗi ngày", title: "Chọn món đồ bạn yêu", description: "Tìm cảm hứng mới cho phong cách của riêng bạn.", image: "/home/fashion-hero.png", alt: "Túi tote vải canvas", href: "/category/fashion", gradient: "linear-gradient(120deg, #6573d9, #c7a5db)" },
    { kicker: "Làm mới không gian", title: "Tiện ích cho tổ ấm", description: "Những lựa chọn nhỏ cho một không gian nhiều niềm vui.", image: "/home/home-hero.png", alt: "Đèn bàn LED", href: "/category/home", gradient: "linear-gradient(120deg, #426eae, #9bb9dc)" },
];
const CanvaHero = ({ banners = [], slidesOverride }) => {
    const [active, setActive] = useState(0);
    const gradients = { blue: 'linear-gradient(120deg, #4969d8, #a6a4ed)', purple: 'linear-gradient(120deg, #6573d9, #c7a5db)', cyan: 'linear-gradient(120deg, #426eae, #9bb9dc)' };
    const slides = slidesOverride ? slidesOverride.filter(slide => slide.enabled).map(slide => ({ id: slide.id, kicker: slide.kicker, title: slide.title, description: slide.description,
        image: slide.imageUrl, alt: slide.imageAlt, href: slide.targetUrl, gradient: gradients[slide.tone], buttonText: slide.buttonText })) : banners.length ? banners.map(banner => ({
        id: banner.id, buttonText: 'Khám phá ngay',
        kicker: "Khám phá MDUC247", title: banner.title, description: "Khám phá thêm sản phẩm đang bán.",
        image: banner.imageUrl || "/home/shopping-hero.png", alt: banner.title,
        href: banner.targetUrl, gradient: "linear-gradient(120deg, #4969d8, #a6a4ed)",
    })) : defaultSlides.map((slide, index) => ({ ...slide, id: 'default-' + index, buttonText: index === 0 ? 'Bắt đầu mua hàng' : 'Khám phá ngay' }));
    useEffect(() => {
        setActive(0);
        if (slides.length < 2)
            return;
        const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 5500);
        return () => window.clearInterval(timer);
    }, [slides.length]);
    const show = (index) => setActive((index + slides.length) % slides.length);
    if (!slides.length)
        return null;
    return (_jsxs("section", { className: "canva-home__hero", "aria-label": "\u01AFu \u0111\u00E3i n\u1ED5i b\u1EADt", children: [_jsxs("div", { className: "canva-home__carousel", children: [slides.map((slide, index) => (_jsxs("article", { className: `canva-home__slide ${index === active ? "is-active" : ""}`, style: { background: slide.gradient }, "aria-hidden": index !== active, children: [_jsxs("div", { className: "canva-home__hero-copy", children: [_jsx("p", { className: "canva-home__eyebrow canva-home__eyebrow--light", children: slide.kicker }), index === 0 ? _jsx("h1", { children: slide.title }) : _jsx("h2", { children: slide.title }), _jsx("p", { children: slide.description }), _jsx(Link, { className: "canva-home__primary-button", to: slide.href, children: slide.buttonText })] }), _jsx("img", { src: slide.image, alt: slide.alt, className: "canva-home__hero-image", onError: showImageFallback })] }, slide.id))), _jsx("div", { className: "canva-home__dots", "aria-label": "Ch\u1ECDn banner", children: slides.map((slide, index) => _jsx("button", { type: "button", className: index === active ? "is-active" : "", onClick: () => show(index), "aria-label": `Banner ${index + 1}`, "aria-current": index === active ? "true" : undefined }, slide.id)) }), _jsxs("div", { className: "canva-home__carousel-controls", children: [_jsx("button", { type: "button", onClick: () => show(active - 1), "aria-label": "Banner tr\u01B0\u1EDBc", children: _jsx(ChevronLeft, {}) }), _jsx("button", { type: "button", onClick: () => show(active + 1), "aria-label": "Banner ti\u1EBFp theo", children: _jsx(ChevronRight, {}) })] })] }), _jsxs("div", { className: "canva-home__promos", children: [_jsxs("article", { className: "canva-home__promo canva-home__promo--cyan", children: [_jsx(Truck, { "aria-hidden": "true" }), _jsx("h2", { children: "Giao h\u00E0ng thu\u1EADn ti\u1EC7n" }), _jsx("p", { children: "Xem ph\u00ED v\u1EADn chuy\u1EC3n r\u00F5 r\u00E0ng tr\u01B0\u1EDBc khi \u0111\u1EB7t h\u00E0ng." })] }), _jsxs("article", { className: "canva-home__promo canva-home__promo--coral", children: [_jsx(Gift, { "aria-hidden": "true" }), _jsx("h2", { children: "Kh\u00E1m ph\u00E1 gian h\u00E0ng m\u1EDBi" }), _jsx("p", { children: "T\u00ECm th\u00EAm s\u1EA3n ph\u1EA9m t\u1EEB c\u00E1c c\u1EEDa h\u00E0ng \u0111ang b\u00E1n." })] })] })] }));
};
export default CanvaHero;

import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Apple, ArrowRight, BookOpen, Dumbbell, House, Laptop, Package, Shirt, Smartphone, Sparkles, Star, Store, Tag } from 'lucide-react';
import { catalogApi } from '../../api/catalogApi';
import { engagementApi } from '../../api/engagementApi';
import CanvaHero from '../../components/Home/CanvaHome/CanvaHero';
import LiveProductCard from '../../components/Home/CanvaHome/LiveProductCard';
import LiveFlashCard from '../../components/Home/CanvaHome/LiveFlashCard';
import '../../components/Home/CanvaHome/CanvaHome.css';
const empty = { categories: [], featuredProducts: [], newestProducts: [], bestSellers: [], featuredStores: [], banners: [] };
const iconMap = { laptop: Laptop, shirt: Shirt, house: House, sparkles: Sparkles, dumbbell: Dumbbell, apple: Apple, book: BookOpen, tag: Tag, phone: Smartphone, package: Package };
const defaults = [{ id: 'hero', key: 'hero', title: 'Banner trang chủ', eyebrow: '', enabled: true, limit: 6 },
    { id: 'categories', key: 'categories', title: 'Danh mục nổi bật', eyebrow: 'Khám phá dễ dàng', enabled: true, limit: 8 },
    { id: 'flashSale', key: 'flashSale', title: '⚡ Flash Sale', eyebrow: '', enabled: true, limit: 5 },
    { id: 'featuredProducts', key: 'featuredProducts', title: 'Sản phẩm nổi bật', eyebrow: '', enabled: true, limit: 4 },
    { id: 'featuredStores', key: 'featuredStores', title: 'Cửa hàng nổi bật', eyebrow: 'Mua sắm an tâm', enabled: true, limit: 8 },
    { id: 'suggestions', key: 'suggestions', title: 'Gợi ý hôm nay', eyebrow: 'Dành cho bạn', enabled: true, limit: 5 }];
function flatten(items) { return items.flatMap(item => [item, ...flatten(item.children || [])]); }
function fallbackTiles(categories) {
    const definitions = [['electronics', 'Điện tử', 'laptop', 'blue'], ['fashion', 'Thời trang', 'shirt', 'pink'], ['home', 'Gia dụng', 'house', 'green'],
        ['beauty', 'Làm đẹp', 'sparkles', 'coral'], ['sports', 'Thể thao', 'dumbbell', 'purple'], ['food', 'Thực phẩm', 'apple', 'yellow'], ['books', 'Sách', 'book', 'cyan']];
    return [...definitions.flatMap(([slug, label, icon, tone]) => { const category = categories.find(item => item.slug === slug); return category ? [{ id: slug, categoryId: category.id, label, icon, tone, targetUrl: '/category/' + slug, enabled: true }] : []; }),
        { id: 'sale', categoryId: null, label: 'Ưu đãi', icon: 'tag', tone: 'navy', targetUrl: '/products?sale=true', enabled: true }];
}
function FlashCountdown({ endsAt, serverTime }) {
    const [remaining, setRemaining] = useState(0);
    useEffect(() => {
        const offset = new Date(serverTime).getTime() - Date.now();
        const update = () => setRemaining(Math.max(0, new Date(endsAt).getTime() - Date.now() - offset));
        update();
        const timer = window.setInterval(update, 1000);
        return () => window.clearInterval(timer);
    }, [endsAt, serverTime]);
    return _jsxs("div", { className: "canva-home__countdown", children: [_jsx("span", { children: "K\u1EBFt th\u00FAc trong" }), _jsx("time", { dateTime: endsAt, children: [Math.floor(remaining / 3600000), Math.floor(remaining / 60000) % 60, Math.floor(remaining / 1000) % 60].map(value => String(value).padStart(2, '0')).join(':') })] });
}
export default function Home({ initialData } = {}) {
    const [data, setData] = useState(initialData || empty), [loading, setLoading] = useState(!initialData);
    const [flash, setFlash] = useState({ serverTime: '', items: [] });
    useEffect(() => {
        let active = true, request = 0;
        const load = () => {
            const id = ++request;
            void catalogApi.home().then(result => { if (active && id === request)
                setData(result); })
                .catch(error => { if (active)
                toast.error(error instanceof Error ? error.message : 'Không thể tải trang chủ.', { containerId: 'general-toast', toastId: 'home-catalog-error' }); })
                .finally(() => { if (active && id === request)
                setLoading(false); });
        };
        const storage = (event) => { if (event.key === 'mduc247.storefrontVersion')
            load(); };
        if (initialData) {
            setData(initialData);
            setLoading(false);
        }
        else {
            load();
            window.addEventListener('storefrontPublished', load);
            window.addEventListener('storage', storage);
        }
        engagementApi.flashSales().then(result => { if (active)
            setFlash(result); }).catch(() => { });
        return () => { active = false; window.removeEventListener('storefrontPublished', load); window.removeEventListener('storage', storage); };
    }, [initialData]);
    const sections = data.layout?.sections || defaults;
    const config = (key) => sections.find(section => section.key === key) || defaults.find(section => section.key === key);
    const tiles = (data.layout?.featuredCategories || fallbackTiles(flatten(data.categories))).filter(tile => tile.enabled).slice(0, config('categories').limit);
    const featured = data.featuredProducts.slice(0, config('featuredProducts').limit), featuredIds = new Set(featured.map(product => product.id));
    const suggestions = [...data.newestProducts.filter(product => !featuredIds.has(product.id)), ...data.newestProducts.filter(product => featuredIds.has(product.id))].slice(0, config('suggestions').limit);
    const flashEnd = flash.items.length ? flash.items.reduce((earliest, item) => new Date(item.endsAt) < new Date(earliest) ? item.endsAt : earliest, flash.items[0].endsAt) : '';
    function heading(key, link) { const section = config(key); return _jsxs("header", { className: "canva-home__section-header", children: [_jsxs("div", { children: [section.eyebrow && _jsx("p", { className: "canva-home__eyebrow", children: section.eyebrow }), _jsx("h2", { id: `home-${key}-title`, children: section.title })] }), link && _jsxs(Link, { to: link, children: ["Xem t\u1EA5t c\u1EA3 ", _jsx(ArrowRight, { size: 17 })] })] }); }
    const content = {
        hero: _jsx(CanvaHero, { banners: data.banners, slidesOverride: data.storefrontConfigured ? data.layout?.banners.slice(0, config('hero').limit) : undefined }),
        categories: _jsxs("section", { className: "canva-home__section", "aria-labelledby": "home-categories-title", children: [heading('categories'), tiles.length ? _jsx("div", { className: "canva-home__category-grid", children: tiles.map(tile => {
                        const Icon = iconMap[tile.icon] || Package;
                        const count = tile.categoryId ? data.newestProducts.filter(product => product.categoryId === tile.categoryId).length : data.newestProducts.filter(product => product.priceOriginalMinor > product.priceMinor).length;
                        return _jsxs(Link, { className: "canva-home__category", to: tile.targetUrl, children: [_jsx("span", { className: `canva-home__category-icon tone-${tile.tone}`, children: _jsx(Icon, { size: 24 }) }), _jsx("strong", { children: tile.label }), _jsx("small", { children: count ? `${count} sản phẩm gợi ý` : 'Khám phá danh mục' })] }, tile.id);
                    }) }) :
                    _jsx("p", { className: "canva-home__empty", children: loading ? 'Đang tải danh mục…' : 'Chưa có danh mục nổi bật.' })] }),
        flashSale: _jsxs("section", { id: "flash-sale", className: "canva-home__section canva-home__flash", "aria-labelledby": "home-flashSale-title", children: [heading('flashSale', '/flash-sale'), !!flash.items.length && _jsxs("div", { className: "canva-home__title-row", children: [_jsx("span", { className: "canva-home__live", children: "\u0110ang di\u1EC5n ra" }), _jsx(FlashCountdown, { endsAt: flashEnd, serverTime: flash.serverTime })] }), flash.items.length ? _jsx("div", { className: "canva-home__product-grid", children: flash.items.slice(0, config('flashSale').limit).map(item => _jsx(LiveFlashCard, { item: item }, `${item.campaignId}-${item.variantId}`)) }) :
                    _jsxs("div", { className: "canva-home__empty canva-home__empty--flash", children: [_jsx("strong", { children: "Ch\u01B0a c\u00F3 Flash Sale \u0111ang di\u1EC5n ra." }), _jsx("span", { children: "Trong l\u00FAc ch\u1EDD, b\u1EA1n c\u00F3 th\u1EC3 xem c\u00E1c s\u1EA3n ph\u1EA9m \u0111ang b\u00E1n." }), _jsxs(Link, { to: "/products", children: ["Kh\u00E1m ph\u00E1 s\u1EA3n ph\u1EA9m ", _jsx(ArrowRight, { size: 16 })] })] })] }),
        featuredProducts: _jsxs("section", { className: "canva-home__section", "aria-labelledby": "home-featuredProducts-title", children: [heading('featuredProducts', '/products'), featured.length ? _jsx("div", { className: "canva-home__product-grid is-compact", children: featured.map(product => _jsx(LiveProductCard, { product: product, compact: true }, product.id)) }) : _jsx("p", { className: "canva-home__empty", children: loading ? 'Đang tải sản phẩm…' : 'Chưa có sản phẩm đang bán.' })] }),
        featuredStores: _jsxs("section", { className: "canva-home__section canva-home__stores", "aria-labelledby": "home-featuredStores-title", children: [heading('featuredStores', '/store'), data.featuredStores.length ? _jsx("div", { className: "canva-home__store-grid", children: data.featuredStores.slice(0, config('featuredStores').limit).map(store => {
                        const image = store.logoUrl || data.newestProducts.find(product => product.storeId === store.id)?.imageUrl;
                        return _jsxs(Link, { className: "canva-home__store-card", to: `/store/${store.slug}`, children: [_jsx("span", { className: "canva-home__store-logo", children: image ? _jsx("img", { src: image, alt: "" }) : _jsx(Store, { size: 26 }) }), _jsxs("span", { children: [_jsx("strong", { children: store.name }), _jsx("small", { children: store.category || 'Gian hàng MDUC247' }), _jsxs("em", { children: [store.rating != null && _jsxs(_Fragment, { children: [_jsx(Star, { size: 13 }), " ", store.rating.toFixed(1), " \u00B7 "] }), store.productCount ?? 0, " s\u1EA3n ph\u1EA9m"] })] }), _jsx(ArrowRight, { "aria-hidden": "true" })] }, store.id);
                    }) }) :
                    _jsx("p", { className: "canva-home__empty", children: loading ? 'Đang tải cửa hàng…' : 'Chưa có cửa hàng hoạt động.' })] }),
        suggestions: _jsxs("section", { id: "suggestions", className: "canva-home__section", "aria-labelledby": "home-suggestions-title", children: [heading('suggestions', '/products'), suggestions.length ? _jsx("div", { className: "canva-home__product-grid", children: suggestions.map(product => _jsx(LiveProductCard, { product: product }, product.id)) }) : _jsx("p", { className: "canva-home__empty", children: loading ? 'Đang tải gợi ý…' : 'Chưa có sản phẩm gợi ý.' })] }),
    };
    return _jsx("div", { className: "canva-home", children: sections.filter(section => section.enabled).map(section => _jsx(Fragment, { children: content[section.key] }, section.id)) });
}

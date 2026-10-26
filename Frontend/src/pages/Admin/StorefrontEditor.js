import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { adminRequestId } from '../../api/adminCommand';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, Check, Eye, Globe, Plus, RefreshCw, Save, Search, Trash2 } from 'lucide-react';
import { notifyStorefrontPublished, storefrontApi } from '../../api/storefrontApi';
import { AdminDialog, date } from './AdminUi';
import { showImageFallback } from '../../utils/imageFallback';
import './storefront-editor.css';
const tabs = [['navigation', 'Menu điều hướng'], ['featuredCategories', 'Danh mục nổi bật'], ['banners', 'Banner'], ['sections', 'Bố cục trang'], ['selections', 'Sản phẩm & cửa hàng']];
const iconNames = { laptop: 'Máy tính', shirt: 'Áo', house: 'Nhà', sparkles: 'Làm đẹp', dumbbell: 'Thể thao', apple: 'Thực phẩm', book: 'Sách', tag: 'Ưu đãi', phone: 'Điện thoại', package: 'Hộp hàng' };
const toneNames = { blue: 'Xanh dương', pink: 'Hồng', green: 'Xanh lá', coral: 'Cam san hô', purple: 'Tím', yellow: 'Vàng', cyan: 'Xanh nhạt', navy: 'Xanh đậm' };
const blockNames = { hero: 'Banner chính', categories: 'Danh mục nổi bật', flashSale: 'Flash Sale', featuredProducts: 'Sản phẩm nổi bật', featuredStores: 'Cửa hàng nổi bật', suggestions: 'Gợi ý hôm nay' };
function fitCategoryTiles(config) { const section = config.sections.find(section => section.key === 'categories'); if (section)
    section.limit = Math.max(section.limit, config.featuredCategories.filter(item => item.enabled).length); }
function Field({ label, value, onChange, max = 120, placeholder }) {
    return _jsxs("label", { className: "sf-field", children: [label, _jsx("input", { value: value, maxLength: max, onChange: event => onChange(event.target.value), placeholder: placeholder })] });
}
export default function StorefrontEditor() {
    const attempt = useRef({ signature: '', requestId: '' }), categoryAttempt = useRef({ signature: '', requestId: '' });
    const [reason, setReason] = useState(''), [categoryReason, setCategoryReason] = useState('');
    const navigate = useNavigate();
    const [state, setState] = useState(null), [draft, setDraft] = useState(null);
    const [tab, setTab] = useState('navigation'), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [dirty, setDirty] = useState(false);
    const [error, setError] = useState(''), [notice, setNotice] = useState(''), [publishDialog, setPublishDialog] = useState(false);
    const [categoryDialog, setCategoryDialog] = useState(false), [categoryName, setCategoryName] = useState(''), [categorySlug, setCategorySlug] = useState(''), [parentId, setParentId] = useState('');
    const [categoryError, setCategoryError] = useState(''), [categoryBusy, setCategoryBusy] = useState(false);
    const [queries, setQueries] = useState({ products: '', stores: '' }), [choices, setChoices] = useState({ products: [], stores: [] });
    const [choiceError, setChoiceError] = useState(''), [pickedNames, setPickedNames] = useState({});
    const fetchState = useCallback(async () => {
        setLoading(true);
        setError('');
        setState(null);
        setDraft(null);
        try {
            const result = await storefrontApi.read();
            setState(result);
            setDraft(structuredClone(result.draft));
            setDirty(false);
            setPickedNames(Object.fromEntries([...result.references.products, ...result.references.stores].map(item => [item.id, item.name])));
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Chưa tải được cấu hình.');
        }
        finally {
            setLoading(false);
        }
    }, []);
    async function load() {
        if (dirty && !window.confirm('Tải lại sẽ bỏ các thay đổi chưa lưu. Tiếp tục?'))
            return;
        await fetchState();
    }
    useEffect(() => { void fetchState(); }, [fetchState]);
    useEffect(() => {
        if (tab !== 'selections')
            return;
        let active = true;
        setChoiceError('');
        const timer = setTimeout(() => {
            void Promise.all([storefrontApi.choices('products', queries.products), storefrontApi.choices('stores', queries.stores)])
                .then(([products, stores]) => { if (active)
                setChoices({ products: products.items, stores: stores.items }); })
                .catch(() => { if (active)
                setChoiceError('Chưa tải được các lựa chọn. Hãy thử đổi từ khóa hoặc tải lại.'); });
        }, 250);
        return () => { active = false; clearTimeout(timer); };
    }, [tab, queries.products, queries.stores]);
    useEffect(() => { const warn = (event) => { if (dirty) {
        event.preventDefault();
        event.returnValue = '';
    } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
    function update(change) { setDraft(current => { if (!current)
        return current; const next = structuredClone(current); change(next); return next; }); setDirty(true); setNotice(''); }
    function patch(key, index, values) { update(config => { Object.assign(config[key][index], values); if (key === 'featuredCategories' && values.enabled === true)
        fitCategoryTiles(config); }); }
    function move(key, index, direction) { update(config => { const items = config[key]; const [item] = items.splice(index, 1); items.splice(index + direction, 0, item); }); }
    function remove(key, index) { update(config => config[key].splice(index, 1)); }
    async function save(publish = false, preview = false) {
        if (!draft || !state || busy)
            return;
        if (reason.trim().length < 8) {
            setError('Nhập lý do cập nhật từ 8 đến 500 ký tự.');
            return;
        }
        setBusy(true);
        setError('');
        setNotice('');
        try {
            const result = await storefrontApi.save(draft, state.version, publish, reason.trim(), adminRequestId(attempt.current, { config: draft, version: state.version, publish, reason: reason.trim() }));
            setDraft(result.draft);
            setState(current => current ? { ...current, ...result, history: [result.change, ...current.history].slice(0, 20), published: publish ? result.draft : current.published } : current);
            setDirty(false);
            setPublishDialog(false);
            setNotice(publish ? 'Đã xuất bản. Trang chủ và menu điều hướng đã được cập nhật.' : 'Đã lưu bản nháp. Trang công khai chưa thay đổi.');
            if (publish)
                notifyStorefrontPublished();
            if (preview)
                navigate('/admin/storefront/preview');
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Chưa thể lưu cấu hình.');
            setPublishDialog(false);
        }
        finally {
            setBusy(false);
        }
    }
    async function createCategory(event) {
        event.preventDefault();
        if (categoryBusy || !state)
            return;
        setCategoryBusy(true);
        setCategoryError('');
        const input = { name: categoryName.trim(), ...(categorySlug.trim() ? { slug: categorySlug.trim() } : {}), parentId: parentId || null, version: state.version, reason: categoryReason.trim() };
        try {
            const result = await storefrontApi.createCategory({ ...input, requestId: adminRequestId(categoryAttempt.current, input) });
            setState(current => current ? { ...current, version: result.version, categories: [...current.categories.filter(item => item.id !== result.category.id), result.category] } : current);
            if (draft && draft.featuredCategories.length < 16)
                update(config => { config.featuredCategories.push({ id: crypto.randomUUID(), categoryId: result.category.id, label: result.category.name.slice(0, 60), targetUrl: '/category/' + result.category.slug, icon: 'package', tone: 'blue', enabled: true }); fitCategoryTiles(config); });
            setCategoryDialog(false);
            setNotice(draft && draft.featuredCategories.length < 16 ? 'Đã tạo danh mục và thêm vào bản nháp danh mục nổi bật.' : 'Đã tạo danh mục trong catalog. Bạn có thể chọn sau khi bớt ô nổi bật hiện có.');
        }
        catch (cause) {
            setCategoryError(cause instanceof Error ? cause.message : 'Chưa thể tạo danh mục.');
        }
        finally {
            setCategoryBusy(false);
        }
    }
    function controls(key, index, label, removable = true) {
        const item = draft[key][index];
        return _jsxs("div", { className: "sf-row-controls", children: [_jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: item.enabled, onChange: event => patch(key, index, { enabled: event.target.checked }) }), "Hi\u1EC3n th\u1ECB"] }), _jsx("button", { type: "button", "aria-label": `Đưa lên ${label}`, disabled: index === 0, onClick: () => move(key, index, -1), children: _jsx(ArrowUp, { size: 15 }) }), _jsx("button", { type: "button", "aria-label": `Đưa xuống ${label}`, disabled: index === draft[key].length - 1, onClick: () => move(key, index, 1), children: _jsx(ArrowDown, { size: 15 }) }), removable && _jsx("button", { type: "button", "aria-label": `Xóa ${label}`, onClick: () => remove(key, index), children: _jsx(Trash2, { size: 15 }) })] });
    }
    if (loading && !state)
        return _jsxs("div", { className: "pa-page", children: [_jsx("h1", { children: "Giao di\u1EC7n trang ch\u1EE7" }), _jsx("p", { role: "status", children: "\u0110ang t\u1EA3i c\u1EA5u h\u00ECnh\u2026" })] });
    return _jsxs("div", { className: "pa-page sf-editor", children: [_jsxs("div", { className: "pa-page-heading", children: [_jsxs("div", { children: [_jsx("span", { className: "pa-eyebrow", children: "TR\u1EA2I NGHI\u1EC6M MUA S\u1EAEM" }), _jsx("h1", { children: "Giao di\u1EC7n trang ch\u1EE7" }), _jsx("p", { children: "Ch\u1EC9nh n\u1ED9i dung, xem tr\u01B0\u1EDBc v\u00E0 xu\u1EA5t b\u1EA3n khi \u0111\u00E3 s\u1EB5n s\u00E0ng." })] }), _jsxs("div", { className: "pa-heading-actions", children: [_jsxs(Link, { className: "pa-button pa-button-light", to: "/", target: "_blank", rel: "noreferrer", children: [_jsx(Globe, { size: 15 }), "Trang \u0111ang hi\u1EC3n th\u1ECB"] }), _jsx("button", { className: "pa-button pa-button-light", disabled: busy || loading, onClick: () => void load(), "aria-label": "T\u1EA3i l\u1EA1i c\u1EA5u h\u00ECnh", children: _jsx(RefreshCw, { size: 15 }) })] })] }), error && _jsxs("div", { className: "pa-error", role: "alert", children: [error, _jsx("button", { className: "pa-text-link", onClick: () => void load(), children: "T\u1EA3i l\u1EA1i" })] }), notice && _jsx("p", { className: "pa-success", role: "status", children: notice }), state && draft && _jsxs(_Fragment, { children: [_jsx(Field, { label: "L\u00FD do c\u1EADp nh\u1EADt (8\u2013500 k\u00FD t\u1EF1)", value: reason, max: 500, onChange: setReason }), _jsxs("div", { className: "sf-publish-bar", children: [_jsxs("div", { children: [_jsx("span", { className: `sf-state ${dirty ? 'is-dirty' : ''}`, children: dirty ? 'Có thay đổi chưa lưu' : 'Bản nháp đã sẵn sàng' }), _jsx("small", { children: state.publishedAt ? `Xuất bản lần cuối: ${date(state.publishedAt, true)}` : 'Chưa xuất bản bố cục tùy chỉnh' })] }), _jsxs("div", { children: [_jsxs("button", { className: "pa-button pa-button-light", disabled: busy || loading, onClick: () => void save(false), children: [_jsx(Save, { size: 15 }), "L\u01B0u b\u1EA3n nh\u00E1p"] }), _jsxs("button", { className: "pa-button pa-button-light", disabled: busy || loading, onClick: () => void save(false, true), children: [_jsx(Eye, { size: 15 }), "L\u01B0u & xem tr\u01B0\u1EDBc"] }), _jsxs("button", { className: "pa-button", disabled: busy || loading, onClick: () => setPublishDialog(true), children: [_jsx(Check, { size: 15 }), "Xu\u1EA5t b\u1EA3n"] })] })] }), _jsx("button", { className: "pa-text-link sf-restore", disabled: busy || loading || (!state.published && !dirty), onClick: () => { setDraft(structuredClone(state.published || state.draft)); setDirty(Boolean(state.published)); setNotice('Đã đưa bố cục đã lưu vào bản nháp để bạn kiểm tra.'); }, children: state.published ? 'Dùng lại bản đã xuất bản' : 'Bỏ thay đổi chưa lưu' }), _jsx("div", { className: "sf-tabs", role: "tablist", "aria-label": "Th\u00E0nh ph\u1EA7n trang ch\u1EE7", children: tabs.map(([key, label]) => _jsx("button", { role: "tab", "aria-selected": tab === key, className: tab === key ? 'is-active' : '', onClick: () => setTab(key), children: label }, key)) }), _jsx("section", { className: "pa-panel sf-panel", "aria-label": tabs.find(([key]) => key === tab)?.[1], children: _jsxs("fieldset", { disabled: busy || loading, children: [tab === 'navigation' && _jsxs(_Fragment, { children: [_jsxs("div", { className: "sf-section-head", children: [_jsxs("div", { children: [_jsx("h2", { children: "Menu \u0111i\u1EC1u h\u01B0\u1EDBng" }), _jsx("p", { children: "Th\u00EAm li\u00EAn k\u1EBFt trong s\u00E0n, thay nh\u00E3n, \u1EA9n ho\u1EB7c \u0111\u1ED5i th\u1EE9 t\u1EF1 tr\u00EAn thanh navbar." })] }), _jsxs("button", { className: "pa-button", disabled: draft.navigation.length >= 16, onClick: () => update(config => config.navigation.push({ id: crypto.randomUUID(), label: 'Mục mới', targetUrl: '/products', enabled: true })), children: [_jsx(Plus, { size: 15 }), "Th\u00EAm m\u1EE5c menu"] })] }), draft.navigation.map((item, index) => _jsxs("article", { className: "sf-item", children: [_jsxs("div", { className: "sf-item-heading", children: [_jsxs("strong", { children: [index + 1, ". ", item.label] }), controls('navigation', index, item.label)] }), _jsxs("div", { className: "sf-form-grid", children: [_jsx(Field, { label: "T\u00EAn hi\u1EC3n th\u1ECB", value: item.label, max: 50, onChange: label => patch('navigation', index, { label }) }), _jsx(Field, { label: "Li\u00EAn k\u1EBFt n\u1ED9i b\u1ED9", value: item.targetUrl, max: 500, placeholder: "/products ho\u1EB7c /category/electronics", onChange: targetUrl => patch('navigation', index, { targetUrl }) })] })] }, item.id)), !draft.navigation.length && _jsx("p", { className: "sf-empty", children: "Ch\u01B0a c\u00F3 m\u1EE5c menu. B\u1EA5m Th\u00EAm m\u1EE5c menu \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u." })] }), tab === 'featuredCategories' && _jsxs(_Fragment, { children: [_jsxs("div", { className: "sf-section-head", children: [_jsxs("div", { children: [_jsx("h2", { children: "Danh m\u1EE5c n\u1ED5i b\u1EADt" }), _jsx("p", { children: "Ch\u1ECDn danh m\u1EE5c trong catalog ho\u1EB7c m\u1ED9t li\u00EAn k\u1EBFt kh\u00E1m ph\u00E1 ri\u00EAng." })] }), _jsxs("div", { children: [_jsx("button", { className: "pa-button pa-button-light", onClick: () => { setCategoryName(''); setCategorySlug(''); setParentId(''); setCategoryError(''); setCategoryDialog(true); }, children: "T\u1EA1o danh m\u1EE5c" }), _jsxs("button", { className: "pa-button", disabled: draft.featuredCategories.length >= 16, onClick: () => update(config => { config.featuredCategories.push({ id: crypto.randomUUID(), categoryId: null, label: 'Khám phá sản phẩm', targetUrl: '/products', icon: 'package', tone: 'blue', enabled: true }); fitCategoryTiles(config); }), children: [_jsx(Plus, { size: 15 }), "Th\u00EAm \u00F4 danh m\u1EE5c"] })] })] }), draft.featuredCategories.map((item, index) => _jsxs("article", { className: "sf-item", children: [_jsxs("div", { className: "sf-item-heading", children: [_jsxs("strong", { children: [index + 1, ". ", item.label] }), controls('featuredCategories', index, item.label)] }), _jsxs("div", { className: "sf-form-grid", children: [_jsxs("label", { className: "sf-field", children: ["Danh m\u1EE5c ngu\u1ED3n", _jsxs("select", { value: item.categoryId || '', onChange: event => { const category = state.categories.find(category => category.id === event.target.value); patch('featuredCategories', index, { categoryId: category?.id || null, ...(category ? { label: category.name.slice(0, 60), targetUrl: '/category/' + category.slug } : { targetUrl: '/products' }) }); }, children: [_jsx("option", { value: "", children: "Li\u00EAn k\u1EBFt ri\u00EAng" }), state.categories.map(category => _jsxs("option", { value: category.id, children: [category.parentId ? '↳ ' : '', category.name] }, category.id))] })] }), _jsx(Field, { label: "Nh\u00E3n tr\u00EAn trang ch\u1EE7", value: item.label, max: 60, onChange: label => patch('featuredCategories', index, { label }) }), !item.categoryId && _jsx(Field, { label: "Li\u00EAn k\u1EBFt", value: item.targetUrl, max: 500, onChange: targetUrl => patch('featuredCategories', index, { targetUrl }) }), _jsxs("label", { className: "sf-field", children: ["Bi\u1EC3u t\u01B0\u1EE3ng", _jsx("select", { value: item.icon, onChange: event => patch('featuredCategories', index, { icon: event.target.value }), children: Object.entries(iconNames).map(([key, label]) => _jsx("option", { value: key, children: label }, key)) })] }), _jsxs("label", { className: "sf-field", children: ["M\u00E0u n\u1EC1n", _jsx("select", { value: item.tone, onChange: event => patch('featuredCategories', index, { tone: event.target.value }), children: Object.entries(toneNames).map(([key, label]) => _jsx("option", { value: key, children: label }, key)) })] })] })] }, item.id))] }), tab === 'banners' && _jsxs(_Fragment, { children: [_jsxs("div", { className: "sf-section-head", children: [_jsxs("div", { children: [_jsx("h2", { children: "Banner trang ch\u1EE7" }), _jsx("p", { children: "\u1EA2nh, th\u00F4ng \u0111i\u1EC7p v\u00E0 n\u00FAt d\u1EABn \u0111\u1EBFn s\u1EA3n ph\u1EA9m ho\u1EB7c danh m\u1EE5c." })] }), _jsxs("button", { className: "pa-button", disabled: draft.banners.length >= 6, onClick: () => update(config => config.banners.push({ id: crypto.randomUUID(), title: 'Khám phá lựa chọn mới', kicker: 'MDUC247', description: 'Sản phẩm từ các gian hàng đang bán.', imageUrl: '/home/shopping-hero.png', imageAlt: 'Banner mua sắm', targetUrl: '/products', buttonText: 'Khám phá ngay', tone: 'blue', enabled: true })), children: [_jsx(Plus, { size: 15 }), "Th\u00EAm banner"] })] }), draft.banners.map((item, index) => _jsxs("article", { className: "sf-item", children: [_jsxs("div", { className: "sf-item-heading", children: [_jsxs("strong", { children: [index + 1, ". ", item.title] }), controls('banners', index, item.title)] }), _jsxs("div", { className: "sf-banner-edit", children: [_jsx("img", { src: item.imageUrl, alt: item.imageAlt, onError: showImageFallback }), _jsxs("div", { className: "sf-form-grid", children: [_jsx(Field, { label: "Ti\u00EAu \u0111\u1EC1", value: item.title, max: 120, onChange: title => patch('banners', index, { title }) }), _jsx(Field, { label: "D\u00F2ng gi\u1EDBi thi\u1EC7u", value: item.kicker, max: 80, onChange: kicker => patch('banners', index, { kicker }) }), _jsx(Field, { label: "M\u00F4 t\u1EA3", value: item.description, max: 300, onChange: description => patch('banners', index, { description }) }), _jsx(Field, { label: "\u1EA2nh (\u0111\u01B0\u1EDDng d\u1EABn th\u01B0 vi\u1EC7n ho\u1EB7c HTTPS)", value: item.imageUrl, max: 2048, onChange: imageUrl => patch('banners', index, { imageUrl }) }), _jsxs("label", { className: "sf-field", children: ["\u1EA2nh c\u00F3 s\u1EB5n", _jsxs("select", { value: ['/home/shopping-hero.png', '/home/fashion-hero.png', '/home/home-hero.png'].includes(item.imageUrl) ? item.imageUrl : '', onChange: event => { if (event.target.value)
                                                                                patch('banners', index, { imageUrl: event.target.value }); }, children: [_jsx("option", { value: "", children: "\u1EA2nh t\u00F9y ch\u1ECDn" }), _jsx("option", { value: "/home/shopping-hero.png", children: "Mua s\u1EAFm & c\u00F4ng ngh\u1EC7" }), _jsx("option", { value: "/home/fashion-hero.png", children: "Th\u1EDDi trang" }), _jsx("option", { value: "/home/home-hero.png", children: "Gia d\u1EE5ng" })] })] }), _jsx(Field, { label: "M\u00F4 t\u1EA3 \u1EA3nh", value: item.imageAlt, max: 160, onChange: imageAlt => patch('banners', index, { imageAlt }) }), _jsx(Field, { label: "Nh\u00E3n n\u00FAt", value: item.buttonText, max: 40, onChange: buttonText => patch('banners', index, { buttonText }) }), _jsx(Field, { label: "Li\u00EAn k\u1EBFt n\u00FAt", value: item.targetUrl, max: 500, onChange: targetUrl => patch('banners', index, { targetUrl }) }), _jsxs("label", { className: "sf-field", children: ["T\u00F4ng m\u00E0u", _jsxs("select", { value: item.tone, onChange: event => patch('banners', index, { tone: event.target.value }), children: [_jsx("option", { value: "blue", children: "Xanh d\u01B0\u01A1ng" }), _jsx("option", { value: "purple", children: "T\u00EDm" }), _jsx("option", { value: "cyan", children: "Xanh nh\u1EA1t" })] })] })] })] })] }, item.id))] }), tab === 'sections' && _jsxs(_Fragment, { children: [_jsx("div", { className: "sf-section-head", children: _jsxs("div", { children: [_jsx("h2", { children: "B\u1ED1 c\u1EE5c trang ch\u1EE7" }), _jsx("p", { children: "D\u00F9ng m\u0169i t\u00EAn \u0111\u1EC3 s\u1EAFp x\u1EBFp; t\u1EAFt nh\u1EEFng kh\u1ED1i ch\u01B0a mu\u1ED1n hi\u1EC3n th\u1ECB." })] }) }), draft.sections.map((item, index) => _jsxs("article", { className: "sf-item", children: [_jsxs("div", { className: "sf-item-heading", children: [_jsxs("strong", { children: [index + 1, ". ", blockNames[item.key]] }), controls('sections', index, blockNames[item.key], false)] }), _jsxs("div", { className: "sf-form-grid", children: [item.key !== 'hero' ? _jsxs(_Fragment, { children: [_jsx(Field, { label: "Ti\u00EAu \u0111\u1EC1 kh\u1ED1i", value: item.title, max: 80, onChange: title => patch('sections', index, { title }) }), _jsx(Field, { label: "D\u00F2ng m\u00F4 t\u1EA3 ng\u1EAFn", value: item.eyebrow, max: 80, onChange: eyebrow => patch('sections', index, { eyebrow }) })] }) : _jsx("p", { className: "sf-help", children: "Ch\u1EC9nh ti\u00EAu \u0111\u1EC1 v\u00E0 n\u1ED9i dung t\u1EEBng banner trong tab Banner." }), _jsxs("label", { className: "sf-field", children: ["S\u1ED1 m\u1EE5c t\u1ED1i \u0111a", _jsx("input", { type: "number", min: 1, max: 24, value: item.limit, onChange: event => patch('sections', index, { limit: Number(event.target.value) }) })] })] })] }, item.id))] }), tab === 'selections' && _jsxs(_Fragment, { children: [_jsx("div", { className: "sf-section-head", children: _jsxs("div", { children: [_jsx("h2", { children: "Ghim s\u1EA3n ph\u1EA9m v\u00E0 c\u1EEDa h\u00E0ng" }), _jsx("p", { children: "Kh\u00F4ng ghim m\u1EE5c n\u00E0o th\u00EC h\u1EC7 th\u1ED1ng t\u1EF1 ch\u1ECDn. C\u00E1c m\u1EE5c b\u1ECB \u1EA9n ho\u1EB7c t\u1EA1m ng\u1EEBng s\u1EBD kh\u00F4ng xu\u1EA5t hi\u1EC7n tr\u00EAn trang c\u00F4ng khai." })] }) }), choiceError && _jsx("p", { className: "pa-error", role: "alert", children: choiceError }), _jsx("div", { className: "sf-pickers", children: ['products', 'stores'].map(resource => {
                                                const key = resource === 'products' ? 'featuredProductIds' : 'featuredStoreIds';
                                                return _jsxs("div", { className: "sf-picker", children: [_jsxs("h3", { children: [resource === 'products' ? 'Sản phẩm nổi bật' : 'Cửa hàng nổi bật', " ", _jsxs("small", { children: [draft[key].length, "/12"] })] }), _jsxs("div", { className: "sf-search", children: [_jsx(Search, { size: 16 }), _jsx("input", { "aria-label": `Tìm ${resource === 'products' ? 'sản phẩm' : 'cửa hàng'} để ghim`, value: queries[resource], onChange: event => setQueries(current => ({ ...current, [resource]: event.target.value })), maxLength: 100, placeholder: "Nh\u1EADp t\u00EAn \u0111\u1EC3 t\u00ECm\u2026" })] }), _jsxs("div", { className: "sf-selected", children: [draft[key].map((id, index) => _jsxs("div", { children: [_jsx("span", { children: pickedNames[id] || 'Mục không còn hiển thị' }), _jsx("button", { "aria-label": "\u0110\u01B0a l\u1EF1a ch\u1ECDn l\u00EAn", disabled: index === 0, onClick: () => update(config => { const ids = config[key]; [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]; }), children: _jsx(ArrowUp, { size: 14 }) }), _jsx("button", { "aria-label": "B\u1ECF ghim", onClick: () => update(config => config[key].splice(index, 1)), children: _jsx(Trash2, { size: 14 }) })] }, id)), !draft[key].length && _jsx("p", { children: "\u0110ang d\u00F9ng l\u1EF1a ch\u1ECDn t\u1EF1 \u0111\u1ED9ng." })] }), _jsxs("div", { className: "sf-choice-list", children: [choices[resource].map(item => _jsxs("button", { disabled: draft[key].includes(item.id) || draft[key].length >= 12, onClick: () => { update(config => config[key].push(item.id)); setPickedNames(current => ({ ...current, [item.id]: item.name })); }, children: [_jsx("span", { children: item.name }), draft[key].includes(item.id) ? _jsx(Check, { size: 15 }) : _jsx(Plus, { size: 15 })] }, item.id)), !choices[resource].length && _jsx("p", { className: "sf-empty", children: "Ch\u01B0a c\u00F3 l\u1EF1a ch\u1ECDn ph\u00F9 h\u1EE3p." })] })] }, resource);
                                            }) })] })] }) }), _jsxs("section", { className: "sf-history", children: [_jsx("h2", { children: "L\u1ECBch s\u1EED c\u1EADp nh\u1EADt g\u1EA7n \u0111\u00E2y" }), state.history.length ? state.history.slice(0, 8).map(item => _jsxs("div", { children: [_jsx("span", { children: item.action === 'published' ? 'Xuất bản' : item.action === 'category_created' ? 'Tạo danh mục' : 'Lưu bản nháp' }), _jsxs("small", { children: ["Phi\u00EAn b\u1EA3n ", item.version, " \u00B7 ", date(item.created_at, true)] }), item.reason && _jsx("small", { children: item.reason })] }, item.id)) : _jsx("p", { children: "Ch\u01B0a c\u00F3 l\u1EA7n c\u1EADp nh\u1EADt n\u00E0o." })] }), publishDialog && _jsx(AdminDialog, { title: "Xu\u1EA5t b\u1EA3n trang ch\u1EE7", close: () => { if (!busy)
                            setPublishDialog(false); }, busy: busy, children: _jsxs("div", { className: "pa-detail", children: [_jsx("p", { children: "Menu \u0111i\u1EC1u h\u01B0\u1EDBng v\u00E0 c\u00E1c n\u1ED9i dung \u0111ang b\u1EADt trong b\u1EA3n nh\u00E1p n\u00E0y s\u1EBD xu\u1EA5t hi\u1EC7n tr\u00EAn trang c\u00F4ng khai." }), _jsxs("p", { children: [draft.navigation.filter(item => item.enabled).length, " m\u1EE5c menu \u00B7 ", draft.featuredCategories.filter(item => item.enabled).length, " \u00F4 danh m\u1EE5c \u00B7 ", draft.banners.filter(item => item.enabled).length, " banner"] }), _jsxs("div", { className: "pa-dialog-actions", children: [_jsx("button", { className: "pa-button pa-button-light", disabled: busy, onClick: () => setPublishDialog(false), children: "H\u1EE7y" }), _jsx("button", { className: "pa-button", disabled: busy, onClick: () => void save(true), children: busy ? 'Đang xuất bản…' : 'Xác nhận xuất bản' })] })] }) }), categoryDialog && _jsx(AdminDialog, { title: "T\u1EA1o danh m\u1EE5c", close: () => { if (!categoryBusy)
                            setCategoryDialog(false); }, busy: categoryBusy, children: _jsxs("form", { className: "pa-detail sf-create-category", onSubmit: createCategory, children: [_jsx(Field, { label: "T\u00EAn danh m\u1EE5c", value: categoryName, max: 120, onChange: setCategoryName }), _jsx(Field, { label: "Slug (b\u1ECF tr\u1ED1ng \u0111\u1EC3 t\u1EA1o t\u1EF1 \u0111\u1ED9ng)", value: categorySlug, max: 80, onChange: setCategorySlug, placeholder: "vi-du-danh-muc" }), _jsxs("label", { className: "sf-field", children: ["Danh m\u1EE5c cha", _jsxs("select", { value: parentId, onChange: event => setParentId(event.target.value), children: [_jsx("option", { value: "", children: "Danh m\u1EE5c g\u1ED1c" }), state.categories.map(category => _jsx("option", { value: category.id, children: category.name }, category.id))] })] }), _jsx(Field, { label: "L\u00FD do t\u1EA1o danh m\u1EE5c (8\u2013500 k\u00FD t\u1EF1)", value: categoryReason, max: 500, onChange: setCategoryReason }), _jsx("p", { className: "sf-help", children: "Danh m\u1EE5c m\u1EDBi \u0111\u01B0\u1EE3c t\u1EA1o trong catalog v\u00E0 th\u00EAm v\u00E0o b\u1EA3n nh\u00E1p n\u1ED5i b\u1EADt. Xu\u1EA5t b\u1EA3n \u0111\u1EC3 c\u1EADp nh\u1EADt trang ch\u1EE7." }), categoryError && _jsx("p", { className: "pa-error", role: "alert", children: categoryError }), _jsxs("div", { className: "pa-dialog-actions", children: [_jsx("button", { type: "button", className: "pa-button pa-button-light", disabled: categoryBusy, onClick: () => setCategoryDialog(false), children: "H\u1EE7y" }), _jsx("button", { className: "pa-button", disabled: categoryBusy || categoryName.trim().length < 2 || categoryReason.trim().length < 8, children: categoryBusy ? 'Đang tạo…' : 'Tạo danh mục' })] })] }) })] })] });
}

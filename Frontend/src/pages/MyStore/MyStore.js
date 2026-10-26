import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import { catalogApi } from "../../api/catalogApi";
import SellerPromotionPanel from "../../components/MyStore/SellerPromotionPanel";
const empty = { name: "", slug: "", description: "", logoUrl: "", bannerUrl: "", category: "", contactEmail: "", contactPhone: "", pickupAddress: "", returnAddress: "" };
const fieldClass = "mt-1 w-full rounded-xl border border-[#dce3ee] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#476de4]";
const buttonClass = "rounded-xl bg-[#476de4] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50";
const cardClass = "rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-sm sm:p-6";
export default function MyStore() {
    const [stores, setStores] = useState([]);
    const [selected, setSelected] = useState("");
    const [store, setStore] = useState(null);
    const [form, setForm] = useState(empty);
    const [creating, setCreating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [members, setMembers] = useState([]);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteToken, setInviteToken] = useState("");
    const [acceptToken, setAcceptToken] = useState("");
    const [hours, setHours] = useState("");
    const [overview, setOverview] = useState(null);
    const [products, setProducts] = useState([]);
    const [productForm, setProductForm] = useState({ name: "", description: "", price: 0, stock: 0, imageUrl: "", status: "draft" });
    const [productImage, setProductImage] = useState(null);
    async function loadStores(preferred) {
        const result = await catalogApi.mine();
        setStores(result.stores);
        setSelected(preferred || result.stores[0]?.id || "");
    }
    useEffect(() => {
        let active = true;
        catalogApi.mine().then(result => { if (active) {
            setStores(result.stores);
            setSelected(result.stores[0]?.id || "");
        } })
            .catch(error => { if (active)
            toast.error(error instanceof Error ? error.message : "Không thể tải cửa hàng.", { containerId: "general-toast", toastId: "seller-load" }); })
            .finally(() => { if (active)
            setLoading(false); });
        return () => { active = false; };
    }, []);
    useEffect(() => {
        if (!selected) {
            setStore(null);
            return;
        }
        let active = true;
        Promise.all([catalogApi.manage(selected), catalogApi.overview(selected), catalogApi.members(selected), catalogApi.products(selected)]).then(([detail, summary, people, listing]) => {
            if (!active)
                return;
            setStore(detail.store);
            setOverview(summary.metrics);
            setMembers(people.members);
            setProducts(listing.products);
            setHours(typeof detail.store.businessHours?.text === "string" ? detail.store.businessHours.text : "");
            setForm({ name: detail.store.name, description: detail.store.description, logoUrl: detail.store.logoUrl || "",
                bannerUrl: detail.store.bannerUrl || "", category: detail.store.category || "", contactEmail: detail.store.contactInfo?.email || "",
                contactPhone: detail.store.contactInfo?.phone || "", pickupAddress: detail.store.pickupAddress || "",
                returnAddress: detail.store.returnAddress || "" });
        }).catch(error => { if (active)
            toast.error(error instanceof Error ? error.message : "Không thể tải shop.", { containerId: "general-toast" }); });
        return () => { active = false; };
    }, [selected]);
    const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
    async function act(fn) {
        setBusy(true);
        try {
            await fn();
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Không thể xử lý yêu cầu.", { containerId: "general-toast" });
        }
        finally {
            setBusy(false);
        }
    }
    function create(event) {
        event.preventDefault();
        void act(async () => {
            const result = await catalogApi.create({ ...form, slug: form.slug?.trim() || undefined, logoUrl: form.logoUrl || undefined, bannerUrl: form.bannerUrl || undefined, category: form.category || undefined, returnAddress: form.returnAddress || undefined });
            await loadStores(result.store.id);
            setCreating(false);
            toast.success("Đã tạo cửa hàng.", { containerId: "general-toast" });
        });
    }
    function save(event) {
        event.preventDefault();
        if (!store)
            return;
        void act(async () => {
            await catalogApi.update(store.id, { name: form.name, description: form.description, logoUrl: form.logoUrl || "", bannerUrl: form.bannerUrl || "", category: form.category || undefined, pickupAddress: form.pickupAddress, returnAddress: form.returnAddress || form.pickupAddress });
            await catalogApi.settings(store.id, { contactInfo: { email: form.contactEmail, phone: form.contactPhone }, businessHours: { text: hours } });
            setStore((await catalogApi.manage(store.id)).store);
            toast.success("Đã cập nhật cửa hàng.", { containerId: "general-toast" });
        });
    }
    function addProduct(event) {
        event.preventDefault();
        if (!store)
            return;
        void act(async () => {
            const result = await catalogApi.createCatalogProduct(store.id, { title: productForm.name, description: productForm.description,
                priceMinor: productForm.price, stock: productForm.stock });
            if (productImage) {
                try {
                    await catalogApi.uploadProductImage(result.product.id, productImage, { primary: true });
                }
                catch (error) {
                    toast.warning(error instanceof Error ? `Đã tạo bản nháp; tải ảnh thất bại: ${error.message}` : "Đã tạo bản nháp; tải ảnh thất bại.", { containerId: "general-toast" });
                }
            }
            setProducts((await catalogApi.products(store.id)).products);
            setOverview((await catalogApi.overview(store.id)).metrics);
            setProductForm({ name: "", description: "", price: 0, stock: 0, imageUrl: "", status: "draft" });
            setProductImage(null);
            toast.success("Đã thêm sản phẩm.", { containerId: "general-toast" });
        });
    }
    return _jsxs("div", { className: "py-8 pb-16", children: [_jsx(ContentBreadcrumb, { items: [{ label: "Quản lý cửa hàng" }] }), _jsxs("div", { className: "mb-6 flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-extrabold", children: "C\u1EEDa h\u00E0ng c\u1EE7a b\u1EA1n" }), _jsx("p", { className: "mt-1 text-sm text-[#718099]", children: "\u0110\u0103ng k\u00FD v\u00E0 v\u1EADn h\u00E0nh shop tr\u00EAn MDUC247." })] }), _jsx("button", { className: buttonClass, type: "button", onClick: () => { setForm(empty); setCreating(true); }, children: "+ T\u1EA1o c\u1EEDa h\u00E0ng" })] }), loading ? _jsx("p", { children: "\u0110ang t\u1EA3i c\u1EEDa h\u00E0ng..." }) : _jsxs(_Fragment, { children: [stores.length > 0 && _jsxs("div", { className: "mb-6 flex flex-wrap items-center gap-3", children: [_jsx("label", { className: "text-sm font-bold", htmlFor: "seller-store-select", children: "Shop \u0111ang qu\u1EA3n l\u00FD" }), _jsx("select", { id: "seller-store-select", className: "rounded-xl border border-[#dce3ee] bg-white px-3 py-2", value: selected, onChange: event => { setSelected(event.target.value); setCreating(false); }, children: stores.map(item => _jsxs("option", { value: item.id, children: [item.name, " (", item.role === "owner" ? "Chủ shop" : "Nhân viên", ")"] }, item.id)) })] }), !stores.length && !creating && _jsxs("div", { className: cardClass, children: [_jsx("h2", { className: "text-xl font-bold", children: "B\u1EAFt \u0111\u1EA7u b\u00E1n h\u00E0ng" }), _jsx("p", { className: "mt-2 text-[#718099]", children: "T\u1EA1o c\u1EEDa h\u00E0ng \u0111\u1EC3 qu\u1EA3n l\u00FD th\u00F4ng tin v\u00E0 nh\u00E2n s\u1EF1." }), _jsx("button", { className: `mt-5 ${buttonClass}`, type: "button", onClick: () => setCreating(true), children: "\u0110\u0103ng k\u00FD shop" })] }), creating && _jsxs("section", { className: cardClass, children: [_jsx("h2", { className: "mb-4 text-xl font-bold", children: "\u0110\u0103ng k\u00FD shop" }), _jsx(StoreFields, { form: form, update: update, onSubmit: create, busy: busy, creating: true }), _jsx("button", { type: "button", className: "mt-3 text-sm text-[#718099]", onClick: () => setCreating(false), children: "H\u1EE7y" })] }), store && !creating && _jsxs("div", { className: "grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]", children: [_jsxs("div", { className: "space-y-6", children: [_jsx("section", { className: cardClass, children: _jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-bold", children: store.name }), _jsxs("p", { className: "text-sm text-[#718099]", children: ["/", store.slug, " \u00B7 ", store.status === "active" ? "Đang hoạt động" : "Tạm ngừng nhận đơn"] })] }), _jsx(Link, { className: "text-sm font-bold text-[#476de4]", to: `/store/${store.slug}`, children: "Xem trang c\u00F4ng khai \u2192" })] }) }), store.role === "owner" && _jsxs("section", { className: cardClass, children: [_jsx("h2", { className: "mb-4 text-xl font-bold", children: "Th\u00F4ng tin c\u1EEDa h\u00E0ng" }), _jsx(StoreFields, { form: form, update: update, onSubmit: save, busy: busy, hours: hours, setHours: setHours })] }), _jsxs("section", { className: cardClass, children: [_jsx("h2", { className: "text-xl font-bold", children: "S\u1EA3n ph\u1EA9m" }), _jsx("p", { className: "mt-1 text-sm text-[#718099]", children: "Ch\u1EC9 s\u1EA3n ph\u1EA9m \u0111\u00E3 c\u00F4ng b\u1ED1 v\u00E0 c\u00F2n h\u00E0ng xu\u1EA5t hi\u1EC7n tr\u00EAn trang c\u00F4ng khai." }), _jsx("div", { className: "mt-4 space-y-3", children: products.map(product => _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e8edf5] p-3", children: [_jsxs("div", { children: [_jsx("strong", { children: product.name }), _jsxs("p", { className: "text-sm text-[#718099]", children: [product.priceMinor.toLocaleString("vi-VN"), "\u20AB \u00B7 T\u1ED3n ", product.stock, " \u00B7 ", product.status === "active" ? "Đang bán" : product.status === "draft" ? "Bản nháp" : "Đã ẩn"] })] }), _jsx("button", { type: "button", className: "text-sm font-bold text-[#476de4]", disabled: busy, onClick: () => void act(async () => { await catalogApi.setCatalogProductStatus(product.id, product.status === "active" ? "hidden" : "active"); setProducts((await catalogApi.products(store.id)).products); toast.success("Đã cập nhật trạng thái sản phẩm.", { containerId: "general-toast" }); }), children: product.status === "active" ? "Ẩn" : "Công bố" }), _jsx(Link, { className: "text-sm font-bold text-[#476de4]", to: `/mystore/products/${product.id}`, children: "Bi\u1EBFn th\u1EC3 v\u00E0 \u1EA3nh" })] }, product.id)) }), _jsxs("form", { className: "mt-5 grid gap-3 sm:grid-cols-2", onSubmit: addProduct, children: [_jsxs("label", { className: "text-sm font-bold", children: ["T\u00EAn s\u1EA3n ph\u1EA9m", _jsx("input", { className: fieldClass, value: productForm.name, onChange: event => setProductForm(current => ({ ...current, name: event.target.value })), required: true, minLength: 3 })] }), _jsxs("label", { className: "text-sm font-bold", children: ["Gi\u00E1 (\u20AB)", _jsx("input", { className: fieldClass, type: "number", min: "0", value: productForm.price, onChange: event => setProductForm(current => ({ ...current, price: Number(event.target.value) })), required: true })] }), _jsxs("label", { className: "text-sm font-bold", children: ["T\u1ED3n kho", _jsx("input", { className: fieldClass, type: "number", min: "0", value: productForm.stock, onChange: event => setProductForm(current => ({ ...current, stock: Number(event.target.value) })), required: true })] }), _jsxs("label", { className: "text-sm font-bold", children: ["\u1EA2nh s\u1EA3n ph\u1EA9m", _jsx("input", { className: fieldClass, type: "file", accept: "image/jpeg,image/png,image/webp", onChange: event => setProductImage(event.target.files?.[0] || null) })] }), _jsxs("label", { className: "text-sm font-bold sm:col-span-2", children: ["M\u00F4 t\u1EA3", _jsx("input", { className: fieldClass, value: productForm.description || "", onChange: event => setProductForm(current => ({ ...current, description: event.target.value })) })] }), _jsx("button", { className: buttonClass, disabled: busy, children: "Th\u00EAm s\u1EA3n ph\u1EA9m" })] })] }), _jsx(SellerPromotionPanel, { storeId: store.id, products: products }), _jsxs("section", { className: cardClass, children: [_jsx("h2", { className: "text-xl font-bold", children: "Th\u00E0nh vi\u00EAn shop" }), _jsx("div", { className: "mt-4 space-y-3", children: members.map(member => _jsxs("div", { className: "flex items-center justify-between gap-3 border-b border-[#e8edf5] pb-3 text-sm", children: [_jsxs("span", { className: "break-all", children: [member.userId, " \u00B7 ", member.role === "owner" ? "Chủ shop" : "Nhân viên"] }), store.role === "owner" && member.role === "staff" && _jsx("button", { type: "button", className: "font-bold text-red-600", disabled: busy, onClick: () => void act(async () => { await catalogApi.removeMember(store.id, member.userId); setMembers((await catalogApi.members(store.id)).members); toast.success("Đã gỡ nhân viên.", { containerId: "general-toast" }); }), children: "G\u1EE1" })] }, member.userId)) }), store.role === "owner" && _jsxs("form", { className: "mt-5 flex flex-wrap gap-2", onSubmit: event => { event.preventDefault(); void act(async () => { const result = await catalogApi.invite(store.id, inviteEmail); setInviteToken(result.token); setInviteEmail(""); toast.success("Đã tạo lời mời.", { containerId: "general-toast" }); }); }, children: [_jsx("input", { className: `${fieldClass} flex-1`, type: "email", placeholder: "Email nh\u00E2n vi\u00EAn", value: inviteEmail, onChange: event => setInviteEmail(event.target.value), required: true }), _jsx("button", { className: buttonClass, disabled: busy, children: "T\u1EA1o l\u1EDDi m\u1EDDi" })] }), inviteToken && _jsxs("div", { className: "mt-4 rounded-xl bg-[#f4f7fb] p-3 text-sm", children: [_jsx("p", { children: "G\u1EEDi m\u00E3 n\u00E0y cho nh\u00E2n vi\u00EAn (hi\u1EC7u l\u1EF1c 7 ng\u00E0y):" }), _jsx("code", { className: "mt-1 block break-all", children: inviteToken })] })] })] }), _jsxs("aside", { className: "space-y-6", children: [_jsxs("section", { className: cardClass, children: [_jsx("h2", { className: "text-xl font-bold", children: "\u0110\u01A1n h\u00E0ng" }), _jsx("p", { className: "mt-2 text-sm text-[#718099]", children: "X\u00E1c nh\u1EADn, chu\u1EA9n b\u1ECB v\u00E0 b\u00E0n giao \u0111\u01A1n c\u1EE7a shop." }), _jsx(Link, { to: `/mystore/${selected}/orders`, className: "mt-4 inline-block font-bold text-[#476de4]", children: "Qu\u1EA3n l\u00FD \u0111\u01A1n h\u00E0ng \u2192" })] }), _jsxs("section", { className: cardClass, children: [_jsx("h2", { className: "text-xl font-bold", children: "T\u1ED5ng quan shop" }), _jsxs("p", { className: "mt-3 text-sm", children: ["S\u1EA3n ph\u1EA9m: ", overview?.productCount ?? "—"] }), _jsx("p", { className: "mt-2 text-sm text-[#718099]", children: "Th\u1ED1ng k\u00EA \u0111\u01A1n v\u00E0 doanh thu tr\u00EAn dashboard \u0111ang ch\u1EDD k\u1EBFt n\u1ED1i d\u1EEF li\u1EC7u t\u1ED5ng h\u1EE3p." })] }), store.role === "owner" && _jsxs("section", { className: cardClass, children: [_jsx("h2", { className: "text-xl font-bold", children: "Tr\u1EA1ng th\u00E1i nh\u1EADn \u0111\u01A1n" }), _jsx("p", { className: "mt-2 text-sm text-[#718099]", children: "Khi t\u1EA1m ng\u1EEBng, shop s\u1EBD kh\u00F4ng xu\u1EA5t hi\u1EC7n trong danh s\u00E1ch c\u00F4ng khai." }), _jsx("button", { type: "button", className: `mt-4 ${buttonClass}`, disabled: busy, onClick: () => void act(async () => { const next = await catalogApi.settings(store.id, { acceptingOrders: !store.acceptingOrders }); setStore(next.store); await loadStores(store.id); toast.success(next.store.acceptingOrders ? "Shop đã hoạt động lại." : "Shop đã tạm ngừng.", { containerId: "general-toast" }); }), children: store.acceptingOrders ? "Tạm ngừng shop" : "Hoạt động lại" })] })] })] }), _jsxs("section", { className: `mt-6 ${cardClass}`, children: [_jsx("h2", { className: "text-lg font-bold", children: "Nh\u1EADn l\u1EDDi m\u1EDDi tham gia shop" }), _jsxs("form", { className: "mt-3 flex flex-wrap gap-2", onSubmit: event => { event.preventDefault(); void act(async () => { const result = await catalogApi.acceptInvite(acceptToken); await loadStores(result.storeId); setAcceptToken(""); toast.success("Đã tham gia shop.", { containerId: "general-toast" }); }); }, children: [_jsx("input", { className: `${fieldClass} flex-1`, placeholder: "M\u00E3 l\u1EDDi m\u1EDDi", value: acceptToken, onChange: event => setAcceptToken(event.target.value), required: true }), _jsx("button", { className: buttonClass, disabled: busy, children: "Tham gia" })] })] })] })] });
}
function StoreFields({ form, update, onSubmit, busy, creating = false, hours, setHours }) {
    const fields = [
        { key: "name", label: "Tên shop", required: true }, ...(creating ? [{ key: "slug", label: "Slug (để trống để tự tạo)" }] : []),
        { key: "description", label: "Mô tả" }, { key: "category", label: "Nhóm sản phẩm" },
        { key: "logoUrl", label: "URL logo HTTPS", type: "url" }, { key: "bannerUrl", label: "URL ảnh bìa HTTPS", type: "url" },
        { key: "contactEmail", label: "Email liên hệ", required: true, type: "email" }, { key: "contactPhone", label: "Số điện thoại liên hệ", required: true },
        { key: "pickupAddress", label: "Địa chỉ lấy hàng", required: true }, { key: "returnAddress", label: "Địa chỉ hoàn hàng" },
    ];
    return _jsxs("form", { onSubmit: onSubmit, children: [_jsx("div", { className: "grid gap-4 sm:grid-cols-2", children: fields.map(field => _jsxs("label", { className: "text-sm font-bold", children: [field.label, _jsx("input", { className: fieldClass, type: field.type || "text", value: form[field.key] || "", required: field.required, onChange: event => update(field.key, event.target.value) })] }, field.key)) }), setHours && _jsxs("label", { className: "mt-4 block text-sm font-bold", children: ["L\u1ECBch ho\u1EA1t \u0111\u1ED9ng", _jsx("input", { className: fieldClass, value: hours || "", onChange: event => setHours(event.target.value), placeholder: "V\u00ED d\u1EE5: Th\u1EE9 2\u20137, 8:00\u201318:00" })] }), _jsx("button", { className: `mt-5 ${buttonClass}`, disabled: busy, children: creating ? "Tạo cửa hàng" : "Lưu thay đổi" })] });
}

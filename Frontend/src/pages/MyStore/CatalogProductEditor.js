import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import { catalogApi } from "../../api/catalogApi";
import InventoryPanel from "../../components/MyStore/InventoryPanel";
const input = "mt-1 w-full rounded-xl border border-[#dce3ee] bg-white px-3 py-2 text-sm";
const primary = "rounded-xl bg-[#476de4] px-4 py-2 text-sm font-bold text-white disabled:opacity-50";
const card = "rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-sm";
const blankVariant = { sku: "", attributes: "{}", priceMinor: 0, salePriceMinor: "", saleStartsAt: "", saleEndsAt: "", stock: 0, status: "active" };
const asDateInput = (value) => value ? new Date(value).toISOString().slice(0, 16) : "";
const flatten = (items, depth = 0) => items.flatMap(item => [{ item, depth }, ...flatten(item.children, depth + 1)]);
export default function CatalogProductEditor() {
    const { id = "" } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [categories, setCategories] = useState([]);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [brand, setBrand] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [variantId, setVariantId] = useState(null);
    const [variant, setVariant] = useState(blankVariant);
    const [image, setImage] = useState(null);
    const [imageVariantId, setImageVariantId] = useState("");
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    async function reload() {
        const result = await catalogApi.sellerProduct(id);
        setProduct(result.product);
        return result.product;
    }
    useEffect(() => {
        let active = true;
        Promise.all([catalogApi.sellerProduct(id), catalogApi.categories()]).then(([result, tree]) => {
            if (!active)
                return;
            const item = result.product;
            setProduct(item);
            setCategories(tree.categories);
            setTitle(item.title);
            setDescription(item.description || "");
            setBrand(item.brand || "");
            setCategoryId(item.categoryId || "");
        }).catch(error => { if (active)
            toast.error(error instanceof Error ? error.message : "Không thể tải sản phẩm.", { containerId: "general-toast" }); })
            .finally(() => { if (active)
            setLoading(false); });
        return () => { active = false; };
    }, [id]);
    async function act(action, success) {
        setBusy(true);
        try {
            await action();
            toast.success(success, { containerId: "general-toast" });
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Không thể xử lý yêu cầu.", { containerId: "general-toast" });
        }
        finally {
            setBusy(false);
        }
    }
    function chooseVariant(item) {
        setVariantId(item.id);
        setVariant({ sku: item.sku, attributes: JSON.stringify(item.attributes), priceMinor: item.priceOriginalMinor,
            salePriceMinor: item.salePriceMinor == null ? "" : String(item.salePriceMinor),
            saleStartsAt: asDateInput(item.saleStartsAt), saleEndsAt: asDateInput(item.saleEndsAt), stock: item.stock, status: item.status });
    }
    function saveVariant(event) {
        event.preventDefault();
        void act(async () => {
            let attributes;
            try {
                attributes = JSON.parse(variant.attributes);
            }
            catch {
                throw new Error("Thuộc tính phải là JSON hợp lệ, ví dụ {\"color\":\"Đỏ\"}.");
            }
            await catalogApi.saveVariant(id, { sku: variant.sku, attributes, priceMinor: variant.priceMinor,
                salePriceMinor: variant.salePriceMinor === "" ? null : Number(variant.salePriceMinor),
                saleStartsAt: variant.saleStartsAt || null, saleEndsAt: variant.saleEndsAt || null,
                ...(!variantId ? { stock: variant.stock } : {}), status: variant.status }, variantId || undefined);
            await reload();
            setVariantId(null);
            setVariant(blankVariant);
        }, variantId ? "Đã cập nhật biến thể." : "Đã thêm biến thể.");
    }
    if (loading)
        return _jsx("div", { className: "py-12 text-center", children: "\u0110ang t\u1EA3i s\u1EA3n ph\u1EA9m..." });
    if (!product)
        return _jsxs("div", { className: "py-12 text-center", children: [_jsx("p", { children: "Kh\u00F4ng c\u00F3 d\u1EEF li\u1EC7u s\u1EA3n ph\u1EA9m." }), _jsx(Link, { to: "/mystore", children: "Quay l\u1EA1i c\u1EEDa h\u00E0ng" })] });
    return _jsxs("div", { className: "space-y-6 py-8 pb-16", children: [_jsx(ContentBreadcrumb, { items: [{ label: "Cửa hàng", to: "/mystore" }, { label: product.name }] }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-extrabold", children: product.name }), _jsx("p", { className: "text-sm text-[#718099]", children: product.status === "active" ? "Đang bán" : product.status === "draft" ? "Bản nháp" : product.status === "hidden" ? "Đã ẩn" : "Ngừng bán" })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx("button", { className: primary, disabled: busy, onClick: () => void act(async () => { const result = await catalogApi.duplicateCatalogProduct(id); navigate(`/mystore/products/${result.product.id}`); }, "Đã nhân bản thành bản nháp."), children: "Nh\u00E2n b\u1EA3n" }), _jsx("button", { className: primary, disabled: busy, onClick: () => void act(async () => { await catalogApi.setCatalogProductStatus(id, product.status === "active" ? "hidden" : "active"); await reload(); }, "Đã cập nhật trạng thái."), children: product.status === "active" ? "Ẩn" : "Đăng bán" }), _jsx("button", { className: "rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600", disabled: busy, onClick: () => void act(async () => { await catalogApi.setCatalogProductStatus(id, "discontinued"); await reload(); }, "Đã ngừng bán."), children: "Ng\u1EEBng b\u00E1n" })] })] }), _jsxs("section", { className: card, children: [_jsx("h2", { className: "mb-4 text-lg font-bold", children: "Th\u00F4ng tin s\u1EA3n ph\u1EA9m" }), _jsxs("form", { className: "grid gap-4 sm:grid-cols-2", onSubmit: event => { event.preventDefault(); void act(async () => { await catalogApi.editCatalogProduct(id, { title, description, brand, categoryId: categoryId || null }); await reload(); }, "Đã lưu sản phẩm."); }, children: [_jsxs("label", { className: "text-sm font-bold", children: ["T\u00EAn", _jsx("input", { className: input, value: title, onChange: event => setTitle(event.target.value), required: true, minLength: 3 })] }), _jsxs("label", { className: "text-sm font-bold", children: ["Th\u01B0\u01A1ng hi\u1EC7u", _jsx("input", { className: input, value: brand, onChange: event => setBrand(event.target.value) })] }), _jsxs("label", { className: "text-sm font-bold", children: ["Danh m\u1EE5c", _jsxs("select", { className: input, value: categoryId, onChange: event => setCategoryId(event.target.value), children: [_jsx("option", { value: "", children: "Ch\u01B0a ch\u1ECDn" }), flatten(categories).map(({ item, depth }) => _jsxs("option", { value: item.id, children: ["— ".repeat(depth), item.name] }, item.id))] })] }), _jsxs("label", { className: "text-sm font-bold sm:col-span-2", children: ["M\u00F4 t\u1EA3", _jsx("textarea", { className: input, rows: 5, value: description, onChange: event => setDescription(event.target.value) })] }), _jsx("button", { className: primary, disabled: busy, children: "L\u01B0u th\u00F4ng tin" })] })] }), _jsxs("section", { className: card, children: [_jsx("h2", { className: "text-lg font-bold", children: "Bi\u1EBFn th\u1EC3 v\u00E0 gi\u00E1 (VND)" }), _jsx("p", { className: "mt-1 text-sm text-[#718099]", children: "Gi\u00E1 v\u00E0 t\u1ED3n kho \u0111\u01B0\u1EE3c qu\u1EA3n l\u00FD ri\u00EAng cho t\u1EEBng SKU." }), _jsx("div", { className: "mt-4 grid gap-3 sm:grid-cols-2", children: product.variants?.map(item => _jsxs("button", { type: "button", onClick: () => chooseVariant(item), className: "rounded-xl border border-[#e8edf5] p-3 text-left text-sm", children: [_jsx("strong", { children: item.sku }), _jsx("span", { className: "mt-1 block", children: Object.entries(item.attributes).map(([key, value]) => `${key}: ${value}`).join(" · ") || "Mặc định" }), _jsxs("span", { className: "block text-[#476de4]", children: [item.priceMinor.toLocaleString("vi-VN"), "\u20AB \u00B7 T\u1ED3n ", item.stock] })] }, item.id)) }), _jsxs("form", { className: "mt-5 grid gap-3 sm:grid-cols-2", onSubmit: saveVariant, children: [_jsxs("label", { className: "text-sm font-bold", children: ["SKU", _jsx("input", { className: input, value: variant.sku, onChange: event => setVariant(current => ({ ...current, sku: event.target.value })), required: true })] }), _jsxs("label", { className: "text-sm font-bold", children: ["Thu\u1ED9c t\u00EDnh JSON", _jsx("input", { className: input, value: variant.attributes, onChange: event => setVariant(current => ({ ...current, attributes: event.target.value })) })] }), _jsxs("label", { className: "text-sm font-bold", children: ["Gi\u00E1 g\u1ED1c", _jsx("input", { className: input, type: "number", min: "0", step: "1", value: variant.priceMinor, onChange: event => setVariant(current => ({ ...current, priceMinor: Number(event.target.value) })), required: true })] }), _jsxs("label", { className: "text-sm font-bold", children: ["Gi\u00E1 gi\u1EA3m", _jsx("input", { className: input, type: "number", min: "0", step: "1", value: variant.salePriceMinor, onChange: event => setVariant(current => ({ ...current, salePriceMinor: event.target.value })) })] }), _jsxs("label", { className: "text-sm font-bold", children: ["B\u1EAFt \u0111\u1EA7u gi\u1EA3m", _jsx("input", { className: input, type: "datetime-local", value: variant.saleStartsAt, onChange: event => setVariant(current => ({ ...current, saleStartsAt: event.target.value })) })] }), _jsxs("label", { className: "text-sm font-bold", children: ["K\u1EBFt th\u00FAc gi\u1EA3m", _jsx("input", { className: input, type: "datetime-local", value: variant.saleEndsAt, onChange: event => setVariant(current => ({ ...current, saleEndsAt: event.target.value })) })] }), _jsxs("label", { className: "text-sm font-bold", children: ["T\u1ED3n kho", _jsx("input", { className: input, type: "number", min: "0", step: "1", value: variant.stock, readOnly: Boolean(variantId), onChange: event => setVariant(current => ({ ...current, stock: Number(event.target.value) })), required: true })] }), _jsxs("label", { className: "text-sm font-bold", children: ["Tr\u1EA1ng th\u00E1i", _jsxs("select", { className: input, value: variant.status, onChange: event => setVariant(current => ({ ...current, status: event.target.value })), children: [_jsx("option", { value: "active", children: "\u0110ang d\u00F9ng" }), _jsx("option", { value: "inactive", children: "T\u1EA1m \u1EA9n" })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { className: primary, disabled: busy, children: variantId ? "Lưu biến thể" : "Thêm biến thể" }), variantId && _jsx("button", { type: "button", onClick: () => { setVariantId(null); setVariant(blankVariant); }, children: "H\u1EE7y" })] })] })] }), variantId && _jsx(InventoryPanel, { variantId: variantId, onAdjusted: reload }, variantId), _jsxs("section", { className: card, children: [_jsx("h2", { className: "text-lg font-bold", children: "H\u00ECnh \u1EA3nh" }), _jsx("div", { className: "mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5", children: product.images?.map((item, index) => _jsxs("div", { className: "rounded-xl border border-[#e8edf5] p-2", children: [_jsx("img", { className: "aspect-square w-full rounded-lg object-cover", src: item.url || "/visual-placeholder.svg", alt: "" }), _jsx("p", { className: "mt-2 text-xs", children: item.isPrimary ? "Ảnh đại diện" : `Ảnh ${index + 1}` }), _jsxs("div", { className: "mt-2 flex gap-2 text-xs", children: [_jsx("button", { type: "button", disabled: busy || index === 0, onClick: () => void act(async () => { const ids = (product.images || []).map(image => image.id); [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]; await catalogApi.reorderProductImages(id, ids, product.images?.find(image => image.isPrimary)?.id); await reload(); }, "Đã đổi thứ tự ảnh."), children: "\u2190" }), _jsx("button", { type: "button", disabled: busy || item.isPrimary, onClick: () => void act(async () => { await catalogApi.reorderProductImages(id, (product.images || []).map(image => image.id), item.id); await reload(); }, "Đã chọn ảnh đại diện."), children: "\u0110\u1EB7t ch\u00EDnh" }), _jsx("button", { type: "button", disabled: busy, onClick: () => void act(async () => { await catalogApi.removeProductImage(id, item.id); await reload(); }, "Đã xóa ảnh."), children: "X\u00F3a" })] })] }, item.id)) }), _jsxs("form", { className: "mt-4 flex flex-wrap items-end gap-3", onSubmit: event => { event.preventDefault(); if (!image)
                            return; void act(async () => { await catalogApi.uploadProductImage(id, image, { variantId: imageVariantId || undefined, primary: !product.images?.length }); await reload(); setImage(null); }, "Đã tải ảnh lên."); }, children: [_jsxs("label", { className: "text-sm font-bold", children: ["JPEG, PNG ho\u1EB7c WebP t\u1ED1i \u0111a 5 MB", _jsx("input", { className: input, type: "file", accept: "image/jpeg,image/png,image/webp", onChange: event => setImage(event.target.files?.[0] || null), required: true })] }), _jsxs("label", { className: "text-sm font-bold", children: ["\u1EA2nh theo bi\u1EBFn th\u1EC3", _jsxs("select", { className: input, value: imageVariantId, onChange: event => setImageVariantId(event.target.value), children: [_jsx("option", { value: "", children: "\u1EA2nh chung" }), product.variants?.map(item => _jsx("option", { value: item.id, children: item.sku }, item.id))] })] }), _jsx("button", { className: primary, disabled: busy || !image, children: "T\u1EA3i \u1EA3nh" })] })] })] });
}
